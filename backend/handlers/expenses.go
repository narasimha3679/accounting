package handlers

import (
	"net/http"
	"strconv"
	"time"

	"accounting-backend/database"
	"accounting-backend/models"

	"github.com/gin-gonic/gin"
)

// CreateExpenseCategoryRequest represents a request to create an expense category
type CreateExpenseCategoryRequest struct {
	Name        string  `json:"name" binding:"required"`
	Description *string `json:"description,omitempty"`
}

// UpdateExpenseCategoryRequest represents a request to update an expense category
type UpdateExpenseCategoryRequest struct {
	Name        *string `json:"name,omitempty"`
	Description *string `json:"description,omitempty"`
}

// CreateExpenseRequest represents a request to create an expense
type CreateExpenseRequest struct {
	Description     string  `json:"description" binding:"required"`
	CategoryID      uint    `json:"category_id" binding:"required"`
	Amount          float64 `json:"amount" binding:"required,min=0"`
	HSTPaid         float64 `json:"hst_paid" binding:"min=0"`
	ExpenseDate     string  `json:"expense_date" binding:"required"`
	ReceiptAttached bool    `json:"receipt_attached"`
	PaidBy          string  `json:"paid_by" binding:"required,oneof=corp owner"`
	CompanyID       uint    `json:"company_id" binding:"required"`
}

// UpdateExpenseRequest represents a request to update an expense
type UpdateExpenseRequest struct {
	Description     *string  `json:"description,omitempty"`
	CategoryID      *uint    `json:"category_id,omitempty"`
	Amount          *float64 `json:"amount,omitempty" binding:"omitempty,min=0"`
	HSTPaid         *float64 `json:"hst_paid,omitempty" binding:"omitempty,min=0"`
	ExpenseDate     *string  `json:"expense_date,omitempty"`
	ReceiptAttached *bool    `json:"receipt_attached,omitempty"`
	PaidBy          *string  `json:"paid_by,omitempty" binding:"omitempty,oneof=corp owner"`
}

// CreateExpenseCategory creates a new expense category
func CreateExpenseCategory(c *gin.Context) {
	var req CreateExpenseCategoryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Create expense category
	category := models.ExpenseCategory{
		Name:        req.Name,
		Description: req.Description,
	}

	if err := database.DB.Create(&category).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create expense category"})
		return
	}

	c.JSON(http.StatusCreated, category)
}

// GetExpenseCategory retrieves an expense category by ID
func GetExpenseCategory(c *gin.Context) {
	categoryID := c.Param("id")

	var category models.ExpenseCategory
	if err := database.DB.First(&category, categoryID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Expense category not found"})
		return
	}

	c.JSON(http.StatusOK, category)
}

// UpdateExpenseCategory updates an expense category
func UpdateExpenseCategory(c *gin.Context) {
	categoryID := c.Param("id")

	var req UpdateExpenseCategoryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Find category
	var category models.ExpenseCategory
	if err := database.DB.First(&category, categoryID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Expense category not found"})
		return
	}

	// Update fields if provided
	updates := make(map[string]interface{})
	if req.Name != nil {
		updates["name"] = *req.Name
	}
	if req.Description != nil {
		updates["description"] = *req.Description
	}

	if err := database.DB.Model(&category).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update expense category"})
		return
	}

	// Load updated category
	if err := database.DB.First(&category, category.ID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load updated expense category data"})
		return
	}

	c.JSON(http.StatusOK, category)
}

// DeleteExpenseCategory deletes an expense category
func DeleteExpenseCategory(c *gin.Context) {
	categoryID := c.Param("id")

	// Find category
	var category models.ExpenseCategory
	if err := database.DB.First(&category, categoryID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Expense category not found"})
		return
	}

	// Check if category has associated expenses
	var expenseCount int64
	if err := database.DB.Model(&models.Expense{}).Where("category_id = ?", categoryID).Count(&expenseCount).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check category dependencies"})
		return
	}

	if expenseCount > 0 {
		c.JSON(http.StatusConflict, gin.H{"error": "Cannot delete category with associated expenses"})
		return
	}

	// Soft delete category
	if err := database.DB.Delete(&category).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete expense category"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Expense category deleted successfully"})
}

