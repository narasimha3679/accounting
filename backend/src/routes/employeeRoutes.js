const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const authenticateUser = require('../middleware/auth');
const { requireRole, verifyCompanyAccess } = require('../middleware/authorization');
const supabase = require('../config/supabase');
const { supabaseAdmin } = require('../config/supabase');

// Generate a secure random password
function generatePassword(length = 16) {
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    const values = new Uint8Array(length);
    crypto.getRandomValues(values);
    return Array.from(values, (x) => charset[x % charset.length]).join("");
}

// All routes require authentication
router.use(authenticateUser);
router.use(requireRole(['admin', 'accountant']));

/**
 * POST /api/employees
 * Create a new employee with auth user
 */
router.post('/', async (req, res) => {
    try {
        const {
            company_id,
            employee_id,
            first_name,
            last_name,
            email,
            phone,
            position,
            hire_date,
            status,
            address,
            sin,
            payrate,
            payrate_type,
            initialPassword,
        } = req.body;

        // Verify company_id matches user's company
        if (company_id !== req.user.profile.company_id) {
            return res.status(403).json({ error: 'Forbidden: Company ID mismatch' });
        }

        if (!supabaseAdmin) {
            return res.status(500).json({ error: 'Service role key not configured' });
        }

        // Auto-generate employee_id if not provided
        let finalEmployeeId = employee_id;
        if (!finalEmployeeId) {
            const { data: existingEmployees, error: fetchError } = await supabaseAdmin
                .from('employees')
                .select('employee_id')
                .eq('company_id', company_id);

            if (fetchError) {
                return res.status(500).json({ error: `Failed to fetch existing employees: ${fetchError.message}` });
            }

            // Extract numeric part from existing employee_ids and find max
            const maxNum = existingEmployees && existingEmployees.length > 0
                ? existingEmployees
                    .map(e => {
                        const match = e.employee_id.replace(/^EMP/i, '').match(/^\d+/);
                        return match ? parseInt(match[0], 10) : 0;
                    })
                    .reduce((max, num) => Math.max(max, num), 0)
                : 0;

            finalEmployeeId = `EMP${maxNum + 1}`;
        }

        // Create auth user
        const { data: authUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password: initialPassword,
            email_confirm: true,
        });

        if (createUserError || !authUser.user) {
            return res.status(400).json({ error: `Failed to create auth user: ${createUserError?.message}` });
        }

        // Create employee record
        const { data: employee, error: employeeError } = await supabaseAdmin
            .from('employees')
            .insert({
                company_id,
                auth_user_id: authUser.user.id,
                employee_id: finalEmployeeId,
                first_name,
                last_name,
                email,
                phone: phone || null,
                position: position || null,
                hire_date: hire_date || null,
                status: status || 'active',
                address: address || null,
                sin: sin || null,
                payrate: payrate || null,
                payrate_type: payrate_type || null,
            })
            .select()
            .single();

        if (employeeError) {
            // Clean up auth user if employee creation fails
            await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
            return res.status(400).json({ error: `Failed to create employee: ${employeeError.message}` });
        }

        return res.status(201).json(employee);
    } catch (error) {
        console.error('Error creating employee:', error);
        return res.status(500).json({ error: error.message });
    }
});

/**
 * DELETE /api/employees/:id
 * Delete an employee and optionally the auth user
 */
