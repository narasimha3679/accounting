# Employee Management System Documentation

## Quick Reference

- **Main Feature**: Companies can manage employees and generate login credentials. Employees can view their salary information.
- **Key Files**: 
  - Database: Migration applied via Supabase MCP
  - Edge Functions: `supabase/functions/*/index.ts`
  - Frontend: `frontend/src/pages/Employees.tsx`, `frontend/src/pages/EmployeeDashboard.tsx`
  - API: `frontend/src/lib/api.ts`
- **Setup Required**: Set `SERVICE_ROLE_KEY` secret: `npx supabase secrets set SERVICE_ROLE_KEY=<key>`
- **Deployment**: Functions already deployed. See [Deployment Guide](./supabase/functions/DEPLOYMENT.md)

## Overview

The Employee Management System allows companies to manage their employees, generate login credentials, and provides employees with a limited dashboard to view their salary information. This feature extends the accounting system to support employee authentication and access control.

## Architecture

### Components

1. **Database Schema**: `employees` table with RLS policies
2. **Supabase Edge Functions**: Server-side functions for secure auth user management
3. **API Layer**: Frontend API methods for employee CRUD operations
4. **Frontend Components**: Employees page, Employee Dashboard, and updated Salary page
5. **Authentication**: Extended AuthContext to support employee users

### Why Edge Functions?

Creating and managing Supabase Auth users requires admin privileges (service role key). Edge functions run server-side and can securely access the service role key without exposing it to the frontend. This follows Supabase security best practices.

## Database Schema

### Employees Table

```sql
CREATE TABLE employees (
    id BIGSERIAL PRIMARY KEY,
    company_id BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    employee_id TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT,
    position TEXT,
    hire_date DATE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'terminated')),
    address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(company_id, employee_id)
);
```

**Indexes:**
- `idx_employees_company_id` on `company_id`
- `idx_employees_email` on `email`
- `idx_employees_auth_user_id` on `auth_user_id`

**Constraints:**
- Unique constraint on `email`
- Unique constraint on `(company_id, employee_id)`

### Salaries Table Update

The `salaries` table was updated to use `employee_id` (foreign key to employees) instead of `employee_name` (text field):

```sql
ALTER TABLE salaries ADD COLUMN employee_id BIGINT REFERENCES employees(id) ON DELETE SET NULL;
```

**Note:** The `employee_name` column remains for backward compatibility with existing data. New salary records should use `employee_id`.

### Row-Level Security (RLS) Policies

#### Employees Table Policies

**Company users can view employees:**
```sql
CREATE POLICY "Company users can view employees"
    ON employees FOR SELECT
    USING (
        company_id IN (
            SELECT company_id FROM profiles 
            WHERE auth_user_id = auth.uid() 
            AND role IN ('admin', 'accountant')
        )
    );
```

**Company users can create employees:**
```sql
CREATE POLICY "Company users can create employees"
    ON employees FOR INSERT
    WITH CHECK (
        company_id IN (
            SELECT company_id FROM profiles 
            WHERE auth_user_id = auth.uid() 
            AND role IN ('admin', 'accountant')
        )
    );
```

**Company users can update employees:**
```sql
CREATE POLICY "Company users can update employees"
    ON employees FOR UPDATE
    USING (
        company_id IN (
            SELECT company_id FROM profiles 
            WHERE auth_user_id = auth.uid() 
            AND role IN ('admin', 'accountant')
        )
    );
```

**Company users can delete employees:**
```sql
CREATE POLICY "Company users can delete employees"
    ON employees FOR DELETE
    USING (
        company_id IN (
            SELECT company_id FROM profiles 
            WHERE auth_user_id = auth.uid() 
            AND role IN ('admin', 'accountant')
        )
    );
```

**Employees can view their own record:**
```sql
CREATE POLICY "Employees can view own record"
    ON employees FOR SELECT
    USING (auth_user_id = auth.uid());
```

#### Salaries Table Policy (New)

**Employees can view their own salary records:**
```sql
CREATE POLICY "Employees can view own salaries"
    ON salaries FOR SELECT
    USING (
        employee_id IN (
            SELECT id FROM employees 
            WHERE auth_user_id = auth.uid()
        )
    );
```

## Supabase Edge Functions

### Overview

Edge functions handle operations that require admin privileges (service role key). All functions:
- Verify the caller is authenticated
- Verify the caller has admin/accountant role
- Verify company_id matches the caller's company
- Use service role key to perform auth operations

### Functions

#### 1. create-employee

**Purpose:** Creates an employee record and associated Supabase Auth user.

**Endpoint:** `POST /functions/v1/create-employee`

