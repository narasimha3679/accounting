package handlers

import (
	"accounting-backend/database"
	"accounting-backend/models"
	"bytes"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jung-kurt/gofpdf"
)

// TaxReportRequest represents the request for generating a tax report
type TaxReportRequest struct {
	CompanyID  uint   `json:"company_id" binding:"required"`
	FiscalYear int    `json:"fiscal_year" binding:"required"`
	StartDate  string `json:"start_date,omitempty"`
	EndDate    string `json:"end_date,omitempty"`
	ReportType string `json:"report_type" binding:"required"` // "comprehensive", "pandl", "hst", "retained"
}

// TaxReportData contains all the data needed for tax reports
type TaxReportData struct {
	Company       *models.Company       `json:"company"`
	FiscalYear    int                   `json:"fiscal_year"`
	StartDate     time.Time             `json:"start_date"`
	EndDate       time.Time             `json:"end_date"`
	Invoices      []models.Invoice      `json:"invoices"`
	Expenses      []models.Expense      `json:"expenses"`
	Dividends     []models.Dividend     `json:"dividends"`
	CapitalAssets []models.CapitalAsset `json:"capital_assets"`
	HSTPayments   []models.HSTPayment   `json:"hst_payments"`
	TaxReturns    []models.TaxReturn    `json:"tax_returns"`
	Summary       TaxReportSummary      `json:"summary"`
}

// TaxReportSummary contains calculated summary data
type TaxReportSummary struct {
	GrossIncome          float64 `json:"gross_income"`
	TotalExpenses        float64 `json:"total_expenses"`
	NetIncomeBeforeTax   float64 `json:"net_income_before_tax"`
	SmallBusinessTax     float64 `json:"small_business_tax"`
	NetIncomeAfterTax    float64 `json:"net_income_after_tax"`
	HSTCollected         float64 `json:"hst_collected"`
	HSTPaid              float64 `json:"hst_paid"`
	HSTRemittance        float64 `json:"hst_remittance"`
	TotalDividends       float64 `json:"total_dividends"`
	RetainedEarnings     float64 `json:"retained_earnings"`
	TotalDepreciation    float64 `json:"total_depreciation"`
	CapitalCostAllowance float64 `json:"capital_cost_allowance"`
}

