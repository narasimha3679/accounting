package handlers

import (
	"net/http"
	"strconv"
	"time"

	"accounting-backend/database"
	"accounting-backend/models"

	"github.com/gin-gonic/gin"
)

// CCA class rates (as of 2024 - these should be updated based on current CRA rates)
var ccaRates = map[string]float64{
	"1":  0.04, // Buildings acquired after 1987
	"3":  0.05, // Buildings acquired before 1988
	"8":  0.20, // Limited-life patents and franchises
	"10": 0.30, // Automobiles, general-purpose electronic data processing equipment
	"12": 1.00, // Computer software
	"13": 0.00, // Leasehold improvements
	"14": 0.05, // Patents, franchises, concessions, or licenses for a limited period
	"16": 0.40, // Taxis, rental cars, buses
	"17": 0.08, // Roads, parking lots, sidewalks, airplane runways, storage areas
	"29": 0.00, // Class 29 assets (manufacturing and processing equipment)
	"38": 0.30, // Photocopiers, fax machines, telephone equipment
	"43": 0.30, // Manufacturing and processing machinery and equipment
	"50": 0.55, // General-purpose electronic data processing equipment and systems software
	"52": 1.00, // Computer software (acquired after March 22, 2004)
	"53": 0.50, // Manufacturing and processing machinery and equipment
	"54": 0.30, // Manufacturing and processing machinery and equipment
	"55": 0.00, // Class 55 assets
}

// CreateCapitalAsset creates a new capital asset
func CreateCapitalAsset(c *gin.Context) {
	var req models.CreateCapitalAssetRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Verify category exists
	var category models.ExpenseCategory
	if err := database.DB.First(&category, req.CategoryID).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Expense category not found"})
		return
	}

	// Verify company exists
	var company models.Company
	if err := database.DB.First(&company, req.CompanyID).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Company not found"})
		return
	}

	// Parse purchase date
	purchaseDate, err := time.Parse("2006-01-02", req.PurchaseDate)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid purchase date format. Use YYYY-MM-DD"})
		return
	}

	// Get CCA rate
	ccaRate, exists := ccaRates[req.CCAClass]
	if !exists {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid CCA class"})
		return
	}

	// Calculate total cost and depreciable amount
	totalCost := req.PurchaseAmount + req.HSTPaid
	depreciableAmount := totalCost

	// Create capital asset
	asset := models.CapitalAsset{
		Description:             req.Description,
		CategoryID:              req.CategoryID,
		PurchaseDate:            purchaseDate,
		PurchaseAmount:          req.PurchaseAmount,
		HSTPaid:                 req.HSTPaid,
		TotalCost:               totalCost,
		CCAClass:                req.CCAClass,
		CCARate:                 ccaRate,
		DepreciableAmount:       depreciableAmount,
		AccumulatedDepreciation: 0,
		BookValue:               totalCost,
		PaidBy:                  req.PaidBy,
		ReceiptAttached:         req.ReceiptAttached,
		CompanyID:               req.CompanyID,
	}

	if err := database.DB.Create(&asset).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create capital asset"})
		return
	}

	// Load asset with related data
	if err := database.DB.Preload("Category").Preload("Company").First(&asset, asset.ID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load capital asset data"})
		return
	}

	c.JSON(http.StatusCreated, asset)
}

// GetCapitalAsset retrieves a capital asset by ID
func GetCapitalAsset(c *gin.Context) {
	assetID := c.Param("id")

	var asset models.CapitalAsset
	if err := database.DB.Preload("Category").Preload("Company").Preload("DepreciationEntries").First(&asset, assetID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Capital asset not found"})
		return
	}

	c.JSON(http.StatusOK, asset)
}

