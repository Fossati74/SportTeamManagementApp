import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface InviteUserRequest {
  email?: string;
  role: "admin" | "user";
  collectifId?: string;
  playerId?: string;
  firstName?: string;
  lastName?: string;
}

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Sends the invite email ourselves (instead of relying on
// `auth.admin.inviteUserByEmail`'s built-in mailer) so that the link we send is
// the exact same one we store in `invite_links` - there is only ever one
// `generateLink` call per invite, so there's no risk of a second call
// invalidating the token that was actually mailed out.
async function sendInviteEmail(email: string, link: string): Promise<{ sent: boolean; error?: string }> {
  const host = Deno.env.get("SMTP_HOST");
  const port = Number(Deno.env.get("SMTP_PORT") ?? "587");
  const user = Deno.env.get("SMTP_USER");
  const password = Deno.env.get("SMTP_PASSWORD");
  const from = Deno.env.get("SMTP_FROM") || user;

  if (!host || !user || !password || !from) {
    return { sent: false, error: "SMTP not configured (missing SMTP_HOST/SMTP_USER/SMTP_PASSWORD/SMTP_FROM)" };
  }

  const secure = Deno.env.get("SMTP_SECURE") === "true" || port === 465;
  const client = new SMTPClient({
    connection: {
      hostname: host,
      port,
      tls: secure,
      auth: { username: user, password },
    },
  });

  try {
    await client.send({
      from,
      to: email,
      subject: "Invitation - Team Manager",
      content: "auto",
      html: `
        <p>Bonjour,</p>
        <p>Vous avez été invité à rejoindre votre équipe sur Team Manager.</p>
        <p><a href="${link}">Cliquez ici pour activer votre compte</a></p>
        <p>Si le lien ne fonctionne pas, copiez-collez cette adresse dans votre navigateur :<br />${link}</p>
      `,
    });
    return { sent: true };
  } catch (error) {
    return { sent: false, error: error instanceof Error ? error.message : "Unknown SMTP error" };
  } finally {
    await client.close();
  }
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

    // Runs as the caller (their JWT is forwarded), so RLS restricts this to their
    // own member row - no service key needed to identify who is calling.
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

    const { email, role, collectifId, playerId, firstName, lastName }: InviteUserRequest = await req.json();

    if (!role) {
      return jsonResponse({ error: "Missing required field: role" }, 400);
    }

    if (!playerId && (!firstName || !lastName)) {
      return jsonResponse({ error: "firstName and lastName are required when not selecting an existing member" }, 400);
    }

    // Which collectif this action applies to - independent of what role is being
    // requested, checked next once we know whether it's a new account or not.
    let targetCollectifId: string;

    if (callerProfile.role === "admin") {
      // Ignore any collectifId the client sends - always the admin's own collectif.
      targetCollectifId = callerProfile.collectif_id;
    } else if (callerProfile.role === "super_admin") {
      if (!collectifId) {
        return jsonResponse({ error: "collectifId is required" }, 400);
      }
      targetCollectifId = collectifId;
    } else {
      return jsonResponse({ error: "Not authorized to invite users" }, 403);
    }

    // Service-role client, used only server-side, never exposed to the frontend.
    const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // If targeting an existing member, look them up first: if they already have a
    // login account (user_id set - whether or not they've clicked the invite link
    // yet), this is just a role change on their existing row, no new invite email.
    let existingMemberUserId: string | null = null;
    if (playerId) {
      const { data: existingMember, error: memberError } = await serviceClient
        .from("members")
        .select("user_id")
        .eq("id", playerId)
        .eq("collectif_id", targetCollectifId)
        .maybeSingle();

      if (memberError || !existingMember) {
        return jsonResponse({ error: "Player not found in this collectif" }, 404);
      }
      existingMemberUserId = existingMember.user_id;
    }

    const needsNewAccount = !existingMemberUserId;

    // Now that we know whether this creates a brand-new account or just touches an
    // existing member, apply the actual permission rule for the requested role.
    // - Setting role "user" is allowed for an admin (their own collectif) or a
    //   super_admin acting as/managing a chosen collectif (e.g. via "Entrer dans ce
    //   collectif") - same rights an admin of that collectif would have.
    // - Setting role "admin" (creating a new admin, or promoting/demoting an
    //   existing member to/from admin) is reserved to super_admin.
    if (role === "admin" && callerProfile.role !== "super_admin") {
      return jsonResponse({ error: "Only super admins can manage the admin role" }, 403);
    }
    if (role !== "admin" && role !== "user") {
      return jsonResponse({ error: "Invalid role" }, 400);
    }

    if (needsNewAccount && !email) {
      return jsonResponse({ error: "email is required to create a new account" }, 400);
    }

    if (!needsNewAccount) {
      // Member already has an account - just update their role, no email sent.
      const { error: updateError } = await serviceClient
        .from("members")
        .update({ role })
        .eq("id", playerId);

      if (updateError) {
        return jsonResponse({ error: "Failed to update role", details: updateError.message }, 500);
      }

      return jsonResponse({ success: true, message: "Rôle mis à jour" }, 200);
    }

    // Redirect to the site root, not a dedicated "/accept-invite" path: this app is
    // static-hosted (GitHub Pages), which can't route a path that isn't a real file
    // - only the root reliably loads. The app detects the invite from the "type=invite"
    // Supabase already attaches to the link's hash, regardless of where it lands.
    const appUrl = Deno.env.get("APP_URL");
    const { data: generated, error: generateError } = await serviceClient.auth.admin.generateLink({
      type: "invite",
      email,
      options: appUrl ? { redirectTo: appUrl } : undefined,
    });

    if (generateError || !generated.user) {
      console.error("generateLink failed:", generateError?.message);
      return jsonResponse({ error: "Failed to generate invite link", details: generateError?.message }, 500);
    }

    const inviteLink = generated.properties.action_link;

    let memberId = playerId ?? null;

    if (playerId) {
      const { error: updateError, count } = await serviceClient
        .from("members")
        .update({ user_id: generated.user.id, role, email }, { count: "exact" })
        .eq("id", playerId)
        .eq("collectif_id", targetCollectifId);

      if (updateError || count === 0) {
        console.error("Failed to link player after invite:", updateError?.message ?? "Player not found in this collectif");
        return jsonResponse(
          { error: "Invite generated but failed to link player", details: updateError?.message ?? "Player not found in this collectif" },
          500
        );
      }
    } else {
      const { data: inserted, error: insertError } = await serviceClient
        .from("members")
        .insert({
          user_id: generated.user.id,
          role,
          collectif_id: targetCollectifId,
          email,
          first_name: firstName,
          last_name: lastName,
        })
        .select("id")
        .single();

      if (insertError || !inserted) {
        console.error("Failed to create member after invite:", insertError?.message);
        return jsonResponse({ error: "Invite generated but failed to create member", details: insertError?.message }, 500);
      }
      memberId = inserted.id;
    }

    // Best-effort audit trail: keep going even if this insert fails (the invite
    // itself already succeeded), but the whole point of this table is to have
    // something to debug from, so surface the failure in the response.
    const { error: linkLogError } = await serviceClient.from("invite_links").insert({
      member_id: memberId,
      collectif_id: targetCollectifId,
      email,
      link: inviteLink,
    });
    if (linkLogError) {
      console.error("Failed to log invite link:", linkLogError.message);
    }

    const { sent, error: sendError } = await sendInviteEmail(email, inviteLink);

    if (!sent) {
      console.error("Failed to send invite email:", sendError);
      return jsonResponse(
        {
          success: true,
          emailSent: false,
          message: `Compte créé et lien généré, mais l'envoi de l'email a échoué (${sendError}). Le lien est enregistré et consultable côté admin.`,
        },
        200
      );
    }

    return jsonResponse(
      {
        success: true,
        emailSent: true,
        message: linkLogError ? "Invitation envoyée (non journalisée)" : "Invitation envoyée",
      },
      200
    );
  } catch (error) {
    console.error("Unhandled error in invite-user:", error);
    return jsonResponse(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" },
      500
    );
  }
});
