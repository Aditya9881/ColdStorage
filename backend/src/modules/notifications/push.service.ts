/**
 * Push Notification Sender — ColdStorage Backend
 *
 * Sends push notifications via Expo's Push API.
 * Handles: temperature alerts, order updates, price alerts, rent reminders.
 */
import { prisma } from '../../config/database';
import { logger } from '../../config/logger';

// Expo Push API endpoint
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface PushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  sound?: string;
  priority?: 'default' | 'normal' | 'high';
  channelId?: string;
}

interface PushTicket {
  id?: string;
  status: 'ok' | 'error';
  message?: string;
  details?: { error?: string };
}

class PushNotificationService {
  /**
   * Send a push notification to a specific user
   */
  async sendToUser(userId: string, notification: {
    title: string;
    body: string;
    type: string;
    data?: Record<string, any>;
  }): Promise<boolean> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { pushToken: true, fullName: true },
      });

      if (!user?.pushToken) {
        logger.debug(`[PushNotification] No push token for user ${userId}`);
        return false;
      }

      const channelId = this.getChannelForType(notification.type);

      const message: PushMessage = {
        to: user.pushToken,
        title: notification.title,
        body: notification.body,
        data: { ...notification.data, type: notification.type },
        sound: 'default',
        priority: notification.type === 'TEMP_ALERT' ? 'high' : 'default',
        channelId,
      };

      return await this.sendPush([message]);
    } catch (error) {
      logger.error('[PushNotification] sendToUser failed', { error, userId });
      return false;
    }
  }

  /**
   * Send push notifications to multiple users
   */
  async sendToUsers(userIds: string[], notification: {
    title: string;
    body: string;
    type: string;
    data?: Record<string, any>;
  }): Promise<number> {
    try {
      const users = await prisma.user.findMany({
        where: { id: { in: userIds }, pushToken: { not: null } },
        select: { pushToken: true, id: true },
      });

      if (users.length === 0) return 0;

      const channelId = this.getChannelForType(notification.type);
      const messages: PushMessage[] = users.map(u => ({
        to: u.pushToken!,
        title: notification.title,
        body: notification.body,
        data: { ...notification.data, type: notification.type },
        sound: 'default',
        priority: notification.type === 'TEMP_ALERT' ? 'high' : 'default',
        channelId,
      }));

      await this.sendPush(messages);
      return users.length;
    } catch (error) {
      logger.error('[PushNotification] sendToUsers failed', { error });
      return 0;
    }
  }

  /**
   * Send temperature alert to facility owner
   */
  async sendTemperatureAlert(facilityId: string, chamberNumber: string | number, temperature: number, threshold: { min: number; max: number }) {
    try {
      const facility = await prisma.facility.findUnique({
        where: { id: facilityId },
        select: { ownerId: true, name: true },
      });

      if (!facility) return;

      const isHigh = temperature > threshold.max;
      const direction = isHigh ? 'HIGH' : 'LOW';

      await this.sendToUser(facility.ownerId, {
        title: `🔴 Temperature ${direction} — Chamber ${chamberNumber}`,
        body: `${facility.name}: ${temperature}°C (safe range: ${threshold.min}–${threshold.max}°C). Check immediately.`,
        type: 'TEMP_ALERT',
        data: { facilityId, chamberNumber, temperature },
      });

      logger.info(`[PushNotification] Temperature alert sent for facility ${facilityId}, chamber ${chamberNumber}`);
    } catch (error) {
      logger.error('[PushNotification] sendTemperatureAlert failed', { error });
    }
  }

  /**
   * Send order status update to buyer and/or farmer
   */
  async sendOrderUpdate(orderId: string, status: string, recipientId: string) {
    try {
      // Order → listing → lot (Order has no direct lot relation)
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        select: {
          id: true,
          listing: { select: { lot: { select: { commodityName: true } } } },
        },
      });

      if (!order) return;

      const commodityName = order.listing?.lot?.commodityName ?? 'commodity';

      const statusMessages: Record<string, { title: string; body: string }> = {
        CONFIRMED: {
          title: 'Order Confirmed',
          body: `Your order for ${commodityName} has been confirmed by the farmer.`,
        },
        PAYMENT_PENDING: {
          title: 'Payment Required',
          body: `Complete payment for your ${commodityName} order.`,
        },
        IN_TRANSIT: {
          title: 'Order Dispatched',
          body: `Your ${commodityName} order is on its way!`,
        },
        DELIVERED: {
          title: 'Order Delivered',
          body: `Your ${commodityName} order has been delivered successfully.`,
        },
        CANCELLED: {
          title: 'Order Cancelled',
          body: `Your ${commodityName} order has been cancelled.`,
        },
      };

      const msg = statusMessages[status] || {
        title: 'Order Update',
        body: `Your ${commodityName} order status changed to ${status}.`,
      };

      await this.sendToUser(recipientId, {
        ...msg,
        type: 'ORDER_UPDATE',
        data: { orderId },
      });
    } catch (error) {
      logger.error('[PushNotification] sendOrderUpdate failed', { error });
    }
  }

  /**
   * Send price alert when mandi prices change significantly
   */
  async sendPriceAlert(commodity: string, market: string, newPrice: number, changePercent: number) {
    try {
      // Notify all buyers who might be interested
      const buyers = await prisma.user.findMany({
        where: { role: 'BUYER', pushToken: { not: null } },
        select: { id: true, pushToken: true },
      });

      if (buyers.length === 0) return;

      const direction = changePercent > 0 ? '📈' : '📉';
      const sign = changePercent > 0 ? '+' : '';

      const messages: PushMessage[] = buyers.map(b => ({
        to: b.pushToken!,
        title: `${direction} ${commodity} Price Alert`,
        body: `${market}: ₹${newPrice}/kg (${sign}${changePercent.toFixed(1)}%)`,
        data: { type: 'PRICE_ALERT', commodity, market },
        sound: 'default',
        channelId: 'price-alerts',
      }));

      await this.sendPush(messages);
      logger.info(`[PushNotification] Price alert sent to ${buyers.length} buyers for ${commodity}`);
    } catch (error) {
      logger.error('[PushNotification] sendPriceAlert failed', { error });
    }
  }

  /**
   * Core: Send push messages via Expo Push API
   */
  private async sendPush(messages: PushMessage[]): Promise<boolean> {
    try {
      // Expo recommends batches of max 100
      const chunks = this.chunkArray(messages, 100);

      for (const chunk of chunks) {
        const response = await fetch(EXPO_PUSH_URL, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Accept-Encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(chunk),
        });

        const result = await response.json() as { data?: PushTicket[] };
        const tickets: PushTicket[] = result.data || [];

        // Log any errors
        for (const ticket of tickets) {
          if (ticket.status === 'error') {
            logger.warn('[PushNotification] Push error', {
              message: ticket.message,
              details: ticket.details,
            });

            // Handle invalid tokens
            if (ticket.details?.error === 'DeviceNotRegistered') {
              // Token is invalid, remove it
              const failedToken = chunk.find((_, i) => tickets[i] === ticket)?.to;
              if (failedToken) {
                await this.removeInvalidToken(failedToken);
              }
            }
          }
        }
      }

      return true;
    } catch (error) {
      logger.error('[PushNotification] sendPush failed', { error });
      return false;
    }
  }

  /**
   * Remove invalid push tokens from DB
   */
  private async removeInvalidToken(token: string) {
    try {
      await prisma.user.updateMany({
        where: { pushToken: token },
        data: { pushToken: null },
      });
      logger.info(`[PushNotification] Removed invalid token: ${token.substring(0, 20)}...`);
    } catch (error) {
      logger.error('[PushNotification] removeInvalidToken failed', { error });
    }
  }

  private getChannelForType(type: string): string {
    switch (type) {
      case 'TEMP_ALERT': return 'temp-alerts';
      case 'ORDER_UPDATE': return 'order-updates';
      case 'PRICE_ALERT': return 'price-alerts';
      case 'RENT_DUE': return 'billing';
      default: return 'general';
    }
  }

  private chunkArray<T>(arr: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size));
    }
    return chunks;
  }
}

export const pushNotificationService = new PushNotificationService();
