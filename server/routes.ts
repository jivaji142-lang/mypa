import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { setupAuth, registerAuthRoutes } from "./replit_integrations/auth";
import { invalidateUserCache } from "./replit_integrations/auth/routes";
import { seed } from "./seed";
import { handleTokenLogin, handleGetTokenUser, requireToken, isAuthenticatedAny, getUserId } from "./tokenAuth";
import bcrypt from "bcryptjs";
import { getUncachableStripeClient, getStripePublishableKey } from "./stripeClient";
import { sql } from "drizzle-orm";
import { db } from "./db";
import Razorpay from "razorpay";
import crypto from "crypto";
import { getVapidPublicKey, savePushSubscription, removePushSubscription, sendPushNotification } from "./pushNotification";
import { startAlarmScheduler } from "./alarmScheduler";
import { setAlarmActiveStatus, handleAlarmToggle } from "./alarmToggleLogic";
import multer from "multer";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Auth Setup
  await setupAuth(app);
  registerAuthRoutes(app);

  // ═══════════════════════════════════════════════════════════════
  // Token-Based Authentication (for Mobile App - works with HTTP)
  // ═══════════════════════════════════════════════════════════════
  app.post('/api/auth/token-login', handleTokenLogin);
  app.get('/api/auth/token-user', requireToken, handleGetTokenUser);
  console.log('[Token Auth] Routes registered: POST /api/auth/token-login, GET /api/auth/token-user');

  // Seed Database
  seed().catch(console.error);

  // Alarms
  app.get(api.alarms.list.path, async (req, res) => {
    if (!isAuthenticatedAny(req)) return res.sendStatus(401);
    const alarms = await storage.getAlarms(getUserId(req));
    res.json(alarms);
  });

  app.post(api.alarms.create.path, async (req, res) => {
    if (!isAuthenticatedAny(req)) return res.sendStatus(401);
    try {
      let input = {
        ...req.body,
        userId: getUserId(req)
      };
      // Apply smart toggle logic - auto-set isActive based on future occurrences
      input = setAlarmActiveStatus(input);
      const alarm = await storage.createAlarm(input);
      res.status(201).json(alarm);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: err.errors[0].message });
        return;
      }
      throw err;
    }
  });

  app.put(api.alarms.update.path, async (req, res) => {
    if (!isAuthenticatedAny(req)) return res.sendStatus(401);
    try {
      let input = {
        ...req.body,
        userId: getUserId(req)
      };

      // Detect if this is a manual toggle (only isActive is being updated)
      const requestKeys = Object.keys(req.body);
      const isManualToggle = requestKeys.length === 1 && requestKeys[0] === 'isActive';

      // Apply smart toggle logic unless it's a manual toggle
      if (!isManualToggle) {
        input = setAlarmActiveStatus(input);
      }
      // For manual toggle, respect user's choice (keep input.isActive as is)

      const alarm = await storage.updateAlarm(Number(req.params.id), input);
      res.json(alarm);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: err.errors[0].message });
        return;
      }
      res.status(404).json({ message: "Alarm not found" });
    }
  });

  app.delete(api.alarms.delete.path, async (req, res) => {
    if (!isAuthenticatedAny(req)) return res.sendStatus(401);
    await storage.deleteAlarm(Number(req.params.id));
    res.status(204).end();
  });

  // Medicines
  app.get(api.medicines.list.path, async (req, res) => {
    if (!isAuthenticatedAny(req)) return res.sendStatus(401);
    const medicines = await storage.getMedicines(getUserId(req));
    res.json(medicines);
  });

  app.post(api.medicines.create.path, async (req, res) => {
    if (!isAuthenticatedAny(req)) return res.sendStatus(401);
    try {
      const input = {
        ...req.body,
        userId: getUserId(req)
      };
      const medicine = await storage.createMedicine(input);
      res.status(201).json(medicine);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: err.errors[0].message });
        return;
      }
      throw err;
    }
  });

  app.put(api.medicines.update.path, async (req, res) => {
    if (!isAuthenticatedAny(req)) return res.sendStatus(401);
    try {
      const input = {
        ...req.body,
        userId: getUserId(req)
      };
      const medicine = await storage.updateMedicine(Number(req.params.id), input);
      res.json(medicine);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: err.errors[0].message });
        return;
      }
      res.status(404).json({ message: "Medicine not found" });
    }
  });

  app.delete(api.medicines.delete.path, async (req, res) => {
    if (!isAuthenticatedAny(req)) return res.sendStatus(401);
    await storage.deleteMedicine(Number(req.params.id));
    res.status(204).end();
  });

  // Meetings
  app.get(api.meetings.list.path, async (req, res) => {
    if (!isAuthenticatedAny(req)) return res.sendStatus(401);
    const meetings = await storage.getMeetings(getUserId(req));
    res.json(meetings);
  });

  app.post(api.meetings.create.path, async (req, res) => {
    if (!isAuthenticatedAny(req)) return res.sendStatus(401);
    try {
      const input = {
        ...req.body,
        userId: getUserId(req)
      };
      const meeting = await storage.createMeeting(input);
      res.status(201).json(meeting);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: err.errors[0].message });
        return;
      }
      throw err;
    }
  });

  app.patch(api.meetings.update.path, async (req, res) => {
    if (!isAuthenticatedAny(req)) return res.sendStatus(401);
    try {
      const input = {
        ...req.body,
        userId: getUserId(req)
      };
      const meeting = await storage.updateMeeting(Number(req.params.id), input);
      res.json(meeting);
    } catch (err) {
      res.status(404).json({ message: "Meeting not found" });
    }
  });

  app.delete(api.meetings.delete.path, async (req, res) => {
    if (!isAuthenticatedAny(req)) return res.sendStatus(401);
    await storage.deleteMeeting(Number(req.params.id));
    res.status(204).end();
  });

  // User Settings
  app.patch("/api/user/settings", async (req, res) => {
    if (!isAuthenticatedAny(req)) return res.sendStatus(401);
    const userId = getUserId(req);
    const user = await storage.updateUser(userId, req.body);
    // Invalidate user cache so next /api/auth/user gets fresh data
    invalidateUserCache(userId);
    res.json(user);
  });

  const uploadStorage = multer.memoryStorage();
  const uploadMiddleware = multer({ storage: uploadStorage, limits: { fileSize: 10 * 1024 * 1024 } });
  app.post(api.upload.create.path, uploadMiddleware.single("file"), async (req, res) => {
    if (!isAuthenticatedAny(req)) return res.sendStatus(401);
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    const base64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
    res.json({ url: base64 });
  });

  // Helper to sanitize user response (exclude sensitive fields)
  const sanitizeUser = (user: any) => {
    const { passwordHash, ...safeUser } = user;
    return safeUser;
  };

  // Validation schemas for auth
  const signupSchema = z.object({
    email: z.string().email("Invalid email format"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    name: z.string().optional()
  });

  const loginSchema = z.object({
    email: z.string().email("Invalid email format"),
    password: z.string().min(1, "Password is required")
  });

  const phoneSchema = z.object({
    phone: z.string().min(10, "Invalid phone number")
  });

  const verifyOtpSchema = z.object({
    phone: z.string().min(10, "Invalid phone number"),
    otp: z.string().length(6, "OTP must be 6 digits"),
    name: z.string().optional()
  });

  // Email/Password Authentication
  app.post("/api/auth/signup", async (req, res) => {
    try {
      const validatedData = signupSchema.parse(req.body);
      const { email, password, name } = validatedData;

      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already registered" });
      }

      const passwordHash = await bcrypt.hash(password, 12);
      const nameParts = (name || "").split(" ");

      const user = await storage.createEmailUser({
        email,
        passwordHash,
        firstName: nameParts[0] || email.split("@")[0],
        lastName: nameParts.slice(1).join(" ") || "",
        authProvider: "email"
      });

      // Generate JWT token for mobile app compatibility
      const { generateToken } = await import("./tokenAuth");
      const token = generateToken(user.id, user.email);

      // Also setup session for backwards compatibility
      req.login(user, (err) => {
        if (err) {
          console.error("Session setup error:", err);
        }
      });

      // Return token and user data
      res.json({
        success: true,
        token,
        user: sanitizeUser(user)
      });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      console.error("Signup error:", err);
      res.status(500).json({ message: "Signup failed" });
    }
  });

  // NOTE: /api/auth/token-login is already registered above (line 32)
  // It uses handleTokenLogin from tokenAuth.ts
  // No need for duplicate /api/auth/login endpoint

  // Helper to normalize Indian phone numbers to 10 digits
  const normalizePhone = (phone: string): string =>
    phone.replace(/^\+91/, '').replace(/^91/, '').replace(/\s/g, '').replace(/-/g, '');

  // Phone OTP Authentication with Fast2SMS
  app.post("/api/auth/send-otp", async (req, res) => {
    try {
      const validatedData = phoneSchema.parse(req.body);
      const phone = normalizePhone(validatedData.phone);

      if (phone.length !== 10 || !/^\d{10}$/.test(phone)) {
        return res.status(400).json({ message: "Please enter valid 10-digit mobile number" });
      }

      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      await storage.createOtp({ phone, code: otp, expiresAt });

      // Send OTP via Fast2SMS
      const fast2smsKey = process.env.FAST2SMS_API_KEY;

      if (!fast2smsKey) {
        console.error("[Fast2SMS] FAST2SMS_API_KEY not configured");
        return res.status(503).json({
          success: false,
          message: "SMS service not configured. Please contact support."
        });
      }

      try {
        const response = await fetch("https://www.fast2sms.com/dev/bulkV2", {
          method: "POST",
          headers: {
            "authorization": fast2smsKey,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            route: "otp",
            variables_values: otp,
            flash: 0,
            numbers: phone
          })
        });

        const result = await response.json() as any;
        console.log(`[Fast2SMS] Response:`, JSON.stringify(result, null, 2));

        if (result.return !== true) {
          console.error("[Fast2SMS] Error:", result.message || result);
          return res.status(502).json({
            success: false,
            message: "Failed to send OTP. Please try again."
          });
        }

        console.log(`[Fast2SMS] SUCCESS - OTP sent to ${phone}`);
      } catch (smsError) {
        console.error("[Fast2SMS] Exception:", smsError);
        return res.status(502).json({
          success: false,
          message: "SMS service temporarily unavailable. Please try again."
        });
      }

      res.json({ success: true, message: "OTP sent to your mobile number" });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      console.error("Send OTP error:", err);
      res.status(500).json({ message: "Failed to send OTP" });
    }
  });

  app.post("/api/auth/verify-otp", async (req, res) => {
    try {
      const validatedData = verifyOtpSchema.parse(req.body);
      // Normalize phone same way as send-otp so DB lookup matches
      const phone = normalizePhone(validatedData.phone);
      const { otp, name } = validatedData;

      const validOtp = await storage.verifyOtp(phone, otp);
      if (!validOtp) {
        return res.status(401).json({ message: "Invalid or expired OTP" });
      }

      // Find or create user by phone
      let user = await storage.getUserByPhone(phone);
      if (!user) {
        const nameParts = (name || "").split(" ");
        user = await storage.createPhoneUser({
          phone,
          firstName: nameParts[0] || phone.slice(-4),
          lastName: nameParts.slice(1).join(" ") || "",
          authProvider: "phone"
        });
      }

      // Generate JWT token for mobile app compatibility
      const { generateToken } = await import("./tokenAuth");
      const token = generateToken(user.id, user.email || user.phone || user.id);

      // Also setup session for backwards compatibility
      req.login(user, (err) => {
        if (err) {
          console.error("Session setup error:", err);
        }
      });

      // Return token and user data
      res.json({
        success: true,
        token,
        user: sanitizeUser(user)
      });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      console.error("Verify OTP error:", err);
      res.status(500).json({ message: "Verification failed" });
    }
  });

  // Stripe Payment Routes
  app.get("/api/stripe/publishable-key", async (req, res) => {
    try {
      const key = await getStripePublishableKey();
      res.json({ publishableKey: key });
    } catch (error) {
      console.error("Error getting publishable key:", error);
      res.status(500).json({ message: "Stripe not configured" });
    }
  });

  app.get("/api/stripe/products", async (req, res) => {
    try {
      const result = await db.execute(sql`
        SELECT 
          p.id as product_id,
          p.name as product_name,
          p.description,
          pr.id as price_id,
          pr.unit_amount,
          pr.currency,
          pr.recurring
        FROM stripe.products p
        LEFT JOIN stripe.prices pr ON pr.product = p.id AND pr.active = true
        WHERE p.active = true
        ORDER BY pr.unit_amount ASC
      `);
      res.json({ products: result.rows });
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  app.post("/api/stripe/checkout", async (req, res) => {
    if (!isAuthenticatedAny(req)) return res.sendStatus(401);
    
    try {
      const { priceId } = req.body;
      const userId = getUserId(req);
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const stripe = await getUncachableStripeClient();
      
      let customerId = user.stripeCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email || undefined,
          metadata: { userId: user.id }
        });
        customerId = customer.id;
        
        await db.execute(sql`
          UPDATE users SET stripe_customer_id = ${customerId} WHERE id = ${userId}
        `);
      }
      
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [{ price: priceId, quantity: 1 }],
        mode: 'subscription',
        success_url: `${req.protocol}://${req.get('host')}/settings?payment=success`,
        cancel_url: `${req.protocol}://${req.get('host')}/settings?payment=cancelled`,
        subscription_data: {
          trial_period_days: 30
        }
      });
      
      res.json({ url: session.url });
    } catch (error: any) {
      console.error("Checkout error:", error);
      res.status(500).json({ message: error.message || "Checkout failed" });
    }
  });

  app.get("/api/stripe/subscription", async (req, res) => {
    if (!isAuthenticatedAny(req)) return res.sendStatus(401);
    
    try {
      const userId = getUserId(req);
      const user = await storage.getUser(userId);
      
      if (!user?.stripeSubscriptionId) {
        return res.json({ subscription: null, status: user?.subscriptionStatus || 'trial' });
      }
      
      const result = await db.execute(sql`
        SELECT * FROM stripe.subscriptions WHERE id = ${user.stripeSubscriptionId}
      `);
      
      res.json({ 
        subscription: result.rows[0] || null,
        status: user.subscriptionStatus 
      });
    } catch (error) {
      console.error("Error fetching subscription:", error);
      res.status(500).json({ message: "Failed to fetch subscription" });
    }
  });

  app.post("/api/stripe/portal", async (req, res) => {
    if (!isAuthenticatedAny(req)) return res.sendStatus(401);
    
    try {
      const userId = getUserId(req);
      const user = await storage.getUser(userId);
      
      if (!user?.stripeCustomerId) {
        return res.status(400).json({ message: "No billing account found" });
      }
      
      const stripe = await getUncachableStripeClient();
      const session = await stripe.billingPortal.sessions.create({
        customer: user.stripeCustomerId,
        return_url: `${req.protocol}://${req.get('host')}/settings`
      });
      
      res.json({ url: session.url });
    } catch (error: any) {
      console.error("Portal error:", error);
      res.status(500).json({ message: error.message || "Portal access failed" });
    }
  });

  // Razorpay Integration (only if credentials are provided)
  let razorpay: Razorpay | null = null;
  if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
    razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    });
    console.log('[Razorpay] Initialized');
  } else {
    console.log('[Razorpay] Credentials not found - Razorpay disabled');
  }

  app.get("/api/razorpay/key", (req, res) => {
    res.json({ key: process.env.RAZORPAY_KEY_ID });
  });

  // Razorpay Webhook - handles payment.captured event
  app.post("/api/razorpay/webhook", async (req, res) => {
    if (!razorpay) {
      return res.status(503).json({ message: "Razorpay not configured" });
    }
    try {
      const webhookSignature = req.headers['x-razorpay-signature'] as string;
      const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
      
      // If webhook secret is set, verify signature
      if (webhookSecret && webhookSignature) {
        const body = JSON.stringify(req.body);
        const expectedSignature = crypto
          .createHmac("sha256", webhookSecret)
          .update(body)
          .digest("hex");
        
        if (expectedSignature !== webhookSignature) {
          console.log("Razorpay webhook signature mismatch");
          return res.status(400).json({ message: "Invalid signature" });
        }
      }
      
      const event = req.body.event;
      const payload = req.body.payload;
      
      if (event === 'payment.captured') {
        const payment = payload.payment.entity;
        const orderId = payment.order_id;
        
        // Fetch order to get user info
        const order = await razorpay.orders.fetch(orderId);
        const userId = order.notes?.userId;
        
        if (userId) {
          const plan = order.amount === 600 ? 'yearly' : 'monthly';
          const subscriptionEnd = new Date();
          if (plan === 'yearly') {
            subscriptionEnd.setFullYear(subscriptionEnd.getFullYear() + 1);
          } else {
            subscriptionEnd.setDate(subscriptionEnd.getDate() + 30);
          }
          
          await db.execute(sql`
            UPDATE users 
            SET subscription_status = 'active',
                trial_ends_at = ${subscriptionEnd.toISOString()},
                updated_at = NOW()
            WHERE id = ${userId}
          `);
          
          console.log(`Webhook: Subscription activated for user ${userId}, plan: ${plan}`);
        }
      }
      
      res.json({ status: 'ok' });
    } catch (error: any) {
      console.error("Razorpay webhook error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/razorpay/create-order", async (req, res) => {
    if (!isAuthenticatedAny(req)) return res.sendStatus(401);

    if (!razorpay) {
      return res.status(503).json({ message: "Razorpay not configured" });
    }

    try {
      const { plan } = req.body;
      
      if (plan !== 'monthly' && plan !== 'yearly') {
        return res.status(400).json({ message: "Invalid plan. Use 'monthly' or 'yearly'" });
      }
      
      const amount = plan === 'yearly' ? 600 : 500; // Testing: ₹6 yearly, ₹5 monthly
      
      const order = await razorpay.orders.create({
        amount: amount,
        currency: "INR",
        receipt: `mypa_${Date.now()}`,
        notes: {
          userId: getUserId(req),
          plan: plan
        }
      });
      
      res.json({
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        plan: plan
      });
    } catch (error: any) {
      console.error("Razorpay order error:", error);
      res.status(500).json({ message: error.message || "Failed to create order" });
    }
  });

  app.post("/api/razorpay/verify-payment", async (req, res) => {
    if (!isAuthenticatedAny(req)) return res.sendStatus(401);

    if (!razorpay) {
      return res.status(503).json({ message: "Razorpay not configured" });
    }

    try {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
      const userId = getUserId(req);
      
      const body = razorpay_order_id + "|" + razorpay_payment_id;
      const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
        .update(body.toString())
        .digest("hex");
      
      if (expectedSignature !== razorpay_signature) {
        return res.status(400).json({ message: "Invalid payment signature" });
      }
      
      const order = await razorpay.orders.fetch(razorpay_order_id);
      const payment = await razorpay.payments.fetch(razorpay_payment_id);
      
      if (payment.status !== 'captured') {
        return res.status(400).json({ message: "Payment not captured" });
      }
      
      if (order.notes?.userId !== userId) {
        return res.status(400).json({ message: "Order user mismatch" });
      }
      
      const plan = order.amount === 600 ? 'yearly' : 'monthly';
      
      const subscriptionEnd = new Date();
      if (plan === 'yearly') {
        subscriptionEnd.setFullYear(subscriptionEnd.getFullYear() + 1);
      } else {
        subscriptionEnd.setDate(subscriptionEnd.getDate() + 30);
      }
      
      await db.execute(sql`
        UPDATE users 
        SET subscription_status = 'active',
            trial_ends_at = ${subscriptionEnd.toISOString()},
            updated_at = NOW()
        WHERE id = ${userId}
      `);
      
      res.json({ 
        success: true, 
        message: "Payment verified successfully",
        subscriptionEnd: subscriptionEnd.toISOString()
      });
    } catch (error: any) {
      console.error("Payment verification error:", error);
      res.status(500).json({ message: error.message || "Payment verification failed" });
    }
  });

  // Push Notification Routes
  app.get("/api/push/vapid-key", (req, res) => {
    res.json({ publicKey: getVapidPublicKey() });
  });

  app.post("/api/push/subscribe", async (req, res) => {
    if (!isAuthenticatedAny(req)) return res.sendStatus(401);

    try {
      const { endpoint, keys, platform, deviceType, supportsFullScreen, deviceName } = req.body;

      if (!endpoint || !keys?.p256dh || !keys?.auth) {
        return res.status(400).json({ message: "Invalid subscription data" });
      }

      await savePushSubscription(
        getUserId(req),
        endpoint,
        keys.p256dh,
        keys.auth,
        platform,
        deviceType,
        supportsFullScreen,
        deviceName
      );

      console.log(`[Push] Subscription saved - Device: ${deviceName || deviceType}, Platform: ${platform}, Full-screen: ${supportsFullScreen}`);
      res.json({ success: true, message: "Push subscription saved" });
    } catch (error: any) {
      console.error("Push subscribe error:", error);
      res.status(500).json({ message: error.message || "Failed to save subscription" });
    }
  });

  app.post("/api/push/unsubscribe", async (req, res) => {
    try {
      const { endpoint } = req.body;
      
      if (endpoint) {
        await removePushSubscription(endpoint);
      }
      
      res.json({ success: true });
    } catch (error: any) {
      console.error("Push unsubscribe error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/push/test", async (req, res) => {
    if (!isAuthenticatedAny(req)) return res.sendStatus(401);
    
    try {
      const result = await sendPushNotification(getUserId(req), {
        title: "MyPA Test",
        body: "Push notification working!",
        type: "alarm"
      });
      
      res.json({ sent: result.success, failed: result.failed });
    } catch (error: any) {
      console.error("Push test error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/push/snooze", async (req, res) => {
    try {
      const { alarmId, minutes } = req.body;
      console.log(`[Snooze] Alarm ${alarmId} snoozed for ${minutes} minutes`);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Start the alarm scheduler
  startAlarmScheduler();

  return httpServer;
}
