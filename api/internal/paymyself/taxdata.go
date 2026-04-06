
package paymyself

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
)

// TaxBundle matches the legacy JS fetchTaxConstants return shape.
type TaxBundle struct {
	TaxConstants         map[string]any `json:"taxConstants"`
	FederalBrackets      []any          `json:"federalBrackets"`
	ProvincialBrackets   []any          `json:"provincialBrackets"`
	ProvincialConstants  map[string]any `json:"provincialConstants"`
	DividendConstants    []any          `json:"dividendConstants"`
	HealthPremiumTiers   []any          `json:"healthPremiumTiers"`
	Province             string         `json:"province"`
	TaxYear              int            `json:"taxYear"`
}

func LoadTaxBundle(ctx context.Context, pool *pgxpool.Pool, taxYear int, province string) (*TaxBundle, error) {
	b := &TaxBundle{Province: province, TaxYear: taxYear}
	row := pool.QueryRow(ctx, `SELECT to_jsonb(t) FROM tax_constants t WHERE tax_year = $1 LIMIT 1`, taxYear)
	var tc []byte
	if err := row.Scan(&tc); err != nil {
		return nil, fmt.Errorf("tax_constants: %w", err)
	}
	_ = json.Unmarshal(tc, &b.TaxConstants)
	if b.TaxConstants == nil {
		b.TaxConstants = map[string]any{}
	}
	rows, err := pool.Query(ctx, `SELECT to_jsonb(t) FROM tax_rates t WHERE tax_year = $1 AND jurisdiction = 'federal' ORDER BY bracket_number`, taxYear)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var j []byte
		if err := rows.Scan(&j); err != nil {
			return nil, err
		}
		var m map[string]any
		_ = json.Unmarshal(j, &m)
		b.FederalBrackets = append(b.FederalBrackets, m)
	}
	rows2, err := pool.Query(ctx, `SELECT to_jsonb(t) FROM tax_rates t WHERE tax_year = $1 AND jurisdiction = $2 ORDER BY bracket_number`, taxYear, province)
	if err != nil {
		return nil, err
	}
	defer rows2.Close()
	for rows2.Next() {
		var j []byte
		if err := rows2.Scan(&j); err != nil {
			return nil, err
		}
		var m map[string]any
		_ = json.Unmarshal(j, &m)
		b.ProvincialBrackets = append(b.ProvincialBrackets, m)
	}
	row3 := pool.QueryRow(ctx, `SELECT to_jsonb(t) FROM provincial_tax_constants t WHERE tax_year = $1 AND province = $2 LIMIT 1`, taxYear, province)
	var pc []byte
	if err := row3.Scan(&pc); err == nil {
		_ = json.Unmarshal(pc, &b.ProvincialConstants)
	}
	if b.ProvincialConstants == nil {
		b.ProvincialConstants = map[string]any{}
	}
	rows4, err := pool.Query(ctx, `SELECT to_jsonb(t) FROM dividend_tax_constants t WHERE tax_year = $1 AND province = ANY($2::text[])`,
		taxYear, []string{"federal", province})
	if err != nil {
		return nil, err
	}
	defer rows4.Close()
	for rows4.Next() {
		var j []byte
		if err := rows4.Scan(&j); err != nil {
			return nil, err
		}
		var m map[string]any
		_ = json.Unmarshal(j, &m)
		b.DividendConstants = append(b.DividendConstants, m)
	}
	if province == "ON" {
		rows5, err := pool.Query(ctx, `SELECT to_jsonb(t) FROM ontario_health_premium t WHERE tax_year = $1 ORDER BY min_income`, taxYear)
		if err == nil {
			defer rows5.Close()
			for rows5.Next() {
				var j []byte
				if err := rows5.Scan(&j); err != nil {
					return nil, err
				}
				var m map[string]any
				_ = json.Unmarshal(j, &m)
				b.HealthPremiumTiers = append(b.HealthPremiumTiers, m)
			}
		}
	}
	return b, nil
}
