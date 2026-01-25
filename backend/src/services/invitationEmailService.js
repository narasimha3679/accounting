/**
 * Service for sending company invitation emails via Resend
 */

const sendCompanyInvitation = async (email, name, companyName, inviteToken, role) => {
    const resendApiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    if (!resendApiKey) {
        console.error('RESEND_API_KEY not configured');
        throw new Error('Email service not configured. Please contact support.');
    }

    const invitationLink = `${frontendUrl}/accept-invitation?token=${inviteToken}`;
    
    const roleLabels = {
        owner: 'Owner',
        manager: 'Manager',
        accountant: 'Accountant',
        viewer: 'Viewer',
    };

    const roleDescription = {
        owner: 'full access to manage the company and all its members',
        manager: 'limited access based on permissions set by the owner',
        accountant: 'access to financial data and accounting features',
        viewer: 'read-only access to view company data',
    };

    const emailSubject = `You've been invited to join ${companyName}`;

    const emailHtml = `
        <!DOCTYPE html>
        <html>
            <head>
                <meta charset="utf-8">
                <style>
                    body { 
                        font-family: Arial, sans-serif; 
                        line-height: 1.6; 
                        color: #333; 
                        max-width: 600px;
                        margin: 0 auto;
                        padding: 20px;
                    }
                    .container { 
                        background-color: #ffffff;
                        border-radius: 8px;
                        padding: 30px;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    }
                    .header { 
                        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                        color: white;
                        padding: 30px;
                        border-radius: 8px 8px 0 0;
                        margin: -30px -30px 30px -30px;
                        text-align: center;
                    }
                    .header h1 {
                        margin: 0;
                        font-size: 24px;
                    }
                    .content { 
                        padding: 20px 0; 
                    }
                    .button { 
                        display: inline-block; 
                        padding: 12px 30px; 
                        background-color: #10b981; 
                        color: white; 
                        text-decoration: none; 
                        border-radius: 6px; 
                        margin: 20px 0;
                        font-weight: bold;
                    }
                    .button:hover {
                        background-color: #059669;
                    }
                    .info-box {
                        background-color: #f3f4f6;
                        border-left: 4px solid #10b981;
                        padding: 15px;
                        margin: 20px 0;
                        border-radius: 4px;
                    }
                    .footer { 
                        margin-top: 30px; 
                        padding-top: 20px; 
                        border-top: 1px solid #e5e7eb; 
                        font-size: 12px; 
                        color: #6b7280; 
                        text-align: center;
                    }
                    .role-badge {
                        display: inline-block;
                        padding: 4px 12px;
                        background-color: #dbeafe;
                        color: #1e40af;
                        border-radius: 12px;
                        font-size: 12px;
                        font-weight: 600;
                        margin-left: 8px;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Company Invitation</h1>
                    </div>
                    <div class="content">
                        <p>Hello${name ? ` ${name}` : ''},</p>
                        <p>You've been invited to join <strong>${companyName}</strong> as a <strong>${roleLabels[role] || role}</strong><span class="role-badge">${roleLabels[role] || role}</span>.</p>
                        
                        <div class="info-box">
                            <p style="margin: 0;"><strong>Your Role:</strong> ${roleLabels[role] || role}</p>
                            <p style="margin: 8px 0 0 0;">As a ${roleLabels[role] || role}, you'll have ${roleDescription[role] || 'access based on your role'}.</p>
                        </div>

                        <p>To accept this invitation and get started, click the button below:</p>
                        
                        <div style="text-align: center;">
                            <a href="${invitationLink}" class="button">Accept Invitation</a>
                        </div>

                        <p style="font-size: 14px; color: #6b7280;">
                            Or copy and paste this link into your browser:<br>
                            <a href="${invitationLink}" style="color: #10b981; word-break: break-all;">${invitationLink}</a>
                        </p>

                        <p style="margin-top: 30px; font-size: 14px; color: #6b7280;">
                            <strong>Note:</strong> This invitation link will expire in 7 days. If you didn't expect this invitation, you can safely ignore this email.
                        </p>
                    </div>
                    <div class="footer">
                        <p>This is an automated email from ${companyName}.</p>
                        <p>Please do not reply to this email.</p>
                    </div>
                </div>
            </body>
        </html>
    `;

    try {
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${resendApiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: fromEmail,
                to: [email],
                subject: emailSubject,
                html: emailHtml,
            }),
        });

        if (!response.ok) {
            const errorData = await response.text();
            console.error('Resend API error:', errorData);
            throw new Error(`Failed to send invitation email: ${errorData}`);
        }

        const data = await response.json();
        console.log('Invitation email sent successfully:', data.id);
        return { success: true, emailId: data.id };
    } catch (error) {
        console.error('Error sending invitation email:', error);
        throw error;
    }
};

module.exports = {
    sendCompanyInvitation,
};
