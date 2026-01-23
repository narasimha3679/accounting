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

        // Fetch user profile with company_id and role
        const { data: profile, error: profileError } = await userClient
            .from('profiles')
            .select('company_id, role')
            .eq('auth_user_id', user.id)
            .single();

        if (profileError || !profile) {
            console.error('Profile error:', profileError);
            return res.status(403).json({ error: 'User profile not found' });
        }

        req.user = user;
        req.user.profile = profile;
        req.userClient = userClient; // Attach for RLS checks
        next();
    } catch (err) {
        console.error('Unexpected auth error:', err);
        res.status(500).json({ error: 'Internal server error during authentication' });
    }
};

module.exports = authenticateUser;
