/**
 * Main Menu Flow — Premium bilingual entry point
 */
import { whatsappService } from '../whatsapp.service';
import { t, Lang } from '../language';
import { sessionManager } from '../session-manager';

export async function showMainMenu(phone: string, lang: Lang = 'en'): Promise<void> {
  // Try to get user name for personalized greeting
  let name: string | undefined;
  try {
    const user = await sessionManager.findLinkedUser(phone);
    if (user) {
      name = (user as any).fullName || (user as any).name;
    }
  } catch { /* ignore */ }

  const welcomeFn = t('welcome', lang);
  await whatsappService.sendText(phone, welcomeFn(name));
}

export async function showHelp(phone: string, lang: Lang = 'en'): Promise<void> {
  await whatsappService.sendText(phone, t('help', lang));
}
