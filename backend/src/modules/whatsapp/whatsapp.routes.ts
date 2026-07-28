/**
 * WhatsApp Routes
 *
 * GET  /api/whatsapp/webhook — Verification (Meta handshake)
 * POST /api/whatsapp/webhook — Incoming messages
 *
 * NOTE: These routes are NOT behind auth middleware.
 * Meta needs to reach them publicly. Security is via verify_token.
 */
import { Router } from 'express';
import { whatsappController } from './whatsapp.controller';

const router = Router();

// Meta webhook verification (GET)
router.get('/webhook', whatsappController.verifyWebhook);

// Incoming messages (POST)
router.post('/webhook', whatsappController.handleWebhook);

export default router;