**Request Body:**
```typescript
{
  company_id: number;
  employee_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  position?: string;
  hire_date?: string;
  status?: 'active' | 'inactive' | 'terminated';
  address?: string;
  initialPassword: string;
}
```

**Response:** Employee record with `auth_user_id` populated

**Security:**
- Requires JWT authentication
- Verifies user is admin/accountant
- Verifies company_id matches user's company

#### 2. update-employee-password

**Purpose:** Updates an employee's password.

**Endpoint:** `POST /functions/v1/update-employee-password`

**Request Body:**
```typescript
{
  employee_id: number;
  newPassword: string;
}
```

**Response:** `{ success: true }`

#### 3. reset-employee-password

**Purpose:** Generates and sets a new secure password for an employee.

**Endpoint:** `POST /functions/v1/reset-employee-password`

**Request Body:**
```typescript
{
  employee_id: number;
}
```

**Response:** `{ password: string }` - The generated password (display once, cannot retrieve)

#### 4. update-employee-email

**Purpose:** Updates an employee's email in both `employees` table and `auth.users`.

**Endpoint:** `POST /functions/v1/update-employee-email`

**Request Body:**
```typescript
{
  employee_id: number;
  newEmail: string;
}
```

**Response:** `{ success: true }`

#### 5. delete-employee

**Purpose:** Deletes an employee record and optionally the auth user account.

**Endpoint:** `POST /functions/v1/delete-employee`

**Request Body:**
```typescript
{
  employee_id: number;
  deleteAuthUser?: boolean; // Default: true
}
```

**Response:** `{ success: true }`

### Deployment

#### Prerequisites

1. Supabase CLI installed: `npm install -g supabase`
2. Logged into Supabase: `npx supabase login`
3. Project linked: `npx supabase link --project-ref <your-project-ref>`

#### Step 1: Set Service Role Key Secret

**Important:** Supabase CLI does not allow secret names starting with `SUPABASE_`. Use `SERVICE_ROLE_KEY` instead.

```bash
npx supabase secrets set SERVICE_ROLE_KEY=<your-service-role-key>
```

Get your service role key from: Supabase Dashboard → Settings → API → Service Role Key

**Security Note:** Never commit the service role key. It has full admin access to your database.

#### Step 2: Deploy Functions

Functions are already deployed via Supabase MCP. To redeploy or update:

```bash
# Deploy individual functions
npx supabase functions deploy create-employee
npx supabase functions deploy update-employee-password
npx supabase functions deploy reset-employee-password
npx supabase functions deploy update-employee-email
npx supabase functions deploy delete-employee
```

Or deploy all at once:
```bash
npx supabase functions deploy create-employee update-employee-password reset-employee-password update-employee-email delete-employee
```

#### Step 3: Verify Deployment

Check deployed functions:
```bash
npx supabase functions list
```

View function logs:
```bash
npx supabase functions logs create-employee
```

### Environment Variables

Edge functions automatically have access to:
- `SUPABASE_URL` - Your Supabase project URL (auto-provided)
- `SUPABASE_ANON_KEY` - Your Supabase anon key (auto-provided)

You must set as a secret:
- `SERVICE_ROLE_KEY` - Your Supabase service role key (for admin operations)

## API Layer

### Employee Interface

```typescript
export interface Employee {
    id: number;
    company_id: number;
    auth_user_id?: string | null;
    employee_id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone?: string | null;
    position?: string | null;
    hire_date?: string | null;
    status: 'active' | 'inactive' | 'terminated';
    address?: string | null;
    created_at: string;
    updated_at: string;
    company?: Company;
}
```

### API Methods

#### Get Employees

```typescript
api.getEmployees(params?: {
    page?: number;
    limit?: number;
    search?: string;
    company_id?: number;
    status?: string;
}): Promise<PaginatedResponse<Employee>>
```

#### Get Employee

```typescript
api.getEmployee(id: number): Promise<Employee>
```

#### Create Employee

```typescript
api.createEmployee(employee: Omit<Employee, 'id' | 'created_at' | 'updated_at' | 'company' | 'auth_user_id'> & {
    initialPassword: string;
}): Promise<Employee>
```

**Note:** This calls the `create-employee` edge function which creates both the auth user and employee record.

#### Update Employee

```typescript
api.updateEmployee(id: number, employee: Partial<Employee> & {
    newEmail?: string;
}): Promise<Employee>
```

**Note:** If `newEmail` is provided and different from current email, calls `update-employee-email` edge function.

#### Delete Employee

```typescript
api.deleteEmployee(id: number, deleteAuthUser?: boolean): Promise<void>
```

**Note:** Calls `delete-employee` edge function. Defaults to deleting auth user.

