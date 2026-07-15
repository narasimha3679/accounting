/**
 * Pay Myself Optimizer Routes
 *
 * DEPRECATED: Optimization and YTD income now run client-side via
 * frontend/src/lib/payMyselfOptimizer.ts and direct Supabase reads.
 * These routes remain temporarily for backward compatibility / health checks.
 */

const express = require('express');
const router = express.Router();
const { optimizeWithdrawal } = require('../services/payMyselfOptimizer');

/**
 * POST /api/pay-myself/optimize
 *
 * @deprecated Use client-side optimizeWithdrawal() instead.
 */
router.post('/optimize', async (req, res) => {
    try {
        res.set('Deprecation', 'true');
        res.set('Sunset', 'Sat, 01 Aug 2026 00:00:00 GMT');

        const {
            corporateCost,
            owedToOwner = 0,
            province = 'ON',
            taxYear = new Date().getFullYear(),
            ytdPersonalIncome = 0,
            dividendType = 'non_eligible'
        } = req.body;

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
 */
router.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'pay-myself-optimizer',
        deprecated: true,
        message: 'Optimization moved client-side; prefer frontend payMyselfOptimizer.ts',
    });
});

/**
 * GET /api/pay-myself/ytd-income/:companyId/:memberId
 *
 * @deprecated Use api.getYtdIncome() (direct Supabase) instead.
 */
router.get('/ytd-income/:companyId/:memberId', async (req, res) => {
    try {
        res.set('Deprecation', 'true');
        res.set('Sunset', 'Sat, 01 Aug 2026 00:00:00 GMT');

        const { companyId, memberId } = req.params;
        const fiscalYear = parseInt(req.query.fiscalYear) || new Date().getFullYear();

        const { createClient } = require('@supabase/supabase-js');
        const supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        const startDate = `${fiscalYear}-01-01`;
        const endDate = `${fiscalYear}-12-31`;

        // employees.auth_user_id is UUID; memberId may be profile id or auth uuid
        let employeeQuery = supabase
            .from('employees')
            .select('id')
            .eq('company_id', companyId);

        if (memberId.includes('-')) {
            employeeQuery = employeeQuery.eq('auth_user_id', memberId);
        } else {
            // Legacy: profile id — resolve via profiles.auth_user_id
            const { data: profile } = await supabase
                .from('profiles')
                .select('auth_user_id')
                .eq('id', memberId)
                .maybeSingle();

            if (profile?.auth_user_id) {
                employeeQuery = employeeQuery.eq('auth_user_id', profile.auth_user_id);
            } else {
                employeeQuery = employeeQuery.eq('id', -1); // force empty
            }
        }

        const { data: employee } = await employeeQuery.maybeSingle();

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

        const { data: dividends } = await supabase
            .from('dividends')
            .select('amount, shareholder_id')
            .eq('company_id', companyId)
            .eq('fiscal_year', fiscalYear)
            .in('status', ['paid', 'declared']);

        const ytdDividends = (dividends || []).reduce((sum, d) => sum + (d.amount || 0), 0);

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
