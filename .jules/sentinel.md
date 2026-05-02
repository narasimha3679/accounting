## 2025-05-20 - HTML Injection in Email Templates
**Vulnerability:** User input (message, client name, etc.) was directly interpolated into HTML email templates without escaping.
**Learning:** Interpolating user input directly into HTML strings is risky even in backend code (email generation), as it allows HTML injection and potential phishing vectors.
**Prevention:** Use an HTML escaping utility function (like `escapeHtml`) for all user-controlled data before inserting it into HTML templates.
