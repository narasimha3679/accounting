package handlers

import (
	"net/http"
	"time"

	"accounting-backend/database"
	"accounting-backend/models"
	"accounting-backend/utils"

	"github.com/gin-gonic/gin"
)

// Login handles user authentication
func Login(c *gin.Context) {
	var req models.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Find user by email
	var user models.User
	if err := database.DB.Preload("Company").Where("email = ?", req.Email).First(&user).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	// Check password
	if !utils.CheckPasswordHash(req.Password, user.Password) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	// Generate JWT token
	token, err := utils.GenerateToken(user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	// Return token and user info (without password)
	user.Password = ""
	response := models.LoginResponse{
		Token: token,
		User:  user,
	}

	c.JSON(http.StatusOK, response)
}

// Register handles user registration
func Register(c *gin.Context) {
	var req models.RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Check if user already exists
	var existingUser models.User
	if err := database.DB.Where("email = ?", req.Email).First(&existingUser).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "User with this email already exists"})
		return
	}

	// Hash password
	hashedPassword, err := utils.HashPassword(req.Password)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
		return
	}

	// Create a default company for the user
	company := models.Company{
		Name:              req.Name + "'s Company",
		BusinessNumber:    "TEMP-" + req.Email, // Temporary, user will update this
		FiscalYearEnd:     time.Date(time.Now().Year(), 12, 31, 0, 0, 0, 0, time.UTC),
		SmallBusinessRate: 0.125, // 12.5% for Ontario small business tax
		HSTRate:           0.13,  // 13% HST for Ontario
	}

	if err := database.DB.Create(&company).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create company"})
		return
	}

	// Create user
	user := models.User{
		Email:     req.Email,
		Password:  hashedPassword,
		Name:      req.Name,
		Role:      "admin", // First user is admin of their company
		CompanyID: company.ID,
	}

	if err := database.DB.Create(&user).Error; err != nil {
		// Rollback company creation if user creation fails
		database.DB.Delete(&company)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user"})
		return
	}

	// Load user with company
	if err := database.DB.Preload("Company").First(&user, user.ID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load user data"})
		return
	}

	// Generate JWT token
	token, err := utils.GenerateToken(user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	// Return token and user info (without password)
	user.Password = ""
	response := models.LoginResponse{
		Token: token,
		User:  user,
	}

	c.JSON(http.StatusCreated, response)
}

// GetProfile returns the current user's profile
func GetProfile(c *gin.Context) {
	user, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	userModel := user.(models.User)
	userModel.Password = "" // Hide password from response

	c.JSON(http.StatusOK, userModel)
}

// CreateUser creates a new user (admin only)
func CreateUser(c *gin.Context) {
	var req models.CreateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Check if user already exists
	var existingUser models.User
	if err := database.DB.Where("email = ?", req.Email).First(&existingUser).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "User with this email already exists"})
		return
	}

	// Hash password
	hashedPassword, err := utils.HashPassword(req.Password)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
		return
	}

	// Create user
	user := models.User{
		Email:     req.Email,
		Password:  hashedPassword,
		Name:      req.Name,
		Role:      req.Role,
		CompanyID: req.CompanyID,
	}

	if err := database.DB.Create(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user"})
		return
	}

	// Load company information
	if err := database.DB.Preload("Company").First(&user, user.ID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load user data"})
		return
	}

	user.Password = "" // Hide password from response
	c.JSON(http.StatusCreated, user)
}

// UpdateUser updates a user (admin only)
func UpdateUser(c *gin.Context) {
	userID := c.Param("id")

	var req models.UpdateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Find user
	var user models.User
	if err := database.DB.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	// Update fields if provided
	updates := make(map[string]interface{})
	if req.Email != nil {
		updates["email"] = *req.Email
	}
	if req.Name != nil {
		updates["name"] = *req.Name
	}
	if req.Role != nil {
		updates["role"] = *req.Role
	}
	if req.CompanyID != nil {
		updates["company_id"] = *req.CompanyID
	}

	if err := database.DB.Model(&user).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update user"})
		return
	}

	// Load updated user with company
	if err := database.DB.Preload("Company").First(&user, user.ID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load updated user data"})
		return
	}

	user.Password = "" // Hide password from response
	c.JSON(http.StatusOK, user)
}

// DeleteUser deletes a user (admin only)
func DeleteUser(c *gin.Context) {
	userID := c.Param("id")

	// Find user
	var user models.User
	if err := database.DB.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	// Soft delete user
	if err := database.DB.Delete(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete user"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "User deleted successfully"})
}

// GetUser retrieves a user by ID (admin only)
func GetUser(c *gin.Context) {
	userID := c.Param("id")

	var user models.User
	if err := database.DB.Preload("Company").First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	user.Password = "" // Hide password from response
	c.JSON(http.StatusOK, user)
}

// ListUsers lists all users (admin only)
func ListUsers(c *gin.Context) {
	var users []models.User

	// Get company_id from query parameter for filtering
	companyID := c.Query("company_id")

	query := database.DB.Preload("Company")
	if companyID != "" {
		query = query.Where("company_id = ?", companyID)
	}

	if err := query.Find(&users).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch users"})
		return
	}

	// Hide passwords from response
	for i := range users {
		users[i].Password = ""
	}

	c.JSON(http.StatusOK, users)
}
