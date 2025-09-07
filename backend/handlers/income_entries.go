package handlers

import (
	"net/http"
	"strconv"
	"time"

	"accounting-backend/database"
	"accounting-backend/models"

	"github.com/gin-gonic/gin"
)

// ListIncomeEntries lists all income entries
func ListIncomeEntries(c *gin.Context) {
	var incomeEntries []models.IncomeEntry

	// Get query parameters
	companyID := c.Query("company_id")
	incomeType := c.Query("income_type")
	startDate := c.Query("start_date")
	endDate := c.Query("end_date")
	page := c.DefaultQuery("page", "1")
	limit := c.DefaultQuery("limit", "10")

	// Parse pagination
	pageInt, _ := strconv.Atoi(page)
	limitInt, _ := strconv.Atoi(limit)
	offset := (pageInt - 1) * limitInt

	// Build query
	query := database.DB.Preload("Client").Preload("Company")

	if companyID != "" {
		query = query.Where("company_id = ?", companyID)
	}
	if incomeType != "" {
		query = query.Where("income_type = ?", incomeType)
	}
	if startDate != "" {
		query = query.Where("income_date >= ?", startDate)
	}
	if endDate != "" {
		query = query.Where("income_date <= ?", endDate)
	}

	// Get total count
	var total int64
	query.Model(&models.IncomeEntry{}).Count(&total)

	// Get paginated results
	if err := query.Offset(offset).Limit(limitInt).Order("income_date DESC").Find(&incomeEntries).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch income entries"})
		return
	}

	response := models.PaginatedResponse[models.IncomeEntry]{
		Data:       incomeEntries,
		Total:      int(total),
		Page:       pageInt,
		Limit:      limitInt,
		TotalPages: int((total + int64(limitInt) - 1) / int64(limitInt)),
	}

	c.JSON(http.StatusOK, response)
}

// CreateIncomeEntry creates a new income entry
func CreateIncomeEntry(c *gin.Context) {
	var req models.CreateIncomeEntryRequest
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

	// If client income, verify client exists and check HST exemption
	var client *models.Client
	if req.IncomeType == "client" && req.ClientID != nil {
		var clientRecord models.Client
		if err := database.DB.First(&clientRecord, *req.ClientID).Error; err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Client not found"})
			return
		}
		client = &clientRecord
	}

	// Parse income date
	incomeDate, err := time.Parse("2006-01-02", req.IncomeDate)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid income date format. Use YYYY-MM-DD"})
		return
	}

	// Calculate HST and total
	// Only apply HST if it's not client income or if the client is not HST exempt
	var hstAmount float64
	if req.IncomeType != "client" || client == nil || !client.HSTExempt {
		hstAmount = req.Amount * company.HSTRate
	}
	total := req.Amount + hstAmount

	// Create income entry
	incomeEntry := models.IncomeEntry{
		Description: req.Description,
		Amount:      req.Amount,
		HSTAmount:   hstAmount,
		Total:       total,
		IncomeType:  req.IncomeType,
		ClientID:    req.ClientID,
		IncomeDate:  incomeDate,
		CompanyID:   req.CompanyID,
	}

	if err := database.DB.Create(&incomeEntry).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create income entry"})
		return
	}

	// Load income entry with relations
	if err := database.DB.Preload("Client").Preload("Company").First(&incomeEntry, incomeEntry.ID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load income entry data"})
		return
	}

	c.JSON(http.StatusCreated, incomeEntry)
}

// GetIncomeEntry retrieves an income entry by ID
func GetIncomeEntry(c *gin.Context) {
	incomeEntryID := c.Param("id")

	var incomeEntry models.IncomeEntry
	if err := database.DB.Preload("Client").Preload("Company").First(&incomeEntry, incomeEntryID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Income entry not found"})
		return
	}

	c.JSON(http.StatusOK, incomeEntry)
}

