package models

import (
	"time"

	"gorm.io/gorm"
)

// User represents a user in the system
type User struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	Email     string         `json:"email" gorm:"uniqueIndex;not null"`
	Password  string         `json:"-" gorm:"not null"` // Hidden from JSON
	Name      string         `json:"name" gorm:"not null"`
	Role      string         `json:"role" gorm:"not null;default:'viewer'"` // admin, accountant, viewer
	CompanyID uint           `json:"company_id" gorm:"not null"`
	Company   Company        `json:"company,omitempty" gorm:"foreignKey:CompanyID"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`
}

// Company represents a company entity
type Company struct {
	ID                uint           `json:"id" gorm:"primaryKey"`
	Name              string         `json:"name" gorm:"not null"`
	BusinessNumber    string         `json:"business_number" gorm:"uniqueIndex;not null"`
	HSTNumber         *string        `json:"hst_number"`
	HSTRegistered     bool           `json:"hst_registered" gorm:"default:false"` // Can claim Input Tax Credits
	FiscalYearEnd     time.Time      `json:"fiscal_year_end" gorm:"not null"`
	SmallBusinessRate float64        `json:"small_business_rate" gorm:"not null;default:0.15"`
	HSTRate           float64        `json:"hst_rate" gorm:"not null;default:0.13"`
	CreatedAt         time.Time      `json:"created_at"`
	UpdatedAt         time.Time      `json:"updated_at"`
	DeletedAt         gorm.DeletedAt `json:"-" gorm:"index"`
}

// Client represents a client/customer
type Client struct {
	ID            uint           `json:"id" gorm:"primaryKey"`
	Name          string         `json:"name" gorm:"not null"`
	ContactPerson *string        `json:"contact_person"`
	Email         *string        `json:"email"`
	Phone         *string        `json:"phone"`
	Address       *string        `json:"address"`
	HSTExempt     bool           `json:"hst_exempt" gorm:"default:false"`
	CompanyID     uint           `json:"company_id" gorm:"not null"`
	Company       Company        `json:"company,omitempty" gorm:"foreignKey:CompanyID"`
	CreatedAt     time.Time      `json:"created_at"`
	UpdatedAt     time.Time      `json:"updated_at"`
	DeletedAt     gorm.DeletedAt `json:"-" gorm:"index"`
}

// Invoice represents an invoice
type Invoice struct {
	ID            uint           `json:"id" gorm:"primaryKey"`
	InvoiceNumber string         `json:"invoice_number" gorm:"uniqueIndex;not null"`
	ClientID      uint           `json:"client_id" gorm:"not null"`
	Client        Client         `json:"client,omitempty" gorm:"foreignKey:ClientID"`
	IssueDate     time.Time      `json:"issue_date" gorm:"not null"`
	DueDate       time.Time      `json:"due_date" gorm:"not null"`
	Subtotal      float64        `json:"subtotal" gorm:"not null"`
	HSTAmount     float64        `json:"hst_amount" gorm:"not null"`
	Total         float64        `json:"total" gorm:"not null"`
	Status        string         `json:"status" gorm:"not null;default:'draft'"` // draft, sent, paid, overdue, cancelled
	PaidDate      *time.Time     `json:"paid_date"`
	Description   *string        `json:"description"`
	CompanyID     uint           `json:"company_id" gorm:"not null"`
	Company       Company        `json:"company,omitempty" gorm:"foreignKey:CompanyID"`
	Items         []InvoiceItem  `json:"items,omitempty" gorm:"foreignKey:InvoiceID"`
	CreatedAt     time.Time      `json:"created_at"`
	UpdatedAt     time.Time      `json:"updated_at"`
	DeletedAt     gorm.DeletedAt `json:"-" gorm:"index"`
}

// InvoiceItem represents a line item in an invoice
type InvoiceItem struct {
	ID          uint           `json:"id" gorm:"primaryKey"`
	InvoiceID   uint           `json:"invoice_id" gorm:"not null"`
	Invoice     Invoice        `json:"invoice,omitempty" gorm:"foreignKey:InvoiceID"`
	Description string         `json:"description" gorm:"not null"`
	Quantity    float64        `json:"quantity" gorm:"not null"`
	UnitPrice   float64        `json:"unit_price" gorm:"not null"`
	Total       float64        `json:"total" gorm:"not null"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `json:"-" gorm:"index"`
}

// ExpenseCategory represents a category for expenses
type ExpenseCategory struct {
	ID          uint           `json:"id" gorm:"primaryKey"`
	Name        string         `json:"name" gorm:"not null"`
	Description *string        `json:"description"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `json:"-" gorm:"index"`
}

