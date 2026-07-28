/**
 * Main Menu Flow — Entry point for WhatsApp bot
 */
import { whatsappService } from '../whatsapp.service';
import { MAIN_MENU, HELP_TEXT } from '../response-builder';

export async function showMainMenu(phone: string): Promise<void> {
  await whatsappService.sendText(phone, MAIN_MENU);
}

export async function showHelp(phone: string): Promise<void> {
  await whatsappService.sendText(phone, HELP_TEXT);
}
