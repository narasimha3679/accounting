package handlers

import (
	"net/http"
	"strconv"

	"accounting-backend/database"
	"accounting-backend/models"

	"github.com/gin-gonic/gin"
)

// CreateTaxReturnRequest represents a request to create a tax return
type CreateTaxReturnRequest struct {
	FiscalYear         int     `json:"fiscal_year" binding:"required,min=2000,max=2100"`
	GrossIncome        float64 `json:"gross_income" binding:"required,min=0"`
	TotalExpenses      float64 `json:"total_expenses" binding:"required,min=0"`
	NetIncomeBeforeTax float64 `json:"net_income_before_tax" binding:"required"`
	SmallBusinessTax   float64 `json:"small_business_tax" binding:"required,min=0"`
	NetIncomeAfterTax  float64 `json:"net_income_after_tax" binding:"required"`
	HSTCollected       float64 `json:"hst_collected" binding:"required,min=0"`
	HSTPaid            float64 `json:"hst_paid" binding:"required,min=0"`
	HSTRemittance      float64 `json:"hst_remittance" binding:"required"`
	RetainedEarnings   float64 `json:"retained_earnings" binding:"required"`
	CompanyID          uint    `json:"company_id" binding:"required"`
}

// UpdateTaxReturnRequest represents a request to update a tax return
type UpdateTaxReturnRequest struct {
	FiscalYear         *int     `json:"fiscal_year,omitempty" binding:"omitempty,min=2000,max=2100"`
	GrossIncome        *float64 `json:"gross_income,omitempty" binding:"omitempty,min=0"`
	TotalExpenses      *float64 `json:"total_expenses,omitempty" binding:"omitempty,min=0"`
	NetIncomeBeforeTax *float64 `json:"net_income_before_tax,omitempty"`
	SmallBusinessTax   *float64 `json:"small_business_tax,omitempty" binding:"omitempty,min=0"`
	NetIncomeAfterTax  *float64 `json:"net_income_after_tax,omitempty"`
	HSTCollected       *float64 `json:"hst_collected,omitempty" binding:"omitempty,min=0"`
	HSTPaid            *float64 `json:"hst_paid,omitempty" binding:"omitempty,min=0"`
	HSTRemittance      *float64 `json:"hst_remittance,omitempty"`
	RetainedEarnings   *float64 `json:"retained_earnings,omitempty"`
}

// CreateTaxReturn creates a new tax return
func CreateTaxReturn(c *gin.Context) {
	var req CreateTaxReturnRequest
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

	// Check if tax return for this fiscal year already exists
	var existingTaxReturn models.TaxReturn
	if err := database.DB.Where("company_id = ? AND fiscal_year = ?", req.CompanyID, req.FiscalYear).First(&existingTaxReturn).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Tax return for this fiscal year already exists"})
		return
	}

	// Create tax return
	taxReturn := models.TaxReturn{
		FiscalYear:         req.FiscalYear,
		GrossIncome:        req.GrossIncome,
		TotalExpenses:      req.TotalExpenses,
		NetIncomeBeforeTax: req.NetIncomeBeforeTax,
		SmallBusinessTax:   req.SmallBusinessTax,
		NetIncomeAfterTax:  req.NetIncomeAfterTax,
		HSTCollected:       req.HSTCollected,
		HSTPaid:            req.HSTPaid,
		HSTRemittance:      req.HSTRemittance,
		RetainedEarnings:   req.RetainedEarnings,
		CompanyID:          req.CompanyID,
	}

	if err := database.DB.Create(&taxReturn).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create tax return"})
		return
	}

	// Load tax return with company
	if err := database.DB.Preload("Company").First(&taxReturn, taxReturn.ID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load tax return data"})
		return
	}

	c.JSON(http.StatusCreated, taxReturn)
}

// GetTaxReturn retrieves a tax return by ID
func GetTaxReturn(c *gin.Context) {
	taxReturnID := c.Param("id")

	var taxReturn models.TaxReturn
	if err := database.DB.Preload("Company").First(&taxReturn, taxReturnID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Tax return not found"})
		return
	}

	c.JSON(http.StatusOK, taxReturn)
}

