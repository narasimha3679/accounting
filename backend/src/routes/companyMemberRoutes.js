const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const authenticateUser = require('../middleware/auth');
const { requireOwner } = require('../middleware/authorization');
const { supabaseAdmin } = require('../config/supabase');
const { sendCompanyInvitation } = require('../services/invitationEmailService');

// All routes require authentication
router.use(authenticateUser);

/**
 * POST /api/company-members/invite
 * Invite a new member: Creates DB record AND sends email
 */
router.post('/invite', requireOwner(), async (req, res) => {
    try {
        const { email, name, role, company_id, permissions } = req.body;

        if (!email || !company_id) {
            return res.status(400).json({ error: 'Missing required fields: email, company_id' });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Invalid email address format' });
        }

        // Verify user access
        // We ensure the user is an owner of the target company
        const isOwnerOfTarget = req.user.memberships?.some(m => m.company_id === parseInt(company_id) && m.role === 'owner') ||
            (req.user.profile.company_id === parseInt(company_id) && req.user.profile.role === 'owner'); // Backward compat

        if (!isOwnerOfTarget) {
            return res.status(403).json({ error: 'Forbidden: You must be an owner of this company' });
        }

        // Generate invite token
        const invite_token = crypto.randomUUID();
        const expires_at = new Date();
        expires_at.setDate(expires_at.getDate() + 7); // 7 days expiry

        // 1. Create DB Record
        const { data: invite, error: dbError } = await supabaseAdmin
            .from('pending_shareholder_invites')
            .insert({
                company_id,
                email,
                name: name || email.split('@')[0],
                role: role || 'viewer',
                permissions: permissions || null,
                invite_token,
                invited_by: req.user.id,
                expires_at: expires_at.toISOString()
            })
            .select()
            .single();

        if (dbError) {
            console.error('Database error creating invite:', dbError);
            return res.status(500).json({ error: 'Failed to create invitation record' });
        }

        // 2. Get company name for email
        const { data: company } = await supabaseAdmin
            .from('companies')
            .select('name')
            .eq('id', company_id)
            .single();

        // 3. Send Email
        try {
            await sendCompanyInvitation(
                email,
                name || email.split('@')[0],
                company?.name || 'Company',
                invite_token,
                role || 'viewer'
            );
        } catch (emailError) {
            console.error('Error sending email, but invite created:', emailError);
            return res.status(200).json({
                success: true,
                message: 'Invitation created but email failed to send',
                warning: true,
                invite
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Invitation sent successfully',
            invite
        });

    } catch (error) {
        console.error('Error in invite flow:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * DELETE /api/company-members/:memberId
 * Remove a member from the company
 */
router.delete('/:memberId', requireOwner(), async (req, res) => {
    try {
        const { memberId } = req.params;
        // Check company_id from query or body? 
        // We need to know which company context we are in.
        // Assuming the ID is unique global ID of user_companies, we just need to verify the user owns the company that this membership belongs to.

        // 1. Fetch the membership to identify company_id
        const { data: member, error: fetchError } = await supabaseAdmin
            .from('user_companies')
            .select('company_id, role, user_id')
            .eq('id', memberId)
            .single();

        if (fetchError || !member) {
            return res.status(404).json({ error: 'Member not found' });
        }

        // 2. Check if requester is owner of THIS company
        const isOwnerOfTarget = req.user.memberships?.some(m => m.company_id === member.company_id && m.role === 'owner');

        if (!isOwnerOfTarget) {
            return res.status(403).json({ error: 'Forbidden: You do not have permission to remove members from this company' });
        }

        // 3. Perform deletion (Trigger will block if it's the last owner)
        const { error: deleteError } = await supabaseAdmin
            .from('user_companies')
            .delete()
            .eq('id', memberId);

        if (deleteError) {
            if (deleteError.message.includes('Cannot remove the last owner')) {
                return res.status(400).json({ error: deleteError.message });
            }
            console.error('Error deleting member:', deleteError);
            return res.status(500).json({ error: 'Failed to remove member' });
        }

        return res.status(200).json({ success: true, message: 'Member removed successfully' });

    } catch (error) {
        console.error('Error removing member:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});


/**
 * POST /api/company-members/accept
 * Accept an invitation: Converts pending invite to user_companies record
 */
router.post('/accept', async (req, res) => {
    try {
        const { invite_token } = req.body;

        if (!invite_token) {
            return res.status(400).json({ error: 'Missing invite token' });
        }

        // 1. Find the pending invitation
        const { data: invite, error: fetchError } = await supabaseAdmin
            .from('pending_shareholder_invites')
            .select('*')
            .eq('invite_token', invite_token)
            .is('claimed_at', null)
            .gt('expires_at', new Date().toISOString())
            .single();

        if (fetchError || !invite) {
            return res.status(404).json({ error: 'Invalid or expired invitation' });
        }

        // 2. Get the current user's profile
        const { data: profile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('id, email')
            .eq('auth_user_id', req.user.id) // req.user set by authenticateUser middleware
            .single();

        if (profileError || !profile) {
            return res.status(404).json({ error: 'User profile not found' });
        }

        // 3. Create the company membership
        const { error: insertError } = await supabaseAdmin
            .from('user_companies')
            .insert({
                user_id: profile.id,
                company_id: invite.company_id,
                role: invite.role,
                permissions: invite.permissions,
                is_primary: false, // Default to false? Or true if it's their first? Let's keep it false for now.
                invite_status: 'accepted',
                invite_token: invite_token // Store token for reference/linkage
            });

        if (insertError) {
            // Handle duplicate membership gracefully
            if (insertError.code === '23505') {
                return res.status(400).json({ error: 'You are already a member of this company' });
            }
            console.error('Error creating membership:', insertError);
            return res.status(500).json({ error: 'Failed to create membership' });
        }

        // 4. Mark invitation as claimed
        const { error: updateError } = await supabaseAdmin
            .from('pending_shareholder_invites')
            .update({
                claimed_at: new Date().toISOString()
            })
            .eq('id', invite.id);

        if (updateError) {
            console.error('Error marking invite as claimed:', updateError);
            // Non-critical error, membership already created
        }

        // 5. Update user's current company_id if they don't have one (optional nice-to-have)
        // For now, we'll leave it to the frontend to switch contexts.

        return res.status(200).json({
            success: true,
            message: 'Invitation accepted successfully',
            company_id: invite.company_id
        });

    } catch (error) {
        console.error('Error accepting invite:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * PUT /api/company-members/:memberId
 * Update a member's role or permissions
 */
router.put('/:memberId', requireOwner(), async (req, res) => {
    try {
        const { memberId } = req.params;
        const { role, permissions } = req.body;

        // 1. Fetch the membership to identify company_id
        const { data: member, error: fetchError } = await supabaseAdmin
            .from('user_companies')
            .select('company_id, role, user_id')
            .eq('id', memberId)
            .single();

        if (fetchError || !member) {
            return res.status(404).json({ error: 'Member not found' });
        }

        // 2. Check if requester is owner of THIS company
        // requireOwner middleware checks if user is an owner of *any* company, 
        // but we need to verify they own the specific company being modified.
        const isOwnerOfTarget = req.user.memberships?.some(m => m.company_id === member.company_id && m.role === 'owner');

        if (!isOwnerOfTarget) {
            return res.status(403).json({ error: 'Forbidden: You do not have permission to manage this company' });
        }

        // 3. Prepare update data
        const updates = {};
        if (role) updates.role = role;
        if (permissions) updates.permissions = permissions;

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ error: 'No updates provided' });
        }

        // 4. Perform update
        const { error: updateError } = await supabaseAdmin
            .from('user_companies')
            .update(updates)
            .eq('id', memberId);

        if (updateError) {
            console.error('Error updating member:', updateError);
            return res.status(500).json({ error: 'Failed to update member' });
        }

        return res.status(200).json({ success: true, message: 'Member updated successfully' });

    } catch (error) {
        console.error('Error updating member:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