// Expense represents a business expense
type Expense struct {
	ID              uint            `json:"id" gorm:"primaryKey"`
	Description     string          `json:"description" gorm:"not null"`
	CategoryID      uint            `json:"category_id" gorm:"not null"`
	Category        ExpenseCategory `json:"category,omitempty" gorm:"foreignKey:CategoryID"`
	Amount          float64         `json:"amount" gorm:"not null"`
	HSTPaid         float64         `json:"hst_paid" gorm:"not null"`
	ExpenseDate     time.Time       `json:"expense_date" gorm:"not null"`
	ReceiptAttached bool            `json:"receipt_attached" gorm:"default:false"`
	PaidBy          string          `json:"paid_by" gorm:"not null;default:'corp'"` // "corp" or "owner"
	CompanyID       uint            `json:"company_id" gorm:"not null"`
	Company         Company         `json:"company,omitempty" gorm:"foreignKey:CompanyID"`
	Files           []ExpenseFile   `json:"files,omitempty" gorm:"foreignKey:ExpenseID"`
	CreatedAt       time.Time       `json:"created_at"`
	UpdatedAt       time.Time       `json:"updated_at"`
	DeletedAt       gorm.DeletedAt  `json:"-" gorm:"index"`
}

// ExpenseFile represents a file attached to an expense
type ExpenseFile struct {
	ID           uint           `json:"id" gorm:"primaryKey"`
	ExpenseID    uint           `json:"expense_id" gorm:"not null"`
	Expense      Expense        `json:"expense,omitempty" gorm:"foreignKey:ExpenseID"`
	FileName     string         `json:"file_name" gorm:"not null"`
	OriginalName string         `json:"original_name" gorm:"not null"`
	FilePath     string         `json:"file_path" gorm:"not null"`
	FileSize     int64          `json:"file_size" gorm:"not null"`
	MimeType     string         `json:"mime_type" gorm:"not null"`
	UploadedAt   time.Time      `json:"uploaded_at" gorm:"not null"`
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	DeletedAt    gorm.DeletedAt `json:"-" gorm:"index"`
}

// Dividend represents a dividend declaration/payment
type Dividend struct {
	ID              uint           `json:"id" gorm:"primaryKey"`
	Amount          float64        `json:"amount" gorm:"not null"`
	DeclarationDate time.Time      `json:"declaration_date" gorm:"not null"`
	PaymentDate     *time.Time     `json:"payment_date"`
	Status          string         `json:"status" gorm:"not null;default:'declared'"` // declared, paid
	Notes           *string        `json:"notes"`
	CompanyID       uint           `json:"company_id" gorm:"not null"`
	Company         Company        `json:"company,omitempty" gorm:"foreignKey:CompanyID"`
	CreatedAt       time.Time      `json:"created_at"`
	UpdatedAt       time.Time      `json:"updated_at"`
	DeletedAt       gorm.DeletedAt `json:"-" gorm:"index"`
}

// IncomeEntry represents an income entry (from clients or owner capital)
type IncomeEntry struct {
	ID          uint           `json:"id" gorm:"primaryKey"`
	Description string         `json:"description" gorm:"not null"`
	Amount      float64        `json:"amount" gorm:"not null"`
	HSTAmount   float64        `json:"hst_amount" gorm:"not null"`
	Total       float64        `json:"total" gorm:"not null"`
	IncomeType  string         `json:"income_type" gorm:"not null"` // "client", "capital", "other"
	ClientID    *uint          `json:"client_id"`                   // Optional, only for client income
	Client      *Client        `json:"client,omitempty" gorm:"foreignKey:ClientID"`
	IncomeDate  time.Time      `json:"income_date" gorm:"not null"`
	CompanyID   uint           `json:"company_id" gorm:"not null"`
	Company     Company        `json:"company,omitempty" gorm:"foreignKey:CompanyID"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `json:"-" gorm:"index"`
}

// HSTPayment represents HST payments made to CRA
type HSTPayment struct {
	ID          uint           `json:"id" gorm:"primaryKey"`
	Amount      float64        `json:"amount" gorm:"not null"`
	PaymentDate time.Time      `json:"payment_date" gorm:"not null"`
	PeriodStart time.Time      `json:"period_start" gorm:"not null"`
	PeriodEnd   time.Time      `json:"period_end" gorm:"not null"`
	Reference   *string        `json:"reference"` // CRA reference number
	Notes       *string        `json:"notes"`
	CompanyID   uint           `json:"company_id" gorm:"not null"`
	Company     Company        `json:"company,omitempty" gorm:"foreignKey:CompanyID"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `json:"-" gorm:"index"`
}

