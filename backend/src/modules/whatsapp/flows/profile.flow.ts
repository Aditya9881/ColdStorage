/**
 * Profile Flow — Premium bilingual profile card
 */
import { whatsappService } from '../whatsapp.service';
import { sessionManager } from '../session-manager';
import { t, Lang } from '../language';

export async function showProfile(phone: string, lang: Lang = 'en'): Promise<void> {
  const user = await sessionManager.findLinkedUser(phone);
  if (!user) {
    await whatsappService.sendText(phone, t('notRegistered', lang));
    return;
  }

  const profileFn = t('profileCard', lang);
  await whatsappService.sendText(phone, profileFn(user));
}