// UpdateCapitalAsset updates a capital asset
func UpdateCapitalAsset(c *gin.Context) {
	assetID := c.Param("id")

	var req models.UpdateCapitalAssetRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Find asset
	var asset models.CapitalAsset
	if err := database.DB.First(&asset, assetID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Capital asset not found"})
		return
	}

	// Update fields if provided
	updates := make(map[string]interface{})
	if req.Description != nil {
		updates["description"] = *req.Description
	}
	if req.CategoryID != nil {
		// Verify category exists
		var category models.ExpenseCategory
		if err := database.DB.First(&category, *req.CategoryID).Error; err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Expense category not found"})
			return
		}
		updates["category_id"] = *req.CategoryID
	}
	if req.PurchaseDate != nil {
		purchaseDate, err := time.Parse("2006-01-02", *req.PurchaseDate)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid purchase date format. Use YYYY-MM-DD"})
			return
		}
		updates["purchase_date"] = purchaseDate
	}
	if req.PurchaseAmount != nil {
		updates["purchase_amount"] = *req.PurchaseAmount
		// Recalculate total cost and book value
		newTotalCost := *req.PurchaseAmount + asset.HSTPaid
		updates["total_cost"] = newTotalCost
		updates["book_value"] = newTotalCost - asset.AccumulatedDepreciation
	}
	if req.HSTPaid != nil {
		updates["hst_paid"] = *req.HSTPaid
		// Recalculate total cost and book value
		newTotalCost := asset.PurchaseAmount + *req.HSTPaid
		updates["total_cost"] = newTotalCost
		updates["book_value"] = newTotalCost - asset.AccumulatedDepreciation
	}
	if req.CCAClass != nil {
		// Verify CCA class exists
		ccaRate, exists := ccaRates[*req.CCAClass]
		if !exists {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid CCA class"})
			return
		}
		updates["cca_class"] = *req.CCAClass
		updates["cca_rate"] = ccaRate
	}
	if req.DisposalDate != nil {
		disposalDate, err := time.Parse("2006-01-02", *req.DisposalDate)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid disposal date format. Use YYYY-MM-DD"})
			return
		}
		updates["disposal_date"] = disposalDate
	}
	if req.DisposalAmount != nil {
		updates["disposal_amount"] = *req.DisposalAmount
	}
	if req.PaidBy != nil {
		updates["paid_by"] = *req.PaidBy
	}
	if req.ReceiptAttached != nil {
		updates["receipt_attached"] = *req.ReceiptAttached
	}

	if err := database.DB.Model(&asset).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update capital asset"})
		return
	}

	// Load updated asset with related data
	if err := database.DB.Preload("Category").Preload("Company").Preload("DepreciationEntries").First(&asset, asset.ID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load updated capital asset data"})
		return
	}

	c.JSON(http.StatusOK, asset)
}

// DeleteCapitalAsset deletes a capital asset
func DeleteCapitalAsset(c *gin.Context) {
	assetID := c.Param("id")

	// Find asset
	var asset models.CapitalAsset
	if err := database.DB.First(&asset, assetID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Capital asset not found"})
		return
	}

	// Check if asset has depreciation entries
	var depCount int64
	if err := database.DB.Model(&models.DepreciationEntry{}).Where("capital_asset_id = ?", assetID).Count(&depCount).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check depreciation entries"})
		return
	}

	if depCount > 0 {
		c.JSON(http.StatusConflict, gin.H{"error": "Cannot delete capital asset with depreciation entries"})
		return
	}

	// Soft delete asset
	if err := database.DB.Delete(&asset).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete capital asset"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Capital asset deleted successfully"})
}

// ListCapitalAssets lists all capital assets
func ListCapitalAssets(c *gin.Context) {
	var assets []models.CapitalAsset

	// Get pagination parameters
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	offset := (page - 1) * limit

	// Get filter parameters
	search := c.Query("search")
	companyID := c.Query("company_id")
	categoryID := c.Query("category_id")
	ccaClass := c.Query("cca_class")

	query := database.DB.Preload("Category").Preload("Company").Model(&models.CapitalAsset{})

	// Apply filters
	if search != "" {
		query = query.Where("description ILIKE ?", "%"+search+"%")
	}
	if companyID != "" {
		query = query.Where("company_id = ?", companyID)
	}
	if categoryID != "" {
		query = query.Where("category_id = ?", categoryID)
	}
	if ccaClass != "" {
		query = query.Where("cca_class = ?", ccaClass)
	}

	// Get total count
	var total int64
	if err := query.Count(&total).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to count capital assets"})
		return
	}

	// Get paginated results
	if err := query.Offset(offset).Limit(limit).Order("purchase_date DESC").Find(&assets).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch capital assets"})
		return
	}

	response := gin.H{
		"data":       assets,
		"total":      total,
		"page":       page,
		"limit":      limit,
		"totalPages": (total + int64(limit) - 1) / int64(limit),
	}

	c.JSON(http.StatusOK, response)
}

// GetCCAClasses returns available CCA classes and their rates
func GetCCAClasses(c *gin.Context) {
	var classes []models.CCAClass

	// Convert map to slice
	for classNumber, rate := range ccaRates {
		description := getCCAClassDescription(classNumber)
		classes = append(classes, models.CCAClass{
			ClassNumber: classNumber,
			Description: description,
			Rate:        rate,
		})
	}

	c.JSON(http.StatusOK, classes)
}

// CalculateDepreciation calculates depreciation for a capital asset for a given fiscal year
func CalculateDepreciation(c *gin.Context) {
	assetID := c.Param("id")
	fiscalYearStr := c.Query("fiscal_year")

	if fiscalYearStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Fiscal year is required"})
		return
	}

	fiscalYear, err := strconv.Atoi(fiscalYearStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid fiscal year"})
		return
	}

	// Find asset
	var asset models.CapitalAsset
	if err := database.DB.First(&asset, assetID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Capital asset not found"})
		return
	}

	// Calculate depreciation
	depreciation := calculateAssetDepreciation(asset, fiscalYear)

	c.JSON(http.StatusOK, gin.H{
		"capital_asset_id":     asset.ID,
		"fiscal_year":          fiscalYear,
		"depreciation_amount":  depreciation.Amount,
		"is_half_year_rule":    depreciation.IsHalfYearRule,
		"remaining_book_value": depreciation.RemainingBookValue,
	})
}