// ListExpenseCategories lists all expense categories
func ListExpenseCategories(c *gin.Context) {
	var categories []models.ExpenseCategory

	// Get pagination parameters
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	offset := (page - 1) * limit

	// Get search parameter
	search := c.Query("search")

	query := database.DB.Model(&models.ExpenseCategory{})

	// Apply search filter if provided
	if search != "" {
		query = query.Where("name ILIKE ? OR description ILIKE ?", "%"+search+"%", "%"+search+"%")
	}

	// Get total count
	var total int64
	if err := query.Count(&total).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to count expense categories"})
		return
	}

	// Get paginated results
	if err := query.Offset(offset).Limit(limit).Find(&categories).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch expense categories"})
		return
	}

	response := gin.H{
		"data":       categories,
		"total":      total,
		"page":       page,
		"limit":      limit,
		"totalPages": (total + int64(limit) - 1) / int64(limit),
	}

	c.JSON(http.StatusOK, response)
}

// CreateExpense creates a new expense
func CreateExpense(c *gin.Context) {
	var req CreateExpenseRequest
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

	// Parse expense date
	expenseDate, err := time.Parse("2006-01-02", req.ExpenseDate)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid expense date format. Use YYYY-MM-DD"})
		return
	}

	// Create expense
	expense := models.Expense{
		Description:     req.Description,
		CategoryID:      req.CategoryID,
		Amount:          req.Amount,
		HSTPaid:         req.HSTPaid,
		ExpenseDate:     expenseDate,
		ReceiptAttached: req.ReceiptAttached,
		PaidBy:          req.PaidBy,
		CompanyID:       req.CompanyID,
	}

	if err := database.DB.Create(&expense).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create expense"})
		return
	}

	// Load expense with related data
	if err := database.DB.Preload("Category").Preload("Company").First(&expense, expense.ID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load expense data"})
		return
	}

	c.JSON(http.StatusCreated, expense)
}

// GetExpense retrieves an expense by ID
func GetExpense(c *gin.Context) {
	expenseID := c.Param("id")

	var expense models.Expense
	if err := database.DB.Preload("Category").Preload("Company").First(&expense, expenseID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Expense not found"})
		return
	}

	c.JSON(http.StatusOK, expense)
}

// UpdateExpense updates an expense
func UpdateExpense(c *gin.Context) {
	expenseID := c.Param("id")

	var req UpdateExpenseRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Find expense
	var expense models.Expense
	if err := database.DB.First(&expense, expenseID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Expense not found"})
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
	if req.Amount != nil {
		updates["amount"] = *req.Amount
	}
	if req.HSTPaid != nil {
		updates["hst_paid"] = *req.HSTPaid
	}
	if req.ExpenseDate != nil {
		expenseDate, err := time.Parse("2006-01-02", *req.ExpenseDate)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid expense date format. Use YYYY-MM-DD"})
			return
		}
		updates["expense_date"] = expenseDate
	}
	if req.ReceiptAttached != nil {
		updates["receipt_attached"] = *req.ReceiptAttached
	}
	if req.PaidBy != nil {
		updates["paid_by"] = *req.PaidBy
	}

	if err := database.DB.Model(&expense).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update expense"})
		return
	}

	// Load updated expense with related data
	if err := database.DB.Preload("Category").Preload("Company").First(&expense, expense.ID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load updated expense data"})
		return
	}

	c.JSON(http.StatusOK, expense)
}

// DeleteExpense deletes an expense
func DeleteExpense(c *gin.Context) {
	expenseID := c.Param("id")

	// Find expense
	var expense models.Expense
	if err := database.DB.First(&expense, expenseID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Expense not found"})
		return
	}

	// Soft delete expense
	if err := database.DB.Delete(&expense).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete expense"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Expense deleted successfully"})
}

// ListExpenses lists all expenses
func ListExpenses(c *gin.Context) {
	var expenses []models.Expense

	// Get pagination parameters
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	offset := (page - 1) * limit

	// Get filter parameters
	search := c.Query("search")
	companyID := c.Query("company_id")
	categoryID := c.Query("category_id")
	startDate := c.Query("start_date")
	endDate := c.Query("end_date")

	query := database.DB.Preload("Category").Preload("Company").Model(&models.Expense{})

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
	if startDate != "" {
		query = query.Where("expense_date >= ?", startDate)
	}
	if endDate != "" {
		query = query.Where("expense_date <= ?", endDate)
	}

	// Get total count
	var total int64
	if err := query.Count(&total).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to count expenses"})
		return
	}

	// Get paginated results
	if err := query.Offset(offset).Limit(limit).Order("expense_date DESC").Find(&expenses).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch expenses"})
		return
	}

	response := gin.H{
		"data":       expenses,
		"total":      total,
		"page":       page,
		"limit":      limit,
		"totalPages": (total + int64(limit) - 1) / int64(limit),
	}

	c.JSON(http.StatusOK, response)
}
