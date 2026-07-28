/**
 * WhatsApp Controller — Webhook handlers
 *
 * GET  /api/whatsapp/webhook — Meta webhook verification
 * POST /api/whatsapp/webhook — Incoming message processing
 */
import { Request, Response } from 'express';
import { handleIncomingMessage } from './message-handler';

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'sheetkosh-whatsapp-verify-2026';

/**
 * GET /api/whatsapp/webhook
 * Meta sends this to verify your webhook URL during setup.
 */
export function verifyWebhook(req: Request, res: Response): void {
  const mode = req.query['hub.mode'] as string;
  const token = req.query['hub.verify_token'] as string;
  const challenge = req.query['hub.challenge'] as string;

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('[WhatsApp] Webhook verified ✅');
    res.status(200).send(challenge);
  } else {
    console.warn('[WhatsApp] Webhook verification failed — token mismatch');
    res.sendStatus(403);
  }
}

/**
 * POST /api/whatsapp/webhook
 * Receives incoming messages from Meta Cloud API.
 */
export async function handleWebhook(req: Request, res: Response): Promise<void> {
  // Always respond 200 immediately (Meta expects fast response)
  res.sendStatus(200);

  try {
    const body = req.body;

    // Validate it's a WhatsApp message event
    if (body.object !== 'whatsapp_business_account') return;

    const entries = body.entry || [];
    for (const entry of entries) {
      const changes = entry.changes || [];
      for (const change of changes) {
        const value = change.value;
        if (!value?.messages) continue;

        for (const msg of value.messages) {
          const from = msg.from; // Phone number (e.g., "919235330553")
          const messageId = msg.id;

          // Handle text messages
          if (msg.type === 'text' && msg.text?.body) {
            console.log(`[WhatsApp] 📩 From: ${from} | Text: "${msg.text.body}"`);
            await handleIncomingMessage(from, msg.text.body, messageId);
          }

          // Handle interactive responses (list/button selections)
          if (msg.type === 'interactive') {
            const interactive = msg.interactive;
            let responseText = '';

            if (interactive.type === 'list_reply') {
              responseText = interactive.list_reply?.id || interactive.list_reply?.title || '';
            } else if (interactive.type === 'button_reply') {
              responseText = interactive.button_reply?.id || interactive.button_reply?.title || '';
            }

            if (responseText) {
              console.log(`[WhatsApp] 📩 From: ${from} | Interactive: "${responseText}"`);
              await handleIncomingMessage(from, responseText, messageId);
            }
          }
        }
      }
    }
  } catch (err) {
    console.error('[WhatsApp] Webhook processing error:', err);
  }
}

export const whatsappController = {
  verifyWebhook,
  handleWebhook,
};
