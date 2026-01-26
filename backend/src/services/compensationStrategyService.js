/**
 * Compensation Strategy Service
 * 
 * Manages annual compensation strategies for business owners.
 * Tracks YTD progress and provides withdrawal recommendations.
 */

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with service role for admin operations
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Get the active compensation strategy for a user/company/year
 */
async function getActiveStrategy(companyId, ownerId, fiscalYear, userClient) {
    const client = userClient || supabase;

    const { data, error } = await client
        .from('compensation_strategies')
        .select('*')
        .eq('company_id', companyId)
        .eq('owner_id', ownerId)
        .eq('fiscal_year', fiscalYear)
        .eq('status', 'active')
        .maybeSingle();

    if (error) throw error;
    return data;
}

/**
 * Get YTD progress against the strategy
 */
async function getStrategyProgress(companyId, ownerId, fiscalYear, userClient) {
    const client = userClient || supabase;

    // 1. Get the active strategy
    const strategy = await getActiveStrategy(companyId, ownerId, fiscalYear, client);
    if (!strategy) {
        return { hasStrategy: false };
    }

    // 2. Get owner's profile to find their email/auth_user_id
    const { data: ownerProfile, error: profileError } = await client
        .from('profiles')
        .select('id, email, auth_user_id')
        .eq('id', ownerId)
        .single();

    if (profileError) throw profileError;

    // 2.5 Get company settings for dividend type
    const { data: company, error: companyError } = await client
        .from('companies')
        .select('default_dividend_type')
        .eq('id', companyId)
        .single();

    if (companyError) throw companyError;
    const defaultDividendType = company.default_dividend_type || 'non_eligible';

    // 3. Get YTD salary paid to this owner
    // Find employee record linked to owner (by email or auth_user_id)
    const { data: employees, error: employeesError } = await client
        .from('employees')
        .select('id')
        .eq('company_id', companyId)
        .or(`email.eq.${ownerProfile.email},auth_user_id.eq.${ownerProfile.auth_user_id}`);

    let ytdSalary = 0;
    if (employees && employees.length > 0) {
        const employeeIds = employees.map(e => e.id);

        // Calculate fiscal year date range
        // For now, assume calendar year (Jan 1 - Dec 31)
        // TODO: Use company's fiscal_year_end to calculate proper range
        const fiscalYearStart = `${fiscalYear}-01-01`;
        const fiscalYearEnd = `${fiscalYear}-12-31`;

        const { data: salaries, error: salariesError } = await client
            .from('salaries')
            .select('amount')
            .eq('company_id', companyId)
            .in('employee_id', employeeIds)
            .gte('payment_date', fiscalYearStart)
            .lte('payment_date', fiscalYearEnd);

        if (salariesError) throw salariesError;
        ytdSalary = salaries?.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0) || 0;
    }

    // 4. Get YTD dividends paid
    // For now, assume all dividends are for the owner (company-level)
    // TODO: Check dividend_recipients table if it exists
    const { data: dividends, error: dividendsError } = await client
        .from('dividends')
        .select('amount, dividend_type')
        .eq('company_id', companyId)
        .eq('fiscal_year', fiscalYear)
        .in('status', ['declared', 'paid']);

    if (dividendsError) throw dividendsError;

    const ytdEligibleDividends = dividends
        ?.filter(d => d.dividend_type === 'eligible')
        .reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0) || 0;

    const ytdNonEligibleDividends = dividends
        ?.filter(d => d.dividend_type === 'non_eligible')
        .reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0) || 0;

    // 5. Calculate progress percentages
    const salaryProgress = strategy.planned_salary > 0
        ? (ytdSalary / parseFloat(strategy.planned_salary)) * 100
        : 0;

    const eligibleDividendProgress = strategy.planned_eligible_dividends > 0
        ? (ytdEligibleDividends / parseFloat(strategy.planned_eligible_dividends)) * 100
        : 0;

    const nonEligibleDividendProgress = strategy.planned_non_eligible_dividends > 0
        ? (ytdNonEligibleDividends / parseFloat(strategy.planned_non_eligible_dividends)) * 100
        : 0;

    // 6. Determine recommendation for next withdrawal
    const recommendation = determineNextWithdrawalType(
        strategy,
        ytdSalary,
        ytdEligibleDividends,
        ytdNonEligibleDividends,
        defaultDividendType
    );

    // 7. Calculate overall progress (weighted average)
    const totalPlanned = parseFloat(strategy.planned_salary) +
        parseFloat(strategy.planned_eligible_dividends) +
        parseFloat(strategy.planned_non_eligible_dividends);
    const totalYtd = ytdSalary + ytdEligibleDividends + ytdNonEligibleDividends;
    const overallProgress = totalPlanned > 0 ? (totalYtd / totalPlanned) * 100 : 0;

    return {
        hasStrategy: true,
        strategy,
        ytd: {
            salary: ytdSalary,
            eligibleDividends: ytdEligibleDividends,
            nonEligibleDividends: ytdNonEligibleDividends,
            total: ytdSalary + ytdEligibleDividends + ytdNonEligibleDividends
        },
        progress: {
            salary: Math.round(salaryProgress * 100) / 100,
            eligibleDividends: Math.round(eligibleDividendProgress * 100) / 100,
            nonEligibleDividends: Math.round(nonEligibleDividendProgress * 100) / 100,
            overall: Math.round(overallProgress * 100) / 100
        },
        recommendation
    };
}

