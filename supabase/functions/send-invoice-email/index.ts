import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

interface SendInvoiceEmailData {
  invoiceId: number;
  recipientEmail: string;
  pdfBase64?: string; // Optional: PDF as base64 string
  message?: string; // Optional custom message
}

/**
 * Get CORS headers for the request
 */
function getCorsHeaders(req: Request): HeadersInit {
  const origin = req.headers.get('origin');
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Credentials': 'true',
  };
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: getCorsHeaders(req),
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { 
          status: 401, 
          headers: {
            ...getCorsHeaders(req),
            "Content-Type": "application/json",
          },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "onboarding@resend.dev";

    // Check if Resend is configured
    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured. Please contact support." }),
        { 
          status: 500, 
          headers: {
            ...getCorsHeaders(req),
            "Content-Type": "application/json",
          },
        }
      );
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    // Authenticate user
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      console.error("Authentication error:", authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { 
          status: 401, 
          headers: {
            ...getCorsHeaders(req),
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Get user profile to verify permissions
    const { data: profile, error: profileError } = await userClient
      .from("profiles")
      .select("company_id, role")
      .eq("auth_user_id", user.id)
      .single();

    if (profileError || !profile || !["admin", "accountant"].includes(profile.role)) {
      console.error("Permission error:", profileError);
      return new Response(
        JSON.stringify({ error: "Forbidden: Must be admin or accountant" }),
        { 
          status: 403, 
          headers: {
            ...getCorsHeaders(req),
            "Content-Type": "application/json",
          },
        }
      );
    }

    const { invoiceId, recipientEmail, pdfBase64, message }: SendInvoiceEmailData = await req.json();

    if (!invoiceId || !recipientEmail) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: invoiceId and recipientEmail" }),
        { 
          status: 400, 
          headers: {
            ...getCorsHeaders(req),
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmail)) {
      return new Response(
        JSON.stringify({ error: "Invalid email address format" }),
        { 
          status: 400, 
          headers: {
            ...getCorsHeaders(req),
            "Content-Type": "application/json",
          },
        }
      );
    }

    console.log(`Sending invoice ${invoiceId} to ${recipientEmail}`);

    // Fetch invoice with client and company data
    const { data: invoice, error: invoiceError } = await adminClient
      .from("invoices")
      .select(`
        *,
        client:clients(*),
        company:companies(*),
        items:invoice_items(*)
      `)
      .eq("id", invoiceId)
      .eq("company_id", profile.company_id)
      .single();

    if (invoiceError || !invoice) {
      console.error("Error fetching invoice:", invoiceError);
      return new Response(
        JSON.stringify({ error: "Invoice not found or access denied" }),
        { 
          status: 404, 
          headers: {
            ...getCorsHeaders(req),
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Verify company_id matches
    if (invoice.company_id !== profile.company_id) {
      return new Response(
        JSON.stringify({ error: "Forbidden: Company ID mismatch" }),
        { 
          status: 403, 
          headers: {
            ...getCorsHeaders(req),
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Check if PDF is provided, if not, return error (PDF should be generated client-side)
    if (!pdfBase64) {
      return new Response(
        JSON.stringify({ error: "PDF attachment is required" }),
        { 
          status: 400, 
          headers: {
            ...getCorsHeaders(req),
            "Content-Type": "application/json",
          },
        }
      );
    }

    // PDF is already in base64 format, ready to send to Resend

    // Prepare email content
    const clientName = invoice.client?.name || "Valued Client";
    const invoiceNumber = invoice.invoice_number;
    const invoiceTotal = new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
    }).format(invoice.total);

    const emailSubject = `Invoice ${invoiceNumber} from ${invoice.company?.name || 'Our Company'}`;
    
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
              ${message ? `<p>${message}</p>` : ''}
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
              <p>This is an automated email from ${invoice.company?.name || 'Our Company'}.</p>
              <p>Please do not reply to this email.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Send email via Resend
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
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
      console.error("Resend API error:", errorData);
      return new Response(
        JSON.stringify({ 
          error: "Failed to send email",
          details: errorData 
        }),
        { 
          status: 500, 
          headers: {
            ...getCorsHeaders(req),
            "Content-Type": "application/json",
          },
        }
      );
    }

    const resendData = await resendResponse.json();
    console.log("Email sent successfully:", resendData);

    // Update invoice status to 'sent'
    const { error: updateError } = await adminClient
      .from("invoices")
      .update({ 
        status: 'sent',
        updated_at: new Date().toISOString(),
      })
      .eq("id", invoiceId);

    if (updateError) {
      console.error("Error updating invoice status:", updateError);
      // Don't fail the request if status update fails, email was sent
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Invoice sent successfully",
        emailId: resendData.id,
      }),
      { 
        status: 200, 
        headers: {
          ...getCorsHeaders(req),
          "Content-Type": "application/json",
        },
      }
    );

  } catch (error: any) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ 
        error: "Internal server error",
        message: error.message 
      }),
      { 
        status: 500, 
        headers: {
          ...getCorsHeaders(req),
          "Content-Type": "application/json",
        },
      }
    );
  }
});
