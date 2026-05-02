const express = require('express');
const router = express.Router();
const authenticateUser = require('../middleware/auth');
const { requireRole } = require('../middleware/authorization');
const { supabaseAdmin } = require('../config/supabase');
const { escapeHtml } = require('../utils/security');

// All routes require authentication
router.use(authenticateUser);
router.use(requireRole(['admin', 'accountant']));

/**
 * POST /api/emails/invoice
 * Send invoice email with PDF attachment via Resend
 */
router.post('/invoice', async (req, res) => {
    try {
        const { invoiceId, recipientEmail, pdfBase64, message } = req.body;

        if (!invoiceId || !recipientEmail) {
            return res.status(400).json({ error: 'Missing required fields: invoiceId and recipientEmail' });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(recipientEmail)) {
            return res.status(400).json({ error: 'Invalid email address format' });
        }

        if (!pdfBase64) {
            return res.status(400).json({ error: 'PDF attachment is required' });
        }

        const resendApiKey = process.env.RESEND_API_KEY;
        const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

        if (!resendApiKey) {
            console.error('RESEND_API_KEY not configured');
            return res.status(500).json({ error: 'Email service not configured. Please contact support.' });
        }

        if (!supabaseAdmin) {
            return res.status(500).json({ error: 'Service role key not configured' });
        }

        // Fetch invoice with client and company data
        const { data: invoice, error: invoiceError } = await supabaseAdmin
            .from('invoices')
            .select(`
                *,
                client:clients(*),
                company:companies(*),
                items:invoice_items(*)
            `)
            .eq('id', invoiceId)
            .eq('company_id', req.user.currentCompanyId || req.user.profile.company_id)
            .single();

        if (invoiceError || !invoice) {
            console.error('Error fetching invoice:', invoiceError);
            return res.status(404).json({ error: 'Invoice not found or access denied' });
        }

        // Verify company_id matches (check user_companies memberships)
        const hasAccess = req.user.memberships?.some(m => m.company_id === invoice.company_id) ||
                         (req.user.profile.company_id === invoice.company_id);
        if (!hasAccess) {
            return res.status(403).json({ error: 'Forbidden: Company ID mismatch' });
        }

        // Prepare email content
        const rawClientName = invoice.client?.name || 'Valued Client';
        const rawInvoiceNumber = invoice.invoice_number;
        const rawCompanyName = invoice.company?.name || 'Our Company';

        const clientName = escapeHtml(rawClientName);
        const invoiceNumber = escapeHtml(rawInvoiceNumber);
        const companyName = escapeHtml(rawCompanyName);

        const invoiceTotal = new Intl.NumberFormat('en-CA', {
            style: 'currency',
            currency: 'CAD',
        }).format(invoice.total);

        // Subject uses raw values (plain text)
        const emailSubject = `Invoice ${rawInvoiceNumber} from ${rawCompanyName}`;
        const escapedMessage = escapeHtml(message);

        const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #f4f4f4; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
            .content { padding: 20px 0; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
            .button { display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>Invoice ${invoiceNumber}</h2>
            </div>
            <div class="content">
              <p>Dear ${clientName},</p>
              <p>Please find attached invoice <strong>${invoiceNumber}</strong> in the amount of <strong>${invoiceTotal}</strong>.</p>
              ${escapedMessage ? `<p>${escapedMessage}</p>` : ''}
              <p>Invoice Details:</p>
              <ul>
                <li>Invoice Number: ${invoiceNumber}</li>
                <li>Issue Date: ${new Date(invoice.issue_date).toLocaleDateString('en-CA')}</li>
                <li>Due Date: ${new Date(invoice.due_date).toLocaleDateString('en-CA')}</li>
                <li>Total Amount: ${invoiceTotal}</li>
              </ul>
              <p>Please remit payment by the due date. If you have any questions, please don't hesitate to contact us.</p>
              <p>Thank you for your business!</p>
            </div>
            <div class="footer">
              <p>This is an automated email from ${companyName}.</p>
              <p>Please do not reply to this email.</p>
            </div>
          </div>
        </body>
      </html>
    `;

        // Send email via Resend
        const resendResponse = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${resendApiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: fromEmail,
                to: [recipientEmail],
                subject: emailSubject,
                html: emailHtml,
                attachments: [
                    {
                        filename: `Invoice_${invoiceNumber}.pdf`,
                        content: pdfBase64,
                    },
                ],
            }),
        });

        if (!resendResponse.ok) {
            const errorData = await resendResponse.text();
            console.error('Resend API error:', errorData);
            return res.status(500).json({
                error: 'Failed to send email',
                details: errorData,
            });
        }

        const resendData = await resendResponse.json();
        console.log('Email sent successfully:', resendData);

        // Update invoice status to 'sent'
        const { error: updateError } = await supabaseAdmin
            .from('invoices')
            .update({
                status: 'sent',
                updated_at: new Date().toISOString(),
            })
            .eq('id', invoiceId);

        if (updateError) {
            console.error('Error updating invoice status:', updateError);
            // Don't fail the request if status update fails, email was sent
        }

        return res.status(200).json({
            success: true,
            message: 'Invoice sent successfully',
            emailId: resendData.id,
        });
    } catch (error) {
        console.error('Unexpected error:', error);
        return res.status(500).json({
            error: 'Internal server error',
            message: error.message,
        });
    }
});

module.exports = router;
