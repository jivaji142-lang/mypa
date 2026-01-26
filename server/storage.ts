import { db } from "./db";
import {
  users, alarms, medicines,
  type User, type InsertUser,
  type Alarm, type InsertAlarm,
  type Medicine, type InsertMedicine
} from "@shared/schema";
import { eq } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  getAlarms(userId: string): Promise<Alarm[]>;
  createAlarm(alarm: InsertAlarm): Promise<Alarm>;
  updateAlarm(id: number, alarm: Partial<InsertAlarm>): Promise<Alarm>;
  deleteAlarm(id: number): Promise<void>;

  getMedicines(userId: string): Promise<Medicine[]>;
  createMedicine(medicine: InsertMedicine): Promise<Medicine>;
  deleteMedicine(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    // Note: username column was replaced by email in unified schema
    const [user] = await db.select().from(users).where(eq(users.email, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getAlarms(userId: string): Promise<Alarm[]> {
    return await db.select().from(alarms).where(eq(alarms.userId, userId));
  }

  async createAlarm(alarm: InsertAlarm): Promise<Alarm> {
    const [newAlarm] = await db.insert(alarms).values(alarm).returning();
    return newAlarm;
  }

  async updateAlarm(id: number, alarm: Partial<InsertAlarm>): Promise<Alarm> {
    const [updatedAlarm] = await db
      .update(alarms)
      .set(alarm)
      .where(eq(alarms.id, id))
      .returning();
    return updatedAlarm;
  }

  async deleteAlarm(id: number): Promise<void> {
    await db.delete(alarms).where(eq(alarms.id, id));
  }

  async getMedicines(userId: string): Promise<Medicine[]> {
    return await db.select().from(medicines).where(eq(medicines.userId, userId));
  }

  async createMedicine(medicine: InsertMedicine): Promise<Medicine> {
    const [newMedicine] = await db.insert(medicines).values(medicine).returning();
    return newMedicine;
  }

  async updateMedicine(id: number, medicine: Partial<InsertMedicine>): Promise<Medicine> {
    const [updatedMedicine] = await db
      .update(medicines)
      .set(medicine)
      .where(eq(medicines.id, id))
      .returning();
    return updatedMedicine;
  }
}

export const storage = new DatabaseStorage();
