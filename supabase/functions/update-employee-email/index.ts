import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

interface EmailUpdateData {
  employee_id: number;
  newEmail: string;
}

/**
 * Get CORS headers for the request
 * Uses the request origin instead of '*' to support credentials (Authorization header)
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
        { 
          status: 401, 
          headers: {
            ...getCorsHeaders(req),
            "Content-Type": "application/json",
          },
        }
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
        { 
          status: 403, 
          headers: {
            ...getCorsHeaders(req),
            "Content-Type": "application/json",
          },
        }
      );
    }

    const { employee_id, newEmail }: EmailUpdateData = await req.json();

    // Get employee to verify company_id and get auth_user_id
    const { data: employee, error: employeeError } = await adminClient
      .from("employees")
      .select("id, company_id, auth_user_id")
      .eq("id", employee_id)
      .single();

    if (employeeError || !employee) {
      return new Response(
        JSON.stringify({ error: "Employee not found" }),
        { 
          status: 404, 
          headers: {
            ...getCorsHeaders(req),
            "Content-Type": "application/json",
          },
        }
      );
    }

    if (employee.company_id !== profile.company_id) {
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

    if (!employee.auth_user_id) {
      return new Response(
        JSON.stringify({ error: "Employee has no auth user account" }),
        { 
          status: 400, 
          headers: {
            ...getCorsHeaders(req),
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Update email in auth.users
    const { error: updateAuthError } = await adminClient.auth.admin.updateUserById(
      employee.auth_user_id,
      { email: newEmail }
    );

    if (updateAuthError) {
      return new Response(
        JSON.stringify({ error: `Failed to update email: ${updateAuthError.message}` }),
        { 
          status: 400, 
          headers: {
            ...getCorsHeaders(req),
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Update email in employees table
    const { error: updateEmployeeError } = await adminClient
      .from("employees")
      .update({ email: newEmail })
      .eq("id", employee_id);

    if (updateEmployeeError) {
      return new Response(
        JSON.stringify({ error: `Failed to update employee email: ${updateEmployeeError.message}` }),
        { 
          status: 400, 
          headers: {
            ...getCorsHeaders(req),
            "Content-Type": "application/json",
          },
        }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { 
        status: 200, 
        headers: {
          ...getCorsHeaders(req),
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
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
