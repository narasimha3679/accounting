package data

import "testing"

func TestFilterSQL_RejectsInvalidOperator(t *testing.T) {
	_, _, _, err := filterSQL([]Filter{
		{Column: "company_id", Op: "contains", Value: 1},
	}, 1)
	if err == nil {
		t.Fatal("expected error for invalid operator")
	}
}

func TestFilterSQL_RejectsInvalidColumn(t *testing.T) {
	_, _, _, err := filterSQL([]Filter{
		{Column: "company_id;DROP TABLE app_users", Op: "eq", Value: 1},
	}, 1)
	if err == nil {
		t.Fatal("expected error for invalid column")
	}
}
