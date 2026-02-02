import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface NotificationRequest {
  to: string;
  subject: string;
  message: string;
  playerName?: string;
  action?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { to, subject, message, playerName, action }: NotificationRequest = await req.json();

    if (!to || !subject || !message) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: to, subject, message" }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

    if (RESEND_API_KEY) {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: 'Team Manager <noreply@resend.dev>',
          to: [to],
          subject: subject,
          text: message,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        console.error('Resend API error:', data);
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Failed to send email via Resend',
            details: data
          }),
          {
            status: res.status,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          }
        );
      }

      console.log(`Email sent successfully to ${to}: ${subject}`);

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Email sent successfully',
          emailId: data.id,
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    } else {
      console.log(`Email notification logged (Resend not configured):`);
      console.log(`To: ${to}`);
      console.log(`Subject: ${subject}`);
      console.log(`Message: ${message}`);
      console.log(`Player: ${playerName}, Action: ${action}`);

      return new Response(
        JSON.stringify({
          success: true,
          message: "Email logged successfully (Resend not configured)",
          details: {
            to,
            subject,
            playerName,
            action,
            note: "To enable actual email sending, set the RESEND_API_KEY environment variable. Get your API key at https://resend.com"
          }
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }
  } catch (error) {
    console.error("Error processing notification:", error);

    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error"
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
