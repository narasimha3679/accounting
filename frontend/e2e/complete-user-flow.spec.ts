import { test, expect } from '@playwright/test';

// Generate unique test credentials to avoid conflicts
const timestamp = Date.now();
const TEST_EMAIL = `e2e-test-${timestamp}@example.com`;
const TEST_PASSWORD = 'TestPassword123!';
const TEST_NAME = 'E2E Test User';
const TEST_BUSINESS_NUMBER = `123456789${timestamp}`; // Unique business number
const TEST_HST_NUMBER = `123456789RT${timestamp.toString().slice(-4)}`; // Unique HST number

test.describe('Complete User Flow', () => {
    test('complete user journey from registration to all platform actions', async ({ page }) => {
        // ============================================
        // STEP 1: REGISTRATION
        // ============================================
        await page.goto('/login');
        await expect(page.getByRole('heading', { name: /sign in to your account/i })).toBeVisible();

        // Switch to registration
        await page.getByRole('button', { name: /don't have an account/i }).click();
        await expect(page.getByRole('heading', { name: /create your account/i })).toBeVisible();

        // Fill registration form
        await page.getByPlaceholder(/full name/i).fill(TEST_NAME);
        await page.getByPlaceholder(/email address/i).fill(TEST_EMAIL);
        await page.getByPlaceholder(/password/i).fill(TEST_PASSWORD);
        await page.getByRole('button', { name: /create account/i }).click();

        // Wait for redirect after registration
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000); // Give time for auth state to settle

        // ============================================
        // STEP 2: LOGIN WITH REGISTERED CREDENTIALS
        // ============================================
        // After registration, user should be logged in, but if redirected to login, log in
        const currentUrl = page.url();
        if (currentUrl.includes('/login')) {
            await page.getByPlaceholder(/email address/i).fill(TEST_EMAIL);
            await page.getByPlaceholder(/password/i).fill(TEST_PASSWORD);
            await page.getByRole('button', { name: /sign in/i }).click();
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(2000);
        }

        // ============================================
        // STEP 3: COMPANY ONBOARDING
        // ============================================
        // User should be redirected to onboarding if no company exists
        const onboardingHeading = page.getByRole('heading', { name: /set up your company/i });
        const dashboardHeading = page.getByRole('heading', { name: /dashboard/i });

        // Wait for either onboarding or dashboard
        await Promise.race([
            onboardingHeading.waitFor({ timeout: 10000 }).catch(() => null),
            dashboardHeading.waitFor({ timeout: 10000 }).catch(() => null),
        ]);

        // If onboarding is visible, complete it
        if (await onboardingHeading.isVisible().catch(() => false)) {
            // Fill onboarding form
            await page.getByLabel(/company name/i).fill('Test Corporation Inc.');
            await page.getByLabel(/business number/i).fill(TEST_BUSINESS_NUMBER);
            await page.getByLabel(/hst number/i).fill(TEST_HST_NUMBER);

            // Set fiscal year end (today's date)
            const today = new Date();
            const fiscalYearEnd = `${today.getFullYear()}-12-31`;
            await page.getByLabel(/fiscal year end/i).fill(fiscalYearEnd);

            // Enable HST registration - the checkbox is hidden, so click the visible toggle div
            const checkbox = page.locator('input[type="checkbox"]').first();
            if (!(await checkbox.isChecked())) {
                // Find the label that contains the checkbox and click it
                // The label wraps both the checkbox and the visible toggle div
                const label = page.locator('label').filter({ has: checkbox }).first();
                if (await label.count() > 0) {
                    // Click the label which will trigger the checkbox change
                    await label.click();
                    await page.waitForTimeout(500); // Wait for toggle animation
                } else {
                    // Fallback: use force click on checkbox if label not found
                    await checkbox.click({ force: true });
                    await page.waitForTimeout(500);
                }
            }

            // Submit onboarding
            await page.getByRole('button', { name: /save and continue/i }).click();

            // Wait for redirect to dashboard - the page does a full reload after onboarding
            // Wait for either success message or redirect
            await page.waitForLoadState('networkidle');

            // Wait for redirect (onboarding does window.location.href = '/')
            await page.waitForURL(/\/(dashboard|\/)$/, { timeout: 10000 }).catch(() => {
                // If URL doesn't change, wait a bit more and check if we're on dashboard
            });

            await page.waitForTimeout(2000); // Additional wait for full page reload
        }

        // Verify we're on the dashboard by waiting for the heading.
        // The app may redirect in different ways, so rely on UI instead of exact URL.
        const finalDashboardHeading = page.getByRole('heading', { name: /dashboard/i });
        await expect(finalDashboardHeading).toBeVisible({ timeout: 30000 });

        // ============================================
        // STEP 4: CREATE A CLIENT
        // ============================================
        await page.getByRole('link', { name: /clients/i }).click();
        await expect(page.getByRole('heading', { name: /clients/i })).toBeVisible();

        // Click Add Client button
        await page.getByRole('button', { name: /add client/i }).click();

        // Wait for modal to appear and be visible
        await expect(page.getByRole('heading', { name: /add new client/i })).toBeVisible({ timeout: 10000 });
        
        // Fill client form - now that labels have proper htmlFor attributes, getByLabel works
        await page.getByLabel(/company name/i).fill('Test Client Company');
        await page.getByLabel(/contact person/i).fill('John Doe');
        await page.getByLabel(/^email$/i).fill('client@example.com');
        await page.getByLabel(/^phone$/i).fill('555-1234');
        await page.getByLabel(/^address$/i).fill('123 Main St, Toronto, ON');

        // Submit client form
        await page.getByRole('button', { name: /save|create/i }).click();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);

        // Verify client was created
        await expect(page.getByText('Test Client Company')).toBeVisible();

        // ============================================
        // STEP 5: CREATE AN INVOICE
        // ============================================
        await page.getByRole('link', { name: /invoices/i }).click();
        await expect(page.getByRole('heading', { name: /invoices/i })).toBeVisible();

        // Click Add Invoice button
        const addInvoiceButton = page.getByRole('button').filter({ hasText: /add|create|new/i }).first();
        await addInvoiceButton.click();
        await page.waitForTimeout(500);

        // Fill invoice form
        // Select the client we just created by its visible text
        await page.getByLabel(/^client$/i).selectOption({ label: 'Test Client Company' });

        // Set issue date
        const issueDate = new Date().toISOString().split('T')[0];
        await page.getByLabel(/issue date/i).fill(issueDate);

        // Add invoice item - all fields are mandatory (description, quantity, unit price)
        // Fill description field first (required) - use the item-description id
        const itemDescriptionInput = page.locator('#item-description');
        await itemDescriptionInput.waitFor({ state: 'visible', timeout: 5000 });
        await itemDescriptionInput.fill('Consulting Services');
        await page.waitForTimeout(300); // Wait for field to update
        
        // Verify description was filled
        await expect(itemDescriptionInput).toHaveValue('Consulting Services');
        
        // Fill quantity field (required, must be > 0)
        const itemQuantityInput = page.locator('#item-quantity');
        await itemQuantityInput.fill('10');
        await page.waitForTimeout(300); // Wait for field to update
        
        // Fill unit price field (required, must be > 0)
        const itemUnitPriceInput = page.locator('#item-unit-price');
        await itemUnitPriceInput.fill('100');
        await page.waitForTimeout(300); // Wait for field to update
        
        // Set up alert handler in case validation fails
        page.on('dialog', async dialog => {
            console.log('Alert dialog:', dialog.message());
            await dialog.accept();
        });
        
        // Click Add Item button to add the item to the invoice
        await page.getByRole('button', { name: /add item/i }).click();
        
        // Wait for the item to appear in the items table (validation requires at least one item)
        // The item should show "Consulting Services" in the table
        await expect(page.locator('table tbody').getByText('Consulting Services')).toBeVisible({ timeout: 10000 });
        await page.waitForTimeout(500); // Additional wait for form state to update

        // Submit invoice - use the submit button inside the form
        // The button text is "Create Invoice" when creating, "Update Invoice" when editing
        const submitButton = page.locator('form').getByRole('button', { name: /create invoice|update invoice/i });
        await submitButton.click();
        
        // Wait for modal to close and page to update
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);
        
        // Verify invoice was created - check that modal is closed and we're back on invoices page
        // The modal heading should no longer be visible
        await expect(page.getByRole('heading', { name: /create new invoice|edit invoice/i })).not.toBeVisible({ timeout: 5000 });
        
        // Verify we're on the invoices page
        await expect(page.getByRole('heading', { name: /invoices/i })).toBeVisible();

        // ============================================
        // STEP 6: CREATE AN EXPENSE
        // ============================================
        await page.getByRole('link', { name: /expenses/i }).click();
        await expect(page.getByRole('heading', { name: /expenses/i })).toBeVisible();

        // Click Add Expense button
        const addExpenseButton = page.getByRole('button').filter({ hasText: /add|create|new/i }).first();
        await addExpenseButton.click();
        await page.waitForTimeout(500);

        // Fill expense form
        await page.getByLabel(/description/i).first().fill('Office Supplies');

        // Select category (required field)
        const categorySelect = page.getByLabel(/category/i).first();
        if (await categorySelect.count() > 0) {
            await categorySelect.selectOption({ index: 1 }); // Select first available category (skip "Select a category")
        }

        // Set expense date
        const expenseDate = new Date().toISOString().split('T')[0];
        await page.getByLabel(/expense date/i).first().fill(expenseDate);

        // Fill amount
        await page.getByLabel(/amount.*before hst/i).first().fill('50.00');

        // Select paid by (if exists)
        const paidBySelect = page.getByLabel(/paid by/i).first();
        if (await paidBySelect.count() > 0) {
            await paidBySelect.selectOption('corp');
        }

        // Submit expense
        await page.getByRole('button', { name: /save|create/i }).click();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);

        // Verify expense was created
        await expect(page.getByText('Office Supplies')).toBeVisible();

        // ============================================
        // STEP 7: CREATE AN INCOME ENTRY
        // ============================================
        await page.getByRole('link', { name: /income/i }).click();
        await expect(page.getByRole('heading', { name: /income entries/i })).toBeVisible();

        // Click Add Income Entry button
        const addIncomeButton = page.getByRole('button').filter({ hasText: /add income|create|new/i }).first();
        await addIncomeButton.click();
        await page.waitForTimeout(500);

        // Fill income form
        await page.getByLabel(/description/i).first().fill('Project Payment');
        await page.getByLabel(/amount/i).first().fill('5000.00');

        // Set income date
        const incomeDate = new Date().toISOString().split('T')[0];
        await page.getByLabel(/income date/i).first().fill(incomeDate);

        // Select income type
        const incomeTypeSelect = page.getByLabel(/income type/i).first();
        if (await incomeTypeSelect.count() > 0) {
            await incomeTypeSelect.selectOption('client');
        }

        // Submit income entry
        await page.getByRole('button', { name: /create|save/i }).click();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);

        // Verify income entry was created
        await expect(page.getByText('Project Payment')).toBeVisible();

        // ============================================
        // STEP 8: CREATE A CAPITAL ASSET
        // ============================================
        await page.getByRole('link', { name: /capital assets/i }).click();
        await expect(page.getByRole('heading', { name: /capital assets/i })).toBeVisible();

        // Click Add Capital Asset button
        const addAssetButton = page.getByRole('button').filter({ hasText: /add|create|new/i }).first();
        await addAssetButton.click();
        await page.waitForTimeout(500);

        // Fill capital asset form
        await page.getByLabel(/description/i).first().fill('Laptop Computer');
        await page.getByLabel(/total cost|cost/i).first().fill('1500.00');

        // Set purchase date
        const purchaseDate = new Date().toISOString().split('T')[0];
        await page.getByLabel(/purchase date/i).first().fill(purchaseDate);

        // Select CCA class (if dropdown exists)
        const ccaClassSelect = page.getByLabel(/cca class/i).first();
        if (await ccaClassSelect.count() > 0) {
            await ccaClassSelect.selectOption({ index: 1 }); // Skip "Select" option
        }

        // Submit capital asset
        await page.getByRole('button', { name: /save|create/i }).click();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);

        // Verify capital asset was created
        await expect(page.getByText('Laptop Computer')).toBeVisible();

        // ============================================
        // STEP 9: CREATE A DIVIDEND
        // ============================================
        await page.getByRole('link', { name: /dividends/i }).click();
        await expect(page.getByRole('heading', { name: /dividends/i })).toBeVisible();

        // Click Add Dividend button
        const addDividendButton = page.getByRole('button').filter({ hasText: /add|create|declare|new/i }).first();
        await addDividendButton.click();
        await page.waitForTimeout(500);

        // Fill dividend form
        await page.getByLabel(/amount/i).first().fill('1000.00');

        // Set declaration date
        const declarationDate = new Date().toISOString().split('T')[0];
        await page.getByLabel(/declaration date/i).first().fill(declarationDate);

        // Submit dividend
        await page.getByRole('button', { name: /save|create|declare/i }).click();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);

        // Verify dividend was created (check for amount or status)
        await expect(page.getByText(/\$1,000|1000|declared/i)).toBeVisible();

        // ============================================
        // STEP 10: CREATE AN OWNER PAYMENT
        // ============================================
        await page.getByRole('link', { name: /owner payments/i }).click();
        await expect(page.getByRole('heading', { name: /owner payments/i })).toBeVisible();

        // Click Add Owner Payment button
        const addOwnerPaymentButton = page.getByRole('button').filter({ hasText: /add|create|new/i }).first();
        await addOwnerPaymentButton.click();
        await page.waitForTimeout(500);

        // Fill owner payment form
        await page.getByLabel(/description/i).first().fill('Owner Reimbursement');
        await page.getByLabel(/amount/i).first().fill('200.00');

        // Set payment date
        const paymentDate = new Date().toISOString().split('T')[0];
        await page.getByLabel(/payment date/i).first().fill(paymentDate);

        // Submit owner payment
        await page.getByRole('button', { name: /save|create/i }).click();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);

        // Verify owner payment was created
        await expect(page.getByText('Owner Reimbursement')).toBeVisible();

        // ============================================
        // STEP 11: VIEW DASHBOARD
        // ============================================
        await page.getByRole('link', { name: /dashboard/i }).click();
        await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();

        // Verify dashboard shows financial overview
        await expect(page.getByText(/total revenue|financial overview/i)).toBeVisible();

        // Verify dashboard shows recent activity
        await expect(page.getByText(/recent activity|recent invoices/i)).toBeVisible();

        // ============================================
        // STEP 12: VIEW REPORTS
        // ============================================
        await page.getByRole('link', { name: /reports/i }).click();
        await expect(page.getByRole('heading', { name: /reports/i })).toBeVisible();

        // Verify reports page loads
        await page.waitForLoadState('networkidle');

        // ============================================
        // STEP 13: VIEW SETTINGS
        // ============================================
        await page.getByRole('link', { name: /settings/i }).click();
        await expect(page.getByRole('heading', { name: /settings/i })).toBeVisible();

        // Verify settings page loads
        await page.waitForLoadState('networkidle');

        // ============================================
        // STEP 14: EDIT ACTIONS - Edit Client
        // ============================================
        await page.getByRole('link', { name: /clients/i }).click();
        await page.waitForTimeout(1000);

        // Find and click edit button for the client we created
        // Look for edit icon button (usually has an Edit icon or text)
        const editButtons = page.locator('button[title*="Edit"], button').filter({ hasText: /edit/i });
        const editButtonCount = await editButtons.count();

        if (editButtonCount > 0) {
            await editButtons.first().click();
            await page.waitForTimeout(1000);

            // Update client name - wait for modal
            const nameInput = page.getByLabel(/company name/i).first();
            if (await nameInput.count() > 0) {
                await nameInput.clear();
                await nameInput.fill('Updated Test Client Company');

                // Save changes
                await page.getByRole('button', { name: /save|update/i }).click();
                await page.waitForLoadState('networkidle');
                await page.waitForTimeout(1000);

                // Verify update
                await expect(page.getByText('Updated Test Client Company')).toBeVisible();
            }
        }

        // ============================================
        // STEP 15: DELETE ACTIONS - Delete Expense
        // ============================================
        await page.getByRole('link', { name: /expenses/i }).click();
        await page.waitForTimeout(1000);

        // Set up dialog handler before clicking delete
        page.on('dialog', async dialog => {
            await dialog.accept();
        });

        // Find and click delete button for an expense
        const deleteButtons = page.locator('button[title*="Delete"], button').filter({ hasText: /delete/i });
        const deleteButtonCount = await deleteButtons.count();

        if (deleteButtonCount > 0) {
            // Get count before deletion
            const expenseCountBefore = await page.locator('text=Office Supplies').count();

            if (expenseCountBefore > 0) {
                await deleteButtons.first().click();

                await page.waitForTimeout(2000); // Wait for confirmation and deletion
                await page.waitForLoadState('networkidle');

                // Verify deletion (expense should no longer be visible or count should decrease)
                const expenseCountAfter = await page.locator('text=Office Supplies').count();
                expect(expenseCountAfter).toBeLessThan(expenseCountBefore);
            }
        }

        // ============================================
        // FINAL VERIFICATION: Return to Dashboard
        // ============================================
        await page.getByRole('link', { name: /dashboard/i }).click();
        await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();

        // Verify user is still authenticated and can see their data
        await expect(page.getByText(/welcome back/i)).toBeVisible();
    });
});