// UpdateIncomeEntry updates an income entry
func UpdateIncomeEntry(c *gin.Context) {
	incomeEntryID := c.Param("id")

	var req models.UpdateIncomeEntryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Find income entry with client relationship
	var incomeEntry models.IncomeEntry
	if err := database.DB.Preload("Client").Preload("Company").First(&incomeEntry, incomeEntryID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Income entry not found"})
		return
	}

	// Update fields if provided
	updates := make(map[string]interface{})
	if req.Description != nil {
		updates["description"] = *req.Description
	}
	if req.Amount != nil {
		updates["amount"] = *req.Amount
		// Recalculate HST and total based on client HST exemption
		var hstAmount float64
		if incomeEntry.IncomeType != "client" || incomeEntry.Client == nil || !incomeEntry.Client.HSTExempt {
			hstAmount = *req.Amount * incomeEntry.Company.HSTRate
		}
		updates["hst_amount"] = hstAmount
		updates["total"] = *req.Amount + hstAmount
	}
	if req.IncomeType != nil {
		updates["income_type"] = *req.IncomeType
	}
	if req.ClientID != nil {
		updates["client_id"] = *req.ClientID
		// Recalculate HST when client changes
		var hstAmount float64
		if incomeEntry.IncomeType == "client" && *req.ClientID != 0 {
			// Get the new client to check HST exemption
			var newClient models.Client
			if err := database.DB.First(&newClient, *req.ClientID).Error; err == nil {
				if !newClient.HSTExempt {
					hstAmount = incomeEntry.Amount * incomeEntry.Company.HSTRate
				}
			}
		} else if incomeEntry.IncomeType != "client" {
			hstAmount = incomeEntry.Amount * incomeEntry.Company.HSTRate
		}
		updates["hst_amount"] = hstAmount
		updates["total"] = incomeEntry.Amount + hstAmount
	}
	if req.IncomeDate != nil {
		// Parse income date
		incomeDate, err := time.Parse("2006-01-02", *req.IncomeDate)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid income date format. Use YYYY-MM-DD"})
			return
		}
		updates["income_date"] = incomeDate
	}

	if err := database.DB.Model(&incomeEntry).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update income entry"})
		return
	}

	// If any field was updated, ensure HST is recalculated based on current client status
	if len(updates) > 0 {
		// Reload the income entry with fresh client data
		if err := database.DB.Preload("Client").Preload("Company").First(&incomeEntry, incomeEntry.ID).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to reload income entry data"})
			return
		}

		// Recalculate HST based on current client exemption status
		var hstAmount float64
		if incomeEntry.IncomeType == "client" && incomeEntry.Client != nil {
			if !incomeEntry.Client.HSTExempt {
				hstAmount = incomeEntry.Amount * incomeEntry.Company.HSTRate
			}
		} else if incomeEntry.IncomeType != "client" {
			hstAmount = incomeEntry.Amount * incomeEntry.Company.HSTRate
		}

		// Update HST and total if they changed
		if hstAmount != incomeEntry.HSTAmount {
			database.DB.Model(&incomeEntry).Updates(map[string]interface{}{
				"hst_amount": hstAmount,
				"total":      incomeEntry.Amount + hstAmount,
			})
		}
	}

	// Load updated income entry with relations
	if err := database.DB.Preload("Client").Preload("Company").First(&incomeEntry, incomeEntry.ID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load updated income entry data"})
		return
	}

	c.JSON(http.StatusOK, incomeEntry)
}

// DeleteIncomeEntry deletes an income entry
func DeleteIncomeEntry(c *gin.Context) {
	incomeEntryID := c.Param("id")

	// Find income entry
	var incomeEntry models.IncomeEntry
	if err := database.DB.First(&incomeEntry, incomeEntryID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Income entry not found"})
		return
	}

	// Soft delete income entry
	if err := database.DB.Delete(&incomeEntry).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete income entry"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Income entry deleted successfully"})
}
