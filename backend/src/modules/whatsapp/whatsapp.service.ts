/**
 * WhatsApp Service — Meta Cloud API Integration
 *
 * Handles sending messages to WhatsApp users via Meta Cloud API.
 * Supports: text, interactive lists, buttons, images, templates.
 */

const WHATSAPP_API_URL = 'https://graph.facebook.com/v25.0';
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN || '';

// Startup log to verify env vars are loaded
console.log(`[WhatsApp] Service initialized — Phone ID: ${PHONE_NUMBER_ID ? PHONE_NUMBER_ID.slice(0, 6) + '...' : '❌ MISSING'}, Token: ${ACCESS_TOKEN ? '✅ set (' + ACCESS_TOKEN.length + ' chars)' : '❌ MISSING'}`);

interface ListSection {
  title: string;
  rows: { id: string; title: string; description?: string }[];
}

interface QuickButton {
  id: string;
  title: string;
}

// ── Core Send Function ──────────────────────────────────────────────────────

async function sendRequest(payload: any): Promise<boolean> {
  try {
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN || '';

    const url = `${WHATSAPP_API_URL}/${phoneNumberId}/messages`;
    console.log(`[WhatsApp] Sending message to ${payload.to || payload.message_id || 'recipient'}`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`[WhatsApp] API error (${response.status}):`, error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[WhatsApp] Send failed:', error);
    return false;
  }
}

// ── Public Methods ──────────────────────────────────────────────────────────

/** Send a plain text message */
export async function sendText(to: string, body: string): Promise<boolean> {
  return sendRequest({
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: { body },
  });
}

/** Send an interactive list message (up to 10 items per section) */
export async function sendList(
  to: string,
  headerText: string,
  bodyText: string,
  buttonText: string,
  sections: ListSection[]
): Promise<boolean> {
  return sendRequest({
    messaging_product: 'whatsapp',
    to,
    type: 'interactive',
    interactive: {
      type: 'list',
      header: { type: 'text', text: headerText },
      body: { text: bodyText },
      action: {
        button: buttonText,
        sections,
      },
    },
  });
}

/** Send quick reply buttons (max 3 buttons) */
export async function sendButtons(
  to: string,
  bodyText: string,
  buttons: QuickButton[]
): Promise<boolean> {
  return sendRequest({
    messaging_product: 'whatsapp',
    to,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text: bodyText },
      action: {
        buttons: buttons.slice(0, 3).map((b) => ({
          type: 'reply',
          reply: { id: b.id, title: b.title },
        })),
      },
    },
  });
}

/** Send an image with optional caption */
export async function sendImage(
  to: string,
  imageUrl: string,
  caption?: string
): Promise<boolean> {
  return sendRequest({
    messaging_product: 'whatsapp',
    to,
    type: 'image',
    image: {
      link: imageUrl,
      ...(caption ? { caption } : {}),
    },
  });
}

/** Send a document (PDF invoice, etc.) */
export async function sendDocument(
  to: string,
  documentUrl: string,
  filename: string,
  caption?: string
): Promise<boolean> {
  return sendRequest({
    messaging_product: 'whatsapp',
    to,
    type: 'document',
    document: {
      link: documentUrl,
      filename,
      ...(caption ? { caption } : {}),
    },
  });
}

/** Mark a message as read */
export async function markAsRead(messageId: string): Promise<boolean> {
  return sendRequest({
    messaging_product: 'whatsapp',
    status: 'read',
    message_id: messageId,
  });
}

export const whatsappService = {
  sendText,
  sendList,
  sendButtons,
  sendImage,
  sendDocument,
  markAsRead,
};
