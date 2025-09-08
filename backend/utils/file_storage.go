package utils

import (
	"fmt"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/google/uuid"
)

// FileStorageService handles file operations for expenses
type FileStorageService struct {
	BasePath string
}

// NewFileStorageService creates a new file storage service
func NewFileStorageService(basePath string) *FileStorageService {
	return &FileStorageService{
		BasePath: basePath,
	}
}

// GetExpenseFolderPath generates the folder path for an expense based on the specified structure
// Structure: C:\Users\venka\Desktop\Expenses\Year\Month\ExpenseName - Amount
func (fs *FileStorageService) GetExpenseFolderPath(expenseDate time.Time, description string, totalAmount float64) string {
	year := expenseDate.Format("2006")
	month := expenseDate.Format("01")

	// Clean description and create folder name
	cleanDescription := strings.ReplaceAll(description, "/", "-")
	cleanDescription = strings.ReplaceAll(cleanDescription, "\\", "-")
	cleanDescription = strings.ReplaceAll(cleanDescription, ":", "-")
	cleanDescription = strings.ReplaceAll(cleanDescription, "*", "-")
	cleanDescription = strings.ReplaceAll(cleanDescription, "?", "-")
	cleanDescription = strings.ReplaceAll(cleanDescription, "\"", "-")
	cleanDescription = strings.ReplaceAll(cleanDescription, "<", "-")
	cleanDescription = strings.ReplaceAll(cleanDescription, ">", "-")
	cleanDescription = strings.ReplaceAll(cleanDescription, "|", "-")

	// Truncate description if too long
	if len(cleanDescription) > 50 {
		cleanDescription = cleanDescription[:50]
	}

	expenseFolderName := fmt.Sprintf("%s - %.2f", cleanDescription, totalAmount)
	fullPath := filepath.Join(fs.BasePath, year, month, expenseFolderName)

	// Debug logging
	fmt.Printf("DEBUG: Creating expense folder path: %s (totalAmount: %.2f)\n", fullPath, totalAmount)

	return fullPath
}

// SaveFile saves an uploaded file to the expense folder
func (fs *FileStorageService) SaveFile(expenseFolderPath string, file *multipart.FileHeader) (string, string, int64, error) {
	// Create the expense folder if it doesn't exist
	if err := os.MkdirAll(expenseFolderPath, 0755); err != nil {
		return "", "", 0, fmt.Errorf("failed to create expense folder: %w", err)
	}

	// Generate unique filename
	ext := filepath.Ext(file.Filename)
	uniqueID := uuid.New().String()
	fileName := fmt.Sprintf("%s%s", uniqueID, ext)
	filePath := filepath.Join(expenseFolderPath, fileName)

	// Open the uploaded file
	src, err := file.Open()
	if err != nil {
		return "", "", 0, fmt.Errorf("failed to open uploaded file: %w", err)
	}
	defer src.Close()

	// Create the destination file
	dst, err := os.Create(filePath)
	if err != nil {
		return "", "", 0, fmt.Errorf("failed to create destination file: %w", err)
	}
	defer dst.Close()

	// Copy the file content
	fileSize, err := io.Copy(dst, src)
	if err != nil {
		return "", "", 0, fmt.Errorf("failed to copy file content: %w", err)
	}

	return fileName, filePath, fileSize, nil
}

// DeleteFile deletes a file from the filesystem
func (fs *FileStorageService) DeleteFile(filePath string) error {
	if err := os.Remove(filePath); err != nil {
		return fmt.Errorf("failed to delete file: %w", err)
	}
	return nil
}

// GetFileInfo returns file information
func (fs *FileStorageService) GetFileInfo(filePath string) (os.FileInfo, error) {
	info, err := os.Stat(filePath)
	if err != nil {
		return nil, fmt.Errorf("failed to get file info: %w", err)
	}
	return info, nil
}

// FileExists checks if a file exists
func (fs *FileStorageService) FileExists(filePath string) bool {
	_, err := os.Stat(filePath)
	return !os.IsNotExist(err)
}

// GetMimeType returns the MIME type of a file based on its extension
func GetMimeType(filename string) string {
	ext := strings.ToLower(filepath.Ext(filename))

	mimeTypes := map[string]string{
		".pdf":  "application/pdf",
		".jpg":  "image/jpeg",
		".jpeg": "image/jpeg",
		".png":  "image/png",
		".gif":  "image/gif",
		".bmp":  "image/bmp",
		".tiff": "image/tiff",
		".doc":  "application/msword",
		".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
		".xls":  "application/vnd.ms-excel",
		".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
		".txt":  "text/plain",
		".csv":  "text/csv",
		".zip":  "application/zip",
		".rar":  "application/x-rar-compressed",
	}

	if mimeType, exists := mimeTypes[ext]; exists {
		return mimeType
	}

	return "application/octet-stream"
}
