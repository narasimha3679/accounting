package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"accounting-backend/database"
	"accounting-backend/models"

	"github.com/gin-gonic/gin"
)

// PersonalFinanceConfig represents configuration for personal finance integration
type PersonalFinanceConfig struct {
	ID                    uint      `json:"id" gorm:"primaryKey"`
	PersonalFinanceAPIURL string    `json:"personal_finance_api_url" gorm:"not null"`
	PersonalFinanceAPIKey string    `json:"personal_finance_api_key" gorm:"not null"`
	UserID                uint      `json:"user_id" gorm:"not null"`
	IsEnabled             bool      `json:"is_enabled" gorm:"default:true"`
	CreatedAt             time.Time `json:"created_at"`
	UpdatedAt             time.Time `json:"updated_at"`
}

// DividendWebhookPayload represents the payload sent to personal finance system
type DividendWebhookPayload struct {
	CorporateDividendID uint    `json:"corporate_dividend_id"`
	Amount              float64 `json:"amount"`
	DeclarationDate     string  `json:"declaration_date"`
	PaymentDate         *string `json:"payment_date,omitempty"`
	Status              string  `json:"status"`
	TaxWithheld         float64 `json:"tax_withheld"`
	CompanyName         string  `json:"company_name"`
	Notes               *string `json:"notes,omitempty"`
}

