package main

import (
	"log"
	"os"
	"time"

	"accounting-backend/database"
	"accounting-backend/handlers"
	"accounting-backend/middleware"
	"accounting-backend/models"
	"accounting-backend/utils"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using system environment variables")
	}

	// Set Gin mode
	ginMode := os.Getenv("GIN_MODE")
	if ginMode == "" {
		ginMode = "debug"
	}
	gin.SetMode(ginMode)

	// Connect to database
	database.Connect()

	// Run migrations
	database.Migrate()

	// Create default admin user if it doesn't exist
	createDefaultAdmin()

	// Create default expense categories if they don't exist
	createDefaultExpenseCategories()

	// Initialize Gin router
	r := gin.Default()

	// Add CORS middleware
	r.Use(middleware.CORSMiddleware())

	// Health check endpoint
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status":  "ok",
			"message": "Accounting backend is running",
		})
	})

	// API routes
	api := r.Group("/api/v1")
	{
		// Authentication routes
		auth := api.Group("/auth")
		{
			auth.POST("/login", handlers.Login)
			auth.POST("/register", handlers.Register)
			auth.GET("/profile", middleware.AuthMiddleware(), handlers.GetProfile)
		}

		// Admin routes
		admin := api.Group("/admin")
		admin.Use(middleware.AuthMiddleware(), middleware.RequireAdmin())
		{
			// User management
			admin.GET("/users", handlers.ListUsers)
			admin.POST("/users", handlers.CreateUser)
			admin.GET("/users/:id", handlers.GetUser)
			admin.PUT("/users/:id", handlers.UpdateUser)
			admin.DELETE("/users/:id", handlers.DeleteUser)

			// Company management
			admin.GET("/companies", handlers.ListCompanies)
			admin.POST("/companies", handlers.CreateCompany)
			admin.GET("/companies/:id", handlers.GetCompany)
			admin.PUT("/companies/:id", handlers.UpdateCompany)
			admin.DELETE("/companies/:id", handlers.DeleteCompany)
		}

		// Protected routes (require authentication)
		protected := api.Group("/")
		protected.Use(middleware.AuthMiddleware())
		{
			// Client routes
			clients := protected.Group("/clients")
			{
				clients.GET("", handlers.ListClients)
				clients.POST("", handlers.CreateClient)
				clients.GET("/:id", handlers.GetClient)
				clients.PUT("/:id", handlers.UpdateClient)
				clients.DELETE("/:id", handlers.DeleteClient)
			}

			// Invoice routes
			invoices := protected.Group("/invoices")
			{
				invoices.GET("", handlers.ListInvoices)
				invoices.POST("", handlers.CreateInvoice)
				invoices.GET("/:id", handlers.GetInvoice)
				invoices.PUT("/:id", handlers.UpdateInvoice)
				invoices.DELETE("/:id", handlers.DeleteInvoice)
			}

			// Expense category routes
			expenseCategories := protected.Group("/expense-categories")
			{
				expenseCategories.GET("", handlers.ListExpenseCategories)
				expenseCategories.POST("", handlers.CreateExpenseCategory)
				expenseCategories.GET("/:id", handlers.GetExpenseCategory)
				expenseCategories.PUT("/:id", handlers.UpdateExpenseCategory)
				expenseCategories.DELETE("/:id", handlers.DeleteExpenseCategory)
			}

			// Expense routes
			expenses := protected.Group("/expenses")
			{
				expenses.GET("", handlers.ListExpenses)
				expenses.POST("", handlers.CreateExpense)
				expenses.GET("/:id", handlers.GetExpense)
				expenses.PUT("/:id", handlers.UpdateExpense)
				expenses.DELETE("/:id", handlers.DeleteExpense)
			}

			// Income entry routes
			incomeEntries := protected.Group("/income-entries")
			{
				incomeEntries.GET("", handlers.ListIncomeEntries)
				incomeEntries.POST("", handlers.CreateIncomeEntry)
				incomeEntries.GET("/:id", handlers.GetIncomeEntry)
				incomeEntries.PUT("/:id", handlers.UpdateIncomeEntry)
				incomeEntries.DELETE("/:id", handlers.DeleteIncomeEntry)
			}

			// HST payment routes
			hstPayments := protected.Group("/hst-payments")
			{
				hstPayments.GET("", handlers.ListHSTPayments)
				hstPayments.POST("", handlers.CreateHSTPayment)
				hstPayments.GET("/:id", handlers.GetHSTPayment)
				hstPayments.PUT("/:id", handlers.UpdateHSTPayment)
				hstPayments.DELETE("/:id", handlers.DeleteHSTPayment)
			}

			// Dividend routes (admin only)
			dividends := protected.Group("/dividends")
			dividends.Use(middleware.RequireAdmin())
			{
				dividends.GET("", handlers.ListDividends)
				dividends.POST("", handlers.CreateDividend)
				dividends.GET("/:id", handlers.GetDividend)
				dividends.PUT("/:id", handlers.UpdateDividend)
				dividends.DELETE("/:id", handlers.DeleteDividend)
			}

			// Tax return routes (admin only)
			taxReturns := protected.Group("/tax-returns")
			taxReturns.Use(middleware.RequireAdmin())
			{
				taxReturns.GET("", handlers.ListTaxReturns)
				taxReturns.POST("", handlers.CreateTaxReturn)
				taxReturns.GET("/:id", handlers.GetTaxReturn)
				taxReturns.PUT("/:id", handlers.UpdateTaxReturn)
				taxReturns.DELETE("/:id", handlers.DeleteTaxReturn)
			}
		}
	}

	// Get port from environment
	port := os.Getenv("PORT")
	if port == "" {
		port = "8090"
	}

	// Start server
	log.Printf("Server starting on port %s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}

// createDefaultAdmin creates a default admin user if none exists
func createDefaultAdmin() {
	var userCount int64
	if err := database.DB.Model(&models.User{}).Count(&userCount).Error; err != nil {
		log.Printf("Error checking user count: %v", err)
		return
	}

	if userCount == 0 {
		// Create default company
		company := models.Company{
			Name:              "Default Company",
			BusinessNumber:    "123456789",
			FiscalYearEnd:     time.Date(2024, 12, 31, 0, 0, 0, 0, time.UTC),
			SmallBusinessRate: 0.15,
			HSTRate:           0.13,
		}

		if err := database.DB.Create(&company).Error; err != nil {
			log.Printf("Error creating default company: %v", err)
			return
		}

		// Create default admin user
		hashedPassword, err := utils.HashPassword("admin123")
		if err != nil {
			log.Printf("Error hashing password: %v", err)
			return
		}

		admin := models.User{
			Email:     "admin@example.com",
			Password:  hashedPassword,
			Name:      "Admin User",
			Role:      "admin",
			CompanyID: company.ID,
		}

		if err := database.DB.Create(&admin).Error; err != nil {
			log.Printf("Error creating default admin: %v", err)
			return
		}

		log.Println("Default admin user created:")
		log.Println("Email: admin@example.com")
		log.Println("Password: admin123")
		log.Println("Please change the password after first login!")
	}
}

// createDefaultExpenseCategories creates default expense categories if none exist
func createDefaultExpenseCategories() {
	var categoryCount int64
	if err := database.DB.Model(&models.ExpenseCategory{}).Count(&categoryCount).Error; err != nil {
		log.Printf("Error checking expense category count: %v", err)
		return
	}

	if categoryCount == 0 {
		defaultCategories := []models.ExpenseCategory{
			{
				Name:        "Office Supplies",
				Description: stringPtr("Office supplies and stationery"),
			},
			{
				Name:        "Travel & Transportation",
				Description: stringPtr("Business travel, gas, parking, public transit"),
			},
			{
				Name:        "Meals & Entertainment",
				Description: stringPtr("Business meals and client entertainment"),
			},
			{
				Name:        "Professional Services",
				Description: stringPtr("Legal, accounting, consulting fees"),
			},
			{
				Name:        "Software & Subscriptions",
				Description: stringPtr("Software licenses, cloud services, subscriptions"),
			},
			{
				Name:        "Marketing & Advertising",
				Description: stringPtr("Marketing materials, advertising, website costs"),
			},
			{
				Name:        "Equipment & Technology",
				Description: stringPtr("Computers, phones, office equipment"),
			},
			{
				Name:        "Utilities",
				Description: stringPtr("Internet, phone, electricity for home office"),
			},
			{
				Name:        "Insurance",
				Description: stringPtr("Business insurance premiums"),
			},
			{
				Name:        "Other",
				Description: stringPtr("Miscellaneous business expenses"),
			},
		}

		for _, category := range defaultCategories {
			if err := database.DB.Create(&category).Error; err != nil {
				log.Printf("Error creating default expense category %s: %v", category.Name, err)
			}
		}

		log.Printf("Created %d default expense categories", len(defaultCategories))
	}
}

// stringPtr returns a pointer to a string
func stringPtr(s string) *string {
	return &s
}
