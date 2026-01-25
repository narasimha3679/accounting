# Access Control System

## Overview

This application uses **two separate access control systems**:

1. **Company Membership Roles** - For business owners and financial staff
2. **Employee Access** - For workers who need to track time and view pay information

---

## 1. Company Membership Roles

Company members are stored in the `user_companies` table and have access to manage the business.

### Owner
- **Full administrative access** to the company
- Can manage all financials, employees, settings, and company information
- Can invite/remove other owners and accountants
- Can update company settings and configuration
- Multiple owners per company are supported (for partnerships)

### Accountant
- **Full financial and operational access**
- Can manage: invoices, expenses, clients, employees, payroll, reports
- **Cannot** manage company settings or invite/remove members
- Ideal for bookkeepers, accountants, or financial staff

### Key Points
- Users can belong to **multiple companies** with different roles
- Each user has a **primary company** designation
- Company switching is supported in the UI
- Invitations use email with expiring tokens

---

## 2. Employee Access

Employees are stored in the `employees` table and represent workers being managed by the company.

### Employee
- **Separate from company membership** - not in `user_companies` table
- Can be linked to an auth account via `auth_user_id` field
- When logged in, employees see:
  - Employee Dashboard (different UI from company dashboard)
  - Their own timesheets and schedules
  - Their own pay stubs and tax documents
  - Time clock for clocking in/out
- **Cannot** access:
  - Company financials
  - Other employees' data
  - Company settings
  - Client information

### Key Points
- Not all employees need login access (can be managed without auth)
- Employees who do log in see a completely different interface
- Designed for hourly workers, staff who need to track time
- RLS policies ensure employees only see their own data

---

## Comparison

| Aspect | Company Member (Owner/Accountant) | Employee |
|--------|-----------------------------------|----------|
| **Table** | `user_companies` | `employees` |
| **Purpose** | Manage the business | Track work time/pay |
| **Access Level** | Company-wide | Personal data only |
| **Can View Financials** | ✅ Yes | ❌ No |
| **Can Manage Others** | ✅ Yes (Owner only) | ❌ No |
| **Dashboard** | Company Dashboard | Employee Dashboard |
| **Multi-Company** | ✅ Yes | ❌ No (per company) |

---

## Database Schema

### Company Membership
```sql
-- user_companies table
CREATE TABLE user_companies (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES profiles(id),
    company_id BIGINT REFERENCES companies(id),
    role TEXT CHECK (role IN ('owner', 'accountant')),
    is_primary BOOLEAN DEFAULT false,
    invite_status TEXT DEFAULT 'accepted',
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
);
```

### Employee Access
```sql
-- employees table
CREATE TABLE employees (
    id BIGSERIAL PRIMARY KEY,
    company_id BIGINT REFERENCES companies(id),
    auth_user_id UUID REFERENCES auth.users(id), -- Optional
    employee_id TEXT,
    first_name TEXT,
    last_name TEXT,
    email TEXT,
    status TEXT CHECK (status IN ('active', 'inactive', 'terminated')),
    -- ... payroll fields
);
```

---

## Implementation Notes

### Frontend
- `useCurrentCompany()` hook for company membership checks
- `user.isEmployee` flag to determine employee vs company member
- Separate routing: `/dashboard` (company) vs `/employee` (employee)
- Different navigation menus based on access type

### Backend/RLS
- `user_has_company_access(company_id)` - Check company membership
- `user_company_role(company_id)` - Get user's role
- Employee RLS: `WHERE auth_user_id = auth.uid()` - Only own data

### Authentication Flow
1. User signs in
2. System checks if they're an employee (`employees.auth_user_id`)
3. If employee: redirect to Employee Dashboard
4. If not: load company memberships, redirect to Company Dashboard

---

## Future Considerations

### Manager Role (Deprioritized)
- Would have customizable permissions via JSONB field
- For middle management with limited access
- Database schema exists but hidden from UI

### Viewer Role (To Be Removed)
- Originally for read-only stakeholders
- Not needed - should be removed from codebase
