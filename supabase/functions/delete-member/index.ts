import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface DeleteMemberRequest {
  memberId: string;
}

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Missing Authorization header" }, 401);
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const callerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: caller }, error: callerError } = await callerClient.auth.getUser();
    if (callerError || !caller) {
      return jsonResponse({ error: "Invalid or expired session" }, 401);
    }

    const { data: callerProfile, error: profileError } = await callerClient
      .from("members")
      .select("role, collectif_id")
      .eq("user_id", caller.id)
      .single();

    if (profileError || !callerProfile) {
      return jsonResponse({ error: "No profile found for caller" }, 403);
    }

    if (callerProfile.role !== "admin" && callerProfile.role !== "super_admin") {
      return jsonResponse({ error: "Not authorized to delete members" }, 403);
    }

    const { memberId }: DeleteMemberRequest = await req.json();
    if (!memberId) {
      return jsonResponse({ error: "Missing required field: memberId" }, 400);
    }

    // Service-role client, used only server-side, never exposed to the frontend -
    // needed both to bypass RLS for the lookup below and to delete the auth account.
    const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: target, error: targetError } = await serviceClient
      .from("members")
      .select("id, user_id, collectif_id")
      .eq("id", memberId)
      .maybeSingle();

    if (targetError || !target) {
      return jsonResponse({ error: "Member not found" }, 404);
    }

    if (callerProfile.role === "admin" && target.collectif_id !== callerProfile.collectif_id) {
      return jsonResponse({ error: "Not authorized to delete this member" }, 403);
    }

    if (target.user_id === caller.id) {
      return jsonResponse({ error: "Vous ne pouvez pas supprimer votre propre compte depuis cet écran" }, 400);
    }

    // Delete the roster row first: it references auth.users via user_id, so
    // deleting the auth account first would fail the foreign key. Any existing
    // fines/carpools/etc. still pointing at this member will make this fail with a
    // foreign key violation (409) - surfaced as-is, not handled here.
    const { error: deleteError } = await serviceClient.from("members").delete().eq("id", memberId);

    if (deleteError) {
      return jsonResponse({ error: "Failed to delete member", details: deleteError.message }, 409);
    }

    if (target.user_id) {
      const { error: authDeleteError } = await serviceClient.auth.admin.deleteUser(target.user_id);
      if (authDeleteError) {
        return jsonResponse(
          {
            success: true,
            warning: "Membre supprimé, mais son compte de connexion n'a pas pu être supprimé automatiquement",
            details: authDeleteError.message,
          },
          200
        );
      }
    }

    return jsonResponse({ success: true, message: "Membre supprimé" }, 200);
  } catch (error) {
    return jsonResponse(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" },
      500
    );
  }
});
