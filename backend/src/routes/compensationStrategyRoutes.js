/**
 * Compensation Strategy Routes
 * 
 * API endpoints for managing annual compensation strategies
 */

const express = require('express');
const router = express.Router();
const authenticateUser = require('../middleware/auth');
const { requireCompanyAccess } = require('../middleware/authorization');
const compensationStrategyService = require('../services/compensationStrategyService');

/**
 * GET /api/compensation-strategy/active
 * 
 * Get active strategy for current fiscal year
 * 
 * Query params:
 * - company_id: number (required)
 * - fiscal_year: number (optional, defaults to current year)
 */
router.get('/active', authenticateUser, async (req, res) => {
    try {
        const companyId = parseInt(req.query.company_id || req.user.currentCompanyId);
        const fiscalYear = parseInt(req.query.fiscal_year || new Date().getFullYear());
        const ownerId = req.user.profile.id;

        if (!companyId) {
            return res.status(400).json({ error: 'company_id is required' });
        }

        // Verify company access
        const hasAccess = req.user.memberships?.some(m => m.company_id === companyId) ||
            req.user.profile.company_id === companyId;
        if (!hasAccess) {
            return res.status(403).json({ error: 'Forbidden: Company access denied' });
        }

        const strategy = await compensationStrategyService.getActiveStrategy(
            companyId,
            ownerId,
            fiscalYear,
            req.userClient
        );

        res.json(strategy || { hasStrategy: false });
    } catch (error) {
        console.error('Error fetching active strategy:', error);
        res.status(500).json({ error: error.message || 'Failed to fetch strategy' });
    }
});

/**
 * GET /api/compensation-strategy/progress
 * 
 * Get strategy progress (YTD actuals vs plan)
 * 
 * Query params:
 * - company_id: number (required)
 * - fiscal_year: number (optional, defaults to current year)
 */
router.get('/progress', authenticateUser, async (req, res) => {
    try {
        const companyId = parseInt(req.query.company_id || req.user.currentCompanyId);
        const fiscalYear = parseInt(req.query.fiscal_year || new Date().getFullYear());
        const ownerId = req.user.profile.id;

        if (!companyId) {
            return res.status(400).json({ error: 'company_id is required' });
        }

        // Verify company access
        const hasAccess = req.user.memberships?.some(m => m.company_id === companyId) ||
            req.user.profile.company_id === companyId;
        if (!hasAccess) {
            return res.status(403).json({ error: 'Forbidden: Company access denied' });
        }

        const progress = await compensationStrategyService.getStrategyProgress(
            companyId,
            ownerId,
            fiscalYear,
            req.userClient
        );

        res.json(progress);
    } catch (error) {
        console.error('Error fetching strategy progress:', error);
        res.status(500).json({ error: error.message || 'Failed to fetch progress' });
    }
});

/**
 * POST /api/compensation-strategy
 * 
 * Create or update strategy
 * 
 * Body:
 * {
 *   company_id: number,
 *   fiscal_year: number,
 *   goal_type: 'net_cash' | 'maximize_rrsp' | 'maximize_cpp' | 'minimize_tax',
 *   target_net_cash?: number,
 *   planned_salary: number,
 *   planned_eligible_dividends: number,
 *   planned_non_eligible_dividends: number,
 *   projected_net_cash?: number,
 *   projected_total_tax?: number,
 *   projected_rrsp_room?: number,
 *   projected_cpp_contributions?: number,
 *   projected_effective_tax_rate?: number,
 *   corporate_net_income?: number,
 *   rdtoh_balance?: number,
 *   other_personal_income?: number,
 *   province?: string
 * }
 */
