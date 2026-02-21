import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertCategorySchema, insertPaymentMethodSchema, insertBillingAccountSchema, insertSubscriptionSchema, insertExchangeRateSchema } from "@shared/schema";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.get("/api/categories", async (_req, res) => {
    const data = await storage.getCategories();
    res.json(data);
  });
  app.post("/api/categories", async (req, res) => {
    const parsed = insertCategorySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const row = await storage.createCategory(parsed.data);
    res.status(201).json(row);
  });
  app.patch("/api/categories/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const row = await storage.updateCategory(id, req.body);
    if (!row) return res.status(404).json({ message: "Not found" });
    res.json(row);
  });
  app.delete("/api/categories/:id", async (req, res) => {
    await storage.deleteCategory(parseInt(req.params.id));
    res.status(204).send();
  });

  app.get("/api/payment-methods", async (_req, res) => {
    const data = await storage.getPaymentMethods();
    res.json(data);
  });
  app.post("/api/payment-methods", async (req, res) => {
    const parsed = insertPaymentMethodSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const row = await storage.createPaymentMethod(parsed.data);
    res.status(201).json(row);
  });
  app.patch("/api/payment-methods/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const row = await storage.updatePaymentMethod(id, req.body);
    if (!row) return res.status(404).json({ message: "Not found" });
    res.json(row);
  });
  app.delete("/api/payment-methods/:id", async (req, res) => {
    await storage.deletePaymentMethod(parseInt(req.params.id));
    res.status(204).send();
  });

  app.get("/api/billing-accounts", async (_req, res) => {
    const data = await storage.getBillingAccounts();
    res.json(data);
  });
  app.post("/api/billing-accounts", async (req, res) => {
    const parsed = insertBillingAccountSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const row = await storage.createBillingAccount(parsed.data);
    res.status(201).json(row);
  });
  app.patch("/api/billing-accounts/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const row = await storage.updateBillingAccount(id, req.body);
    if (!row) return res.status(404).json({ message: "Not found" });
    res.json(row);
  });
  app.delete("/api/billing-accounts/:id", async (req, res) => {
    await storage.deleteBillingAccount(parseInt(req.params.id));
    res.status(204).send();
  });

  app.get("/api/exchange-rates", async (_req, res) => {
    const data = await storage.getExchangeRates();
    res.json(data);
  });
  app.post("/api/exchange-rates", async (req, res) => {
    const parsed = insertExchangeRateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const row = await storage.createExchangeRate(parsed.data);
    res.status(201).json(row);
  });
  app.patch("/api/exchange-rates/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const parsed = insertExchangeRateSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const row = await storage.updateExchangeRate(id, parsed.data);
    if (!row) return res.status(404).json({ message: "Not found" });
    res.json(row);
  });
  app.delete("/api/exchange-rates/:id", async (req, res) => {
    await storage.deleteExchangeRate(parseInt(req.params.id));
    res.status(204).send();
  });

  app.get("/api/subscriptions", async (_req, res) => {
    const data = await storage.getSubscriptions();
    res.json(data);
  });
  app.post("/api/subscriptions", async (req, res) => {
    const parsed = insertSubscriptionSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const row = await storage.createSubscription(parsed.data);
    res.status(201).json(row);
  });
  app.patch("/api/subscriptions/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const row = await storage.updateSubscription(id, req.body);
    if (!row) return res.status(404).json({ message: "Not found" });
    res.json(row);
  });
  app.delete("/api/subscriptions/:id", async (req, res) => {
    await storage.deleteSubscription(parseInt(req.params.id));
    res.status(204).send();
  });

  return httpServer;
}