// TaxReturn represents an annual tax return
type TaxReturn struct {
	ID                 uint           `json:"id" gorm:"primaryKey"`
	FiscalYear         int            `json:"fiscal_year" gorm:"not null"`
	GrossIncome        float64        `json:"gross_income" gorm:"not null"`
	TotalExpenses      float64        `json:"total_expenses" gorm:"not null"`
	NetIncomeBeforeTax float64        `json:"net_income_before_tax" gorm:"not null"`
	SmallBusinessTax   float64        `json:"small_business_tax" gorm:"not null"`
	NetIncomeAfterTax  float64        `json:"net_income_after_tax" gorm:"not null"`
	HSTCollected       float64        `json:"hst_collected" gorm:"not null"`
	HSTPaid            float64        `json:"hst_paid" gorm:"not null"`
	HSTRemittance      float64        `json:"hst_remittance" gorm:"not null"`
	RetainedEarnings   float64        `json:"retained_earnings" gorm:"not null"`
	CompanyID          uint           `json:"company_id" gorm:"not null"`
	Company            Company        `json:"company,omitempty" gorm:"foreignKey:CompanyID"`
	CreatedAt          time.Time      `json:"created_at"`
	UpdatedAt          time.Time      `json:"updated_at"`
	DeletedAt          gorm.DeletedAt `json:"-" gorm:"index"`
}

// LoginRequest represents a login request
type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

// RegisterRequest represents a user registration request
type RegisterRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
	Name     string `json:"name" binding:"required"`
}

// LoginResponse represents a login response
type LoginResponse struct {
	Token string `json:"token"`
	User  User   `json:"user"`
}

// CreateUserRequest represents a request to create a user
type CreateUserRequest struct {
	Email     string `json:"email" binding:"required,email"`
	Password  string `json:"password" binding:"required,min=6"`
	Name      string `json:"name" binding:"required"`
	Role      string `json:"role" binding:"required,oneof=admin accountant viewer"`
	CompanyID uint   `json:"company_id" binding:"required"`
}

// UpdateUserRequest represents a request to update a user
type UpdateUserRequest struct {
	Email     *string `json:"email,omitempty"`
	Name      *string `json:"name,omitempty"`
	Role      *string `json:"role,omitempty" binding:"omitempty,oneof=admin accountant viewer"`
	CompanyID *uint   `json:"company_id,omitempty"`
}

// CreateCompanyRequest represents a request to create a company
type CreateCompanyRequest struct {
	Name              string    `json:"name" binding:"required"`
	BusinessNumber    string    `json:"business_number" binding:"required"`
	HSTNumber         *string   `json:"hst_number,omitempty"`
	HSTRegistered     bool      `json:"hst_registered"`
	FiscalYearEnd     time.Time `json:"fiscal_year_end" binding:"required"`
	SmallBusinessRate float64   `json:"small_business_rate" binding:"required,min=0,max=1"`
	HSTRate           float64   `json:"hst_rate" binding:"required,min=0,max=1"`
}

// UpdateCompanyRequest represents a request to update a company
type UpdateCompanyRequest struct {
	Name              *string    `json:"name,omitempty"`
	BusinessNumber    *string    `json:"business_number,omitempty"`
	HSTNumber         *string    `json:"hst_number,omitempty"`
	HSTRegistered     *bool      `json:"hst_registered,omitempty"`
	FiscalYearEnd     *time.Time `json:"fiscal_year_end,omitempty"`
	SmallBusinessRate *float64   `json:"small_business_rate,omitempty" binding:"omitempty,min=0,max=1"`
	HSTRate           *float64   `json:"hst_rate,omitempty" binding:"omitempty,min=0,max=1"`
}

// CreateIncomeEntryRequest represents a request to create an income entry
type CreateIncomeEntryRequest struct {
	Description string  `json:"description" binding:"required"`
	Amount      float64 `json:"amount" binding:"required,min=0"`
	IncomeType  string  `json:"income_type" binding:"required,oneof=client capital other"`
	ClientID    *uint   `json:"client_id,omitempty"`
	IncomeDate  string  `json:"income_date" binding:"required"`
	CompanyID   uint    `json:"company_id" binding:"required"`
}