router.post('/', authenticateUser, async (req, res) => {
    try {
        const {
            company_id,
            fiscal_year,
            goal_type,
            target_net_cash,
            planned_salary,
            planned_eligible_dividends,
            planned_non_eligible_dividends,
            projected_net_cash,
            projected_total_tax,
            projected_rrsp_room,
            projected_cpp_contributions,
            projected_effective_tax_rate,
            corporate_net_income,
            rdtoh_balance,
            other_personal_income,
            province
        } = req.body;

        const companyId = parseInt(company_id || req.user.currentCompanyId);
        const fiscalYear = parseInt(fiscal_year || new Date().getFullYear());
        const ownerId = req.user.profile.id;

        if (!companyId) {
            return res.status(400).json({ error: 'company_id is required' });
        }

        // Verify company access
        const hasAccess = req.user.memberships?.some(m => m.company_id === companyId) ||
            req.user.profile.company_id === companyId;
        if (!hasAccess) {
            return res.status(403).json({ error: 'Forbidden: Company access denied' });
        }

        // Validate required fields
        if (!goal_type || planned_salary === undefined || planned_eligible_dividends === undefined || planned_non_eligible_dividends === undefined) {
            return res.status(400).json({
                error: 'goal_type, planned_salary, planned_eligible_dividends, and planned_non_eligible_dividends are required'
            });
        }

        const strategyData = {
            company_id: companyId,
            owner_id: ownerId,
            fiscal_year: fiscalYear,
            goal_type,
            target_net_cash: target_net_cash ? parseFloat(target_net_cash) : null,
            planned_salary: parseFloat(planned_salary || 0),
            planned_eligible_dividends: parseFloat(planned_eligible_dividends || 0),
            planned_non_eligible_dividends: parseFloat(planned_non_eligible_dividends || 0),
            projected_net_cash: projected_net_cash ? parseFloat(projected_net_cash) : null,
            projected_total_tax: projected_total_tax ? parseFloat(projected_total_tax) : null,
            projected_rrsp_room: projected_rrsp_room ? parseFloat(projected_rrsp_room) : null,
            projected_cpp_contributions: projected_cpp_contributions ? parseFloat(projected_cpp_contributions) : null,
            projected_effective_tax_rate: projected_effective_tax_rate ? parseFloat(projected_effective_tax_rate) : null,
            corporate_net_income: corporate_net_income ? parseFloat(corporate_net_income) : null,
            rdtoh_balance: rdtoh_balance ? parseFloat(rdtoh_balance) : null,
            other_personal_income: other_personal_income ? parseFloat(other_personal_income) : null,
            province: province || 'ON',
            status: 'active'
        };

        const strategy = await compensationStrategyService.upsertStrategy(
            strategyData,
            req.userClient
        );

        res.json(strategy);
    } catch (error) {
        console.error('Error upserting strategy:', error);
        res.status(500).json({ error: error.message || 'Failed to save strategy' });
    }
});

/**
 * GET /api/compensation-strategy/recommend-withdrawal
 * 
 * Get withdrawal recommendation based on strategy
 * 
 * Query params:
 * - company_id: number (required)
 * - fiscal_year: number (optional, defaults to current year)
 * - amount: number (required) - the withdrawal amount
 */
router.get('/recommend-withdrawal', authenticateUser, async (req, res) => {
    try {
        const companyId = parseInt(req.query.company_id || req.user.currentCompanyId);
        const fiscalYear = parseInt(req.query.fiscal_year || new Date().getFullYear());
        const amount = parseFloat(req.query.amount);
        const ownerId = req.user.profile.id;

        if (!companyId) {
            return res.status(400).json({ error: 'company_id is required' });
        }

        if (!amount || amount <= 0) {
            return res.status(400).json({ error: 'amount is required and must be positive' });
        }

        // Verify company access
        const hasAccess = req.user.memberships?.some(m => m.company_id === companyId) ||
            req.user.profile.company_id === companyId;
        if (!hasAccess) {
            return res.status(403).json({ error: 'Forbidden: Company access denied' });
        }

        const recommendation = await compensationStrategyService.getWithdrawalRecommendation(
            companyId,
            ownerId,
            fiscalYear,
            amount,
            req.userClient
        );

        res.json(recommendation);
    } catch (error) {
        console.error('Error getting withdrawal recommendation:', error);
        res.status(500).json({ error: error.message || 'Failed to get recommendation' });
    }
});

