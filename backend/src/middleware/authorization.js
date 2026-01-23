/**
 * Middleware to require specific roles
 * @param {string[]} allowedRoles - Array of allowed roles (e.g., ['admin', 'accountant'])
 */
const requireRole = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user || !req.user.profile) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const userRole = req.user.profile.role;
        if (!allowedRoles.includes(userRole)) {
            return res.status(403).json({ error: 'Forbidden: Must be ' + allowedRoles.join(' or ') });
        }

        next();
    };
};

/**
 * Middleware to verify company access
 * Verifies that the requested company_id matches the user's company_id
 * @param {Function} getCompanyId - Function to extract company_id from request (req) => number
 */
const verifyCompanyAccess = (getCompanyId) => {
    return (req, res, next) => {
        if (!req.user || !req.user.profile) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const userCompanyId = req.user.profile.company_id;
        const requestedCompanyId = getCompanyId(req);

        if (requestedCompanyId !== userCompanyId) {
            return res.status(403).json({ error: 'Forbidden: Company ID mismatch' });
        }

        next();
    };
};

module.exports = {
    requireRole,
    verifyCompanyAccess,
};
