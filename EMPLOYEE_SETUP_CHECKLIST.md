# Employee Management Setup Checklist

Use this checklist to verify your employee management system is properly configured.

## Prerequisites

- [ ] Supabase project is set up and accessible
- [ ] Supabase CLI is installed: `npm install -g supabase`
- [ ] Logged into Supabase CLI: `npx supabase login`
- [ ] Project is linked: `npx supabase link --project-ref <your-project-ref>`

## Database Setup

- [x] `employees` table created (migration applied)
- [x] RLS enabled on `employees` table
- [x] RLS policies created for employees table
- [x] `salaries.employee_id` column added
- [x] RLS policy added for employees to view own salaries
- [x] Indexes created on `employees` table

**Verify:**
```sql
-- Check table exists
SELECT * FROM employees LIMIT 1;

-- Check RLS is enabled
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'employees';
```

## Edge Functions Setup

- [x] Functions deployed (via Supabase MCP)
- [ ] `SERVICE_ROLE_KEY` secret is set

**Set the secret:**
```bash
npx supabase secrets set SERVICE_ROLE_KEY=<your-service-role-key>
```

**Verify secret is set:**
```bash
npx supabase secrets list
```

**Verify functions are deployed:**
```bash
npx supabase functions list
```

You should see:
- [ ] `create-employee`
- [ ] `update-employee-password`
- [ ] `reset-employee-password`
- [ ] `update-employee-email`
- [ ] `delete-employee`

## Frontend Setup

- [x] Employee interface added to `api.ts`
- [x] Employee API methods implemented
- [x] Salary interface updated to use `employee_id`
- [x] Employees page created
- [x] EmployeeDashboard page created
- [x] Salary page updated to use employee dropdown
- [x] AuthContext updated to detect employee users
- [x] Routing updated for employee vs company user
- [x] Navigation updated conditionally

**Verify frontend:**
- [ ] No TypeScript errors: `cd frontend && npm run build`
- [ ] No linter errors
- [ ] Application starts: `npm run dev`

## Testing

### As Company Admin/Accountant

- [ ] Can access `/employees` page
- [ ] Can create new employee with password
- [ ] Generated password is displayed (one-time)
- [ ] Employee appears in employee list
- [ ] Can edit employee information
- [ ] Can reset employee password
- [ ] Can delete employee
- [ ] Can create salary record using employee dropdown
- [ ] Employee name displays correctly in salary list

### As Employee

- [ ] Can log in with employee credentials
- [ ] Redirected to `/employee-dashboard` after login
- [ ] Can see own salary records
- [ ] Can see summary statistics (total, paid, pending)
- [ ] Cannot access `/employees` page (redirected)
- [ ] Cannot access other company pages (redirected)
- [ ] Navigation shows only Dashboard option

### Security Verification

- [ ] Employee cannot see other employees' data
- [ ] Employee cannot see company financial data
- [ ] Company user from Company A cannot see Company B's employees
- [ ] RLS policies prevent unauthorized access

## Troubleshooting

### Functions Not Working

1. Check secret is set: `npx supabase secrets list`
2. Check function logs: `npx supabase functions logs create-employee`
3. Verify service role key is correct
4. Check function is deployed: `npx supabase functions list`

### Employee Cannot Login

1. Verify `auth_user_id` is populated in employees table
2. Verify auth user exists in Supabase Auth dashboard
3. Check employee status is 'active'
4. Verify password is correct

### RLS Errors

1. Verify RLS is enabled: `SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'employees';`
2. Check security advisors via Supabase MCP
3. Review RLS policies in Supabase dashboard

### Frontend Errors

1. Check browser console for errors
2. Verify API calls are using correct endpoints
3. Check network tab for failed requests
4. Verify environment variables are set

## Next Steps After Setup

1. Create your first employee as a test
2. Test employee login
3. Create a salary record for the employee
4. Verify employee can see their salary
5. Test password reset functionality

## Support

- See [EMPLOYEE_MANAGEMENT.md](./EMPLOYEE_MANAGEMENT.md) for detailed documentation
- See [supabase/functions/DEPLOYMENT.md](./supabase/functions/DEPLOYMENT.md) for deployment details
- Check Supabase dashboard logs for function errors
- Review browser console for frontend errors