// GenerateTaxReport generates a comprehensive tax report
func GenerateTaxReport(c *gin.Context) {
	var req TaxReportRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get user from context
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	// Verify user has access to this company
	var user models.User
	if err := database.DB.Preload("Company").First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	if user.CompanyID != req.CompanyID && user.Role != "admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied to this company"})
		return
	}

	// Generate report data
	reportData, err := generateReportData(req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Generate PDF based on report type
	var pdfBytes []byte
	switch req.ReportType {
	case "comprehensive":
		pdfBytes, err = generateComprehensiveTaxReportPDF(reportData)
	case "pandl":
		pdfBytes, err = generatePandLReportPDF(reportData)
	case "hst":
		pdfBytes, err = generateHSTReportPDF(reportData)
	case "retained":
		pdfBytes, err = generateRetainedEarningsReportPDF(reportData)
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid report type"})
		return
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Set headers for PDF download
	filename := fmt.Sprintf("%s_Tax_Report_%d.pdf", req.ReportType, req.FiscalYear)
	c.Header("Content-Type", "application/pdf")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%s", filename))
	c.Header("Content-Length", strconv.Itoa(len(pdfBytes)))
	c.Data(http.StatusOK, "application/pdf", pdfBytes)
}

// generateReportData fetches and calculates all data needed for the report
func generateReportData(req TaxReportRequest) (*TaxReportData, error) {
	var reportData TaxReportData

	// Set date range
	if req.StartDate != "" && req.EndDate != "" {
		startDate, err := time.Parse("2006-01-02", req.StartDate)
		if err != nil {
			return nil, fmt.Errorf("invalid start date format")
		}
		endDate, err := time.Parse("2006-01-02", req.EndDate)
		if err != nil {
			return nil, fmt.Errorf("invalid end date format")
		}
		reportData.StartDate = startDate
		reportData.EndDate = endDate
	} else {
		// Default to fiscal year
		reportData.StartDate = time.Date(req.FiscalYear, 1, 1, 0, 0, 0, 0, time.UTC)
		reportData.EndDate = time.Date(req.FiscalYear, 12, 31, 23, 59, 59, 0, time.UTC)
	}

	reportData.FiscalYear = req.FiscalYear

	// Get company information
	var company models.Company
	if err := database.DB.First(&company, req.CompanyID).Error; err != nil {
		return nil, fmt.Errorf("company not found")
	}
	reportData.Company = &company

	// Get invoices
	var invoices []models.Invoice
	query := database.DB.Preload("Client").Preload("Items").
		Where("company_id = ? AND issue_date >= ? AND issue_date <= ?",
			req.CompanyID, reportData.StartDate, reportData.EndDate)
	if err := query.Find(&invoices).Error; err != nil {
		return nil, fmt.Errorf("failed to fetch invoices: %v", err)
	}
	reportData.Invoices = invoices

	// Get expenses
	var expenses []models.Expense
	query = database.DB.Preload("Category").
		Where("company_id = ? AND expense_date >= ? AND expense_date <= ?",
			req.CompanyID, reportData.StartDate, reportData.EndDate)
	if err := query.Find(&expenses).Error; err != nil {
		return nil, fmt.Errorf("failed to fetch expenses: %v", err)
	}
	reportData.Expenses = expenses

	// Get dividends
	var dividends []models.Dividend
	query = database.DB.Where("company_id = ? AND declaration_date >= ? AND declaration_date <= ?",
		req.CompanyID, reportData.StartDate, reportData.EndDate)
	if err := query.Find(&dividends).Error; err != nil {
		return nil, fmt.Errorf("failed to fetch dividends: %v", err)
	}
	reportData.Dividends = dividends

	// Get capital assets
	var capitalAssets []models.CapitalAsset
	query = database.DB.Preload("DepreciationEntries").
		Where("company_id = ? AND purchase_date <= ?", req.CompanyID, reportData.EndDate)
	if err := query.Find(&capitalAssets).Error; err != nil {
		return nil, fmt.Errorf("failed to fetch capital assets: %v", err)
	}
	reportData.CapitalAssets = capitalAssets

	// Get HST payments
	var hstPayments []models.HSTPayment
	query = database.DB.Where("company_id = ? AND payment_date >= ? AND payment_date <= ?",
		req.CompanyID, reportData.StartDate, reportData.EndDate)
	if err := query.Find(&hstPayments).Error; err != nil {
		return nil, fmt.Errorf("failed to fetch HST payments: %v", err)
	}
	reportData.HSTPayments = hstPayments

	// Get tax returns
	var taxReturns []models.TaxReturn
	query = database.DB.Where("company_id = ? AND fiscal_year = ?", req.CompanyID, req.FiscalYear)
	if err := query.Find(&taxReturns).Error; err != nil {
		return nil, fmt.Errorf("failed to fetch tax returns: %v", err)
	}
	reportData.TaxReturns = taxReturns

	// Calculate summary
	reportData.Summary = calculateTaxReportSummary(&reportData)

	return &reportData, nil
}

// calculateTaxReportSummary calculates all summary values
func calculateTaxReportSummary(data *TaxReportData) TaxReportSummary {
	var summary TaxReportSummary

	// Calculate income from paid invoices
	for _, invoice := range data.Invoices {
		if invoice.Status == "paid" {
			summary.GrossIncome += invoice.Subtotal
			summary.HSTCollected += invoice.HSTAmount
		}
	}

	// Calculate expenses
	for _, expense := range data.Expenses {
		summary.TotalExpenses += expense.Amount
		summary.HSTPaid += expense.HSTPaid
	}

	// Calculate dividends
	for _, dividend := range data.Dividends {
		if dividend.Status == "paid" {
			summary.TotalDividends += dividend.Amount
		}
	}

	// Calculate depreciation
	for _, asset := range data.CapitalAssets {
		for _, entry := range asset.DepreciationEntries {
			if entry.EntryDate.After(data.StartDate) && entry.EntryDate.Before(data.EndDate) {
				summary.TotalDepreciation += entry.DepreciationAmount
			}
		}
		// Calculate CCA for the year
		if asset.PurchaseDate.Before(data.EndDate) {
			summary.CapitalCostAllowance += asset.DepreciableAmount * asset.CCARate
		}
	}

	// Calculate tax and net income
	summary.NetIncomeBeforeTax = summary.GrossIncome - summary.TotalExpenses - summary.TotalDepreciation
	smallBusinessRate := 0.125 // 12.5% default, should come from company settings
	if data.Company != nil && data.Company.SmallBusinessRate > 0 {
		smallBusinessRate = data.Company.SmallBusinessRate
	}
	summary.SmallBusinessTax = summary.NetIncomeBeforeTax * smallBusinessRate
	summary.NetIncomeAfterTax = summary.NetIncomeBeforeTax - summary.SmallBusinessTax
	summary.HSTRemittance = summary.HSTCollected - summary.HSTPaid
	summary.RetainedEarnings = summary.NetIncomeAfterTax - summary.TotalDividends

	return summary
}

// generateComprehensiveTaxReportPDF creates a comprehensive tax report PDF
func generateComprehensiveTaxReportPDF(data *TaxReportData) ([]byte, error) {
	pdf := gofpdf.New("P", "mm", "A4", "")
	pdf.AddPage()

	// Set margins
	pdf.SetMargins(15, 15, 15)
	pdf.SetAutoPageBreak(true, 20)

	// Header
	pdf.SetFont("Arial", "B", 18)
	pdf.Cell(0, 12, "COMPREHENSIVE TAX REPORT")
	pdf.Ln(8)

	if data.Company != nil {
		pdf.SetFont("Arial", "B", 14)
		pdf.Cell(0, 10, data.Company.Name)
		pdf.SetFont("Arial", "", 11)
		if data.Company.BusinessNumber != "" {
			pdf.Cell(0, 7, fmt.Sprintf("Business Number: %s", data.Company.BusinessNumber))
		}
	}

	pdf.Cell(0, 7, fmt.Sprintf("Fiscal Year: %d", data.FiscalYear))
	pdf.Cell(0, 7, fmt.Sprintf("Report Period: %s to %s",
		data.StartDate.Format("January 2, 2006"),
		data.EndDate.Format("January 2, 2006")))
	pdf.Cell(0, 7, fmt.Sprintf("Generated: %s", time.Now().Format("January 2, 2006 at 3:04 PM")))
	pdf.Ln(15)

	// Executive Summary
	pdf.SetFont("Arial", "B", 14)
	pdf.Cell(0, 10, "EXECUTIVE SUMMARY")
	pdf.Ln(5)

	summary := data.Summary
	pdf.SetFont("Arial", "", 11)

	// Create a summary table
	pdf.Cell(80, 8, "Gross Revenue:")
	pdf.Cell(40, 8, fmt.Sprintf("$%.2f", summary.GrossIncome))
	pdf.Ln(8)

	pdf.Cell(80, 8, "Total Business Expenses:")
	pdf.Cell(40, 8, fmt.Sprintf("$%.2f", summary.TotalExpenses))
	pdf.Ln(8)

	pdf.Cell(80, 8, "Depreciation/CCA:")
	pdf.Cell(40, 8, fmt.Sprintf("$%.2f", summary.TotalDepreciation))
	pdf.Ln(8)

	pdf.SetFont("Arial", "B", 11)
	pdf.Cell(80, 8, "Net Income Before Tax:")
	pdf.Cell(40, 8, fmt.Sprintf("$%.2f", summary.NetIncomeBeforeTax))
	pdf.Ln(8)

	pdf.SetFont("Arial", "", 11)
	pdf.Cell(80, 8, "Small Business Tax:")
	pdf.Cell(40, 8, fmt.Sprintf("$%.2f", summary.SmallBusinessTax))
	pdf.Ln(8)

	pdf.SetFont("Arial", "B", 11)
	pdf.Cell(80, 8, "Net Income After Tax:")
	pdf.Cell(40, 8, fmt.Sprintf("$%.2f", summary.NetIncomeAfterTax))
	pdf.Ln(8)

	pdf.SetFont("Arial", "", 11)
	pdf.Cell(80, 8, "Dividends Paid:")
	pdf.Cell(40, 8, fmt.Sprintf("$%.2f", summary.TotalDividends))
	pdf.Ln(8)

	pdf.SetFont("Arial", "B", 11)
	pdf.Cell(80, 8, "Retained Earnings:")
	pdf.Cell(40, 8, fmt.Sprintf("$%.2f", summary.RetainedEarnings))
	pdf.Ln(15)

	// HST Summary
	pdf.SetFont("Arial", "B", 14)
	pdf.Cell(0, 10, "HST SUMMARY")
	pdf.Ln(5)

	pdf.SetFont("Arial", "", 11)
	pdf.Cell(80, 8, "HST Collected:")
	pdf.Cell(40, 8, fmt.Sprintf("$%.2f", summary.HSTCollected))
	pdf.Ln(8)

	pdf.Cell(80, 8, "HST Paid (Input Tax Credits):")
	pdf.Cell(40, 8, fmt.Sprintf("$%.2f", summary.HSTPaid))
	pdf.Ln(8)

	pdf.SetFont("Arial", "B", 11)
	pdf.Cell(80, 8, "HST Remittance Due:")
	pdf.Cell(40, 8, fmt.Sprintf("$%.2f", summary.HSTRemittance))
	pdf.Ln(15)

	// Check if we need a new page
	if pdf.GetY() > 200 {
		pdf.AddPage()
	}

	// Detailed Income Breakdown
	pdf.SetFont("Arial", "B", 14)
	pdf.Cell(0, 10, "DETAILED INCOME BREAKDOWN")
	pdf.Ln(5)

	pdf.SetFont("Arial", "B", 10)
	// Table header with borders
	pdf.CellFormat(25, 8, "Invoice #", "1", 0, "C", false, 0, "")
	pdf.CellFormat(45, 8, "Client", "1", 0, "C", false, 0, "")
	pdf.CellFormat(25, 8, "Date", "1", 0, "C", false, 0, "")
	pdf.CellFormat(25, 8, "Subtotal", "1", 0, "C", false, 0, "")
	pdf.CellFormat(25, 8, "HST", "1", 0, "C", false, 0, "")
	pdf.CellFormat(25, 8, "Total", "1", 1, "C", false, 0, "")

	// Table rows
	pdf.SetFont("Arial", "", 9)
	for _, invoice := range data.Invoices {
		if invoice.Status == "paid" {
			// Check if we need a new page
			if pdf.GetY() > 250 {
				pdf.AddPage()
				// Reprint header
				pdf.SetFont("Arial", "B", 10)
				pdf.CellFormat(25, 8, "Invoice #", "1", 0, "C", false, 0, "")
				pdf.CellFormat(45, 8, "Client", "1", 0, "C", false, 0, "")
				pdf.CellFormat(25, 8, "Date", "1", 0, "C", false, 0, "")
				pdf.CellFormat(25, 8, "Subtotal", "1", 0, "C", false, 0, "")
				pdf.CellFormat(25, 8, "HST", "1", 0, "C", false, 0, "")
				pdf.CellFormat(25, 8, "Total", "1", 1, "C", false, 0, "")
				pdf.SetFont("Arial", "", 9)
			}

			pdf.CellFormat(25, 7, invoice.InvoiceNumber, "1", 0, "L", false, 0, "")
			clientName := "Unknown"
			if invoice.Client.Name != "" {
				clientName = invoice.Client.Name
			}
			pdf.CellFormat(45, 7, clientName, "1", 0, "L", false, 0, "")
			pdf.CellFormat(25, 7, invoice.IssueDate.Format("2006-01-02"), "1", 0, "C", false, 0, "")
			pdf.CellFormat(25, 7, fmt.Sprintf("$%.2f", invoice.Subtotal), "1", 0, "R", false, 0, "")
			pdf.CellFormat(25, 7, fmt.Sprintf("$%.2f", invoice.HSTAmount), "1", 0, "R", false, 0, "")
			pdf.CellFormat(25, 7, fmt.Sprintf("$%.2f", invoice.Total), "1", 1, "R", false, 0, "")
		}
	}
	pdf.Ln(10)

	// Check if we need a new page
	if pdf.GetY() > 200 {
		pdf.AddPage()
	}

	// Detailed Expense Breakdown
	pdf.SetFont("Arial", "B", 14)
	pdf.Cell(0, 10, "DETAILED EXPENSE BREAKDOWN")
	pdf.Ln(5)

	pdf.SetFont("Arial", "B", 10)
	// Table header with borders
	pdf.CellFormat(30, 8, "Date", "1", 0, "C", false, 0, "")
	pdf.CellFormat(60, 8, "Description", "1", 0, "C", false, 0, "")
	pdf.CellFormat(30, 8, "Category", "1", 0, "C", false, 0, "")
	pdf.CellFormat(25, 8, "Amount", "1", 0, "C", false, 0, "")
	pdf.CellFormat(25, 8, "HST", "1", 1, "C", false, 0, "")

	// Table rows
	pdf.SetFont("Arial", "", 9)
	for _, expense := range data.Expenses {
		// Check if we need a new page
		if pdf.GetY() > 250 {
			pdf.AddPage()
			// Reprint header
			pdf.SetFont("Arial", "B", 10)
			pdf.CellFormat(30, 8, "Date", "1", 0, "C", false, 0, "")
			pdf.CellFormat(60, 8, "Description", "1", 0, "C", false, 0, "")
			pdf.CellFormat(30, 8, "Category", "1", 0, "C", false, 0, "")
			pdf.CellFormat(25, 8, "Amount", "1", 0, "C", false, 0, "")
			pdf.CellFormat(25, 8, "HST", "1", 1, "C", false, 0, "")
			pdf.SetFont("Arial", "", 9)
		}

		pdf.CellFormat(30, 7, expense.ExpenseDate.Format("2006-01-02"), "1", 0, "C", false, 0, "")
		pdf.CellFormat(60, 7, expense.Description, "1", 0, "L", false, 0, "")
		categoryName := "Uncategorized"
		if expense.Category.Name != "" {
			categoryName = expense.Category.Name
		}
		pdf.CellFormat(30, 7, categoryName, "1", 0, "L", false, 0, "")
		pdf.CellFormat(25, 7, fmt.Sprintf("$%.2f", expense.Amount), "1", 0, "R", false, 0, "")
		pdf.CellFormat(25, 7, fmt.Sprintf("$%.2f", expense.HSTPaid), "1", 1, "R", false, 0, "")
	}
	pdf.Ln(10)

	// Capital Assets and Depreciation
	if len(data.CapitalAssets) > 0 {
		// Check if we need a new page
		if pdf.GetY() > 200 {
			pdf.AddPage()
		}

		pdf.SetFont("Arial", "B", 14)
		pdf.Cell(0, 10, "CAPITAL ASSETS & DEPRECIATION")
		pdf.Ln(5)

		pdf.SetFont("Arial", "B", 10)
		// Table header with borders
		pdf.CellFormat(50, 8, "Asset Description", "1", 0, "C", false, 0, "")
		pdf.CellFormat(25, 8, "Purchase Date", "1", 0, "C", false, 0, "")
		pdf.CellFormat(25, 8, "Cost", "1", 0, "C", false, 0, "")
		pdf.CellFormat(20, 8, "CCA Class", "1", 0, "C", false, 0, "")
		pdf.CellFormat(25, 8, "CCA Rate", "1", 0, "C", false, 0, "")
		pdf.CellFormat(25, 8, "Annual CCA", "1", 1, "C", false, 0, "")

		// Table rows
		pdf.SetFont("Arial", "", 9)
		for _, asset := range data.CapitalAssets {
			// Check if we need a new page
			if pdf.GetY() > 250 {
				pdf.AddPage()
				// Reprint header
				pdf.SetFont("Arial", "B", 10)
				pdf.CellFormat(50, 8, "Asset Description", "1", 0, "C", false, 0, "")
				pdf.CellFormat(25, 8, "Purchase Date", "1", 0, "C", false, 0, "")
				pdf.CellFormat(25, 8, "Cost", "1", 0, "C", false, 0, "")
				pdf.CellFormat(20, 8, "CCA Class", "1", 0, "C", false, 0, "")
				pdf.CellFormat(25, 8, "CCA Rate", "1", 0, "C", false, 0, "")
				pdf.CellFormat(25, 8, "Annual CCA", "1", 1, "C", false, 0, "")
				pdf.SetFont("Arial", "", 9)
			}

			pdf.CellFormat(50, 7, asset.Description, "1", 0, "L", false, 0, "")
			pdf.CellFormat(25, 7, asset.PurchaseDate.Format("2006-01-02"), "1", 0, "C", false, 0, "")
			pdf.CellFormat(25, 7, fmt.Sprintf("$%.2f", asset.PurchaseAmount), "1", 0, "R", false, 0, "")
			pdf.CellFormat(20, 7, asset.CCAClass, "1", 0, "C", false, 0, "")
			pdf.CellFormat(25, 7, fmt.Sprintf("%.1f%%", asset.CCARate*100), "1", 0, "C", false, 0, "")
			pdf.CellFormat(25, 7, fmt.Sprintf("$%.2f", asset.DepreciableAmount*asset.CCARate), "1", 1, "R", false, 0, "")
		}
		pdf.Ln(10)
	}

	// Dividends
	if len(data.Dividends) > 0 {
		// Check if we need a new page
		if pdf.GetY() > 200 {
			pdf.AddPage()
		}

		pdf.SetFont("Arial", "B", 14)
		pdf.Cell(0, 10, "DIVIDEND DISTRIBUTIONS")
		pdf.Ln(5)

		pdf.SetFont("Arial", "B", 10)
		// Table header with borders
		pdf.CellFormat(40, 8, "Declaration Date", "1", 0, "C", false, 0, "")
		pdf.CellFormat(30, 8, "Amount", "1", 0, "C", false, 0, "")
		pdf.CellFormat(30, 8, "Status", "1", 0, "C", false, 0, "")
		pdf.CellFormat(50, 8, "Notes", "1", 1, "C", false, 0, "")

		// Table rows
		pdf.SetFont("Arial", "", 9)
		for _, dividend := range data.Dividends {
			// Check if we need a new page
			if pdf.GetY() > 250 {
				pdf.AddPage()
				// Reprint header
				pdf.SetFont("Arial", "B", 10)
				pdf.CellFormat(40, 8, "Declaration Date", "1", 0, "C", false, 0, "")
				pdf.CellFormat(30, 8, "Amount", "1", 0, "C", false, 0, "")
				pdf.CellFormat(30, 8, "Status", "1", 0, "C", false, 0, "")
				pdf.CellFormat(50, 8, "Notes", "1", 1, "C", false, 0, "")
				pdf.SetFont("Arial", "", 9)
			}

			pdf.CellFormat(40, 7, dividend.DeclarationDate.Format("2006-01-02"), "1", 0, "C", false, 0, "")
			pdf.CellFormat(30, 7, fmt.Sprintf("$%.2f", dividend.Amount), "1", 0, "R", false, 0, "")
			pdf.CellFormat(30, 7, dividend.Status, "1", 0, "C", false, 0, "")
			notes := ""
			if dividend.Notes != nil {
				notes = *dividend.Notes
			}
			pdf.CellFormat(50, 7, notes, "1", 1, "L", false, 0, "")
		}
		pdf.Ln(10)
	}

	// Footer
	pdf.SetY(-30)
	pdf.SetFont("Arial", "I", 9)
	pdf.Cell(0, 7, "This report was generated by the Accounting System")
	pdf.Cell(0, 7, "For tax preparation purposes - please review all figures with your accountant")

	// Output to bytes buffer
	var buf bytes.Buffer
	err := pdf.Output(&buf)
	if err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

// generatePandLReportPDF creates a Profit & Loss report PDF
func generatePandLReportPDF(data *TaxReportData) ([]byte, error) {
	pdf := gofpdf.New("P", "mm", "A4", "")
	pdf.AddPage()
	pdf.SetFont("Arial", "B", 16)

	// Header
	pdf.Cell(0, 10, "PROFIT & LOSS STATEMENT")
	pdf.Ln(5)

	if data.Company != nil {
		pdf.SetFont("Arial", "B", 12)
		pdf.Cell(0, 8, data.Company.Name)
	}

	pdf.SetFont("Arial", "", 10)
	pdf.Cell(0, 6, fmt.Sprintf("Fiscal Year: %d", data.FiscalYear))
	pdf.Cell(0, 6, fmt.Sprintf("Report Period: %s to %s",
		data.StartDate.Format("January 2, 2006"),
		data.EndDate.Format("January 2, 2006")))
	pdf.Ln(10)

	summary := data.Summary

	// Income Section
	pdf.SetFont("Arial", "B", 12)
	pdf.Cell(0, 8, "INCOME")
	pdf.SetFont("Arial", "", 10)
	pdf.Cell(0, 6, fmt.Sprintf("Gross Revenue: $%.2f", summary.GrossIncome))
	pdf.Ln(5)

	// Expenses Section
	pdf.SetFont("Arial", "B", 12)
	pdf.Cell(0, 8, "EXPENSES")
	pdf.SetFont("Arial", "", 10)
	pdf.Cell(0, 6, fmt.Sprintf("Total Business Expenses: $%.2f", summary.TotalExpenses))
	pdf.Cell(0, 6, fmt.Sprintf("Depreciation/CCA: $%.2f", summary.TotalDepreciation))
	pdf.Ln(5)

	// Net Income Section
	pdf.SetFont("Arial", "B", 12)
	pdf.Cell(0, 8, "NET INCOME BEFORE TAX")
	pdf.SetFont("Arial", "B", 10)
	pdf.Cell(0, 6, fmt.Sprintf("$%.2f", summary.NetIncomeBeforeTax))
	pdf.Ln(5)

	// Tax Section
	pdf.SetFont("Arial", "B", 12)
	pdf.Cell(0, 8, "TAXES")
	pdf.SetFont("Arial", "", 10)
	pdf.Cell(0, 6, fmt.Sprintf("Small Business Tax: $%.2f", summary.SmallBusinessTax))
	pdf.Ln(5)

	// Net Income After Tax
	pdf.SetFont("Arial", "B", 12)
	pdf.Cell(0, 8, "NET INCOME AFTER TAX")
	pdf.SetFont("Arial", "B", 10)
	pdf.Cell(0, 6, fmt.Sprintf("$%.2f", summary.NetIncomeAfterTax))
	pdf.Ln(5)

	// Dividends
	pdf.SetFont("Arial", "B", 12)
	pdf.Cell(0, 8, "DIVIDENDS PAID")
	pdf.SetFont("Arial", "", 10)
	pdf.Cell(0, 6, fmt.Sprintf("Total Dividends: $%.2f", summary.TotalDividends))
	pdf.Ln(5)

	// Retained Earnings
	pdf.SetFont("Arial", "B", 12)
	pdf.Cell(0, 8, "RETAINED EARNINGS")
	pdf.SetFont("Arial", "B", 10)
	pdf.Cell(0, 6, fmt.Sprintf("$%.2f", summary.RetainedEarnings))

	// Output to bytes buffer
	var buf bytes.Buffer
	err := pdf.Output(&buf)
	if err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

// generateHSTReportPDF creates an HST report PDF
func generateHSTReportPDF(data *TaxReportData) ([]byte, error) {
	pdf := gofpdf.New("P", "mm", "A4", "")
	pdf.AddPage()
	pdf.SetFont("Arial", "B", 16)

	// Header
	pdf.Cell(0, 10, "HST REPORT")
	pdf.Ln(5)

	if data.Company != nil {
		pdf.SetFont("Arial", "B", 12)
		pdf.Cell(0, 8, data.Company.Name)
	}

	pdf.SetFont("Arial", "", 10)
	pdf.Cell(0, 6, fmt.Sprintf("Fiscal Year: %d", data.FiscalYear))
	pdf.Cell(0, 6, fmt.Sprintf("Report Period: %s to %s",
		data.StartDate.Format("January 2, 2006"),
		data.EndDate.Format("January 2, 2006")))
	pdf.Ln(10)

	summary := data.Summary

	// HST Summary
	pdf.SetFont("Arial", "B", 12)
	pdf.Cell(0, 8, "HST SUMMARY")
	pdf.SetFont("Arial", "", 10)
	pdf.Cell(0, 6, fmt.Sprintf("HST Collected: $%.2f", summary.HSTCollected))
	pdf.Cell(0, 6, fmt.Sprintf("HST Paid (Input Tax Credits): $%.2f", summary.HSTPaid))
	pdf.Cell(0, 6, fmt.Sprintf("HST Remittance Due: $%.2f", summary.HSTRemittance))
	pdf.Ln(10)

	// Monthly Breakdown
	pdf.SetFont("Arial", "B", 12)
	pdf.Cell(0, 8, "MONTHLY HST BREAKDOWN")
	pdf.SetFont("Arial", "", 9)

	// Table header
	pdf.Cell(30, 6, "Month")
	pdf.Cell(30, 6, "HST Collected")
	pdf.Cell(30, 6, "HST Paid")
	pdf.Cell(30, 6, "Net HST")
	pdf.Ln(6)

	// Generate monthly breakdown
	for month := 1; month <= 12; month++ {
		monthStart := time.Date(data.FiscalYear, time.Month(month), 1, 0, 0, 0, 0, time.UTC)
		monthEnd := monthStart.AddDate(0, 1, -1)

		var monthHSTCollected, monthHSTPaid float64

		for _, invoice := range data.Invoices {
			if invoice.Status == "paid" && invoice.IssueDate.After(monthStart) && invoice.IssueDate.Before(monthEnd) {
				monthHSTCollected += invoice.HSTAmount
			}
		}

		for _, expense := range data.Expenses {
			if expense.ExpenseDate.After(monthStart) && expense.ExpenseDate.Before(monthEnd) {
				monthHSTPaid += expense.HSTPaid
			}
		}

		pdf.Cell(30, 6, monthStart.Format("Jan 2006"))
		pdf.Cell(30, 6, fmt.Sprintf("$%.2f", monthHSTCollected))
		pdf.Cell(30, 6, fmt.Sprintf("$%.2f", monthHSTPaid))
		pdf.Cell(30, 6, fmt.Sprintf("$%.2f", monthHSTCollected-monthHSTPaid))
		pdf.Ln(6)
	}

	// Output to bytes buffer
	var buf bytes.Buffer
	err := pdf.Output(&buf)
	if err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

// generateRetainedEarningsReportPDF creates a retained earnings report PDF
func generateRetainedEarningsReportPDF(data *TaxReportData) ([]byte, error) {
	pdf := gofpdf.New("P", "mm", "A4", "")
	pdf.AddPage()
	pdf.SetFont("Arial", "B", 16)

	// Header
	pdf.Cell(0, 10, "RETAINED EARNINGS REPORT")
	pdf.Ln(5)

	if data.Company != nil {
		pdf.SetFont("Arial", "B", 12)
		pdf.Cell(0, 8, data.Company.Name)
	}

	pdf.SetFont("Arial", "", 10)
	pdf.Cell(0, 6, fmt.Sprintf("Fiscal Year: %d", data.FiscalYear))
	pdf.Ln(10)

	summary := data.Summary

	// Retained Earnings Calculation
	pdf.SetFont("Arial", "B", 12)
	pdf.Cell(0, 8, "RETAINED EARNINGS CALCULATION")
	pdf.SetFont("Arial", "", 10)
	pdf.Cell(0, 6, fmt.Sprintf("Net Income After Tax: $%.2f", summary.NetIncomeAfterTax))
	pdf.Cell(0, 6, fmt.Sprintf("Less: Dividends Paid: $%.2f", summary.TotalDividends))
	pdf.Ln(5)
	pdf.SetFont("Arial", "B", 10)
	pdf.Cell(0, 6, fmt.Sprintf("Retained Earnings: $%.2f", summary.RetainedEarnings))
	pdf.Ln(10)

	// Dividend Details
	if len(data.Dividends) > 0 {
		pdf.SetFont("Arial", "B", 12)
		pdf.Cell(0, 8, "DIVIDEND DISTRIBUTIONS")
		pdf.SetFont("Arial", "", 9)

		// Table header
		pdf.Cell(40, 6, "Declaration Date")
		pdf.Cell(30, 6, "Amount")
		pdf.Cell(30, 6, "Status")
		pdf.Cell(50, 6, "Notes")
		pdf.Ln(6)

		// Table rows
		for _, dividend := range data.Dividends {
			pdf.Cell(40, 6, dividend.DeclarationDate.Format("2006-01-02"))
			pdf.Cell(30, 6, fmt.Sprintf("$%.2f", dividend.Amount))
			pdf.Cell(30, 6, dividend.Status)
			notes := ""
			if dividend.Notes != nil {
				notes = *dividend.Notes
			}
			pdf.Cell(50, 6, notes)
			pdf.Ln(6)
		}
	}

	// Output to bytes buffer
	var buf bytes.Buffer
	err := pdf.Output(&buf)
	if err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}
