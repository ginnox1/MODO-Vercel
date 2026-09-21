import { ENV } from "./_core/env.js";
import {
  getWaitlistByDeepLinkToken,
  getWaitlistByTelegramUserId,
  linkTelegramAccount,
  markJoinRequested,
  markTelegramJoined,
} from "./db.js";

type TelegramUser = { id: number; first_name?: string; last_name?: string; username?: string };
type TelegramChat = { id: number | string; type?: string };
type TelegramMessage = { chat: TelegramChat; from?: TelegramUser; text?: string; photo?: Array<{ file_id: string }> };
type TelegramJoinRequest = { chat: TelegramChat; from: TelegramUser; user_chat_id: number | string };
type TelegramChatMemberUpdate = { chat: TelegramChat; from?: TelegramUser; new_chat_member?: { user: TelegramUser; status: string }; old_chat_member?: { status: string } };
export type TelegramUpdate = { update_id: number; message?: TelegramMessage; chat_join_request?: TelegramJoinRequest; chat_member?: TelegramChatMemberUpdate };

type InlineKeyboard = { inline_keyboard: Array<Array<{ text: string; url?: string; callback_data?: string }>> };

async function telegramApi<T>(method: string, body: Record<string, unknown>): Promise<T> {
  if (!ENV.telegramBotToken) throw new Error("TELEGRAM_BOT_TOKEN is not configured");
  const response = await fetch(`https://api.telegram.org/bot${ENV.telegramBotToken}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = (await response.json()) as { ok?: boolean; description?: string; result?: T };
  if (!response.ok || !payload.ok) throw new Error(payload.description || `Telegram ${method} failed`);
  return payload.result as T;
}

export function displayName(user: TelegramUser) {
  return [user.first_name, user.last_name].filter(Boolean).join(" ") || user.username || "Telegram member";
}

export async function sendTelegramMessage(chatId: number | string, text: string, replyMarkup?: InlineKeyboard) {
  return telegramApi("sendMessage", { chat_id: chatId, text, disable_web_page_preview: true, ...(replyMarkup ? { reply_markup: replyMarkup } : {}) });
}

export async function notifyFounder(text: string) {
  if (!ENV.telegramAdminChatId) {
    console.error("[Telegram] TELEGRAM_ADMIN_CHAT_ID is not set; founder notification skipped");
    return;
  }
  await sendTelegramMessage(ENV.telegramAdminChatId, text);
}

function founderInviteKeyboard() {
  return { inline_keyboard: [[{ text: "Join MODO Founder's Circle", url: ENV.telegramInviteLink }]] } satisfies InlineKeyboard;
}

export async function handleTelegramUpdate(update: TelegramUpdate) {
  if (update.chat_join_request) {
    const request = update.chat_join_request;
    const member = await getWaitlistByTelegramUserId(String(request.from.id));
    const handle = `@${request.from.username || "no username"}`;
    // Each step is isolated so one failure (e.g. a wrong admin chat id) never blocks the others.
    const steps: Array<[string, () => Promise<unknown>]> = [
      ["notify founder", () => notifyFounder(member
        ? `MODO join request\n${member.fullName}\nTelegram: ${handle}\nStatus: awaiting your approval.`
        : `MODO join request (not linked to a waitlist signup)\n${displayName(request.from)}\nTelegram: ${handle} (id ${request.from.id})\nThey did not open the bot from the website link, so we can't match them to a signup. Approve in Telegram if you recognise them.`)],
      ["message requester", () => sendTelegramMessage(request.user_chat_id, "Your request to join MODO Founder's Circle is with the founder for approval. We’ll message you here when it’s approved.")],
    ];
    if (member) steps.unshift(["mark join requested", () => markJoinRequested(member.id)]);
    for (const [label, run] of steps) {
      try {
        await run();
      } catch (error) {
        console.error(`[Telegram] join request: failed to ${label}:`, error);
      }
    }
    return { handled: true, event: "chat_join_request" } as const;
  }

  if (update.chat_member?.new_chat_member?.status === "member") {
    const joinedUser = update.chat_member.new_chat_member.user;
    await markTelegramJoined(String(joinedUser.id));
    const member = await getWaitlistByTelegramUserId(String(joinedUser.id));
    if (member) {
      await sendTelegramMessage(joinedUser.id, "You’re in. Welcome to MODO Founder's Circle — we’ll share the first product wave here soon.");
      await notifyFounder(`MODO member joined\n${member.fullName}\nTelegram: @${joinedUser.username || "no username"}\nStatus: JOINED_TG`);
    }
    return { handled: true, event: "chat_member" } as const;
  }

  const message = update.message;
  if (!message?.text || !message.from) return { handled: false } as const;
  const chatId = message.chat.id;
  const command = message.text.trim();
  const startMatch = command.match(/^\/start(?:\s+(.+))?$/i);

  if (startMatch) {
    const token = startMatch[1]?.trim();
    const member = token ? await getWaitlistByDeepLinkToken(token) : await getWaitlistByTelegramUserId(String(message.from.id));
    if (!member) {
      await sendTelegramMessage(chatId, `Welcome to MODO. Start on the website to join the founding circle, then return here to complete onboarding.\n\n${ENV.publicUrl}`);
      return { handled: true, event: "start_unmatched" } as const;
    }
    await linkTelegramAccount(member.id, String(message.from.id), String(chatId), message.from.username ?? null);
    await sendTelegramMessage(chatId, `Welcome, ${member.fullName}. You’re on the MODO founding list.\n\nNext: request access to the private Founder's Circle. We’ll notify you here when the founder approves it.`, founderInviteKeyboard());
    await notifyFounder(`MODO Telegram linked\n${member.fullName}\nPhone: ${member.phone}\nTelegram: @${message.from.username || "no username"}\nStatus: PENDING_TG`);
    return { handled: true, event: "start_linked" } as const;
  }

  if (/^\/reserve(?:@\w+)?$/i.test(command)) {
    const member = await getWaitlistByTelegramUserId(String(message.from.id));
    if (!member) {
      await sendTelegramMessage(chatId, `Please join the MODO founding circle from the website first: ${ENV.publicUrl}`);
    } else if (member.onboardingStatus !== "JOINED_TG") {
      await sendTelegramMessage(chatId, "Your founder access is still being confirmed. Once you’re approved into the private circle, send /reserve again.");
    } else {
      await sendTelegramMessage(chatId, "Wave 1 reservations are opening soon. We’ll share the product and material options here first.");
    }
    return { handled: true, event: "reserve" } as const;
  }

  if (/^\/(help|menu)(?:@\w+)?$/i.test(command)) {
    await sendTelegramMessage(chatId, "MODO Founder’s Circle\n\n/start — connect your founding signup\n/reserve — check Wave 1 reservation access\n/help — show this menu");
    return { handled: true, event: "help" } as const;
  }

  await sendTelegramMessage(chatId, "Welcome to MODO. Use /help to see what you can do here.");
  return { handled: true, event: "fallback" } as const;
}

export async function registerTelegramWebhookWithTelegram() {
  const webhookUrl = `${ENV.publicUrl.replace(/\/$/, "")}/api/telegram/webhook`;
  return telegramApi("setWebhook", {
    url: webhookUrl,
    secret_token: ENV.telegramWebhookSecret,
    allowed_updates: ["message", "chat_join_request", "chat_member"],
    drop_pending_updates: false,
  });
}

export async function getTelegramWebhookInfo() {
  return telegramApi("getWebhookInfo", {});
}