/**
 * POST /api/compensation-strategy/generate-options
 * 
 * Generate multiple strategy options based on user goals
 * 
 * Body:
 * {
 *   company_id: number,
 *   fiscal_year: number,
 *   corporate_net_income: number,
 *   rdtoh_balance: number,
 *   other_personal_income: number,
 *   province: string,
 *   selected_goals: string[],
 *   target_cash?: number
 * }
 * 
 * Note: This endpoint is a placeholder. Strategy generation is currently
 * handled on the frontend for better performance and user experience.
 */
router.post('/generate-options', authenticateUser, async (req, res) => {
    try {
        const {
            company_id,
            fiscal_year,
            corporate_net_income,
            rdtoh_balance,
            other_personal_income,
            province,
            selected_goals,
            target_cash
        } = req.body;

        const companyId = parseInt(company_id || req.user.currentCompanyId);
        const fiscalYear = parseInt(fiscal_year || new Date().getFullYear());

        if (!companyId) {
            return res.status(400).json({ error: 'company_id is required' });
        }

        // Verify company access
        const hasAccess = req.user.memberships?.some(m => m.company_id === companyId) ||
            req.user.profile.company_id === companyId;
        if (!hasAccess) {
            return res.status(403).json({ error: 'Forbidden: Company access denied' });
        }

        // Note: Strategy generation is handled on the frontend
        // This endpoint exists for future server-side optimization if needed
        res.json({
            message: 'Strategy generation is handled on the frontend for optimal performance',
            note: 'Use the frontend InteractiveStrategyBuilder component for strategy generation'
        });
    } catch (error) {
        console.error('Error in generate-options:', error);
        res.status(500).json({ error: error.message || 'Failed to generate options' });
    }
});

/**
 * POST /api/compensation-strategy/optimize-custom
 * 
 * Optimize a custom strategy with specific constraints
 * 
 * Body:
 * {
 *   company_id: number,
 *   fiscal_year: number,
 *   corporate_net_income: number,
 *   rdtoh_balance: number,
 *   other_personal_income: number,
 *   province: string,
 *   salary: number,
 *   eligible_dividends: number,
 *   non_eligible_dividends: number
 * }
 * 
 * Note: This endpoint is a placeholder. Custom optimization is currently
 * handled on the frontend for better performance and user experience.
 */
router.post('/optimize-custom', authenticateUser, async (req, res) => {
    try {
        const {
            company_id,
            fiscal_year,
            corporate_net_income,
            rdtoh_balance,
            other_personal_income,
            province,
            salary,
            eligible_dividends,
            non_eligible_dividends
        } = req.body;

        const companyId = parseInt(company_id || req.user.currentCompanyId);
        const fiscalYear = parseInt(fiscal_year || new Date().getFullYear());

        if (!companyId) {
            return res.status(400).json({ error: 'company_id is required' });
        }

        // Verify company access
        const hasAccess = req.user.memberships?.some(m => m.company_id === companyId) ||
            req.user.profile.company_id === companyId;
        if (!hasAccess) {
            return res.status(403).json({ error: 'Forbidden: Company access denied' });
        }

        // Note: Custom optimization is handled on the frontend
        // This endpoint exists for future server-side optimization if needed
        res.json({
            message: 'Custom optimization is handled on the frontend for optimal performance',
            note: 'Use the frontend InteractiveStrategyBuilder component for custom optimization'
        });
    } catch (error) {
        console.error('Error in optimize-custom:', error);
        res.status(500).json({ error: error.message || 'Failed to optimize custom strategy' });
    }
});

module.exports = router;