/**
 * Determine what type the next withdrawal should be
 */
function determineNextWithdrawalType(strategy, ytdSalary, ytdEligible, ytdNonEligible, defaultDividendType = 'non_eligible') {
    const salaryRemaining = Math.max(0, parseFloat(strategy.planned_salary) - ytdSalary);
    const eligibleRemaining = Math.max(0, parseFloat(strategy.planned_eligible_dividends) - ytdEligible);
    const nonEligibleRemaining = Math.max(0, parseFloat(strategy.planned_non_eligible_dividends) - ytdNonEligible);

    // Priority: Salary first (for CPP/RRSP), then preferred dividend type
    if (salaryRemaining > 0) {
        return {
            type: 'salary',
            remaining: salaryRemaining,
            reason: 'Take salary to build CPP contributions and RRSP room before year-end.'
        };
    }

    // Only recommend the default dividend type
    if (defaultDividendType === 'non_eligible') {
        if (nonEligibleRemaining > 0) {
            return {
                type: 'non_eligible_dividend',
                remaining: nonEligibleRemaining,
                reason: 'Take non-eligible dividends to trigger RDTOH refund.'
            };
        }
    } else if (defaultDividendType === 'eligible') {
        if (eligibleRemaining > 0) {
            return {
                type: 'eligible_dividend',
                remaining: eligibleRemaining,
                reason: 'Take eligible dividends with favorable tax treatment.'
            };
        }
    } else {
        // Fallback or Mixed
        if (nonEligibleRemaining > 0) {
            return {
                type: 'non_eligible_dividend',
                remaining: nonEligibleRemaining,
                reason: 'Take non-eligible dividends to trigger RDTOH refund.'
            };
        }
        if (eligibleRemaining > 0) {
            return {
                type: 'eligible_dividend',
                remaining: eligibleRemaining,
                reason: 'Take eligible dividends with favorable tax treatment.'
            };
        }
    }

    return {
        type: 'complete',
        remaining: 0,
        reason: 'You have met your annual compensation strategy targets!'
    };
}

/**
 * Upsert (create or update) a compensation strategy
 */
async function upsertStrategy(strategyData, userClient) {
    const client = userClient || supabase;

    const { data, error } = await client
        .from('compensation_strategies')
        .upsert(strategyData, {
            onConflict: 'company_id,owner_id,fiscal_year'
        })
        .select()
        .single();

    if (error) throw error;
    return data;
}

/**
 * Get withdrawal recommendation for a specific amount
 */
async function getWithdrawalRecommendation(companyId, ownerId, fiscalYear, amount, userClient) {
    const progress = await getStrategyProgress(companyId, ownerId, fiscalYear, userClient);

    if (!progress.hasStrategy) {
        return {
            hasStrategy: false,
            message: 'No active strategy. Consider setting up an annual compensation plan.'
        };
    }

    const recommendation = progress.recommendation;

    return {
        hasStrategy: true,
        recommendedType: recommendation.type,
        reason: recommendation.reason,
        suggestedAmount: Math.min(amount, recommendation.remaining),
        message: `Based on your ${fiscalYear} strategy, process this as ${recommendation.type.replace('_', ' ')}.`
    };
}

module.exports = {
    getActiveStrategy,
    getStrategyProgress,
    upsertStrategy,
    getWithdrawalRecommendation
};
