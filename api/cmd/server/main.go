package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/accounting/api/internal/auth"
	"github.com/accounting/api/internal/companyhttp"
	"github.com/accounting/api/internal/config"
	"github.com/accounting/api/internal/compensationhttp"
	"github.com/accounting/api/internal/data"
	"github.com/accounting/api/internal/employeehttp"
	"github.com/accounting/api/internal/httpx"
	"github.com/accounting/api/internal/invoicehttp"
	appmw "github.com/accounting/api/internal/middleware"
	"github.com/accounting/api/internal/paymyself"
	"github.com/accounting/api/internal/pushhttp"
	"github.com/accounting/api/internal/storage"
	"github.com/accounting/api/internal/storagehttp"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"

	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/pgx/v5"
	_ "github.com/golang-migrate/migrate/v4/source/file"
)

func main() {
	_ = godotenv.Load()
	log := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))

	cfg, err := config.Load()
	if err != nil {
		log.Error("config", "err", err)
		os.Exit(1)
	}

	if os.Getenv("RUN_MIGRATIONS") != "false" {
		if err := runMigrations(cfg.DatabaseURL, cfg.MigrationsPath); err != nil && err != migrate.ErrNoChange {
			log.Error("migrate", "err", err)
			os.Exit(1)
		}
	}

	ctx := context.Background()
	pool, err := pgxpool.New(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Error("db", "err", err)
		os.Exit(1)
	}
	defer pool.Close()

	authSvc := auth.NewService(pool, cfg)
	authMW := appmw.NewAuth(pool, cfg)

	r := chi.NewRouter()
	r.Use(middleware.Recoverer)
	r.Use(appmw.RequestID)
	r.Use(appmw.StructuredLogger(log))
	r.Use(appmw.CORS(cfg.FrontendURLs))

	r.Get("/healthz", func(w http.ResponseWriter, _ *http.Request) {
		httpx.WriteJSON(w, http.StatusOK, map[string]any{"status": "ok"})
	})
	r.Get("/health", func(w http.ResponseWriter, _ *http.Request) {
		httpx.WriteJSON(w, http.StatusOK, map[string]any{"status": "ok"})
	})
	r.Get("/ready", func(w http.ResponseWriter, r *http.Request) {
		if err := pool.Ping(r.Context()); err != nil {
			httpx.ProblemJSON(w, http.StatusServiceUnavailable, "Not Ready", err.Error(), "db")
			return
		}
		httpx.WriteJSON(w, http.StatusOK, map[string]any{"status": "ready"})
	})
	r.Get("/v1/features", func(w http.ResponseWriter, _ *http.Request) {
		httpx.WriteJSON(w, http.StatusOK, map[string]any{
			"ocr":               cfg.GeminiAPIKey != "",
			"bank_statements":   false,
			"push_notifications": cfg.VAPIDPrivateKey != "" && cfg.VAPIDPublicKey != "",
			"storage":           b2Configured(cfg),
		})
	})

	r.Route("/v1/auth", func(r chi.Router) {
		r.Post("/register", authSvc.RegisterHTTP)
		r.Post("/login", authSvc.LoginHTTP)
		r.Post("/refresh", authSvc.RefreshHTTP)
		r.Group(func(r chi.Router) {
			r.Use(authMW.Authenticate)
			r.Get("/me", authSvc.MeHTTP)
			r.Post("/update-password", authSvc.UpdatePasswordHTTP)
			r.Post("/logout", authSvc.LogoutHTTP)
		})
	})

	dh := data.NewHandler(pool)
	r.Route("/v1/data", func(r chi.Router) {
		r.Use(authMW.Authenticate)
		r.Post("/select", dh.Select)
		r.Post("/insert", dh.Insert)
		r.Post("/update", dh.Update)
		r.Post("/delete", dh.Delete)
		r.Post("/upsert", dh.Upsert)
	})

	var b2Client *storage.B2
	if b2, err := storage.NewB2(ctx, cfg.B2Endpoint, cfg.B2Region, cfg.B2Bucket, cfg.B2KeyID, cfg.B2ApplicationKey); err != nil {
		log.Info("storage_disabled", "reason", err.Error())
	} else {
		b2Client = b2
	}
	sh := storagehttp.New(b2Client)
	r.Route("/v1/storage", func(r chi.Router) {
		r.Use(authMW.Authenticate)
		r.Post("/presign-upload", sh.PresignUpload)
		r.Post("/presign-download", sh.PresignDownload)
		r.Post("/delete", sh.Delete)
	})

	legacyScript := os.Getenv("OPTIMIZER_SCRIPT")
	if legacyScript == "" {
		legacyScript = "api/legacy/payMyselfOptimizer.js"
	}

	r.Route("/api/pay-myself", func(r chi.Router) {
		paymyself.RegisterOptimize(r, pool, legacyScript)
		r.Group(func(r chi.Router) {
			r.Use(authMW.Authenticate)
			paymyself.RegisterYTD(r, pool)
		})
	})

	r.Route("/api/company-members", func(r chi.Router) {
		r.Use(authMW.Authenticate)
		companyhttp.Register(r, pool, cfg)
	})

	r.Route("/api/employees", func(r chi.Router) {
		r.Use(authMW.Authenticate)
		employeehttp.Register(r, pool)
	})

	r.Route("/api/compensation-strategy", func(r chi.Router) {
		r.Use(authMW.Authenticate)
		compensationhttp.Register(r, pool)
	})

	r.Route("/api/emails", func(r chi.Router) {
		r.Use(authMW.Authenticate)
		invoicehttp.Register(r, pool, cfg)
	})

	r.Route("/api/push-notifications", func(r chi.Router) {
		r.Use(authMW.Authenticate)
		pushhttp.Register(r, pool, cfg.VAPIDPrivateKey, cfg.VAPIDPublicKey)
	})

	r.Route("/api/ocr", func(r chi.Router) {
		r.Use(authMW.Authenticate)
		r.Post("/analyze", func(w http.ResponseWriter, r *http.Request) {
			httpx.ProblemJSON(w, http.StatusNotImplemented, "Not Implemented", "OCR: set GEMINI_API_KEY and port analyze route", "ocr")
		})
	})

	bankNotImplemented := func(w http.ResponseWriter, r *http.Request) {
		httpx.ProblemJSON(w, http.StatusNotImplemented, "Not Implemented", "Bank CSV/PDF parser not yet ported to Go", "bank")
	}
	r.Route("/api/bank-statements", func(r chi.Router) {
		r.Use(authMW.Authenticate)
		r.Post("/upload", bankNotImplemented)
		r.Post("/process", bankNotImplemented)
		r.Post("/categorize", func(w http.ResponseWriter, r *http.Request) {
			httpx.ProblemJSON(w, http.StatusNotImplemented, "Not Implemented", "Bank categorization not yet ported to Go", "bank")
		})
		r.Post("/detect-duplicates", func(w http.ResponseWriter, r *http.Request) {
			httpx.ProblemJSON(w, http.StatusNotImplemented, "Not Implemented", "Duplicate detection not yet ported to Go", "bank")
		})
	})

	srv := &http.Server{Addr: cfg.HTTPAddr, Handler: r, ReadHeaderTimeout: 10 * time.Second}
	go func() {
		log.Info("listening", "addr", cfg.HTTPAddr)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Error("server", "err", err)
			os.Exit(1)
		}
	}()
	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	<-stop
	ctx2, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	_ = srv.Shutdown(ctx2)
}

func runMigrations(databaseURL string, source string) error {
	dbURL := databaseURL
	if strings.HasPrefix(dbURL, "postgres://") {
		dbURL = "pgx5://" + strings.TrimPrefix(dbURL, "postgres://")
	}
	m, err := migrate.New(source, dbURL)
	if err != nil {
		return err
	}
	defer m.Close()
	return m.Up()
}

func b2Configured(cfg *config.Config) bool {
	return cfg.B2Endpoint != "" && cfg.B2Bucket != "" && cfg.B2KeyID != "" && cfg.B2ApplicationKey != ""
}
