/**
 * Session Manager — WhatsApp Conversation State
 *
 * Manages per-phone conversation sessions so multi-step flows
 * (booking, dispatch, etc.) can persist state between messages.
 */
import { prisma } from '../../config/database';

export interface SessionData {
  id: string;
  phone: string;
  userId: string | null;
  currentFlow: string | null;
  flowStep: number;
  flowData: any;
}

/** Get or create a session for a phone number */
export async function getSession(phone: string): Promise<SessionData> {
  try {
    const session = await prisma.whatsAppSession.upsert({
      where: { phone },
      create: { phone },
      update: { lastMessageAt: new Date() },
    });
    return {
      id: session.id,
      phone: session.phone,
      userId: session.userId,
      currentFlow: session.currentFlow,
      flowStep: session.flowStep,
      flowData: session.flowData as any,
    };
  } catch (err: any) {
    // If table doesn't exist, create it and retry
    if (err.code === 'P2021' || err.message?.includes('does not exist')) {
      console.log('[WhatsApp] Creating whatsapp_sessions table...');
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "whatsapp_sessions" (
          "id" UUID NOT NULL DEFAULT gen_random_uuid(),
          "phone" VARCHAR(15) NOT NULL,
          "user_id" UUID,
          "current_flow" VARCHAR(50),
          "flow_step" INTEGER NOT NULL DEFAULT 0,
          "flow_data" JSONB,
          "last_message_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "whatsapp_sessions_pkey" PRIMARY KEY ("id")
        );
        CREATE UNIQUE INDEX IF NOT EXISTS "whatsapp_sessions_phone_key" ON "whatsapp_sessions"("phone");
      `);
      // Retry
      const session = await prisma.whatsAppSession.upsert({
        where: { phone },
        create: { phone },
        update: { lastMessageAt: new Date() },
      });
      return {
        id: session.id,
        phone: session.phone,
        userId: session.userId,
        currentFlow: session.currentFlow,
        flowStep: session.flowStep,
        flowData: session.flowData as any,
      };
    }
    throw err;
  }
}

/** Update current flow, step, and data */
export async function updateFlow(
  phone: string,
  flow: string | null,
  step: number = 0,
  data: any = null
): Promise<void> {
  await prisma.whatsAppSession.update({
    where: { phone },
    data: {
      currentFlow: flow,
      flowStep: step,
      flowData: data,
      lastMessageAt: new Date(),
    },
  });
}

/** Reset session to main menu */
export async function clearFlow(phone: string): Promise<void> {
  await updateFlow(phone, null, 0, null);
}

/** Link a WhatsApp phone to a platform user */
export async function linkUser(phone: string, userId: string): Promise<void> {
  await prisma.whatsAppSession.update({
    where: { phone },
    data: { userId },
  });
}

/** Find the platform user linked to this phone */
export async function findLinkedUser(phone: string) {
  // First check session
  const session = await prisma.whatsAppSession.findUnique({
    where: { phone },
  });
  if (session?.userId) {
    return prisma.user.findUnique({ where: { id: session.userId } });
  }
  // Try finding user by phone directly
  const user = await prisma.user.findFirst({
    where: { phone },
  });
  if (user) {
    // Auto-link
    await linkUser(phone, user.id);
  }
  return user;
}

export const sessionManager = {
  getSession,
  updateFlow,
  clearFlow,
  linkUser,
  findLinkedUser,
};
