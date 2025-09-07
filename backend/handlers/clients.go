package handlers

import (
	"net/http"
	"strconv"

	"accounting-backend/database"
	"accounting-backend/models"

	"github.com/gin-gonic/gin"
)

// CreateClientRequest represents a request to create a client
type CreateClientRequest struct {
	Name          string  `json:"name" binding:"required"`
	ContactPerson *string `json:"contact_person,omitempty"`
	Email         *string `json:"email,omitempty"`
	Phone         *string `json:"phone,omitempty"`
	Address       *string `json:"address,omitempty"`
	HSTExempt     bool    `json:"hst_exempt"`
	CompanyID     uint    `json:"company_id" binding:"required"`
}

// UpdateClientRequest represents a request to update a client
type UpdateClientRequest struct {
	Name          *string `json:"name,omitempty"`
	ContactPerson *string `json:"contact_person,omitempty"`
	Email         *string `json:"email,omitempty"`
	Phone         *string `json:"phone,omitempty"`
	Address       *string `json:"address,omitempty"`
	HSTExempt     *bool   `json:"hst_exempt,omitempty"`
	CompanyID     *uint   `json:"company_id,omitempty"`
}

// CreateClient creates a new client
func CreateClient(c *gin.Context) {
	var req CreateClientRequest
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

	// Create client
	client := models.Client{
		Name:          req.Name,
		ContactPerson: req.ContactPerson,
		Email:         req.Email,
		Phone:         req.Phone,
		Address:       req.Address,
		HSTExempt:     req.HSTExempt,
		CompanyID:     req.CompanyID,
	}

	if err := database.DB.Create(&client).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create client"})
		return
	}

	// Load client with company
	if err := database.DB.Preload("Company").First(&client, client.ID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load client data"})
		return
	}

	c.JSON(http.StatusCreated, client)
}

// GetClient retrieves a client by ID
func GetClient(c *gin.Context) {
	clientID := c.Param("id")

	var client models.Client
	if err := database.DB.Preload("Company").First(&client, clientID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Client not found"})
		return
	}

	c.JSON(http.StatusOK, client)
}

// UpdateClient updates a client
func UpdateClient(c *gin.Context) {
	clientID := c.Param("id")

	var req UpdateClientRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Find client
	var client models.Client
	if err := database.DB.First(&client, clientID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Client not found"})
		return
	}

	// Update fields if provided
	updates := make(map[string]interface{})
	if req.Name != nil {
		updates["name"] = *req.Name
	}
	if req.ContactPerson != nil {
		updates["contact_person"] = *req.ContactPerson
	}
	if req.Email != nil {
		updates["email"] = *req.Email
	}
	if req.Phone != nil {
		updates["phone"] = *req.Phone
	}
	if req.Address != nil {
		updates["address"] = *req.Address
	}
	if req.HSTExempt != nil {
		updates["hst_exempt"] = *req.HSTExempt
	}
	if req.CompanyID != nil {
		// Verify company exists
		var company models.Company
		if err := database.DB.First(&company, *req.CompanyID).Error; err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Company not found"})
			return
		}
		updates["company_id"] = *req.CompanyID
	}

	if err := database.DB.Model(&client).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update client"})
		return
	}

	// Load updated client with company
	if err := database.DB.Preload("Company").First(&client, client.ID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load updated client data"})
		return
	}

	c.JSON(http.StatusOK, client)
}

// DeleteClient deletes a client
func DeleteClient(c *gin.Context) {
	clientID := c.Param("id")

	// Find client
	var client models.Client
	if err := database.DB.First(&client, clientID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Client not found"})
		return
	}

	// Check if client has associated invoices
	var invoiceCount int64
	if err := database.DB.Model(&models.Invoice{}).Where("client_id = ?", clientID).Count(&invoiceCount).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check client dependencies"})
		return
	}

	if invoiceCount > 0 {
		c.JSON(http.StatusConflict, gin.H{"error": "Cannot delete client with associated invoices"})
		return
	}

	// Soft delete client
	if err := database.DB.Delete(&client).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete client"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Client deleted successfully"})
}

// ListClients lists all clients
func ListClients(c *gin.Context) {
	var clients []models.Client

	// Get pagination parameters
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	offset := (page - 1) * limit

	// Get search and company filter parameters
	search := c.Query("search")
	companyID := c.Query("company_id")

	query := database.DB.Preload("Company").Model(&models.Client{})

	// Apply search filter if provided
	if search != "" {
		query = query.Where("name ILIKE ? OR contact_person ILIKE ? OR email ILIKE ?",
			"%"+search+"%", "%"+search+"%", "%"+search+"%")
	}

	// Apply company filter if provided
	if companyID != "" {
		query = query.Where("company_id = ?", companyID)
	}

	// Get total count
	var total int64
	if err := query.Count(&total).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to count clients"})
		return
	}

	// Get paginated results
	if err := query.Offset(offset).Limit(limit).Find(&clients).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch clients"})
		return
	}

	response := gin.H{
		"data":       clients,
		"total":      total,
		"page":       page,
		"limit":      limit,
		"totalPages": (total + int64(limit) - 1) / int64(limit),
	}

	c.JSON(http.StatusOK, response)
}
