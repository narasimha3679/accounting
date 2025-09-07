package handlers

import (
	"net/http"
	"strconv"

	"accounting-backend/database"
	"accounting-backend/models"

	"github.com/gin-gonic/gin"
)

// CreateCompany creates a new company
func CreateCompany(c *gin.Context) {
	var req models.CreateCompanyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Check if company with business number already exists
	var existingCompany models.Company
	if err := database.DB.Where("business_number = ?", req.BusinessNumber).First(&existingCompany).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Company with this business number already exists"})
		return
	}

	// Create company
	company := models.Company{
		Name:              req.Name,
		BusinessNumber:    req.BusinessNumber,
		HSTNumber:         req.HSTNumber,
		HSTRegistered:     req.HSTRegistered,
		FiscalYearEnd:     req.FiscalYearEnd,
		SmallBusinessRate: req.SmallBusinessRate,
		HSTRate:           req.HSTRate,
	}

	if err := database.DB.Create(&company).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create company"})
		return
	}

	c.JSON(http.StatusCreated, company)
}

// GetCompany retrieves a company by ID
func GetCompany(c *gin.Context) {
	companyID := c.Param("id")

	var company models.Company
	if err := database.DB.First(&company, companyID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Company not found"})
		return
	}

	c.JSON(http.StatusOK, company)
}

// UpdateCompany updates a company
func UpdateCompany(c *gin.Context) {
	companyID := c.Param("id")

	var req models.UpdateCompanyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Find company
	var company models.Company
	if err := database.DB.First(&company, companyID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Company not found"})
		return
	}

	// Update fields if provided
	updates := make(map[string]interface{})
	if req.Name != nil {
		updates["name"] = *req.Name
	}
	if req.BusinessNumber != nil {
		// Check if business number is already taken by another company
		var existingCompany models.Company
		if err := database.DB.Where("business_number = ? AND id != ?", *req.BusinessNumber, companyID).First(&existingCompany).Error; err == nil {
			c.JSON(http.StatusConflict, gin.H{"error": "Business number already exists"})
			return
		}
		updates["business_number"] = *req.BusinessNumber
	}
	if req.HSTNumber != nil {
		updates["hst_number"] = *req.HSTNumber
	}
	if req.HSTRegistered != nil {
		updates["hst_registered"] = *req.HSTRegistered
	}
	if req.FiscalYearEnd != nil {
		updates["fiscal_year_end"] = *req.FiscalYearEnd
	}
	if req.SmallBusinessRate != nil {
		updates["small_business_rate"] = *req.SmallBusinessRate
	}
	if req.HSTRate != nil {
		updates["hst_rate"] = *req.HSTRate
	}

	if err := database.DB.Model(&company).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update company"})
		return
	}

	// Load updated company
	if err := database.DB.First(&company, company.ID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load updated company data"})
		return
	}

	c.JSON(http.StatusOK, company)
}

// DeleteCompany deletes a company
func DeleteCompany(c *gin.Context) {
	companyID := c.Param("id")

	// Find company
	var company models.Company
	if err := database.DB.First(&company, companyID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Company not found"})
		return
	}

	// Check if company has associated users
	var userCount int64
	if err := database.DB.Model(&models.User{}).Where("company_id = ?", companyID).Count(&userCount).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check company dependencies"})
		return
	}

	if userCount > 0 {
		c.JSON(http.StatusConflict, gin.H{"error": "Cannot delete company with associated users"})
		return
	}

	// Soft delete company
	if err := database.DB.Delete(&company).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete company"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Company deleted successfully"})
}

// ListCompanies lists all companies
func ListCompanies(c *gin.Context) {
	var companies []models.Company

	// Get pagination parameters
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	offset := (page - 1) * limit

	// Get search parameter
	search := c.Query("search")

	query := database.DB.Model(&models.Company{})

	// Apply search filter if provided
	if search != "" {
		query = query.Where("name ILIKE ? OR business_number ILIKE ?", "%"+search+"%", "%"+search+"%")
	}

	// Get total count
	var total int64
	if err := query.Count(&total).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to count companies"})
		return
	}

	// Get paginated results
	if err := query.Offset(offset).Limit(limit).Find(&companies).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch companies"})
		return
	}

	response := gin.H{
		"data":       companies,
		"total":      total,
		"page":       page,
		"limit":      limit,
		"totalPages": (total + int64(limit) - 1) / int64(limit),
	}

	c.JSON(http.StatusOK, response)
}
