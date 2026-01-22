# Send Invoice Email Edge Function

This edge function sends invoice emails with PDF attachments to clients using Resend.

## Setup

### 1. Sign up for Resend

1. Create an account at [resend.com](https://resend.com)
2. Get your API key from the dashboard
3. Verify your domain (or use the test domain for development)

### 2. Set Supabase Secrets

Set the Resend API key and sender email as Supabase secrets:

```bash
npx supabase secrets set RESEND_API_KEY=<your-resend-api-key>
npx supabase secrets set RESEND_FROM_EMAIL=<your-email@yourdomain.com>
```

**Note**: 
- The sender email must be from a verified domain in Resend
- For development/testing, you can use Resend's test domain: `onboarding@resend.dev`
- The email address will be used as the "From" address for all invoice emails

### 3. Deploy the Function

```bash
npx supabase functions deploy send-invoice-email
```

## Usage

### From Frontend

The function is called automatically when sending an invoice from the Invoices page. The frontend:

1. Generates the invoice PDF
2. Converts it to base64
3. Calls this edge function with the invoice ID, recipient email, and PDF

### Manual Testing

You can test the function manually using curl:

```bash
curl -X POST https://<project-ref>.supabase.co/functions/v1/send-invoice-email \
  -H "Authorization: Bearer <user-jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "invoiceId": 1,
    "recipientEmail": "client@example.com",
    "pdfBase64": "<base64-encoded-pdf>",
    "message": "Optional custom message"
  }'
```

## Request Payload

```typescript
{
  invoiceId: number;          // Required: Invoice ID
  recipientEmail: string;      // Required: Recipient email address
  pdfBase64: string;          // Required: PDF as base64 string
  message?: string;           // Optional: Custom message to include in email
}
```

## Response

**Success (200)**:
```json
{
  "success": true,
  "message": "Invoice sent successfully",
  "emailId": "resend-email-id"
}
```

**Error (400/401/403/404/500)**:
```json
{
  "error": "Error message",
  "details": "Additional error details (if available)"
}
```

## Features

- **Authentication**: Verifies user is authenticated and has admin/accountant role
- **Authorization**: Ensures user can only send invoices for their company
- **Email Validation**: Validates recipient email format
- **PDF Attachment**: Attaches invoice PDF to email
- **Status Update**: Automatically updates invoice status to 'sent'
- **Error Handling**: Comprehensive error handling with detailed logging
- **CORS Support**: Handles CORS preflight requests

## Email Template

The email includes:
- Professional HTML template
- Invoice details (number, dates, amount)
- PDF attachment
- Custom message (if provided)
- Company branding

## Debugging

### Check Edge Function Logs

```bash
# Using Supabase MCP
mcp_supabase_get_logs service=edge-function
```

### Common Issues

1. **"Email service not configured"**
   - Ensure `RESEND_API_KEY` secret is set
   - Redeploy the function after setting secrets

2. **"Invalid email address format"**
   - Check the recipient email format
   - Ensure it's a valid email address

3. **"Invoice not found or access denied"**
   - Verify the invoice ID exists
   - Ensure the invoice belongs to the user's company

4. **"Failed to send email"**
   - Check Resend API key is valid
   - Verify sender email domain is verified in Resend
   - Check Resend dashboard for delivery status

### Resend Dashboard

Check the Resend dashboard for:
- Email delivery status
- Bounce/spam reports
- API usage and limits

## Security

- Requires authentication (JWT token)
- Only admin and accountant roles can send invoices
- Company ID verification prevents cross-company access
- Email validation prevents injection attacks

## Environment Variables

The function uses the following environment variables (set as Supabase secrets):

- `RESEND_API_KEY` - Resend API key (required)
- `RESEND_FROM_EMAIL` - Sender email address (required)
- `SUPABASE_URL` - Automatically provided by Supabase
- `SERVICE_ROLE_KEY` - Automatically provided by Supabase
- `SUPABASE_ANON_KEY` - Automatically provided by Supabase
