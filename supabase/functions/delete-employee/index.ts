import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

interface DeleteEmployeeData {
  employee_id: number;
  deleteAuthUser?: boolean;
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

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

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

    const { employee_id, deleteAuthUser = true }: DeleteEmployeeData = await req.json();

    // Get employee to verify company_id and get auth_user_id
    const { data: employee, error: employeeError } = await adminClient
      .from("employees")
      .select("id, company_id, auth_user_id")
      .eq("id", employee_id)
      .single();

    if (employeeError || !employee) {
      return new Response(
        JSON.stringify({ error: "Employee not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    if (employee.company_id !== profile.company_id) {
      return new Response(
        JSON.stringify({ error: "Forbidden: Company ID mismatch" }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    // Delete employee record (this will cascade or set null on salaries.employee_id)
    const { error: deleteEmployeeError } = await adminClient
      .from("employees")
      .delete()
      .eq("id", employee_id);

    if (deleteEmployeeError) {
      return new Response(
        JSON.stringify({ error: `Failed to delete employee: ${deleteEmployeeError.message}` }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Optionally delete auth user
    if (deleteAuthUser && employee.auth_user_id) {
      const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(
        employee.auth_user_id
      );

      if (deleteAuthError) {
        // Log error but don't fail the request since employee is already deleted
        console.error("Failed to delete auth user:", deleteAuthError);
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
