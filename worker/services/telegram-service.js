/**
 * Telegram Bot Service for FlyTripVisa-Ai
 * Sends professionally formatted notifications via Telegram Bot API.
 * Secrets are read from env — never hardcoded.
 */

const TELEGRAM_API_BASE = "https://api.telegram.org";

/**
 * Send a message to Telegram chat.
 * @param {Object} env - Worker environment (contains secrets)
 * @param {string} text - Message text (HTML or Markdown supported)
 * @param {Object} options - Optional: { parse_mode, disable_notification, reply_markup }
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function sendTelegramMessage(env, text, options = {}) {
  const { TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID } = env;

  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.error("[Telegram] Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID in env");
    return { success: false, error: "Missing credentials" };
  }

  const url = `${TELEGRAM_API_BASE}/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text,
        parse_mode: options.parse_mode || "HTML",
        disable_notification: options.disable_notification || false,
        ...options,
      }),
    });

    const data = await response.json();

    if (!data.ok) {
      console.error("[Telegram] API error:", data.description);
      return { success: false, error: data.description };
    }

    return { success: true };
  } catch (err) {
    console.error("[Telegram] Fetch error:", err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Send a visa application submission notification.
 * @param {Object} env - Worker environment
 * @param {Object} application - Application data
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function notifyApplicationSubmission(env, application) {
  const {
    applicantName = "N/A",
    passportNumber = "N/A",
    visaType = "N/A",
    destination = "N/A",
    submissionId = "N/A",
    timestamp = new Date().toISOString(),
  } = application;

  const message = `
📋 <b>New Visa Application Submitted</b>
━━━━━━━━━━━━━━━━━━━━━━━━

🆔 <b>Submission ID:</b> <code>${submissionId}</code>
👤 <b>Applicant:</b> ${escapeHtml(applicantName)}
📄 <b>Passport:</b> <code>${escapeHtml(passportNumber)}</code>
🌍 <b>Destination:</b> ${escapeHtml(destination)}
 visaType}
📅 <b>Submitted:</b> ${timestamp}

━━━━━━━━━━━━━━━━━━━━━━━━
<i>FlyTripVisa-Ai System</i>
  `.trim();

  return sendTelegramMessage(env, message);
}

/**
 * Send a generic event notification.
 * @param {Object} env - Worker environment
 * @param {string} eventType - Type of event
 * @param {string} message - Event message
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function notifyEvent(env, eventType, message) {
  const formatted = `
🔔 <b>${escapeHtml(eventType)}</b>
━━━━━━━━━━━━━━━━━━━━━━━━

${escapeHtml(message)}

━━━━━━━━━━━━━━━━━━━━━━━━
<i>FlyTripVisa-Ai System</i>
  `.trim();

  return sendTelegramMessage(env, formatted);
}

/**
 * Check Telegram bot connectivity (getMe).
 * @param {Object} env - Worker environment
 * @returns {Promise<{success: boolean, botInfo?: Object, error?: string}>}
 */
export async function checkTelegramConnectivity(env) {
  const { TELEGRAM_BOT_TOKEN } = env;

  if (!TELEGRAM_BOT_TOKEN) {
    return { success: false, error: "Missing TELEGRAM_BOT_TOKEN" };
  }

  const url = `${TELEGRAM_API_BASE}/bot${TELEGRAM_BOT_TOKEN}/getMe`;

  try {
    const response = await fetch(url, { method: "GET" });
    const data = await response.json();

    if (!data.ok) {
      return { success: false, error: data.description };
    }

    return {
      success: true,
      botInfo: {
        id: data.result.id,
        username: data.result.username,
        firstName: data.result.first_name,
      },
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Escape HTML special characters for safe Telegram messaging.
 * @param {string} text
 * @returns {string}
 */
function escapeHtml(text) {
  if (typeof text !== "string") return String(text);
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
