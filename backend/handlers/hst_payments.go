package handlers

import (
	"net/http"
	"strconv"

	"accounting-backend/database"
	"accounting-backend/models"

	"github.com/gin-gonic/gin"
)

// ListHSTPayments lists all HST payments
func ListHSTPayments(c *gin.Context) {
	var hstPayments []models.HSTPayment

	// Get query parameters
	companyID := c.Query("company_id")
	startDate := c.Query("start_date")
	endDate := c.Query("end_date")
	page := c.DefaultQuery("page", "1")
	limit := c.DefaultQuery("limit", "10")

	// Parse pagination
	pageInt, _ := strconv.Atoi(page)
	limitInt, _ := strconv.Atoi(limit)
	offset := (pageInt - 1) * limitInt

	// Build query
	query := database.DB.Preload("Company")

	if companyID != "" {
		query = query.Where("company_id = ?", companyID)
	}
	if startDate != "" {
		query = query.Where("payment_date >= ?", startDate)
	}
	if endDate != "" {
		query = query.Where("payment_date <= ?", endDate)
	}

	// Get total count
	var total int64
	query.Model(&models.HSTPayment{}).Count(&total)

	// Get paginated results
	if err := query.Offset(offset).Limit(limitInt).Order("payment_date DESC").Find(&hstPayments).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch HST payments"})
		return
	}

	response := models.PaginatedResponse[models.HSTPayment]{
		Data:       hstPayments,
		Total:      int(total),
		Page:       pageInt,
		Limit:      limitInt,
		TotalPages: int((total + int64(limitInt) - 1) / int64(limitInt)),
	}

	c.JSON(http.StatusOK, response)
}

// CreateHSTPayment creates a new HST payment
func CreateHSTPayment(c *gin.Context) {
	var req models.CreateHSTPaymentRequest
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

	// Create HST payment
	hstPayment := models.HSTPayment{
		Amount:      req.Amount,
		PaymentDate: req.PaymentDate,
		PeriodStart: req.PeriodStart,
		PeriodEnd:   req.PeriodEnd,
		Reference:   req.Reference,
		Notes:       req.Notes,
		CompanyID:   req.CompanyID,
	}

	if err := database.DB.Create(&hstPayment).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create HST payment"})
		return
	}

	// Load HST payment with company
	if err := database.DB.Preload("Company").First(&hstPayment, hstPayment.ID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load HST payment data"})
		return
	}

	c.JSON(http.StatusCreated, hstPayment)
}

// GetHSTPayment retrieves an HST payment by ID
func GetHSTPayment(c *gin.Context) {
	hstPaymentID := c.Param("id")

	var hstPayment models.HSTPayment
	if err := database.DB.Preload("Company").First(&hstPayment, hstPaymentID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "HST payment not found"})
		return
	}

	c.JSON(http.StatusOK, hstPayment)
}

// UpdateHSTPayment updates an HST payment
func UpdateHSTPayment(c *gin.Context) {
	hstPaymentID := c.Param("id")

	var req models.UpdateHSTPaymentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Find HST payment
	var hstPayment models.HSTPayment
	if err := database.DB.First(&hstPayment, hstPaymentID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "HST payment not found"})
		return
	}

	// Update fields if provided
	updates := make(map[string]interface{})
	if req.Amount != nil {
		updates["amount"] = *req.Amount
	}
	if req.PaymentDate != nil {
		updates["payment_date"] = *req.PaymentDate
	}
	if req.PeriodStart != nil {
		updates["period_start"] = *req.PeriodStart
	}
	if req.PeriodEnd != nil {
		updates["period_end"] = *req.PeriodEnd
	}
	if req.Reference != nil {
		updates["reference"] = *req.Reference
	}
	if req.Notes != nil {
		updates["notes"] = *req.Notes
	}

	if err := database.DB.Model(&hstPayment).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update HST payment"})
		return
	}

	// Load updated HST payment with company
	if err := database.DB.Preload("Company").First(&hstPayment, hstPayment.ID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load updated HST payment data"})
		return
	}

	c.JSON(http.StatusOK, hstPayment)
}

// DeleteHSTPayment deletes an HST payment
func DeleteHSTPayment(c *gin.Context) {
	hstPaymentID := c.Param("id")

	// Find HST payment
	var hstPayment models.HSTPayment
	if err := database.DB.First(&hstPayment, hstPaymentID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "HST payment not found"})
		return
	}

	// Soft delete HST payment
	if err := database.DB.Delete(&hstPayment).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete HST payment"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "HST payment deleted successfully"})
}