#### Update Employee Password

```typescript
api.updateEmployeePassword(id: number, newPassword: string): Promise<void>
```

**Note:** Calls `update-employee-password` edge function.

#### Reset Employee Password

```typescript
api.resetEmployeePassword(id: number): Promise<string>
```

**Returns:** The newly generated password (display once, cannot retrieve later)

**Note:** Calls `reset-employee-password` edge function.

### Salary Interface Update

The `Salary` interface was updated:

```typescript
export interface Salary {
    id: number;
    amount: number;
    payment_date: string;
    period_start: string;
    period_end: string;
    employee_id: number;  // Changed from employee_name: string
    employee?: Employee;   // Added relation
    status: 'pending' | 'paid';
    notes?: string | null;
    company_id: number;
    company?: Company;
    created_at: string;
    updated_at: string;
}
```

## Frontend Components

### Employees Page (`/employees`)

**Route:** `/employees`  
**Access:** Company users (admin/accountant) only

**Features:**
- List all employees for the company
- Summary cards: Total, Active, Inactive employees
- Search by name, email, or employee ID
- Filter by status (active/inactive/terminated)
- Create new employee with initial password
- Edit employee information
- Reset employee password (generates new password)
- Delete employee (with confirmation)

**Components:**
- Employee cards showing: name, email, position, hire date, status
- Create/Edit modal with all employee fields
- Password reset modal (shows generated password once)

### Employee Dashboard (`/employee-dashboard`)

**Route:** `/employee-dashboard`  
**Access:** Employees only

**Features:**
- Welcome message with employee name
- Company name display (read-only)
- Employee's own salary records (read-only)
- Summary statistics:
  - Total salaries
  - Paid salaries
  - Pending salaries

**Restrictions:**
- Employees cannot access company financial data
- Employees cannot see other employees' information
- Employees cannot modify salary records

### Updated Salary Page (`/salary`)

**Changes:**
- Replaced text input for `employee_name` with dropdown select
- Dropdown populated from active employees
- Displays employee full name from employee relation
- Form submission uses `employee_id` instead of `employee_name`

## Authentication Flow

### User Type Detection

The `AuthContext` checks both `profiles` and `employees` tables after login:

1. **Check employees table first:**
   - If `auth_user_id` found in `employees` → User is an employee
   - Set `isEmployee: true`, `role: 'employee'`
   - Load employee record

2. **Check profiles table:**
   - If `auth_user_id` found in `profiles` → User is a company user
   - Set `isEmployee: false`, use profile role (admin/accountant/viewer)
   - Load profile record

### User Interface Update

```typescript
export interface User {
    id: number;
    email: string;
    name: string;
    role: 'admin' | 'accountant' | 'viewer' | 'employee';
    company_id: number;
    company?: Company;
    isEmployee?: boolean;  // true if user is an employee
    employee?: Employee;   // populated if isEmployee is true
    created_at: string;
    updated_at: string;
}
```

### Routing

**Protected Routes (Company Users Only):**
- `/` - Dashboard
- `/employees` - Employee management
- `/invoices`, `/expenses`, `/clients`, etc. - All company management pages

**Employee Routes:**
- `/employee-dashboard` - Employee-only dashboard

**Route Protection:**
- `ProtectedRoute` redirects employees to `/employee-dashboard`
- `EmployeeRoute` redirects company users to `/`
- Employees are blocked from accessing company-only routes

### Navigation

The `Layout` component conditionally shows navigation items:

- **Company users:** Full navigation including Employees page
- **Employees:** Limited navigation (Dashboard only)

## Security Considerations

### Row-Level Security

- **Company users** can only see/manage employees for their own company
- **Employees** can only see their own record and their own salary records
- RLS policies enforce these restrictions at the database level

### Edge Functions Security

- All functions require JWT authentication
- Functions verify caller has admin/accountant role
- Functions verify company_id matches caller's company
- Service role key is stored as a secret, never exposed to frontend

### Password Management

- Initial passwords are set by employer when creating employee
- Passwords can be reset by employer (generates new secure password)
- Generated passwords are shown once and cannot be retrieved
- Passwords are stored securely in Supabase Auth (not in employee table)

### Data Access

- Employees have read-only access to their own salary records
- Employees cannot access:
  - Other employees' information
  - Company financial data (invoices, expenses, etc.)
  - Client information
  - Reports or tax calculations
  - Settings or company configuration

## Setup Instructions

### 1. Database Migration

The migration has already been applied. It includes:
- `employees` table creation
- RLS policies for employees
- `salaries.employee_id` column addition
- RLS policy for employees to view own salaries

### 2. Edge Functions Deployment

