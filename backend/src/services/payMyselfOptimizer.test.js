/**
 * Validation Tests for Pay Myself Optimizer
 * 
 * This file contains test cases with known CRA examples to validate
 * calculation accuracy. Run with: node payMyselfOptimizer.test.js
 * 
 * Note: These tests require database connection and should be run
 * against a test database with seeded tax constants.
 */

const {
    calculateSalaryNet,
    calculateDividendNet,
    calculateReimbursementNet,
    optimizeWithdrawal,
    fetchTaxConstants
} = require('./payMyselfOptimizer');

/**
 * Test case structure
 */
class TestCase {
    constructor(name, input, expected, tolerance = 1.0) {
        this.name = name;
        this.input = input;
        this.expected = expected;
        this.tolerance = tolerance; // Allowable difference in dollars
    }

    async run() {
        try {
            const actual = await this.execute();
            const passed = this.validate(actual);
            return {
                name: this.name,
                passed,
                actual,
                expected: this.expected,
                difference: this.calculateDifference(actual)
            };
        } catch (error) {
            return {
                name: this.name,
                passed: false,
                error: error.message
            };
        }
    }

    validate(actual) {
        // Override in subclasses
        return true;
    }

    calculateDifference(actual) {
        // Override in subclasses
        return {};
    }

    async execute() {
        // Override in subclasses
        return {};
    }
}

/**
 * Test Case: Salary Calculation - Basic Example
 * 
 * Corporate cost: $50,000
 * Expected: Net in pocket should be approximately 70-75% of corporate cost
 */
class SalaryBasicTest extends TestCase {
    constructor() {
        super(
            'Salary Calculation - Basic ($50k corporate cost)',
            { corporateCost: 50000, province: 'ON', taxYear: 2026 },
            { 
                minNetInPocket: 32000, // ~64% efficiency
                maxNetInPocket: 38000, // ~76% efficiency
                minEfficiency: 64,
                maxEfficiency: 76
            }
        );
    }

    async execute() {
        const constants = await fetchTaxConstants(this.input.taxYear, this.input.province);
        return calculateSalaryNet(this.input.corporateCost, constants, 0);
    }

    validate(actual) {
        const netInPocket = actual.netInPocket;
        const efficiency = actual.efficiency;
        
        return netInPocket >= this.expected.minNetInPocket &&
               netInPocket <= this.expected.maxNetInPocket &&
               efficiency >= this.expected.minEfficiency &&
               efficiency <= this.expected.maxEfficiency;
    }

    calculateDifference(actual) {
        return {
            netInPocket: actual.netInPocket,
            expectedRange: `${this.expected.minNetInPocket} - ${this.expected.maxNetInPocket}`,
            efficiency: actual.efficiency,
            expectedEfficiencyRange: `${this.expected.minEfficiency}% - ${this.expected.maxEfficiency}%`
        };
    }
}

/**
 * Test Case: Dividend Calculation - Non-Eligible
 * 
 * Dividend amount: $50,000 (non-eligible)
 * Expected: Net in pocket should be approximately 85-92% of dividend amount
 */
class DividendNonEligibleTest extends TestCase {
    constructor() {
        super(
            'Dividend Calculation - Non-Eligible ($50k)',
            { amount: 50000, dividendType: 'non_eligible', province: 'ON', taxYear: 2026 },
            {
                minNetInPocket: 42500, // ~85% efficiency
                maxNetInPocket: 46000, // ~92% efficiency
                minEfficiency: 85,
                maxEfficiency: 92,
                expectedGrossUp: 57500 // $50k * 1.15
            }
        );
    }

    async execute() {
        const constants = await fetchTaxConstants(this.input.taxYear, this.input.province);
        return calculateDividendNet(this.input.amount, constants, this.input.dividendType, 0);
    }

    validate(actual) {
        const netInPocket = actual.netInPocket;
        const efficiency = actual.efficiency;
        const grossUp = actual.grossedUp;
        
        return netInPocket >= this.expected.minNetInPocket &&
               netInPocket <= this.expected.maxNetInPocket &&
               efficiency >= this.expected.minEfficiency &&
               efficiency <= this.expected.maxEfficiency &&
               Math.abs(grossUp - this.expected.expectedGrossUp) < 100; // Allow $100 tolerance
    }

    calculateDifference(actual) {
        return {
            netInPocket: actual.netInPocket,
            expectedRange: `${this.expected.minNetInPocket} - ${this.expected.maxNetInPocket}`,
            efficiency: actual.efficiency,
            expectedEfficiencyRange: `${this.expected.minEfficiency}% - ${this.expected.maxEfficiency}%`,
            grossedUp: actual.grossedUp,
            expectedGrossUp: this.expected.expectedGrossUp
        };
    }
}

/**
 * Test Case: Reimbursement Calculation
 * 
 * Amount: $5,000, Owed: $10,000
 * Expected: Net in pocket = $5,000 (100% efficiency)
 */
