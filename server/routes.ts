import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertCategorySchema, insertPaymentMethodSchema, insertBillingAccountSchema, insertSubscriptionSchema, insertExchangeRateSchema, insertServiceGroupSchema } from "@shared/schema";
import { isAuthenticated } from "./replit_integrations/auth";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.get("/api/categories", isAuthenticated, async (_req, res) => {
    const data = await storage.getCategories();
    res.json(data);
  });
  app.post("/api/categories", isAuthenticated, async (req, res) => {
    const parsed = insertCategorySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const row = await storage.createCategory(parsed.data);
    res.status(201).json(row);
  });
  app.patch("/api/categories/:id", isAuthenticated, async (req, res) => {
    const id = parseInt(req.params.id);
    const row = await storage.updateCategory(id, req.body);
    if (!row) return res.status(404).json({ message: "Not found" });
    res.json(row);
  });
  app.delete("/api/categories/:id", isAuthenticated, async (req, res) => {
    await storage.deleteCategory(parseInt(req.params.id));
    res.status(204).send();
  });

  app.put("/api/categories/reorder", isAuthenticated, async (req, res) => {
    const ids = req.body.ids;
    if (!Array.isArray(ids)) return res.status(400).json({ message: "ids array required" });
    for (let i = 0; i < ids.length; i++) {
      await storage.updateCategory(ids[i], { sortOrder: i });
    }
    const data = await storage.getCategories();
    res.json(data);
  });

  app.get("/api/payment-methods", isAuthenticated, async (_req, res) => {
    const data = await storage.getPaymentMethods();
    res.json(data);
  });
  app.post("/api/payment-methods", isAuthenticated, async (req, res) => {
    const parsed = insertPaymentMethodSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const row = await storage.createPaymentMethod(parsed.data);
    res.status(201).json(row);
  });
  app.patch("/api/payment-methods/:id", isAuthenticated, async (req, res) => {
    const id = parseInt(req.params.id);
    const row = await storage.updatePaymentMethod(id, req.body);
    if (!row) return res.status(404).json({ message: "Not found" });
    res.json(row);
  });
  app.delete("/api/payment-methods/:id", isAuthenticated, async (req, res) => {
    await storage.deletePaymentMethod(parseInt(req.params.id));
    res.status(204).send();
  });

  app.get("/api/billing-accounts", isAuthenticated, async (_req, res) => {
    const data = await storage.getBillingAccounts();
    res.json(data);
  });
  app.post("/api/billing-accounts", isAuthenticated, async (req, res) => {
    const parsed = insertBillingAccountSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const row = await storage.createBillingAccount(parsed.data);
    res.status(201).json(row);
  });
  app.patch("/api/billing-accounts/:id", isAuthenticated, async (req, res) => {
    const id = parseInt(req.params.id);
    const row = await storage.updateBillingAccount(id, req.body);
    if (!row) return res.status(404).json({ message: "Not found" });
    res.json(row);
  });
  app.delete("/api/billing-accounts/:id", isAuthenticated, async (req, res) => {
    await storage.deleteBillingAccount(parseInt(req.params.id));
    res.status(204).send();
  });

  app.get("/api/exchange-rates", isAuthenticated, async (_req, res) => {
    const data = await storage.getExchangeRates();
    res.json(data);
  });
  app.post("/api/exchange-rates", isAuthenticated, async (req, res) => {
    const parsed = insertExchangeRateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const row = await storage.createExchangeRate(parsed.data);
    res.status(201).json(row);
  });
  app.patch("/api/exchange-rates/:id", isAuthenticated, async (req, res) => {
    const id = parseInt(req.params.id);
    const parsed = insertExchangeRateSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const row = await storage.updateExchangeRate(id, parsed.data);
    if (!row) return res.status(404).json({ message: "Not found" });
    res.json(row);
  });
  app.delete("/api/exchange-rates/:id", isAuthenticated, async (req, res) => {
    await storage.deleteExchangeRate(parseInt(req.params.id));
    res.status(204).send();
  });

  app.post("/api/exchange-rates/fetch", isAuthenticated, async (_req, res) => {
    const apiKey = process.env.ExchangeRate_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ message: "ExchangeRate API キーが設定されていません" });
    }
    try {
      const response = await fetch(`https://v6.exchangerate-api.com/v6/${apiKey}/latest/JPY`);
      if (!response.ok) {
        return res.status(502).json({ message: "為替レートAPIの呼び出しに失敗しました" });
      }
      const data = await response.json() as { result: string; conversion_rates?: Record<string, number> };
      if (data.result !== "success" || !data.conversion_rates) {
        return res.status(502).json({ message: "為替レートAPIからの応答が不正です" });
      }
      const jpyRates = data.conversion_rates;
      const existingRates = await storage.getExchangeRates();
      const updated: { currency: string; rateToJpy: number }[] = [];
      const skipped: string[] = [];
      for (const rate of existingRates) {
        const jpyToForeign = jpyRates[rate.currency];
        if (jpyToForeign && jpyToForeign > 0) {
          const rateToJpy = 1 / jpyToForeign;
          await storage.updateExchangeRate(rate.id, { rateToJpy });
          updated.push({ currency: rate.currency, rateToJpy });
        } else {
          skipped.push(rate.currency);
        }
      }
      res.json({ updated, count: updated.length, skipped });
    } catch (e: any) {
      res.status(500).json({ message: e.message || "為替レート取得中にエラーが発生しました" });
    }
  });

  app.get("/api/service-groups", isAuthenticated, async (_req, res) => {
    const data = await storage.getServiceGroups();
    res.json(data);
  });
  app.post("/api/service-groups", isAuthenticated, async (req, res) => {
    const parsed = insertServiceGroupSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const row = await storage.createServiceGroup(parsed.data);
    res.status(201).json(row);
  });
  app.patch("/api/service-groups/:id", isAuthenticated, async (req, res) => {
    const id = parseInt(req.params.id);
    const row = await storage.updateServiceGroup(id, req.body);
    if (!row) return res.status(404).json({ message: "Not found" });
    res.json(row);
  });
  app.delete("/api/service-groups/:id", isAuthenticated, async (req, res) => {
    await storage.deleteServiceGroup(parseInt(req.params.id));
    res.status(204).send();
  });

  app.put("/api/service-groups/reorder", isAuthenticated, async (req, res) => {
    const ids = req.body.ids;
    if (!Array.isArray(ids)) return res.status(400).json({ message: "ids array required" });
    for (let i = 0; i < ids.length; i++) {
      await storage.updateServiceGroup(ids[i], { sortOrder: i });
    }
    const data = await storage.getServiceGroups();
    res.json(data);
  });

  app.get("/api/subscriptions", isAuthenticated, async (_req, res) => {
    const data = await storage.getSubscriptions();
    res.json(data);
  });
  app.post("/api/subscriptions", isAuthenticated, async (req, res) => {
    const parsed = insertSubscriptionSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const row = await storage.createSubscription(parsed.data);
    res.status(201).json(row);
  });
  app.patch("/api/subscriptions/:id", isAuthenticated, async (req, res) => {
    const id = parseInt(req.params.id);
    const row = await storage.updateSubscription(id, req.body);
    if (!row) return res.status(404).json({ message: "Not found" });
    res.json(row);
  });
  app.delete("/api/subscriptions/:id", isAuthenticated, async (req, res) => {
    await storage.deleteSubscription(parseInt(req.params.id));
    res.status(204).send();
  });

  return httpServer;
}
