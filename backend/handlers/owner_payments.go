package handlers

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"

	"accounting-backend/database"
	"accounting-backend/models"
)

// GetOwnerPayments retrieves owner payments with optional filtering
func GetOwnerPayments(c *gin.Context) {
	companyIDStr := c.Query("company_id")
	if companyIDStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "company_id is required"})
		return
	}

	companyID, err := strconv.ParseUint(companyIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid company_id"})
		return
	}

	// Parse pagination parameters
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 50
	}

	// Parse date range filters
	startDateStr := c.Query("start_date")
	endDateStr := c.Query("end_date")
	paymentType := c.Query("payment_type")

	// Build query
	query := database.DB.Where("company_id = ?", companyID)

	// Apply date filters
	if startDateStr != "" {
		if startDate, err := time.Parse("2006-01-02", startDateStr); err == nil {
			query = query.Where("payment_date >= ?", startDate)
		}
	}
	if endDateStr != "" {
		if endDate, err := time.Parse("2006-01-02", endDateStr); err == nil {
			query = query.Where("payment_date <= ?", endDate)
		}
	}

	// Apply payment type filter
	if paymentType != "" {
		query = query.Where("payment_type = ?", paymentType)
	}

	// Get total count
	var total int64
	if err := query.Model(&models.OwnerPayment{}).Count(&total).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to count owner payments"})
		return
	}

	// Get paginated results
	var ownerPayments []models.OwnerPayment
	offset := (page - 1) * limit
	if err := query.Preload("Company").
		Order("payment_date DESC").
		Offset(offset).
		Limit(limit).
		Find(&ownerPayments).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve owner payments"})
		return
	}

	totalPages := int((total + int64(limit) - 1) / int64(limit))
	response := models.PaginatedResponse[models.OwnerPayment]{
		Data:       ownerPayments,
		Total:      int(total),
		Page:       page,
		Limit:      limit,
		TotalPages: totalPages,
	}

	c.JSON(http.StatusOK, response)
}

// CreateOwnerPayment creates a new owner payment
func CreateOwnerPayment(c *gin.Context) {
	var req models.CreateOwnerPaymentRequest
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

	// Parse payment date
	paymentDate, err := time.Parse("2006-01-02", req.PaymentDate)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid payment_date format. Use YYYY-MM-DD"})
		return
	}

	// Create owner payment
	ownerPayment := models.OwnerPayment{
		Description: req.Description,
		Amount:      req.Amount,
		PaymentDate: paymentDate,
		PaymentType: req.PaymentType,
		Reference:   req.Reference,
		Notes:       req.Notes,
		CompanyID:   req.CompanyID,
	}

	if err := database.DB.Create(&ownerPayment).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create owner payment"})
		return
	}

	// Load owner payment with company
	if err := database.DB.Preload("Company").First(&ownerPayment, ownerPayment.ID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load owner payment data"})
		return
	}

	c.JSON(http.StatusCreated, ownerPayment)
}

// GetOwnerPayment retrieves an owner payment by ID
func GetOwnerPayment(c *gin.Context) {
	ownerPaymentID := c.Param("id")

	var ownerPayment models.OwnerPayment
	if err := database.DB.Preload("Company").First(&ownerPayment, ownerPaymentID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Owner payment not found"})
		return
	}

	c.JSON(http.StatusOK, ownerPayment)
}

// UpdateOwnerPayment updates an owner payment
func UpdateOwnerPayment(c *gin.Context) {
	ownerPaymentID := c.Param("id")

	var req models.UpdateOwnerPaymentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get existing owner payment
	var ownerPayment models.OwnerPayment
	if err := database.DB.First(&ownerPayment, ownerPaymentID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Owner payment not found"})
		return
	}

	// Update fields
	updates := make(map[string]interface{})
	if req.Description != nil {
		updates["description"] = *req.Description
	}
	if req.Amount != nil {
		updates["amount"] = *req.Amount
	}
	if req.PaymentDate != nil {
		paymentDate, err := time.Parse("2006-01-02", *req.PaymentDate)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid payment_date format. Use YYYY-MM-DD"})
			return
		}
		updates["payment_date"] = paymentDate
	}
	if req.PaymentType != nil {
		updates["payment_type"] = *req.PaymentType
	}
	if req.Reference != nil {
		updates["reference"] = req.Reference
	}
	if req.Notes != nil {
		updates["notes"] = req.Notes
	}

	if err := database.DB.Model(&ownerPayment).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update owner payment"})
		return
	}

	// Load updated owner payment with company
	if err := database.DB.Preload("Company").First(&ownerPayment, ownerPayment.ID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load updated owner payment data"})
		return
	}

	c.JSON(http.StatusOK, ownerPayment)
}

// DeleteOwnerPayment deletes an owner payment
func DeleteOwnerPayment(c *gin.Context) {
	ownerPaymentID := c.Param("id")

	// Check if owner payment exists
	var ownerPayment models.OwnerPayment
	if err := database.DB.First(&ownerPayment, ownerPaymentID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Owner payment not found"})
		return
	}

	// Soft delete
	if err := database.DB.Delete(&ownerPayment).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete owner payment"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Owner payment deleted successfully"})
}

// GetOwnerPaymentStats retrieves statistics about owner payments
func GetOwnerPaymentStats(c *gin.Context) {
	companyIDStr := c.Query("company_id")
	if companyIDStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "company_id is required"})
		return
	}

	companyID, err := strconv.ParseUint(companyIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid company_id"})
		return
	}

	// Parse date range
	startDateStr := c.Query("start_date")
	endDateStr := c.Query("end_date")

	var startDate, endDate time.Time
	if startDateStr != "" {
		startDate, err = time.Parse("2006-01-02", startDateStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid start_date format. Use YYYY-MM-DD"})
			return
		}
	} else {
		// Default to start of current year
		now := time.Now()
		startDate = time.Date(now.Year(), 1, 1, 0, 0, 0, 0, now.Location())
	}

	if endDateStr != "" {
		endDate, err = time.Parse("2006-01-02", endDateStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid end_date format. Use YYYY-MM-DD"})
			return
		}
	} else {
		// Default to end of current year
		now := time.Now()
		endDate = time.Date(now.Year(), 12, 31, 23, 59, 59, 0, now.Location())
	}

	// Get owner payments in date range
	var ownerPayments []models.OwnerPayment
	if err := database.DB.Where("company_id = ? AND payment_date >= ? AND payment_date <= ?",
		companyID, startDate, endDate).Find(&ownerPayments).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve owner payment statistics"})
		return
	}

	// Calculate statistics
	totalPaid := 0.0
	reimbursementTotal := 0.0
	loanRepaymentTotal := 0.0
	otherTotal := 0.0

	for _, payment := range ownerPayments {
		totalPaid += payment.Amount
		switch payment.PaymentType {
		case "reimbursement":
			reimbursementTotal += payment.Amount
		case "loan_repayment":
			loanRepaymentTotal += payment.Amount
		case "other":
			otherTotal += payment.Amount
		}
	}

	stats := gin.H{
		"total_paid":           totalPaid,
		"reimbursement_total":  reimbursementTotal,
		"loan_repayment_total": loanRepaymentTotal,
		"other_total":          otherTotal,
		"payment_count":        len(ownerPayments),
		"start_date":           startDate.Format("2006-01-02"),
		"end_date":             endDate.Format("2006-01-02"),
	}

	c.JSON(http.StatusOK, stats)
}
