import { pgTable, text, serial, integer, boolean, timestamp, varchar, index, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { sql } from "drizzle-orm";

// Session storage table - mandatory for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)]
);

// User storage table - unified schema for auth and app
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  phone: varchar("phone"),
  passwordHash: varchar("password_hash"),
  authProvider: varchar("auth_provider").default("email"), // email, google, phone
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  // App-specific fields
  subscriptionStatus: text("subscription_status").default("trial"),
  trialEndsAt: timestamp("trial_ends_at").defaultNow(),
  language: text("language").default("english"),
  // Stripe fields for payment
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
});

// OTP storage for phone verification
export const otpCodes = pgTable("otp_codes", {
  id: serial("id").primaryKey(),
  phone: varchar("phone").notNull(),
  code: varchar("code").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const alarms = pgTable("alarms", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  title: text("title").notNull(),
  time: text("time").notNull(), // HH:mm format
  date: text("date"), // YYYY-MM-DD for specific date alarms
  days: text("days").array(), // ["Mon", "Tue", ...] for recurring
  isActive: boolean("is_active").default(true),
  type: text("type").default("speaking"), // speaking, custom_voice, text
  voiceUrl: text("voice_url"), // URL to recorded audio or uploaded image
  imageUrl: text("image_url"), // New field for alarm photo
  textToSpeak: text("text_to_speak"),
  voiceGender: text("voice_gender").default("female"), // male, female
  language: text("language").default("english"), // Added language support
  duration: integer("duration").default(30), // Duration in seconds to play
  loop: boolean("loop").default(true), // Whether to loop the audio/TTS
});

export const medicines = pgTable("medicines", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  name: text("name").notNull(),
  photoUrl: text("photo_url"),
  timeOfDay: text("time_of_day"), 
  times: text("times").array(), 
  dosage: text("dosage"),
  isActive: boolean("is_active").default(true),
  type: text("type").default("speaking"),
  voiceUrl: text("voice_url"),
  textToSpeak: text("text_to_speak"),
  voiceGender: text("voice_gender").default("female"),
  language: text("language").default("english"),
  duration: integer("duration").default(30),
  loop: boolean("loop").default(true),
});

export const meetings = pgTable("meetings", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  title: text("title").notNull(),
  date: text("date").notNull(), // YYYY-MM-DD
  time: text("time").notNull(), // HH:mm format
  location: text("location"),
  description: text("description"),
  participants: text("participants"),
  textToSpeak: text("text_to_speak"),
  enabled: boolean("enabled").default(true),
});

// Push notification subscriptions
export const pushSubscriptions = pgTable("push_subscriptions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users);
export const insertAlarmSchema = createInsertSchema(alarms).omit({ id: true });
export const insertMedicineSchema = createInsertSchema(medicines).omit({ id: true });
export const insertMeetingSchema = createInsertSchema(meetings).omit({ id: true });
export const insertPushSubscriptionSchema = createInsertSchema(pushSubscriptions).omit({ id: true });

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpsertUser = Partial<InsertUser> & { id: string };
export type Alarm = typeof alarms.$inferSelect;
export type InsertAlarm = z.infer<typeof insertAlarmSchema>;
export type Medicine = typeof medicines.$inferSelect;
export type InsertMedicine = z.infer<typeof insertMedicineSchema>;
export type Meeting = typeof meetings.$inferSelect;
export type InsertMeeting = z.infer<typeof insertMeetingSchema>;
export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type InsertPushSubscription = z.infer<typeof insertPushSubscriptionSchema>;
