package handlers

import (
	"fmt"
	"net/http"
	"path/filepath"
	"strconv"
	"time"

	"accounting-backend/database"
	"accounting-backend/models"
	"accounting-backend/utils"

	"github.com/gin-gonic/gin"
)

// FileStorageService instance
var fileStorage *utils.FileStorageService

// InitializeFileStorage initializes the file storage service
func InitializeFileStorage(basePath string) {
	fileStorage = utils.NewFileStorageService(basePath)
}

// UploadExpenseFile handles file upload for an expense
func UploadExpenseFile(c *gin.Context) {
	expenseIDStr := c.Param("id")
	expenseID, err := strconv.ParseUint(expenseIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid expense ID"})
		return
	}

	// Find the expense
	var expense models.Expense
	if err := database.DB.First(&expense, uint(expenseID)).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Expense not found"})
		return
	}

	// Get the uploaded file
	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No file uploaded"})
		return
	}

	// Validate file size (max 10MB)
	const maxFileSize = 10 * 1024 * 1024 // 10MB
	if file.Size > maxFileSize {
		c.JSON(http.StatusBadRequest, gin.H{"error": "File size exceeds 10MB limit"})
		return
	}

	// Validate file type
	allowedExtensions := []string{".pdf", ".jpg", ".jpeg", ".png", ".gif", ".bmp", ".tiff", ".doc", ".docx", ".xls", ".xlsx", ".txt", ".csv", ".zip", ".rar"}
	ext := filepath.Ext(file.Filename)
	allowed := false
	for _, allowedExt := range allowedExtensions {
		if ext == allowedExt {
			allowed = true
			break
		}
	}
	if !allowed {
		c.JSON(http.StatusBadRequest, gin.H{"error": "File type not allowed"})
		return
	}

	// Calculate total amount for folder naming
	totalAmount := expense.Amount + expense.HSTPaid

	// Debug logging
	fmt.Printf("DEBUG: Expense upload - Amount: %.2f, HST: %.2f, Total: %.2f\n",
		expense.Amount, expense.HSTPaid, totalAmount)

	// Get the expense folder path
	expenseFolderPath := fileStorage.GetExpenseFolderPath(expense.ExpenseDate, expense.Description, totalAmount)

	// Save the file
	fileName, filePath, fileSize, err := fileStorage.SaveFile(expenseFolderPath, file)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save file: " + err.Error()})
		return
	}

	// Create expense file record
	expenseFile := models.ExpenseFile{
		ExpenseID:    expense.ID,
		FileName:     fileName,
		OriginalName: file.Filename,
		FilePath:     filePath,
		FileSize:     fileSize,
		MimeType:     utils.GetMimeType(file.Filename),
		UploadedAt:   time.Now(),
	}

	if err := database.DB.Create(&expenseFile).Error; err != nil {
		// If database save fails, clean up the file
		fileStorage.DeleteFile(filePath)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save file record"})
		return
	}

	// Update expense receipt_attached status
	if !expense.ReceiptAttached {
		database.DB.Model(&expense).Update("receipt_attached", true)
	}

	c.JSON(http.StatusCreated, expenseFile)
}

// GetExpenseFiles retrieves all files for an expense
func GetExpenseFiles(c *gin.Context) {
	expenseIDStr := c.Param("id")
	expenseID, err := strconv.ParseUint(expenseIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid expense ID"})
		return
	}

	var files []models.ExpenseFile
	if err := database.DB.Where("expense_id = ?", uint(expenseID)).Find(&files).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch files"})
		return
	}

	c.JSON(http.StatusOK, files)
}

// DownloadExpenseFile downloads a file
func DownloadExpenseFile(c *gin.Context) {
	fileIDStr := c.Param("fileId")
	fileID, err := strconv.ParseUint(fileIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid file ID"})
		return
	}

	// Find the file record
	var expenseFile models.ExpenseFile
	if err := database.DB.First(&expenseFile, uint(fileID)).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "File not found"})
		return
	}

	// Check if file exists on disk
	if !fileStorage.FileExists(expenseFile.FilePath) {
		c.JSON(http.StatusNotFound, gin.H{"error": "File not found on disk"})
		return
	}

	// Set headers for file download
	c.Header("Content-Description", "File Transfer")
	c.Header("Content-Transfer-Encoding", "binary")
	c.Header("Content-Disposition", "attachment; filename="+expenseFile.OriginalName)
	c.Header("Content-Type", expenseFile.MimeType)

	// Serve the file
	c.File(expenseFile.FilePath)
}

// DeleteExpenseFile deletes a file
func DeleteExpenseFile(c *gin.Context) {
	fileIDStr := c.Param("fileId")
	fileID, err := strconv.ParseUint(fileIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid file ID"})
		return
	}

	// Find the file record
	var expenseFile models.ExpenseFile
	if err := database.DB.First(&expenseFile, uint(fileID)).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "File not found"})
		return
	}

	// Delete the file from disk
	if err := fileStorage.DeleteFile(expenseFile.FilePath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete file from disk"})
		return
	}

	// Delete the file record from database
	if err := database.DB.Delete(&expenseFile).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete file record"})
		return
	}

	// Check if expense has any remaining files
	var fileCount int64
	database.DB.Model(&models.ExpenseFile{}).Where("expense_id = ?", expenseFile.ExpenseID).Count(&fileCount)

	// Update expense receipt_attached status if no files remain
	if fileCount == 0 {
		var expense models.Expense
		if err := database.DB.First(&expense, expenseFile.ExpenseID).Error; err == nil {
			database.DB.Model(&expense).Update("receipt_attached", false)
		}
	}

	c.JSON(http.StatusOK, gin.H{"message": "File deleted successfully"})
}
