package database

import (
	"fmt"
	"log"
	"os"

	"accounting-backend/models"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

// Connect initializes the database connection
func Connect() {
	var err error

	// Get database configuration from environment variables
	host := getEnv("DB_HOST", "localhost")
	port := getEnv("DB_PORT", "5432")
	user := getEnv("DB_USER", "accounting_user")
	password := getEnv("DB_PASSWORD", "password")
	dbname := getEnv("DB_NAME", "accounting_db")
	sslmode := getEnv("DB_SSLMODE", "disable")

	// Create DSN (Data Source Name)
	dsn := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		host, port, user, password, dbname, sslmode)

	// Connect to the database
	DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})

	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	log.Println("Database connected successfully")
}

// Migrate runs database migrations
func Migrate() {
	err := DB.AutoMigrate(
		&models.Company{},
		&models.User{},
		&models.Client{},
		&models.ExpenseCategory{},
		&models.Expense{},
		&models.Invoice{},
		&models.InvoiceItem{},
		&models.Dividend{},
		&models.TaxReturn{},
		&models.HSTPayment{},
		&models.IncomeEntry{},
	)

	if err != nil {
		log.Fatal("Failed to migrate database:", err)
	}

	log.Println("Database migration completed successfully")
}

// getEnv gets an environment variable with a fallback default value
func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
