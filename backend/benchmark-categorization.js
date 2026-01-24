require('dotenv').config();

/**
 * Benchmark script to compare sequential vs parallel batch processing
 * Mocks Gemini API calls to simulate 1-second delay per batch
 */

// Mock transaction data generator
const generateMockTransactions = (count) => {
    const transactions = [];
    for (let i = 0; i < count; i++) {
        transactions.push({
            date: `2024-01-${String(i % 28 + 1).padStart(2, '0')}`,
            description: `Transaction ${i + 1} - Test purchase`,
            amount: Math.random() * 1000 + 10,
        });
    }
    return transactions;
};

// Mock categories
const mockCategories = [
    { id: 1, name: 'Office Supplies' },
    { id: 2, name: 'Meals & Entertainment' },
    { id: 3, name: 'Vehicle & Automobile' },
    { id: 4, name: 'Travel' },
    { id: 5, name: 'Uncategorized' },
];

// Mock Gemini model with 1-second delay
const createMockModel = () => {
    return {
        generateContent: async (prompt) => {
            // Simulate API call delay (1 second per batch)
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Mock response - return a simple categorized result
            const transactions = JSON.parse(prompt.match(/TRANSACTIONS TO CATEGORIZE:\s*(\[[\s\S]*\])/)?.[1] || '[]');
            
            const categorized = transactions.map((t, idx) => ({
                category: mockCategories[idx % mockCategories.length].name,
                category_id: mockCategories[idx % mockCategories.length].id,
                hst_paid: parseFloat((t.amount * 0.13).toFixed(2)),
                suggested_description: t.description,
                deduction_percentage: 1.0,
            }));

            return {
                response: {
                    text: () => JSON.stringify(categorized),
                },
            };
        },
    };
};

// Sequential processing (original implementation)
const categorizeTransactionsSequential = async (transactions, categories = []) => {
    const batchSize = 50;
    const batches = [];
    
    for (let i = 0; i < transactions.length; i += batchSize) {
        batches.push(transactions.slice(i, i + batchSize));
    }

    const categorizedTransactions = [];
    const mockModel = createMockModel();

    for (const batch of batches) {
        const prompt = `TRANSACTIONS TO CATEGORIZE:\n${JSON.stringify(batch, null, 2)}`;
        const result = await mockModel.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        const categorized = JSON.parse(text);
        categorizedTransactions.push(...categorized);
    }

    return categorizedTransactions;
};

// Parallel processing with concurrency limit (new implementation)
const processBatchesWithConcurrency = async (batches, processFn, concurrencyLimit = 3) => {
    const results = new Array(batches.length);
    const executing = [];

    for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        
        const promise = (async () => {
            try {
                const result = await processFn(batch);
                return { index: i, result, error: null };
            } catch (error) {
                return { index: i, result: null, error };
            }
        })();

        executing.push(promise);

        if (executing.length >= concurrencyLimit) {
            const completed = await Promise.race(executing);
            
            const completedIndex = executing.indexOf(completed);
            if (completedIndex > -1) {
                executing.splice(completedIndex, 1);
            }
            
            if (completed.error) {
                throw completed.error;
            }
            results[completed.index] = completed.result;
        }
    }

    const remaining = await Promise.all(executing);
    for (const item of remaining) {
        if (item.error) {
            throw item.error;
        }
        results[item.index] = item.result;
    }

    return results;
};

const categorizeTransactionsParallel = async (transactions, categories = [], concurrencyLimit = 3) => {
    const batchSize = 50;
    const batches = [];
    
    for (let i = 0; i < transactions.length; i += batchSize) {
        batches.push(transactions.slice(i, i + batchSize));
    }

    const mockModel = createMockModel();

    const batchResults = await processBatchesWithConcurrency(
        batches,
        async (batch) => {
            const prompt = `TRANSACTIONS TO CATEGORIZE:\n${JSON.stringify(batch, null, 2)}`;
            const result = await mockModel.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            return JSON.parse(text);
        },
        concurrencyLimit
    );

    return batchResults.flat();
};

// Benchmark function
const runBenchmark = async (transactionCount, concurrencyLimit = 3) => {
    console.log('\n' + '='.repeat(60));
    console.log(`Benchmark: ${transactionCount} transactions (${Math.ceil(transactionCount / 50)} batches)`);
    console.log('='.repeat(60));

    const transactions = generateMockTransactions(transactionCount);
    const batchCount = Math.ceil(transactionCount / 50);

    // Test sequential approach
    console.log('\n📊 Testing Sequential Processing...');
    const startSequential = Date.now();
    await categorizeTransactionsSequential(transactions, mockCategories);
    const timeSequential = Date.now() - startSequential;

    // Test parallel approach
    console.log(`📊 Testing Parallel Processing (concurrency: ${concurrencyLimit})...`);
    const startParallel = Date.now();
    await categorizeTransactionsParallel(transactions, mockCategories, concurrencyLimit);
    const timeParallel = Date.now() - startParallel;

    // Calculate improvement
    const improvement = ((timeSequential - timeParallel) / timeSequential * 100).toFixed(1);
    const speedup = (timeSequential / timeParallel).toFixed(2);

    console.log('\n' + '-'.repeat(60));
    console.log('RESULTS:');
    console.log('-'.repeat(60));
    console.log(`Sequential: ${timeSequential}ms (${(timeSequential / 1000).toFixed(2)}s)`);
    console.log(`Parallel:   ${timeParallel}ms (${(timeParallel / 1000).toFixed(2)}s)`);
    console.log(`Improvement: ${improvement}% faster`);
    console.log(`Speedup: ${speedup}x`);
    console.log('-'.repeat(60));

    return {
        transactionCount,
        batchCount,
        timeSequential,
        timeParallel,
        improvement: parseFloat(improvement),
        speedup: parseFloat(speedup),
    };
};

// Main execution
(async () => {
    console.log('🚀 Transaction Categorization Benchmark');
    console.log('Simulating 1-second delay per batch (mocked Gemini API)');

    const results = [];

    // Test with different transaction counts
    const testCases = [150, 300, 500];
    const concurrencyLimit = parseInt(process.env.GEMINI_BATCH_CONCURRENCY || '3', 10);

    for (const count of testCases) {
        const result = await runBenchmark(count, concurrencyLimit);
        results.push(result);
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('SUMMARY');
    console.log('='.repeat(60));
    console.log('Transaction Count | Batches | Sequential | Parallel | Speedup');
    console.log('-'.repeat(60));
    results.forEach(r => {
        console.log(
            `${String(r.transactionCount).padStart(17)} | ${String(r.batchCount).padStart(7)} | ` +
            `${String(r.timeSequential + 'ms').padStart(10)} | ${String(r.timeParallel + 'ms').padStart(8)} | ` +
            `${r.speedup}x`
        );
    });
    console.log('='.repeat(60));
    console.log('\n✅ Benchmark complete!');
})();
