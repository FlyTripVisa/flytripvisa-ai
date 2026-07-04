import {
  sendTelegramMessage,
  notifyApplicationSubmission,
  notifyEvent,
  checkTelegramConnectivity,
} from "./services/telegram-service.js";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // ── Telegram connectivity check ──
    if (path === "/api/telegram/health") {
      const result = await checkTelegramConnectivity(env);
      return new Response(JSON.stringify(result), {
        headers: { "Content-Type": "application/json" },
        status: result.success ? 200 : 503,
      });
    }

    // ── Telegram webhook receiver (for incoming updates from Telegram) ──
    if (path === "/api/telegram/webhook" && request.method === "POST") {
      try {
        const update = await request.json();

        // Optional: verify webhook secret (recommended)
        // const secretHeader = request.headers.get("X-Telegram-Bot-Api-Secret-Token");
        // if (secretHeader !== env.TELEGRAM_WEBHOOK_SECRET) {
        //   return new Response("Unauthorized", { status: 401 });
        // }

        // Handle incoming messages here
        if (update.message) {
          const chatId = update.message.chat.id;
          const text = update.message.text || "";

          // Echo or handle commands
          if (text.startsWith("/start")) {
            await sendTelegramMessage(env, "👋 Welcome to Fly Ai Robot 🐲 Bot!");
          } else if (text.startsWith("/status")) {
            await sendTelegramMessage(env, "✅ System is operational.");
          }
        }

        return new Response("OK", { status: 200 });
      } catch (err) {
        console.error("[Webhook] Error:", err);
        return new Response("Internal Error", { status: 500 });
      }
    }

    // ── Test notification endpoint ──
    if (path === "/api/telegram/test" && request.method === "POST") {
      const result = await notifyEvent(env, "Test Notification", "This is a test message from Fly Ai Robot 🐲 Worker.");
      return new Response(JSON.stringify(result), {
        headers: { "Content-Type": "application/json" },
        status: result.success ? 200 : 500,
      });
    }

    // ── Application submission handler (example) ──
    if (path === "/api/applications/submit" && request.method === "POST") {
      try {
        const body = await request.json();

        // ... your application processing logic ...

        // Send Telegram notification
        const notification = await notifyApplicationSubmission(env, {
          submissionId: body.submissionId || crypto.randomUUID(),
          applicantName: body.applicantName,
          passportNumber: body.passportNumber,
          visaType: body.visaType,
          destination: body.destination,
          timestamp: new Date().toISOString(),
        });

        return new Response(JSON.stringify({
          success: true,
          telegramNotified: notification.success,
        }), {
          headers: { "Content-Type": "application/json" },
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    // ── Default route ──
    return new Response("Fly Ai Robot 🐲 Worker is running", {
      headers: { "Content-Type": "text/plain" },
    });
  },
};
