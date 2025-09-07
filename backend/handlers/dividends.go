package handlers

import (
	"net/http"
	"strconv"
	"time"

	"accounting-backend/database"
	"accounting-backend/models"

	"github.com/gin-gonic/gin"
)

// CreateDividendRequest represents a request to create a dividend
type CreateDividendRequest struct {
	Amount          float64 `json:"amount" binding:"required,min=0"`
	DeclarationDate string  `json:"declaration_date" binding:"required"`
	PaymentDate     *string `json:"payment_date,omitempty"`
	Status          string  `json:"status" binding:"required,oneof=declared paid"`
	Notes           *string `json:"notes,omitempty"`
	CompanyID       uint    `json:"company_id" binding:"required"`
}

// UpdateDividendRequest represents a request to update a dividend
type UpdateDividendRequest struct {
	Amount          *float64 `json:"amount,omitempty" binding:"omitempty,min=0"`
	DeclarationDate *string  `json:"declaration_date,omitempty"`
	PaymentDate     *string  `json:"payment_date,omitempty"`
	Status          *string  `json:"status,omitempty" binding:"omitempty,oneof=declared paid"`
	Notes           *string  `json:"notes,omitempty"`
}

// CreateDividend creates a new dividend
func CreateDividend(c *gin.Context) {
	var req CreateDividendRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Verify company exists
	var company models.Company
	if err := database.DB.First(&company, req.CompanyID).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Company not found"})
		return
	}

	// Parse declaration date
	declarationDate, err := time.Parse("2006-01-02", req.DeclarationDate)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid declaration date format. Use YYYY-MM-DD"})
		return
	}

	// Parse payment date if provided
	var paymentDate *time.Time
	if req.PaymentDate != nil {
		parsed, err := time.Parse("2006-01-02", *req.PaymentDate)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid payment date format. Use YYYY-MM-DD"})
			return
		}
		paymentDate = &parsed
	}

	// Create dividend
	dividend := models.Dividend{
		Amount:          req.Amount,
		DeclarationDate: declarationDate,
		PaymentDate:     paymentDate,
		Status:          req.Status,
		Notes:           req.Notes,
		CompanyID:       req.CompanyID,
	}

	if err := database.DB.Create(&dividend).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create dividend"})
		return
	}

	// Load dividend with company
	if err := database.DB.Preload("Company").First(&dividend, dividend.ID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load dividend data"})
		return
	}

	c.JSON(http.StatusCreated, dividend)
}

// GetDividend retrieves a dividend by ID
func GetDividend(c *gin.Context) {
	dividendID := c.Param("id")

	var dividend models.Dividend
	if err := database.DB.Preload("Company").First(&dividend, dividendID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Dividend not found"})
		return
	}

	c.JSON(http.StatusOK, dividend)
}

// UpdateDividend updates a dividend
func UpdateDividend(c *gin.Context) {
	dividendID := c.Param("id")

	var req UpdateDividendRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Find dividend
	var dividend models.Dividend
	if err := database.DB.First(&dividend, dividendID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Dividend not found"})
		return
	}

	// Update fields if provided
	updates := make(map[string]interface{})
	if req.Amount != nil {
		updates["amount"] = *req.Amount
	}
	if req.DeclarationDate != nil {
		declarationDate, err := time.Parse("2006-01-02", *req.DeclarationDate)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid declaration date format. Use YYYY-MM-DD"})
			return
		}
		updates["declaration_date"] = declarationDate
	}
	if req.PaymentDate != nil {
		if *req.PaymentDate == "" {
			updates["payment_date"] = nil
		} else {
			paymentDate, err := time.Parse("2006-01-02", *req.PaymentDate)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid payment date format. Use YYYY-MM-DD"})
				return
			}
			updates["payment_date"] = paymentDate
		}
	}
	if req.Status != nil {
		updates["status"] = *req.Status
	}
	if req.Notes != nil {
		updates["notes"] = *req.Notes
	}

	if err := database.DB.Model(&dividend).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update dividend"})
		return
	}

	// Load updated dividend with company
	if err := database.DB.Preload("Company").First(&dividend, dividend.ID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load updated dividend data"})
		return
	}

	c.JSON(http.StatusOK, dividend)
}

// DeleteDividend deletes a dividend
func DeleteDividend(c *gin.Context) {
	dividendID := c.Param("id")

	// Find dividend
	var dividend models.Dividend
	if err := database.DB.First(&dividend, dividendID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Dividend not found"})
		return
	}

	// Soft delete dividend
	if err := database.DB.Delete(&dividend).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete dividend"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Dividend deleted successfully"})
}

// ListDividends lists all dividends
func ListDividends(c *gin.Context) {
	var dividends []models.Dividend

	// Get pagination parameters
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	offset := (page - 1) * limit

	// Get filter parameters
	companyID := c.Query("company_id")
	status := c.Query("status")
	startDate := c.Query("start_date")
	endDate := c.Query("end_date")

	query := database.DB.Preload("Company").Model(&models.Dividend{})

	// Apply filters
	if companyID != "" {
		query = query.Where("company_id = ?", companyID)
	}
	if status != "" {
		query = query.Where("status = ?", status)
	}
	if startDate != "" {
		query = query.Where("declaration_date >= ?", startDate)
	}
	if endDate != "" {
		query = query.Where("declaration_date <= ?", endDate)
	}

	// Get total count
	var total int64
	if err := query.Count(&total).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to count dividends"})
		return
	}

	// Get paginated results
	if err := query.Offset(offset).Limit(limit).Order("declaration_date DESC").Find(&dividends).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch dividends"})
		return
	}

	response := gin.H{
		"data":       dividends,
		"total":      total,
		"page":       page,
		"limit":      limit,
		"totalPages": (total + int64(limit) - 1) / int64(limit),
	}

	c.JSON(http.StatusOK, response)
}
