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
  alarmType?: string;
  voiceUrl?: string;
  imageUrl?: string;
  language?: string;
  days?: string[];
  duration?: number;
  loop?: boolean;
  photoUrl?: string;
  dosage?: string;
  voiceGender?: string;
}

export async function sendPushNotification(
  userId: string,
  payload: PushPayload
): Promise<{ success: number; failed: number }> {
  // Get all subscriptions for this user (all devices)
  const subscriptions = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId));

  if (subscriptions.length === 0) {
    console.log(`[Push] No subscriptions found for user ${userId}`);
    return { success: 0, failed: 0 };
  }

  console.log(`[Push] Sending ${payload.type} notification to ${subscriptions.length} device(s) for user ${userId}`);

  let success = 0;
  let failed = 0;

  for (const sub of subscriptions) {
    const deviceInfo = `${sub.deviceName || sub.deviceType || 'unknown'} (${sub.platform || 'web'})`;

    try {
      // Send notification to this device
      await webPush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth
          }
        },
        JSON.stringify(payload),
        {
          TTL: 3600,
          urgency: 'high',
          headers: {
            'Urgency': 'high'
          }
        }
      );
      success++;
      console.log(`[Push] ✓ Sent to ${deviceInfo} - Full-screen: ${sub.supportsFullScreen ? 'YES' : 'NO'}`);
    } catch (error: any) {
      failed++;
      console.error(`[Push] ✗ Failed to send to ${deviceInfo}:`, error.message);

      // Remove invalid subscription
      if (error.statusCode === 410 || error.statusCode === 404) {
        await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id));
        console.log(`[Push] Removed invalid subscription ${sub.id} (${deviceInfo})`);
      }
    }
  }

  console.log(`[Push] Summary: ${success} sent, ${failed} failed`);
  return { success, failed };
}

export async function savePushSubscription(
  userId: string,
  endpoint: string,
  p256dh: string,
  auth: string,
  platform?: string,
  deviceType?: string,
  supportsFullScreen?: boolean,
  deviceName?: string
): Promise<void> {
  // Check if subscription already exists
  const existing = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.endpoint, endpoint));

  if (existing.length > 0) {
    // Update existing subscription with new device info
    await db
      .update(pushSubscriptions)
      .set({
        userId,
        p256dh,
        auth,
        platform: platform || 'web',
        deviceType: deviceType || 'desktop',
        supportsFullScreen: supportsFullScreen || false,
        deviceName: deviceName || null
      })
      .where(eq(pushSubscriptions.endpoint, endpoint));
    console.log(`[Push] Updated subscription for user ${userId} - ${deviceName || deviceType}`);
  } else {
    // Insert new subscription with device info
    await db.insert(pushSubscriptions).values({
      userId,
      endpoint,
      p256dh,
      auth,
      platform: platform || 'web',
      deviceType: deviceType || 'desktop',
      supportsFullScreen: supportsFullScreen || false,
      deviceName: deviceName || null
    });
    console.log(`[Push] New subscription saved for user ${userId} - ${deviceName || deviceType}`);
  }
}

export async function removePushSubscription(endpoint: string): Promise<void> {
  await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
  console.log(`[Push] Subscription removed`);
}
