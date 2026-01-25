/**
 * Middleware to require specific roles
 * @param {string[]} allowedRoles - Array of allowed roles (e.g., ['owner', 'accountant'])
 */
const requireRole = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user || !req.user.profile) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Check role from current membership (new structure) or profile (backward compat)
        const userRole = req.user.currentMembership?.role || 
                        (req.user.profile.role === 'admin' ? 'owner' : req.user.profile.role);
        
        if (!allowedRoles.includes(userRole)) {
            return res.status(403).json({ error: 'Forbidden: Must be ' + allowedRoles.join(' or ') });
        }

        next();
    };
};

/**
 * Middleware to verify company access
 * Verifies that the requested company_id matches one of the user's companies
 * @param {Function} getCompanyId - Function to extract company_id from request (req) => number
 */
const verifyCompanyAccess = (getCompanyId) => {
    return (req, res, next) => {
        if (!req.user || !req.user.profile) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const requestedCompanyId = getCompanyId(req);
        
        // Check if user has access to this company via user_companies
        const hasAccess = req.user.memberships?.some(m => m.company_id === requestedCompanyId) ||
                         // Backward compatibility: check profiles.company_id
                         (req.user.profile.company_id === requestedCompanyId);

        if (!hasAccess) {
            return res.status(403).json({ error: 'Forbidden: Company ID mismatch' });
        }

        next();
    };
};

/**
 * Middleware to require company access
 * Verifies that the user has access to the specified company
 * @param {Function} getCompanyId - Function to extract company_id from request (req) => number
 */
const requireCompanyAccess = (getCompanyId) => {
    return verifyCompanyAccess(getCompanyId);
};

/**
 * Middleware to require a specific permission
 * @param {string} permissionName - Permission to check (e.g., 'can_manage_employees')
 */
const requirePermission = (permissionName) => {
    return (req, res, next) => {
        if (!req.user || !req.user.profile) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const currentMembership = req.user.currentMembership;
        const userRole = currentMembership?.role || 
                        (req.user.profile.role === 'admin' ? 'owner' : req.user.profile.role);

        // Owners have all permissions
        if (userRole === 'owner') {
            return next();
        }

        // Accountants have financial permissions by default
        if (userRole === 'accountant') {
            const accountantPermissions = [
                'can_manage_invoices',
                'can_manage_expenses',
                'can_view_financials',
                'can_view_reports'
            ];
            if (accountantPermissions.includes(permissionName)) {
                return next();
            }
        }

        // Managers: check stored permissions
        if (userRole === 'manager' && currentMembership?.permissions) {
            const hasPermission = currentMembership.permissions[permissionName] === true;
            if (hasPermission) {
                return next();
            }
        }

        return res.status(403).json({ error: `Forbidden: Missing permission '${permissionName}'` });
    };
};

/**
 * Middleware to require owner role
 */
const requireOwner = () => {
    return requireRole(['owner']);
};

module.exports = {
    requireRole,
    verifyCompanyAccess,
    requireCompanyAccess,
    requirePermission,
    requireOwner,
};
