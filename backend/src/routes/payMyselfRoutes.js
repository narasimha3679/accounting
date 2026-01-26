/**
 * Pay Myself Optimizer Routes
 * 
 * API endpoints for withdrawal optimization calculations
 */

const express = require('express');
const router = express.Router();
const { optimizeWithdrawal } = require('../services/payMyselfOptimizer');

/**
 * POST /api/pay-myself/optimize
 * 
 * Calculate optimal withdrawal strategy
 * 
 * Request body:
 * {
 *   corporateCost: number,        // Total amount corporation will spend
 *   owedToOwner: number,          // From owner_payments balance
 *   province: string,             // Default from company settings, e.g. 'ON'
 *   taxYear: number,              // Default current year
 *   ytdPersonalIncome: number,    // Optional: for marginal rate accuracy
 *   dividendType: string          // 'eligible' or 'non_eligible' (default)
 * }
 */
router.post('/optimize', async (req, res) => {
    try {
        const {
            corporateCost,
            owedToOwner = 0,
            province = 'ON',
            taxYear = new Date().getFullYear(),
            ytdPersonalIncome = 0,
            dividendType = 'non_eligible'
        } = req.body;

        // Validation
        if (corporateCost === undefined || corporateCost === null) {
            return res.status(400).json({
                error: 'corporateCost is required'
            });
        }

        if (typeof corporateCost !== 'number' || corporateCost < 0) {
            return res.status(400).json({
                error: 'corporateCost must be a non-negative number'
            });
        }

        if (dividendType && !['eligible', 'non_eligible'].includes(dividendType)) {
            return res.status(400).json({
                error: 'dividendType must be "eligible" or "non_eligible"'
            });
        }

        // Calculate optimization
        const result = await optimizeWithdrawal({
            corporateCost,
            owedToOwner,
            province,
            taxYear,
            ytdPersonalIncome,
            dividendType
        });

        res.json(result);
    } catch (error) {
        console.error('Error in pay-myself optimize:', error);
        res.status(500).json({
            error: 'Failed to calculate optimization',
            message: error.message
        });
    }
});

/**
 * GET /api/pay-myself/health
 * 
 * Health check for the optimizer service
 */
router.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'pay-myself-optimizer' });
});

/**
 * GET /api/pay-myself/ytd-income/:companyId/:memberId
 * 
 * Fetch year-to-date salaries and dividends for a company member
 * This is used to auto-populate YTD income in the optimizer
 * 
 * Query params:
 *   fiscalYear: number (optional, defaults to current year)
 */
router.get('/ytd-income/:companyId/:memberId', async (req, res) => {
    try {
        const { companyId, memberId } = req.params;
        const fiscalYear = parseInt(req.query.fiscalYear) || new Date().getFullYear();

        const { createClient } = require('@supabase/supabase-js');
        const supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        // Get fiscal year date range (assuming calendar year for now)
        // TODO: Could be enhanced to use company's fiscal year end
        const startDate = `${fiscalYear}-01-01`;
        const endDate = `${fiscalYear}-12-31`;

        // Fetch salaries for this member (by employee_id linked to member)
        // First, find employee record for this member
        const { data: employee } = await supabase
            .from('employees')
            .select('id')
            .eq('company_id', companyId)
            .eq('user_id', memberId)
            .maybeSingle();

        let ytdSalaries = 0;
        if (employee) {
            const { data: salaries } = await supabase
                .from('salaries')
                .select('amount')
                .eq('company_id', companyId)
                .eq('employee_id', employee.id)
                .gte('payment_date', startDate)
                .lte('payment_date', endDate)
                .in('status', ['paid', 'pending']);

            ytdSalaries = (salaries || []).reduce((sum, s) => sum + (s.amount || 0), 0);
        }

        // Fetch dividends for this member
        // Dividends are linked to shareholder_id or we look at company-level dividends
        const { data: dividends } = await supabase
            .from('dividends')
            .select('amount, shareholder_id')
            .eq('company_id', companyId)
            .eq('fiscal_year', fiscalYear)
            .in('status', ['paid', 'declared']);

        // For now, sum all dividends (TODO: filter by shareholder when multi-shareholder is implemented)
        let ytdDividends = (dividends || []).reduce((sum, d) => sum + (d.amount || 0), 0);

        res.json({
            companyId: parseInt(companyId),
            memberId,
            fiscalYear,
            ytdSalaries: Math.round(ytdSalaries * 100) / 100,
            ytdDividends: Math.round(ytdDividends * 100) / 100,
            total: Math.round((ytdSalaries + ytdDividends) * 100) / 100
        });
    } catch (error) {
        console.error('Error fetching YTD income:', error);
        res.status(500).json({
            error: 'Failed to fetch YTD income',
            message: error.message
        });
    }
});

module.exports = router;
