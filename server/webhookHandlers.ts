import { getStripeSync } from './stripeClient';
import { db } from './db';
import { users } from '@shared/schema';
import { eq, sql } from 'drizzle-orm';

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        'STRIPE WEBHOOK ERROR: Payload must be a Buffer. ' +
        'Received type: ' + typeof payload + '. ' +
        'FIX: Ensure webhook route is registered BEFORE app.use(express.json()).'
      );
    }

    const sync = await getStripeSync();
    await sync.processWebhook(payload, signature);
    
    const payloadString = payload.toString('utf8');
    const event = JSON.parse(payloadString);
    
    await WebhookHandlers.handleSubscriptionEvents(event);
  }
  
  static async handleSubscriptionEvents(event: any) {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await WebhookHandlers.activateSubscription(event.data.object);
        break;
      case 'customer.subscription.deleted':
        await WebhookHandlers.deactivateSubscription(event.data.object);
        break;
      case 'checkout.session.completed':
        await WebhookHandlers.handleCheckoutComplete(event.data.object);
        break;
    }
  }
  
  static async activateSubscription(subscription: any) {
    const customerId = subscription.customer;
    const subscriptionId = subscription.id;
    const status = subscription.status;
    const trialEnd = subscription.trial_end;
    
    // Map Stripe status to app status - preserve trial state
    let appStatus: string;
    if (status === 'trialing') {
      appStatus = 'trial';
    } else if (status === 'active') {
      appStatus = 'active';
    } else if (status === 'canceled' || status === 'unpaid' || status === 'past_due') {
      appStatus = 'expired';
    } else {
      console.log(`[Stripe] Skipping subscription ${subscriptionId} with status ${status}`);
      return;
    }
    
    // Update user with correct status
    if (appStatus === 'trial' && trialEnd) {
      const trialEndsAt = new Date(trialEnd * 1000);
      await db.execute(
        sql`UPDATE users SET 
          subscription_status = ${appStatus},
          stripe_subscription_id = ${subscriptionId},
          trial_ends_at = ${trialEndsAt}
        WHERE stripe_customer_id = ${customerId}`
      );
    } else {
      await db.execute(
        sql`UPDATE users SET 
          subscription_status = ${appStatus},
          stripe_subscription_id = ${subscriptionId}
        WHERE stripe_customer_id = ${customerId}`
      );
    }
    console.log(`[Stripe] Subscription ${appStatus} for customer: ${customerId}`);
  }
  
  static async deactivateSubscription(subscription: any) {
    const customerId = subscription.customer;
    
    await db.execute(
      sql`UPDATE users SET 
        subscription_status = 'expired',
        stripe_subscription_id = NULL
      WHERE stripe_customer_id = ${customerId}`
    );
    console.log(`[Stripe] Subscription deactivated for customer: ${customerId}`);
  }
  
  static async handleCheckoutComplete(session: any) {
    const customerId = session.customer;
    const subscriptionId = session.subscription;
    
    if (subscriptionId) {
      // The subscription.created webhook will handle the actual status update
      // Here we just ensure the stripe_customer_id is set correctly
      console.log(`[Stripe] Checkout completed for customer: ${customerId}, subscription: ${subscriptionId}`);
    }
  }
}
