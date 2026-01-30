import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { setupAuth, registerAuthRoutes } from "./replit_integrations/auth";
import { seed } from "./seed";
import bcrypt from "bcryptjs";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Auth Setup
  await setupAuth(app);
  registerAuthRoutes(app);
  
  // Seed Database
  seed().catch(console.error);

  // Alarms
  app.get(api.alarms.list.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const alarms = await storage.getAlarms((req.user as any).id);
    res.json(alarms);
  });

  app.post(api.alarms.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const input = {
        ...req.body,
        userId: (req.user as any).id
      };
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
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const input = {
        ...req.body,
        userId: (req.user as any).id
      };
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
    if (!req.isAuthenticated()) return res.sendStatus(401);
    await storage.deleteAlarm(Number(req.params.id));
    res.status(204).end();
  });

  // Medicines
  app.get(api.medicines.list.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const medicines = await storage.getMedicines((req.user as any).id);
    res.json(medicines);
  });

  app.post(api.medicines.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const input = {
        ...req.body,
        userId: (req.user as any).id
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
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const input = {
        ...req.body,
        userId: (req.user as any).id
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
    if (!req.isAuthenticated()) return res.sendStatus(401);
    await storage.deleteMedicine(Number(req.params.id));
    res.status(204).end();
  });

  // Meetings
  app.get(api.meetings.list.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const meetings = await storage.getMeetings((req.user as any).id);
    res.json(meetings);
  });

  app.post(api.meetings.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const validated = api.meetings.create.input.parse(req.body);
      const input = {
        ...validated,
        userId: (req.user as any).id
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
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const validated = api.meetings.update.input.parse(req.body);
      const input = {
        ...validated,
        userId: (req.user as any).id
      };
      const meeting = await storage.updateMeeting(Number(req.params.id), input);
      res.json(meeting);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: err.errors[0].message });
        return;
      }
      res.status(404).json({ message: "Meeting not found" });
    }
  });

  app.delete(api.meetings.delete.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    await storage.deleteMeeting(Number(req.params.id));
    res.status(204).end();
  });

  // User Settings
  app.patch("/api/user/settings", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = await storage.updateUser((req.user as any).id, req.body);
    res.json(user);
  });

  // Upload (Mock)
  app.post(api.upload.create.path, async (req, res) => {
    // In a real app, use multer to save to disk or S3
    // Here we just return a mock URL
    res.json({ url: "https://placehold.co/400" });
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
      
      req.login(user, (err) => {
        if (err) {
          return res.status(500).json({ message: "Login failed after signup" });
        }
        res.json({ success: true, user: sanitizeUser(user) });
      });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      console.error("Signup error:", err);
      res.status(500).json({ message: "Signup failed" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const validatedData = loginSchema.parse(req.body);
      const { email, password } = validatedData;
      
      const user = await storage.getUserByEmail(email);
      if (!user || !user.passwordHash) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      
      const validPassword = await bcrypt.compare(password, user.passwordHash);
      if (!validPassword) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      
      req.login(user, (err) => {
        if (err) {
          return res.status(500).json({ message: "Login failed" });
        }
        res.json({ success: true, user: sanitizeUser(user) });
      });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      console.error("Login error:", err);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Phone OTP Authentication with Fast2SMS
  app.post("/api/auth/send-otp", async (req, res) => {
    try {
      const validatedData = phoneSchema.parse(req.body);
      let { phone } = validatedData;
      
      // Remove country code if present (Fast2SMS works with 10-digit Indian numbers)
      phone = phone.replace(/^\+91/, '').replace(/^91/, '').replace(/\s/g, '');
      
      if (phone.length !== 10) {
        return res.status(400).json({ message: "Please enter valid 10-digit mobile number" });
      }
      
      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      
      await storage.createOtp({ phone, code: otp, expiresAt });
      
      // Send OTP via Fast2SMS
      const fast2smsKey = process.env.FAST2SMS_API_KEY;
      
      if (fast2smsKey) {
        try {
          // Use Quick SMS route (works without DLT verification)
          const message = `Your MyPA verification code is: ${otp}. Valid for 10 minutes.`;
          const apiUrl = `https://www.fast2sms.com/dev/bulkV2?authorization=${fast2smsKey}&message=${encodeURIComponent(message)}&route=q&numbers=${phone}`;
          
          console.log(`[Fast2SMS] Sending to ${phone}...`);
          const response = await fetch(apiUrl);
          const result = await response.json();
          
          console.log(`[Fast2SMS] Response:`, JSON.stringify(result, null, 2));
          
          if (!result.return) {
            console.error("[Fast2SMS] Error - SMS not sent:", result.message || result);
            // Fallback: log OTP for testing
            console.log(`[FALLBACK] OTP for ${phone}: ${otp}`);
          } else {
            console.log(`[Fast2SMS] SUCCESS - OTP sent to ${phone}`);
          }
        } catch (smsError) {
          console.error("[Fast2SMS] Exception:", smsError);
          // Fallback: log OTP for testing
          console.log(`[FALLBACK] OTP for ${phone}: ${otp}`);
        }
      } else {
        // Development fallback - log OTP
        console.log(`[DEV] OTP for ${phone}: ${otp} (Fast2SMS not configured)`);
      }
      
      res.json({ success: true, message: "OTP sent successfully" });
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
      const { phone, otp, name } = validatedData;
      
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
      
      req.login(user, (err) => {
        if (err) {
          return res.status(500).json({ message: "Login failed" });
        }
        res.json({ success: true, user: sanitizeUser(user) });
      });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      console.error("Verify OTP error:", err);
      res.status(500).json({ message: "Verification failed" });
    }
  });

  return httpServer;
}