class ReimbursementTest extends TestCase {
    constructor() {
        super(
            'Reimbursement Calculation ($5k amount, $10k owed)',
            { amount: 5000, owedToOwner: 10000 },
            {
                netInPocket: 5000,
                efficiency: 100,
                tax: 0
            }
        );
    }

    async execute() {
        return calculateReimbursementNet(this.input.amount, this.input.owedToOwner);
    }

    validate(actual) {
        return actual.netInPocket === this.expected.netInPocket &&
               actual.efficiency === this.expected.efficiency &&
               actual.tax === this.expected.tax;
    }

    calculateDifference(actual) {
        return {
            netInPocket: actual.netInPocket,
            expected: this.expected.netInPocket,
            efficiency: actual.efficiency,
            expectedEfficiency: this.expected.efficiency
        };
    }
}

/**
 * Test Case: Reimbursement Capped by Owed Amount
 * 
 * Amount: $10,000, Owed: $5,000
 * Expected: Net in pocket = $5,000 (capped at owed amount)
 */
class ReimbursementCappedTest extends TestCase {
    constructor() {
        super(
            'Reimbursement Calculation - Capped ($10k amount, $5k owed)',
            { amount: 10000, owedToOwner: 5000 },
            {
                netInPocket: 5000,
                efficiency: 100,
                tax: 0
            }
        );
    }

    async execute() {
        return calculateReimbursementNet(this.input.amount, this.input.owedToOwner);
    }

    validate(actual) {
        return actual.netInPocket === this.expected.netInPocket &&
               actual.efficiency === this.expected.efficiency &&
               actual.tax === this.expected.tax;
    }

    calculateDifference(actual) {
        return {
            netInPocket: actual.netInPocket,
            expected: this.expected.netInPocket
        };
    }
}

/**
 * Test Case: Optimization - Reimbursement + Dividend
 * 
 * Corporate cost: $50,000, Owed: $5,000
 * Expected: Should recommend $5k reimbursement + $45k dividend
 */
class OptimizationTest extends TestCase {
    constructor() {
        super(
            'Optimization - Reimbursement + Dividend ($50k cost, $5k owed)',
            {
                corporateCost: 50000,
                owedToOwner: 5000,
                province: 'ON',
                taxYear: 2026,
                dividendType: 'non_eligible'
            },
            {
                expectedReimbursement: 5000,
                expectedRemaining: 45000,
                recommendationShouldIncludeReimbursement: true
            }
        );
    }

    async execute() {
        return await optimizeWithdrawal(this.input);
    }

    validate(actual) {
        const reimbursement = actual.options.reimbursement.amount;
        const recommendation = actual.recommendation;
        
        return reimbursement === this.expected.expectedReimbursement &&
               recommendation.breakdown.some(b => b.type === 'reimbursement') &&
               recommendation.breakdown.some(b => b.type === 'dividend' || b.type === 'salary');
    }

    calculateDifference(actual) {
        return {
            reimbursementAmount: actual.options.reimbursement.amount,
            expectedReimbursement: this.expected.expectedReimbursement,
            recommendation: actual.recommendation.strategy,
            breakdown: actual.recommendation.breakdown
        };
    }
}

/**
 * Run all tests
 */
async function runTests() {
    console.log('🧪 Running Pay Myself Optimizer Validation Tests\n');
    console.log('=' .repeat(60));
    
    const tests = [
        new SalaryBasicTest(),
        new DividendNonEligibleTest(),
        new ReimbursementTest(),
        new ReimbursementCappedTest(),
        new OptimizationTest()
    ];

    const results = [];
    
    for (const test of tests) {
        console.log(`\n📋 Running: ${test.name}`);
        const result = await test.run();
        results.push(result);
        
        if (result.passed) {
            console.log('✅ PASSED');
            if (result.difference) {
                console.log('   Details:', JSON.stringify(result.difference, null, 2));
            }
        } else {
            console.log('❌ FAILED');
            if (result.error) {
                console.log('   Error:', result.error);
            } else {
                console.log('   Actual:', JSON.stringify(result.actual, null, 2));
                console.log('   Expected:', JSON.stringify(result.expected, null, 2));
                if (result.difference) {
                    console.log('   Difference:', JSON.stringify(result.difference, null, 2));
                }
            }
        }
    }

    console.log('\n' + '='.repeat(60));
    const passed = results.filter(r => r.passed).length;
    const total = results.length;
    console.log(`\n📊 Results: ${passed}/${total} tests passed`);
    
    if (passed === total) {
        console.log('🎉 All tests passed!');
        process.exit(0);
    } else {
        console.log('⚠️  Some tests failed. Review the output above.');
        process.exit(1);
    }
}

// Run tests if executed directly
if (require.main === module) {
    runTests().catch(error => {
        console.error('❌ Test execution failed:', error);
        process.exit(1);
    });
}

module.exports = {
    runTests,
    TestCase,
    SalaryBasicTest,
    DividendNonEligibleTest,
    ReimbursementTest,
    ReimbursementCappedTest,
    OptimizationTest
};