router.delete('/:id', async (req, res) => {
    try {
        const employeeId = parseInt(req.params.id);
        const { deleteAuthUser = true } = req.body;

        if (!supabaseAdmin) {
            return res.status(500).json({ error: 'Service role key not configured' });
        }

        // Get employee to verify company_id and get auth_user_id
        const { data: employee, error: employeeError } = await supabaseAdmin
            .from('employees')
            .select('id, company_id, auth_user_id')
            .eq('id', employeeId)
            .single();

        if (employeeError || !employee) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        // Verify company_id matches
        if (employee.company_id !== req.user.profile.company_id) {
            return res.status(403).json({ error: 'Forbidden: Company ID mismatch' });
        }

        // Delete employee record
        const { error: deleteEmployeeError } = await supabaseAdmin
            .from('employees')
            .delete()
            .eq('id', employeeId);

        if (deleteEmployeeError) {
            return res.status(400).json({ error: `Failed to delete employee: ${deleteEmployeeError.message}` });
        }

        // Optionally delete auth user
        if (deleteAuthUser && employee.auth_user_id) {
            const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(
                employee.auth_user_id
            );

            if (deleteAuthError) {
                // Log error but don't fail the request since employee is already deleted
                console.error('Failed to delete auth user:', deleteAuthError);
            }
        }

        return res.status(200).json({ success: true });
    } catch (error) {
        console.error('Error deleting employee:', error);
        return res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/employees/:id/reset-password
 * Reset employee password and return new password
 */
router.post('/:id/reset-password', async (req, res) => {
    try {
        const employeeId = parseInt(req.params.id);

        if (!supabaseAdmin) {
            return res.status(500).json({ error: 'Service role key not configured' });
        }

        // Get employee to verify company_id and get auth_user_id
        const { data: employee, error: employeeError } = await supabaseAdmin
            .from('employees')
            .select('id, company_id, auth_user_id')
            .eq('id', employeeId)
            .single();

        if (employeeError || !employee) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        // Verify company_id matches
        if (employee.company_id !== req.user.profile.company_id) {
            return res.status(403).json({ error: 'Forbidden: Company ID mismatch' });
        }

        if (!employee.auth_user_id) {
            return res.status(400).json({ error: 'Employee has no auth user account' });
        }

        // Generate new password
        const newPassword = generatePassword(16);

        // Update password
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
            employee.auth_user_id,
            { password: newPassword }
        );

        if (updateError) {
            return res.status(400).json({ error: `Failed to reset password: ${updateError.message}` });
        }

        return res.status(200).json({ password: newPassword });
    } catch (error) {
        console.error('Error resetting password:', error);
        return res.status(500).json({ error: error.message });
    }
});

/**
 * PUT /api/employees/:id/email
 * Update employee email in both auth.users and employees table
 */
router.put('/:id/email', async (req, res) => {
    try {
        const employeeId = parseInt(req.params.id);
        const { newEmail } = req.body;

        if (!newEmail) {
            return res.status(400).json({ error: 'newEmail is required' });
        }

        if (!supabaseAdmin) {
            return res.status(500).json({ error: 'Service role key not configured' });
        }

        // Get employee to verify company_id and get auth_user_id
        const { data: employee, error: employeeError } = await supabaseAdmin
            .from('employees')
            .select('id, company_id, auth_user_id')
            .eq('id', employeeId)
            .single();

        if (employeeError || !employee) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        // Verify company_id matches
        if (employee.company_id !== req.user.profile.company_id) {
            return res.status(403).json({ error: 'Forbidden: Company ID mismatch' });
        }

        if (!employee.auth_user_id) {
            return res.status(400).json({ error: 'Employee has no auth user account' });
        }

        // Update email in auth.users
        const { error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(
            employee.auth_user_id,
            { email: newEmail }
        );

        if (updateAuthError) {
            return res.status(400).json({ error: `Failed to update email: ${updateAuthError.message}` });
        }

        // Update email in employees table
        const { error: updateEmployeeError } = await supabaseAdmin
            .from('employees')
            .update({ email: newEmail })
            .eq('id', employeeId);

        if (updateEmployeeError) {
            return res.status(400).json({ error: `Failed to update employee email: ${updateEmployeeError.message}` });
        }

        return res.status(200).json({ success: true });
    } catch (error) {
        console.error('Error updating email:', error);
        return res.status(500).json({ error: error.message });
    }
});

/**
 * PUT /api/employees/:id/password
 * Update employee password
 */
router.put('/:id/password', async (req, res) => {
    try {
        const employeeId = parseInt(req.params.id);
        const { newPassword } = req.body;

        if (!newPassword) {
            return res.status(400).json({ error: 'newPassword is required' });
        }

        if (!supabaseAdmin) {
            return res.status(500).json({ error: 'Service role key not configured' });
        }

        // Get employee to verify company_id and get auth_user_id
        const { data: employee, error: employeeError } = await supabaseAdmin
            .from('employees')
            .select('id, company_id, auth_user_id')
            .eq('id', employeeId)
            .single();

        if (employeeError || !employee) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        // Verify company_id matches
        if (employee.company_id !== req.user.profile.company_id) {
            return res.status(403).json({ error: 'Forbidden: Company ID mismatch' });
        }

        if (!employee.auth_user_id) {
            return res.status(400).json({ error: 'Employee has no auth user account' });
        }

        // Update password
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
            employee.auth_user_id,
            { password: newPassword }
        );

        if (updateError) {
            return res.status(400).json({ error: `Failed to update password: ${updateError.message}` });
        }

        return res.status(200).json({ success: true });
    } catch (error) {
        console.error('Error updating password:', error);
        return res.status(500).json({ error: error.message });
    }
});

module.exports = router;
