package handlers

import (
	"fmt"
	"net/http"
	"strconv"
	"time"

	"accounting-backend/database"
	"accounting-backend/models"

	"github.com/gin-gonic/gin"
)

// CreateInvoiceRequest represents a request to create an invoice
type CreateInvoiceRequest struct {
	ClientID    uint                       `json:"client_id" binding:"required"`
	IssueDate   string                     `json:"issue_date" binding:"required"`
	DueDate     string                     `json:"due_date" binding:"required"`
	Description *string                    `json:"description,omitempty"`
	CompanyID   uint                       `json:"company_id" binding:"required"`
	Items       []CreateInvoiceItemRequest `json:"items" binding:"required,min=1"`
}

// CreateInvoiceItemRequest represents a request to create an invoice item
type CreateInvoiceItemRequest struct {
	Description string  `json:"description" binding:"required"`
	Quantity    float64 `json:"quantity" binding:"required,min=0"`
	UnitPrice   float64 `json:"unit_price" binding:"required,min=0"`
}

// UpdateInvoiceRequest represents a request to update an invoice
type UpdateInvoiceRequest struct {
	ClientID    *uint                      `json:"client_id,omitempty"`
	IssueDate   *string                    `json:"issue_date,omitempty"`
	DueDate     *string                    `json:"due_date,omitempty"`
	Status      *string                    `json:"status,omitempty" binding:"omitempty,oneof=draft sent paid overdue cancelled"`
	PaidDate    *string                    `json:"paid_date,omitempty"`
	Description *string                    `json:"description,omitempty"`
	Items       []CreateInvoiceItemRequest `json:"items,omitempty"`
}

// CreateInvoice creates a new invoice
func CreateInvoice(c *gin.Context) {
	var req CreateInvoiceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Parse issue date
	issueDate, err := time.Parse("2006-01-02", req.IssueDate)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid issue date format. Use YYYY-MM-DD"})
		return
	}

	// Parse due date
	dueDate, err := time.Parse("2006-01-02", req.DueDate)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid due date format. Use YYYY-MM-DD"})
		return
	}

	// Verify client exists
	var client models.Client
	if err := database.DB.First(&client, req.ClientID).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Client not found"})
		return
	}

	// Verify company exists
	var company models.Company
	if err := database.DB.First(&company, req.CompanyID).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Company not found"})
		return
	}

	// Generate invoice number
	invoiceNumber, err := generateInvoiceNumber(req.CompanyID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate invoice number"})
		return
	}

	// Calculate totals
	subtotal := 0.0
	for _, item := range req.Items {
		subtotal += item.Quantity * item.UnitPrice
	}

	// Calculate HST (check if client is HST exempt)
	hstAmount := 0.0
	if !client.HSTExempt {
		hstAmount = subtotal * company.HSTRate
	}

	total := subtotal + hstAmount

	// Create invoice
	invoice := models.Invoice{
		InvoiceNumber: invoiceNumber,
		ClientID:      req.ClientID,
		IssueDate:     issueDate,
		DueDate:       dueDate,
		Subtotal:      subtotal,
		HSTAmount:     hstAmount,
		Total:         total,
		Status:        "draft",
		Description:   req.Description,
		CompanyID:     req.CompanyID,
	}

	// Start transaction
	tx := database.DB.Begin()
	if tx.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to start transaction"})
		return
	}

	// Create invoice
	if err := tx.Create(&invoice).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create invoice"})
		return
	}

	// Create invoice items
	for _, itemReq := range req.Items {
		item := models.InvoiceItem{
			InvoiceID:   invoice.ID,
			Description: itemReq.Description,
			Quantity:    itemReq.Quantity,
			UnitPrice:   itemReq.UnitPrice,
			Total:       itemReq.Quantity * itemReq.UnitPrice,
		}
		if err := tx.Create(&item).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create invoice item"})
			return
		}
	}

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to commit transaction"})
		return
	}

	// Load invoice with related data
	if err := database.DB.Preload("Client").Preload("Company").Preload("Items").First(&invoice, invoice.ID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load invoice data"})
		return
	}

	c.JSON(http.StatusCreated, invoice)
}

// GetInvoice retrieves an invoice by ID
func GetInvoice(c *gin.Context) {
	invoiceID := c.Param("id")

	var invoice models.Invoice
	if err := database.DB.Preload("Client").Preload("Company").Preload("Items").First(&invoice, invoiceID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Invoice not found"})
		return
	}

	c.JSON(http.StatusOK, invoice)
}