// UpdateTaxReturn updates a tax return
func UpdateTaxReturn(c *gin.Context) {
	taxReturnID := c.Param("id")

	var req UpdateTaxReturnRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Find tax return
	var taxReturn models.TaxReturn
	if err := database.DB.First(&taxReturn, taxReturnID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Tax return not found"})
		return
	}

	// Update fields if provided
	updates := make(map[string]interface{})
	if req.FiscalYear != nil {
		// Check if fiscal year is already taken by another tax return for the same company
		var existingTaxReturn models.TaxReturn
		if err := database.DB.Where("company_id = ? AND fiscal_year = ? AND id != ?", taxReturn.CompanyID, *req.FiscalYear, taxReturnID).First(&existingTaxReturn).Error; err == nil {
			c.JSON(http.StatusConflict, gin.H{"error": "Tax return for this fiscal year already exists"})
			return
		}
		updates["fiscal_year"] = *req.FiscalYear
	}
	if req.GrossIncome != nil {
		updates["gross_income"] = *req.GrossIncome
	}
	if req.TotalExpenses != nil {
		updates["total_expenses"] = *req.TotalExpenses
	}
	if req.NetIncomeBeforeTax != nil {
		updates["net_income_before_tax"] = *req.NetIncomeBeforeTax
	}
	if req.SmallBusinessTax != nil {
		updates["small_business_tax"] = *req.SmallBusinessTax
	}
	if req.NetIncomeAfterTax != nil {
		updates["net_income_after_tax"] = *req.NetIncomeAfterTax
	}
	if req.HSTCollected != nil {
		updates["hst_collected"] = *req.HSTCollected
	}
	if req.HSTPaid != nil {
		updates["hst_paid"] = *req.HSTPaid
	}
	if req.HSTRemittance != nil {
		updates["hst_remittance"] = *req.HSTRemittance
	}
	if req.RetainedEarnings != nil {
		updates["retained_earnings"] = *req.RetainedEarnings
	}

	if err := database.DB.Model(&taxReturn).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update tax return"})
		return
	}

	// Load updated tax return with company
	if err := database.DB.Preload("Company").First(&taxReturn, taxReturn.ID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load updated tax return data"})
		return
	}

	c.JSON(http.StatusOK, taxReturn)
}

// DeleteTaxReturn deletes a tax return
func DeleteTaxReturn(c *gin.Context) {
	taxReturnID := c.Param("id")

	// Find tax return
	var taxReturn models.TaxReturn
	if err := database.DB.First(&taxReturn, taxReturnID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Tax return not found"})
		return
	}

	// Soft delete tax return
	if err := database.DB.Delete(&taxReturn).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete tax return"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Tax return deleted successfully"})
}

// ListTaxReturns lists all tax returns
func ListTaxReturns(c *gin.Context) {
	var taxReturns []models.TaxReturn

	// Get pagination parameters
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	offset := (page - 1) * limit

	// Get filter parameters
	companyID := c.Query("company_id")
	fiscalYear := c.Query("fiscal_year")

	query := database.DB.Preload("Company").Model(&models.TaxReturn{})

	// Apply filters
	if companyID != "" {
		query = query.Where("company_id = ?", companyID)
	}
	if fiscalYear != "" {
		query = query.Where("fiscal_year = ?", fiscalYear)
	}

	// Get total count
	var total int64
	if err := query.Count(&total).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to count tax returns"})
		return
	}

	// Get paginated results
	if err := query.Offset(offset).Limit(limit).Order("fiscal_year DESC").Find(&taxReturns).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch tax returns"})
		return
	}

	response := gin.H{
		"data":       taxReturns,
		"total":      total,
		"page":       page,
		"limit":      limit,
		"totalPages": (total + int64(limit) - 1) / int64(limit),
	}

	c.JSON(http.StatusOK, response)
}