// UpdateIncomeEntryRequest represents a request to update an income entry
type UpdateIncomeEntryRequest struct {
	Description *string  `json:"description,omitempty"`
	Amount      *float64 `json:"amount,omitempty" binding:"omitempty,min=0"`
	IncomeType  *string  `json:"income_type,omitempty" binding:"omitempty,oneof=client capital other"`
	ClientID    *uint    `json:"client_id,omitempty"`
	IncomeDate  *string  `json:"income_date,omitempty"`
}

// CreateHSTPaymentRequest represents a request to create an HST payment
type CreateHSTPaymentRequest struct {
	Amount      float64   `json:"amount" binding:"required,min=0"`
	PaymentDate time.Time `json:"payment_date" binding:"required"`
	PeriodStart time.Time `json:"period_start" binding:"required"`
	PeriodEnd   time.Time `json:"period_end" binding:"required"`
	Reference   *string   `json:"reference,omitempty"`
	Notes       *string   `json:"notes,omitempty"`
	CompanyID   uint      `json:"company_id" binding:"required"`
}

// UpdateHSTPaymentRequest represents a request to update an HST payment
type UpdateHSTPaymentRequest struct {
	Amount      *float64   `json:"amount,omitempty" binding:"omitempty,min=0"`
	PaymentDate *time.Time `json:"payment_date,omitempty"`
	PeriodStart *time.Time `json:"period_start,omitempty"`
	PeriodEnd   *time.Time `json:"period_end,omitempty"`
	Reference   *string    `json:"reference,omitempty"`
	Notes       *string    `json:"notes,omitempty"`
}

// CapitalAsset represents a capital asset that must be depreciated
type CapitalAsset struct {
	ID                      uint                `json:"id" gorm:"primaryKey"`
	Description             string              `json:"description" gorm:"not null"`
	CategoryID              uint                `json:"category_id" gorm:"not null"`
	Category                ExpenseCategory     `json:"category,omitempty" gorm:"foreignKey:CategoryID"`
	PurchaseDate            time.Time           `json:"purchase_date" gorm:"not null"`
	PurchaseAmount          float64             `json:"purchase_amount" gorm:"not null"`
	HSTPaid                 float64             `json:"hst_paid" gorm:"not null"`
	TotalCost               float64             `json:"total_cost" gorm:"not null"`         // Purchase amount + HST
	CCAClass                string              `json:"cca_class" gorm:"not null"`          // CCA class (e.g., "10", "12", "50")
	CCARate                 float64             `json:"cca_rate" gorm:"not null"`           // CCA rate as decimal (e.g., 0.20 for 20%)
	DepreciableAmount       float64             `json:"depreciable_amount" gorm:"not null"` // Amount eligible for depreciation
	AccumulatedDepreciation float64             `json:"accumulated_depreciation" gorm:"default:0"`
	BookValue               float64             `json:"book_value" gorm:"not null"` // Total cost - accumulated depreciation
	DisposalDate            *time.Time          `json:"disposal_date"`
	DisposalAmount          *float64            `json:"disposal_amount"`
	PaidBy                  string              `json:"paid_by" gorm:"not null;default:'corp'"` // "corp" or "owner"
	ReceiptAttached         bool                `json:"receipt_attached" gorm:"default:false"`
	CompanyID               uint                `json:"company_id" gorm:"not null"`
	Company                 Company             `json:"company,omitempty" gorm:"foreignKey:CompanyID"`
	DepreciationEntries     []DepreciationEntry `json:"depreciation_entries,omitempty" gorm:"foreignKey:CapitalAssetID"`
	CreatedAt               time.Time           `json:"created_at"`
	UpdatedAt               time.Time           `json:"updated_at"`
	DeletedAt               gorm.DeletedAt      `json:"-" gorm:"index"`
}

// DepreciationEntry represents a depreciation entry for a capital asset
type DepreciationEntry struct {
	ID                 uint           `json:"id" gorm:"primaryKey"`
	CapitalAssetID     uint           `json:"capital_asset_id" gorm:"not null"`
	CapitalAsset       CapitalAsset   `json:"capital_asset,omitempty" gorm:"foreignKey:CapitalAssetID"`
	FiscalYear         int            `json:"fiscal_year" gorm:"not null"`
	DepreciationAmount float64        `json:"depreciation_amount" gorm:"not null"`
	IsHalfYearRule     bool           `json:"is_half_year_rule" gorm:"default:false"`
	EntryDate          time.Time      `json:"entry_date" gorm:"not null"`
	CompanyID          uint           `json:"company_id" gorm:"not null"`
	Company            Company        `json:"company,omitempty" gorm:"foreignKey:CompanyID"`
	CreatedAt          time.Time      `json:"created_at"`
	UpdatedAt          time.Time      `json:"updated_at"`
	DeletedAt          gorm.DeletedAt `json:"-" gorm:"index"`
}