// CreateDepreciationEntry creates a depreciation entry for a capital asset
func CreateDepreciationEntry(c *gin.Context) {
	assetID := c.Param("id")

	var req struct {
		FiscalYear int    `json:"fiscal_year" binding:"required"`
		EntryDate  string `json:"entry_date" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Find asset
	var asset models.CapitalAsset
	if err := database.DB.First(&asset, assetID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Capital asset not found"})
		return
	}

	// Check if depreciation entry already exists for this fiscal year
	var existingEntry models.DepreciationEntry
	if err := database.DB.Where("capital_asset_id = ? AND fiscal_year = ?", assetID, req.FiscalYear).First(&existingEntry).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Depreciation entry already exists for this fiscal year"})
		return
	}

	// Parse entry date
	entryDate, err := time.Parse("2006-01-02", req.EntryDate)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid entry date format. Use YYYY-MM-DD"})
		return
	}

	// Calculate depreciation
	depreciation := calculateAssetDepreciation(asset, req.FiscalYear)

	// Create depreciation entry
	entry := models.DepreciationEntry{
		CapitalAssetID:     asset.ID,
		FiscalYear:         req.FiscalYear,
		DepreciationAmount: depreciation.Amount,
		IsHalfYearRule:     depreciation.IsHalfYearRule,
		EntryDate:          entryDate,
		CompanyID:          asset.CompanyID,
	}

	if err := database.DB.Create(&entry).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create depreciation entry"})
		return
	}

	// Update asset's accumulated depreciation and book value
	newAccumulatedDepreciation := asset.AccumulatedDepreciation + depreciation.Amount
	newBookValue := asset.TotalCost - newAccumulatedDepreciation

	if err := database.DB.Model(&asset).Updates(map[string]interface{}{
		"accumulated_depreciation": newAccumulatedDepreciation,
		"book_value":               newBookValue,
	}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update asset depreciation"})
		return
	}

	// Load entry with related data
	if err := database.DB.Preload("CapitalAsset").Preload("Company").First(&entry, entry.ID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load depreciation entry data"})
		return
	}

	c.JSON(http.StatusCreated, entry)
}

// DepreciationCalculation represents the result of a depreciation calculation
type DepreciationCalculation struct {
	Amount             float64
	IsHalfYearRule     bool
	RemainingBookValue float64
}

// calculateAssetDepreciation calculates depreciation for a capital asset
func calculateAssetDepreciation(asset models.CapitalAsset, fiscalYear int) DepreciationCalculation {
	// Check if asset was purchased in the current fiscal year
	purchaseYear := asset.PurchaseDate.Year()
	isHalfYearRule := purchaseYear == fiscalYear

	// Calculate depreciation amount
	var depreciationAmount float64

	if isHalfYearRule {
		// Half-year rule: only 50% of the normal rate in the first year
		depreciationAmount = asset.DepreciableAmount * asset.CCARate * 0.5
	} else {
		// Normal depreciation: rate * remaining book value
		depreciationAmount = asset.BookValue * asset.CCARate
	}

	// Ensure we don't depreciate more than the remaining book value
	if depreciationAmount > asset.BookValue {
		depreciationAmount = asset.BookValue
	}

	remainingBookValue := asset.BookValue - depreciationAmount

	return DepreciationCalculation{
		Amount:             depreciationAmount,
		IsHalfYearRule:     isHalfYearRule,
		RemainingBookValue: remainingBookValue,
	}
}

// getCCAClassDescription returns a description for a CCA class
func getCCAClassDescription(classNumber string) string {
	descriptions := map[string]string{
		"1":  "Buildings acquired after 1987",
		"3":  "Buildings acquired before 1988",
		"8":  "Limited-life patents and franchises",
		"10": "Automobiles, general-purpose electronic data processing equipment",
		"12": "Computer software",
		"13": "Leasehold improvements",
		"14": "Patents, franchises, concessions, or licenses for a limited period",
		"16": "Taxis, rental cars, buses",
		"17": "Roads, parking lots, sidewalks, airplane runways, storage areas",
		"29": "Class 29 assets (manufacturing and processing equipment)",
		"38": "Photocopiers, fax machines, telephone equipment",
		"43": "Manufacturing and processing machinery and equipment",
		"50": "General-purpose electronic data processing equipment and systems software",
		"52": "Computer software (acquired after March 22, 2004)",
		"53": "Manufacturing and processing machinery and equipment",
		"54": "Manufacturing and processing machinery and equipment",
		"55": "Class 55 assets",
	}

	if desc, exists := descriptions[classNumber]; exists {
		return desc
	}
	return "Unknown CCA class"
}
