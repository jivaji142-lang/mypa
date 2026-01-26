import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { setupAuth, registerAuthRoutes } from "./replit_integrations/auth";
import { seed } from "./seed";

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
    const alarms = await storage.getAlarms(req.user.id);
    res.json(alarms);
  });

  app.post(api.alarms.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const input = {
        ...req.body,
        userId: req.user.id
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
      const input = api.alarms.update.input.parse(req.body);
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
    const medicines = await storage.getMedicines(req.user.id);
    res.json(medicines);
  });

  app.post(api.medicines.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const input = {
        ...req.body,
        userId: req.user.id
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
      const input = api.medicines.update.input.parse(req.body);
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

  // Upload (Mock)
  app.post(api.upload.create.path, async (req, res) => {
    // In a real app, use multer to save to disk or S3
    // Here we just return a mock URL
    res.json({ url: "https://placehold.co/400" });
  });

  return httpServer;
}