// CCAClass represents a CCA class with its rate
type CCAClass struct {
	ID          uint           `json:"id" gorm:"primaryKey"`
	ClassNumber string         `json:"class_number" gorm:"uniqueIndex;not null"` // e.g., "10", "12", "50"
	Description string         `json:"description" gorm:"not null"`
	Rate        float64        `json:"rate" gorm:"not null"` // Rate as decimal (e.g., 0.20 for 20%)
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `json:"-" gorm:"index"`
}

// CreateCapitalAssetRequest represents a request to create a capital asset
type CreateCapitalAssetRequest struct {
	Description     string  `json:"description" binding:"required"`
	CategoryID      uint    `json:"category_id" binding:"required"`
	PurchaseDate    string  `json:"purchase_date" binding:"required"`
	PurchaseAmount  float64 `json:"purchase_amount" binding:"required,min=0"`
	HSTPaid         float64 `json:"hst_paid" binding:"min=0"`
	CCAClass        string  `json:"cca_class" binding:"required"`
	PaidBy          string  `json:"paid_by" binding:"required,oneof=corp owner"`
	ReceiptAttached bool    `json:"receipt_attached"`
	CompanyID       uint    `json:"company_id" binding:"required"`
}

// UpdateCapitalAssetRequest represents a request to update a capital asset
type UpdateCapitalAssetRequest struct {
	Description     *string  `json:"description,omitempty"`
	CategoryID      *uint    `json:"category_id,omitempty"`
	PurchaseDate    *string  `json:"purchase_date,omitempty"`
	PurchaseAmount  *float64 `json:"purchase_amount,omitempty" binding:"omitempty,min=0"`
	HSTPaid         *float64 `json:"hst_paid,omitempty" binding:"omitempty,min=0"`
	CCAClass        *string  `json:"cca_class,omitempty"`
	DisposalDate    *string  `json:"disposal_date,omitempty"`
	DisposalAmount  *float64 `json:"disposal_amount,omitempty" binding:"omitempty,min=0"`
	PaidBy          *string  `json:"paid_by,omitempty" binding:"omitempty,oneof=corp owner"`
	ReceiptAttached *bool    `json:"receipt_attached,omitempty"`
}

// OwnerPayment represents a payment made by the corporation to the owner
type OwnerPayment struct {
	ID          uint           `json:"id" gorm:"primaryKey"`
	Description string         `json:"description" gorm:"not null"`
	Amount      float64        `json:"amount" gorm:"not null"`
	PaymentDate time.Time      `json:"payment_date" gorm:"not null"`
	PaymentType string         `json:"payment_type" gorm:"not null"` // "reimbursement", "loan_repayment", "other"
	Reference   *string        `json:"reference"`                    // Check number, transfer reference, etc.
	Notes       *string        `json:"notes"`
	CompanyID   uint           `json:"company_id" gorm:"not null"`
	Company     Company        `json:"company,omitempty" gorm:"foreignKey:CompanyID"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `json:"-" gorm:"index"`
}

// CreateOwnerPaymentRequest represents a request to create an owner payment
type CreateOwnerPaymentRequest struct {
	Description string  `json:"description" binding:"required"`
	Amount      float64 `json:"amount" binding:"required,min=0"`
	PaymentDate string  `json:"payment_date" binding:"required"`
	PaymentType string  `json:"payment_type" binding:"required,oneof=reimbursement loan_repayment other"`
	Reference   *string `json:"reference,omitempty"`
	Notes       *string `json:"notes,omitempty"`
	CompanyID   uint    `json:"company_id" binding:"required"`
}

// UpdateOwnerPaymentRequest represents a request to update an owner payment
type UpdateOwnerPaymentRequest struct {
	Description *string  `json:"description,omitempty"`
	Amount      *float64 `json:"amount,omitempty" binding:"omitempty,min=0"`
	PaymentDate *string  `json:"payment_date,omitempty"`
	PaymentType *string  `json:"payment_type,omitempty" binding:"omitempty,oneof=reimbursement loan_repayment other"`
	Reference   *string  `json:"reference,omitempty"`
	Notes       *string  `json:"notes,omitempty"`
}

// PaginatedResponse represents a paginated API response
type PaginatedResponse[T any] struct {
	Data       []T `json:"data"`
	Total      int `json:"total"`
	Page       int `json:"page"`
	Limit      int `json:"limit"`
	TotalPages int `json:"total_pages"`
}
