/**
 * Profile Flow — View/edit profile via WhatsApp
 */
import { whatsappService } from '../whatsapp.service';
import { sessionManager } from '../session-manager';

export async function showProfile(phone: string): Promise<void> {
  const user = await sessionManager.findLinkedUser(phone);
  if (!user) {
    await whatsappService.sendText(phone, '⚠️ Your phone is not registered on SheetKosh.\nPlease register on our app first.\n\nReply *menu* for options.');
    return;
  }

  const u = user as any;
  const profile = [
    `👤 *Your Profile*`,
    ``,
    `📛 Name: *${u.fullName || u.name || 'Not set'}*`,
    `📞 Phone: ${u.phone}`,
    `📧 Email: ${u.email || 'Not set'}`,
    `🏷️ Role: ${u.role}`,
    u.address ? `📍 Address: ${u.address}` : '',
    u.city ? `🏙️ City: ${u.city}` : '',
    u.state ? `🗺️ State: ${u.state}` : '',
    ``,
    `📅 Joined: ${new Date(u.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`,
    ``,
    `Reply *menu* for main menu`,
  ].filter(Boolean).join('\n');

  await whatsappService.sendText(phone, profile);
}
