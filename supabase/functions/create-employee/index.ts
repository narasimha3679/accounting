import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

interface EmployeeData {
  company_id: number;
  employee_id?: string; // Optional - will be auto-generated if not provided
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  position?: string;
  hire_date?: string;
  status?: 'active' | 'inactive' | 'terminated';
  address?: string;
  sin?: string;
  payrate?: number;
  payrate_type?: 'hourly' | 'salary' | 'monthly' | 'biweekly';
  initialPassword: string;
}

Deno.serve(async (req: Request) => {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Create admin client for auth operations
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Create client for RLS checks
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    // Verify user is authenticated
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // Verify user is admin or accountant for the company
    const { data: profile, error: profileError } = await userClient
      .from("profiles")
      .select("company_id, role")
      .eq("auth_user_id", user.id)
      .single();

    if (profileError || !profile || !["admin", "accountant"].includes(profile.role)) {
      return new Response(
        JSON.stringify({ error: "Forbidden: Must be admin or accountant" }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    const employeeData: EmployeeData = await req.json();

    // Verify company_id matches user's company
    if (employeeData.company_id !== profile.company_id) {
      return new Response(
        JSON.stringify({ error: "Forbidden: Company ID mismatch" }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    // Auto-generate employee_id if not provided
    let employeeId = employeeData.employee_id;
    if (!employeeId) {
      // Get existing employees for this company to find max employee_id
      const { data: existingEmployees, error: fetchError } = await adminClient
        .from("employees")
        .select("employee_id")
        .eq("company_id", employeeData.company_id);

      if (fetchError) {
        return new Response(
          JSON.stringify({ error: `Failed to fetch existing employees: ${fetchError.message}` }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }

      // Extract numeric part from existing employee_ids and find max
      const maxNum = existingEmployees && existingEmployees.length > 0
        ? existingEmployees
            .map(e => {
              // Extract number from formats like "EMP1", "EMP001", "1", etc.
              const match = e.employee_id.replace(/^EMP/i, '').match(/^\d+/);
              return match ? parseInt(match[0], 10) : 0;
            })
            .reduce((max, num) => Math.max(max, num), 0)
        : 0;

      employeeId = `EMP${maxNum + 1}`;
    }

    // Create auth user
    const { data: authUser, error: createUserError } = await adminClient.auth.admin.createUser({
      email: employeeData.email,
      password: employeeData.initialPassword,
      email_confirm: true,
    });

    if (createUserError || !authUser.user) {
      return new Response(
        JSON.stringify({ error: `Failed to create auth user: ${createUserError?.message}` }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Create employee record
    const { data: employee, error: employeeError } = await adminClient
      .from("employees")
      .insert({
        company_id: employeeData.company_id,
        auth_user_id: authUser.user.id,
        employee_id: employeeId,
        first_name: employeeData.first_name,
        last_name: employeeData.last_name,
        email: employeeData.email,
        phone: employeeData.phone || null,
        position: employeeData.position || null,
        hire_date: employeeData.hire_date || null,
        status: employeeData.status || "active",
        address: employeeData.address || null,
        sin: employeeData.sin || null,
        payrate: employeeData.payrate || null,
        payrate_type: employeeData.payrate_type || null,
      })
      .select()
      .single();

    if (employeeError) {
      // Clean up auth user if employee creation fails
      await adminClient.auth.admin.deleteUser(authUser.user.id);
      return new Response(
        JSON.stringify({ error: `Failed to create employee: ${employeeError.message}` }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify(employee),
      { status: 201, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
