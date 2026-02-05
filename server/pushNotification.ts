import webPush from 'web-push';
import { db } from './db';
import { pushSubscriptions } from '@shared/schema';
import { eq } from 'drizzle-orm';

// Generate VAPID keys if not set
let vapidKeys = {
  publicKey: process.env.VAPID_PUBLIC_KEY || '',
  privateKey: process.env.VAPID_PRIVATE_KEY || ''
};

// Generate new keys if not configured
if (!vapidKeys.publicKey || !vapidKeys.privateKey) {
  const generatedKeys = webPush.generateVAPIDKeys();
  vapidKeys = generatedKeys;
  console.log('[Push] Generated VAPID keys. Add these to environment:');
  console.log('VAPID_PUBLIC_KEY=' + generatedKeys.publicKey);
  console.log('VAPID_PRIVATE_KEY=' + generatedKeys.privateKey);
}

// Configure web-push
webPush.setVapidDetails(
  'mailto:support@mypa.app',
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

export function getVapidPublicKey(): string {
  return vapidKeys.publicKey;
}

export interface PushPayload {
  title: string;
  body: string;
  type: 'alarm' | 'medicine' | 'meeting';
  id?: number;
  textToSpeak?: string;
}

export async function sendPushNotification(
  userId: string,
  payload: PushPayload
): Promise<{ success: number; failed: number }> {
  const subscriptions = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId));

  let success = 0;
  let failed = 0;

  for (const sub of subscriptions) {
    try {
      await webPush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth
          }
        },
        JSON.stringify(payload)
      );
      success++;
      console.log(`[Push] Notification sent to user ${userId}`);
    } catch (error: any) {
      failed++;
      console.error(`[Push] Failed to send notification:`, error.message);
      
      // Remove invalid subscription
      if (error.statusCode === 410 || error.statusCode === 404) {
        await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id));
        console.log(`[Push] Removed invalid subscription ${sub.id}`);
      }
    }
  }

  return { success, failed };
}

export async function savePushSubscription(
  userId: string,
  endpoint: string,
  p256dh: string,
  auth: string
): Promise<void> {
  // Check if subscription already exists
  const existing = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.endpoint, endpoint));

  if (existing.length > 0) {
    // Update existing
    await db
      .update(pushSubscriptions)
      .set({ userId, p256dh, auth })
      .where(eq(pushSubscriptions.endpoint, endpoint));
  } else {
    // Insert new
    await db.insert(pushSubscriptions).values({
      userId,
      endpoint,
      p256dh,
      auth
    });
  }
  
  console.log(`[Push] Subscription saved for user ${userId}`);
}

export async function removePushSubscription(endpoint: string): Promise<void> {
  await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
  console.log(`[Push] Subscription removed`);
}
