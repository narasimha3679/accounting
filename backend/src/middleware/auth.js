const supabase = require('../config/supabase');

const authenticateUser = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ error: 'Missing authorization header' });
    }

    const token = authHeader.split(' ')[1]; // Bearer <token>

    if (!token) {
        return res.status(401).json({ error: 'Invalid token format' });
    }

    try {
        const { createClient } = require('@supabase/supabase-js');
        
        // Create a client with the user's token for RLS checks
        const userClient = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_ANON_KEY,
            {
                global: {
                    headers: { Authorization: authHeader },
                },
            }
        );

        const { data: { user }, error } = await userClient.auth.getUser();

        if (error || !user) {
            console.error('Auth error:', error);
            return res.status(401).json({ error: 'Invalid or expired token' });
        }

        // Fetch user profile
        const { data: profile, error: profileError } = await userClient
            .from('profiles')
            .select('id, company_id, role')
            .eq('auth_user_id', user.id)
            .single();

        if (profileError || !profile) {
            console.error('Profile error:', profileError);
            return res.status(403).json({ error: 'User profile not found' });
        }

        // Load user's company memberships from user_companies table
        const { data: memberships, error: membershipError } = await userClient
            .from('user_companies')
            .select(`
                id,
                user_id,
                company_id,
                role,
                permissions,
                is_primary,
                invite_status,
                company:companies (*)
            `)
            .eq('user_id', profile.id)
            .eq('invite_status', 'accepted')
            .order('is_primary', { ascending: false });

        // Get currentCompanyId from header, query param, or use primary company
        const currentCompanyIdHeader = req.headers['x-company-id'];
        const currentCompanyIdQuery = req.query.company_id;
        const currentCompanyId = currentCompanyIdHeader || currentCompanyIdQuery || 
            (memberships && memberships.length > 0 ? memberships[0].company_id : profile.company_id);

        // Find current membership
        const currentMembership = memberships?.find(m => m.company_id === parseInt(currentCompanyId)) || 
            (memberships && memberships.length > 0 ? memberships[0] : null);

        // Transform memberships (handle nested company data)
        const transformedMemberships = (memberships || []).map(m => ({
            ...m,
            company: Array.isArray(m.company) ? m.company[0] : m.company,
        }));

        req.user = user;
        req.user.profile = profile;
        req.user.memberships = transformedMemberships;
        req.user.currentMembership = currentMembership;
        req.user.currentCompanyId = currentMembership ? currentMembership.company_id : (profile.company_id || null);
        req.user.permissions = currentMembership?.permissions || null;
        req.userClient = userClient; // Attach for RLS checks
        next();
    } catch (err) {
        console.error('Unexpected auth error:', err);
        res.status(500).json({ error: 'Internal server error during authentication' });
    }
};

module.exports = authenticateUser;