// CreatePersonalFinanceConfig creates or updates personal finance integration configuration
func CreatePersonalFinanceConfig(c *gin.Context) {
	userID, err := getUserIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	var req struct {
		PersonalFinanceAPIURL string `json:"personal_finance_api_url" binding:"required"`
		PersonalFinanceAPIKey string `json:"personal_finance_api_key" binding:"required"`
		IsEnabled             bool   `json:"is_enabled"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Check if config already exists
	var config PersonalFinanceConfig
	if err := database.DB.Where("user_id = ?", userID).First(&config).Error; err == nil {
		// Update existing config
		config.PersonalFinanceAPIURL = req.PersonalFinanceAPIURL
		config.PersonalFinanceAPIKey = req.PersonalFinanceAPIKey
		config.IsEnabled = req.IsEnabled
		config.UpdatedAt = time.Now()

		if err := database.DB.Save(&config).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update personal finance configuration"})
			return
		}
	} else {
		// Create new config
		config = PersonalFinanceConfig{
			PersonalFinanceAPIURL: req.PersonalFinanceAPIURL,
			PersonalFinanceAPIKey: req.PersonalFinanceAPIKey,
			IsEnabled:             req.IsEnabled,
			UserID:                userID,
		}

		if err := database.DB.Create(&config).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create personal finance configuration"})
			return
		}
	}

	c.JSON(http.StatusOK, config)
}

// GetPersonalFinanceConfig retrieves personal finance integration configuration
func GetPersonalFinanceConfig(c *gin.Context) {
	userID, err := getUserIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	var config PersonalFinanceConfig
	if err := database.DB.Where("user_id = ?", userID).First(&config).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Personal finance configuration not found"})
		return
	}

	// Don't return the API key for security
	config.PersonalFinanceAPIKey = "***hidden***"
	c.JSON(http.StatusOK, config)
}

// TestPersonalFinanceConnection tests the connection to personal finance system
func TestPersonalFinanceConnection(c *gin.Context) {
	userID, err := getUserIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	var config PersonalFinanceConfig
	if err := database.DB.Where("user_id = ?", userID).First(&config).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Personal finance configuration not found"})
		return
	}

	// Test connection by making a request to personal finance API
	client := &http.Client{Timeout: 10 * time.Second}
	req, err := http.NewRequest("GET", config.PersonalFinanceAPIURL+"/corporate/status", nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create request"})
		return
	}

	req.Header.Set("Authorization", "Bearer "+config.PersonalFinanceAPIKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := client.Do(req)
	if err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Failed to connect to personal finance API"})
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Personal finance API returned error"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status":  "success",
		"message": "Successfully connected to personal finance system",
		"user_id": userID,
	})
}

// SendDividendToPersonalFinance sends dividend data to personal finance system
func SendDividendToPersonalFinance(dividend *models.Dividend) error {
	// Get personal finance configuration
	var config PersonalFinanceConfig
	if err := database.DB.Where("user_id = ? AND is_enabled = ?", 1, true).First(&config).Error; err != nil {
		return fmt.Errorf("personal finance configuration not found or disabled")
	}

	// Prepare webhook payload
	payload := DividendWebhookPayload{
		CorporateDividendID: dividend.ID,
		Amount:              dividend.Amount,
		DeclarationDate:     dividend.DeclarationDate.Format("2006-01-02"),
		Status:              dividend.Status,
		TaxWithheld:         0, // Corporate dividends don't have tax withheld at source
		CompanyName:         dividend.Company.Name,
		Notes:               dividend.Notes,
	}

	if dividend.PaymentDate != nil {
		paymentDate := dividend.PaymentDate.Format("2006-01-02")
		payload.PaymentDate = &paymentDate
	}

	// Send webhook
	jsonData, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal dividend data: %v", err)
	}

	client := &http.Client{Timeout: 10 * time.Second}
	req, err := http.NewRequest("POST", config.PersonalFinanceAPIURL+"/corporate/dividends/sync", bytes.NewBuffer(jsonData))
	if err != nil {
		return fmt.Errorf("failed to create request: %v", err)
	}

	req.Header.Set("Authorization", "Bearer "+config.PersonalFinanceAPIKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("failed to send dividend data: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		return fmt.Errorf("personal finance API returned error status: %d", resp.StatusCode)
	}

	return nil
}

// GetIntegrationStatus returns the status of personal finance integration
func GetIntegrationStatus(c *gin.Context) {
	userID, err := getUserIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	var config PersonalFinanceConfig
	configExists := database.DB.Where("user_id = ?", userID).First(&config).Error == nil

	// Count dividends that could be synced
	var dividendCount int64
	database.DB.Model(&models.Dividend{}).Count(&dividendCount)

	status := gin.H{
		"personal_finance_configured": configExists,
		"integration_enabled":         configExists && config.IsEnabled,
		"total_dividends":             dividendCount,
		"last_sync":                   time.Now().Format("2006-01-02 15:04:05"),
	}

	if configExists {
		status["personal_finance_api_url"] = config.PersonalFinanceAPIURL
	}

	c.JSON(http.StatusOK, status)
}

// SyncAllDividends manually syncs all dividends to personal finance system
func SyncAllDividends(c *gin.Context) {
	userID, err := getUserIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	var config PersonalFinanceConfig
	if err := database.DB.Where("user_id = ? AND is_enabled = ?", userID, true).First(&config).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Personal finance integration not configured or disabled"})
		return
	}

	// Get all dividends
	var dividends []models.Dividend
	if err := database.DB.Preload("Company").Find(&dividends).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch dividends"})
		return
	}

	successCount := 0
	errorCount := 0
	var errors []string

	for _, dividend := range dividends {
		if err := SendDividendToPersonalFinance(&dividend); err != nil {
			errorCount++
			errors = append(errors, fmt.Sprintf("Dividend ID %d: %v", dividend.ID, err))
		} else {
			successCount++
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"message":       "Dividend sync completed",
		"success_count": successCount,
		"error_count":   errorCount,
		"errors":        errors,
	})
}

// Helper function to get user ID from context (you may need to implement this based on your auth middleware)
func getUserIDFromContext(c *gin.Context) (uint, error) {
	userID, exists := c.Get("user_id")
	if !exists {
		return 0, fmt.Errorf("user not authenticated")
	}

	id, ok := userID.(uint)
	if !ok {
		return 0, fmt.Errorf("invalid user ID")
	}

	return id, nil
}