Functions are already deployed. Ensure the secret is set:

```bash
npx supabase secrets set SERVICE_ROLE_KEY=<your-service-role-key>
```

### 3. Frontend

No additional setup required. The frontend code is already integrated.

### 4. Testing

1. **As Company Admin:**
   - Navigate to `/employees`
   - Create a new employee with initial password
   - Verify employee appears in list
   - Test password reset
   - Create salary record using employee dropdown

2. **As Employee:**
   - Log in with employee credentials
   - Verify redirect to `/employee-dashboard`
   - Verify can see own salary records
   - Verify cannot access company pages

## Migration from employee_name to employee_id

Existing salary records may still have `employee_name` populated. The application handles both:

- **New records:** Use `employee_id` (required)
- **Existing records:** May have `employee_name` for backward compatibility

To migrate existing data:

1. Create employee records for existing employee names
2. Update salary records to use `employee_id` instead of `employee_name`
3. Once migrated, `employee_name` can be deprecated

## Troubleshooting

### Edge Functions Not Working

1. **Check secret is set:**
   ```bash
   npx supabase secrets list
   ```

2. **Check function logs:**
   ```bash
   npx supabase functions logs create-employee
   ```

3. **Verify function is deployed:**
   ```bash
   npx supabase functions list
   ```

### Employee Cannot Login

1. Verify employee record has `auth_user_id` populated
2. Verify auth user exists in Supabase Auth
3. Check employee status is 'active'
4. Verify password is correct

### RLS Policy Errors

1. Verify RLS is enabled on `employees` table:
   ```sql
   SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'employees';
   ```

2. Check security advisors:
   ```bash
   # Use Supabase MCP tool
   mcp_supabase_get_advisors type=security
   ```

### Salary Dropdown Empty

1. Verify employees exist for the company
2. Check employees have status 'active'
3. Verify user has correct company_id
4. Check browser console for API errors

## API Usage Examples

### Create Employee

```typescript
const employee = await api.createEmployee({
    company_id: user.company_id,
    employee_id: 'EMP001',
    first_name: 'John',
    last_name: 'Doe',
    email: 'john.doe@example.com',
    phone: '555-0100',
    position: 'Developer',
    hire_date: '2024-01-15',
    status: 'active',
    initialPassword: 'SecurePassword123!'
});
```

### Reset Employee Password

```typescript
const newPassword = await api.resetEmployeePassword(employeeId);
// Display password to employer (one-time only)
console.log('New password:', newPassword);
```

### Get Employees

```typescript
const result = await api.getEmployees({
    company_id: user.company_id,
    status: 'active',
    search: 'john'
});
```

### Create Salary with Employee

```typescript
const salary = await api.createSalary({
    company_id: user.company_id,
    employee_id: employee.id,  // Use employee_id, not employee_name
    amount: 5000,
    payment_date: '2024-01-31',
    period_start: '2024-01-01',
    period_end: '2024-01-31',
    status: 'paid'
});
```

## Future Enhancements

Potential improvements:
- Employee self-service password change
- Employee profile editing (limited fields)
- Email notifications for salary payments
- Employee onboarding workflow
- Bulk employee import
- Employee role/permission system
- Integration with payroll systems

## Related Files

### Database
- Migration: Applied via Supabase MCP (`create_employees_table_and_update_salaries`)
- RLS Policies: Applied via migration

### Edge Functions
- `supabase/functions/create-employee/index.ts`
- `supabase/functions/update-employee-password/index.ts`
- `supabase/functions/reset-employee-password/index.ts`
- `supabase/functions/update-employee-email/index.ts`
- `supabase/functions/delete-employee/index.ts`
- `supabase/functions/README.md` - Function documentation
- `supabase/functions/DEPLOYMENT.md` - Deployment guide

### Frontend API
- `frontend/src/lib/api.ts` - Employee API methods and interfaces

### Frontend Components
- `frontend/src/pages/Employees.tsx` - Employee management page
- `frontend/src/pages/EmployeeDashboard.tsx` - Employee-only dashboard
- `frontend/src/pages/Salary.tsx` - Updated to use employee dropdown

### Authentication & Routing
- `frontend/src/contexts/AuthContext.tsx` - Updated to detect employee users
- `frontend/src/App.tsx` - Updated routing with employee routes
- `frontend/src/components/Layout.tsx` - Conditional navigation based on user type

## Additional Resources

- [Main README](../README.md) - Project overview
- [Design System](../frontend/DESIGN_SYSTEM.md) - UI/UX guidelines
- [Supabase Functions Deployment Guide](./supabase/functions/DEPLOYMENT.md) - Detailed deployment instructions
