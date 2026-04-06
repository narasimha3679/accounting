package data

type Table struct {
	Name          string
	FromSQL       string
	CompanyExpr   string // for ModeCompanyID / ModeEmployeeScoped (e.company_id)
	Mode          TableMode
	ReadOnly      bool
}

type TableMode int

const (
	ModeCompanyID TableMode = iota
	ModeMembershipCompanies
	ModeProfileSelf
	ModeUserCompanies
	ModePushUser
	ModeReference
	ModeEmployeeScoped
)

func Registry() map[string]Table {
	reg := map[string]Table{}
	put := func(tbl Table) {
		if tbl.CompanyExpr == "" && (tbl.Mode == ModeCompanyID || tbl.Mode == ModeEmployeeScoped) {
			if tbl.Mode == ModeEmployeeScoped {
				tbl.CompanyExpr = "e.company_id"
			} else {
				tbl.CompanyExpr = "t.company_id"
			}
		}
		reg[tbl.Name] = tbl
	}

	simple := []string{
		"clients", "employees", "employee_schedules", "timesheets", "time_entries",
		"invoices", "recurring_invoices", "expense_categories", "expenses", "expense_files",
		"dividends", "dividend_recipients", "salaries", "tax_returns", "income_entries",
		"hst_payments", "capital_assets", "depreciation_entries", "owner_payments",
		"payroll_settings", "benefit_types", "pay_runs", "remittance_periods",
		"roe_records", "compensation_strategies", "employee_ytd", "pending_shareholder_invites",
		"t4_slips",
	}
	for _, n := range simple {
		put(Table{Name: n, FromSQL: n + " t", Mode: ModeCompanyID})
	}

	put(Table{Name: "companies", FromSQL: "companies t", Mode: ModeMembershipCompanies})
	put(Table{Name: "profiles", FromSQL: "profiles t", Mode: ModeProfileSelf})
	put(Table{Name: "user_companies", FromSQL: "user_companies t", Mode: ModeUserCompanies})
	put(Table{Name: "push_subscriptions", FromSQL: "push_subscriptions t", Mode: ModePushUser})

	for _, n := range []string{
		"tax_constants", "tax_rates", "provincial_tax_constants", "dividend_tax_constants",
		"ontario_health_premium", "cca_classes",
	} {
		put(Table{Name: n, FromSQL: n + " t", Mode: ModeReference, ReadOnly: true})
	}

	put(Table{
		Name:        "invoice_items",
		FromSQL:     "invoice_items t JOIN invoices i ON i.id = t.invoice_id",
		CompanyExpr: "i.company_id",
		Mode:        ModeCompanyID,
	})
	put(Table{
		Name:        "pay_run_items",
		FromSQL:     "pay_run_items t JOIN pay_runs r ON r.id = t.pay_run_id",
		CompanyExpr: "r.company_id",
		Mode:        ModeCompanyID,
	})
	put(Table{
		Name:        "pay_run_item_deductions",
		FromSQL:     "pay_run_item_deductions t JOIN pay_run_items pri ON pri.id = t.pay_run_item_id JOIN pay_runs r ON r.id = pri.pay_run_id",
		CompanyExpr: "r.company_id",
		Mode:        ModeCompanyID,
	})
	put(Table{
		Name:    "employee_benefits",
		FromSQL: "employee_benefits t JOIN employees e ON e.id = t.employee_id",
		Mode:    ModeEmployeeScoped,
	})
	put(Table{
		Name:    "employee_tax_credits",
		FromSQL: "employee_tax_credits t JOIN employees e ON e.id = t.employee_id",
		Mode:    ModeEmployeeScoped,
	})

	return reg
}