// UpdateInvoice updates an invoice
func UpdateInvoice(c *gin.Context) {
	invoiceID := c.Param("id")

	var req UpdateInvoiceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Parse dates if provided
	var issueDate *time.Time
	var dueDate *time.Time
	var paidDate *time.Time

	if req.IssueDate != nil {
		parsed, err := time.Parse("2006-01-02", *req.IssueDate)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid issue date format. Use YYYY-MM-DD"})
			return
		}
		issueDate = &parsed
	}

	if req.DueDate != nil {
		parsed, err := time.Parse("2006-01-02", *req.DueDate)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid due date format. Use YYYY-MM-DD"})
			return
		}
		dueDate = &parsed
	}

	if req.PaidDate != nil {
		parsed, err := time.Parse("2006-01-02", *req.PaidDate)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid paid date format. Use YYYY-MM-DD"})
			return
		}
		paidDate = &parsed
	}

	// Find invoice
	var invoice models.Invoice
	if err := database.DB.Preload("Client").Preload("Company").First(&invoice, invoiceID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Invoice not found"})
		return
	}

	// Start transaction
	tx := database.DB.Begin()
	if tx.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to start transaction"})
		return
	}

	// Update invoice fields if provided
	updates := make(map[string]interface{})
	if req.ClientID != nil {
		// Verify client exists
		var client models.Client
		if err := tx.First(&client, *req.ClientID).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusBadRequest, gin.H{"error": "Client not found"})
			return
		}
		updates["client_id"] = *req.ClientID
	}
	if issueDate != nil {
		updates["issue_date"] = *issueDate
	}
	if dueDate != nil {
		updates["due_date"] = *dueDate
	}
	if req.Status != nil {
		updates["status"] = *req.Status
	}
	if paidDate != nil {
		updates["paid_date"] = *paidDate
	}
	if req.Description != nil {
		updates["description"] = *req.Description
	}

	// Update invoice if there are changes
	if len(updates) > 0 {
		if err := tx.Model(&invoice).Updates(updates).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update invoice"})
			return
		}
	}

	// Update items if provided
	if req.Items != nil && len(req.Items) > 0 {
		// Delete existing items
		if err := tx.Where("invoice_id = ?", invoice.ID).Delete(&models.InvoiceItem{}).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete existing invoice items"})
			return
		}

		// Create new items
		subtotal := 0.0
		for _, itemReq := range req.Items {
			item := models.InvoiceItem{
				InvoiceID:   invoice.ID,
				Description: itemReq.Description,
				Quantity:    itemReq.Quantity,
				UnitPrice:   itemReq.UnitPrice,
				Total:       itemReq.Quantity * itemReq.UnitPrice,
			}
			if err := tx.Create(&item).Error; err != nil {
				tx.Rollback()
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create invoice item"})
				return
			}
			subtotal += item.Total
		}

		// Recalculate totals
		var client models.Client
		if err := tx.First(&client, invoice.ClientID).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load client data"})
			return
		}

		var company models.Company
		if err := tx.First(&company, invoice.CompanyID).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load company data"})
			return
		}

		hstAmount := 0.0
		if !client.HSTExempt {
			hstAmount = subtotal * company.HSTRate
		}

		total := subtotal + hstAmount

		// Update invoice totals
		if err := tx.Model(&invoice).Updates(map[string]interface{}{
			"subtotal":   subtotal,
			"hst_amount": hstAmount,
			"total":      total,
		}).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update invoice totals"})
			return
		}
	}

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to commit transaction"})
		return
	}

	// Load updated invoice with related data
	if err := database.DB.Preload("Client").Preload("Company").Preload("Items").First(&invoice, invoice.ID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load updated invoice data"})
		return
	}

	c.JSON(http.StatusOK, invoice)
}

// DeleteInvoice deletes an invoice
func DeleteInvoice(c *gin.Context) {
	invoiceID := c.Param("id")

	// Find invoice
	var invoice models.Invoice
	if err := database.DB.First(&invoice, invoiceID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Invoice not found"})
		return
	}

	// Soft delete invoice (items will be cascade deleted)
	if err := database.DB.Delete(&invoice).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete invoice"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Invoice deleted successfully"})
}

// ListInvoices lists all invoices
func ListInvoices(c *gin.Context) {
	var invoices []models.Invoice

	// Get pagination parameters
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	offset := (page - 1) * limit

	// Get filter parameters
	search := c.Query("search")
	companyID := c.Query("company_id")
	clientID := c.Query("client_id")
	status := c.Query("status")

	query := database.DB.Preload("Client").Preload("Company").Model(&models.Invoice{})

	// Apply filters
	if search != "" {
		query = query.Where("invoice_number ILIKE ? OR description ILIKE ?", "%"+search+"%", "%"+search+"%")
	}
	if companyID != "" {
		query = query.Where("company_id = ?", companyID)
	}
	if clientID != "" {
		query = query.Where("client_id = ?", clientID)
	}
	if status != "" {
		query = query.Where("status = ?", status)
	}

	// Get total count
	var total int64
	if err := query.Count(&total).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to count invoices"})
		return
	}

	// Get paginated results
	if err := query.Offset(offset).Limit(limit).Order("created_at DESC").Find(&invoices).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch invoices"})
		return
	}

	response := gin.H{
		"data":       invoices,
		"total":      total,
		"page":       page,
		"limit":      limit,
		"totalPages": (total + int64(limit) - 1) / int64(limit),
	}

	c.JSON(http.StatusOK, response)
}

// generateInvoiceNumber generates a unique invoice number
func generateInvoiceNumber(companyID uint) (string, error) {
	// Get current year
	year := time.Now().Year()

	// Count invoices for this company in current year
	var count int64
	if err := database.DB.Model(&models.Invoice{}).
		Where("company_id = ? AND EXTRACT(YEAR FROM created_at) = ?", companyID, year).
		Count(&count).Error; err != nil {
		return "", err
	}

	// Generate invoice number: YYYY-XXXX
	invoiceNumber := fmt.Sprintf("%d-%04d", year, count+1)

	return invoiceNumber, nil
}
