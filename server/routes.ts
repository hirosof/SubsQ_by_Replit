import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage, type BackupPayload } from "./storage";
import { insertCategorySchema, insertPaymentMethodSchema, insertActualBillingDestinationSchema, insertBillingAccountSchema, insertSubscriptionSchema, insertExchangeRateSchema, insertServiceGroupSchema } from "@shared/schema";
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

  app.get("/api/actual-billing-destinations", isAuthenticated, async (_req, res) => {
    const data = await storage.getActualBillingDestinations();
    res.json(data);
  });
  app.post("/api/actual-billing-destinations", isAuthenticated, async (req, res) => {
    const parsed = insertActualBillingDestinationSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const row = await storage.createActualBillingDestination(parsed.data);
    res.status(201).json(row);
  });
  app.patch("/api/actual-billing-destinations/:id", isAuthenticated, async (req, res) => {
    const id = parseInt(req.params.id);
    const row = await storage.updateActualBillingDestination(id, req.body);
    if (!row) return res.status(404).json({ message: "Not found" });
    res.json(row);
  });
  app.delete("/api/actual-billing-destinations/:id", isAuthenticated, async (req, res) => {
    await storage.deleteActualBillingDestination(parseInt(req.params.id));
    res.status(204).send();
  });

  app.put("/api/actual-billing-destinations/reorder", isAuthenticated, async (req, res) => {
    const ids = req.body.ids;
    if (!Array.isArray(ids)) return res.status(400).json({ message: "ids array required" });
    for (let i = 0; i < ids.length; i++) {
      await storage.updateActualBillingDestination(ids[i], { sortOrder: i });
    }
    const data = await storage.getActualBillingDestinations();
    res.json(data);
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

  app.post("/api/subscriptions/advance-billing-dates", isAuthenticated, async (_req, res) => {
    try {
      const count = await storage.advanceBillingDates();
      res.json({ count });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "エラーが発生しました";
      res.status(500).json({ message });
    }
  });

  app.get("/api/subscriptions/export", isAuthenticated, async (_req, res) => {
    try {
      const [subs, cats, pms, bas, sgs] = await Promise.all([
        storage.getSubscriptions(),
        storage.getCategories(),
        storage.getPaymentMethods(),
        storage.getBillingAccounts(),
        storage.getServiceGroups(),
      ]);

      const catMap = new Map(cats.map(c => [c.id, c.name]));
      const pmMap = new Map(pms.map(p => [p.id, p.name]));
      const baMap = new Map(bas.map(b => [b.id, b.name]));
      const sgMap = new Map(sgs.map(g => [g.id, g.name]));

      const escCsv = (val: string | null | undefined): string => {
        if (val == null || val === "") return "";
        if (val.includes(",") || val.includes('"') || val.includes("\n")) {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      };

      const headers = ["サービス名", "コース名", "金額", "通貨", "課金サイクル", "次回課金日", "カテゴリ", "支払い方法", "請求先", "サービスグループ", "請求者名", "サービスURL", "メモ", "ステータス"];
      const rows = subs.map(sub => [
        escCsv(sub.serviceName),
        escCsv(sub.planName),
        String(sub.amount),
        sub.currency,
        sub.billingCycle,
        sub.nextBillingDate || "",
        escCsv(sub.categoryId != null ? catMap.get(sub.categoryId) : null),
        escCsv(sub.paymentMethodId != null ? pmMap.get(sub.paymentMethodId) : null),
        escCsv(sub.billingAccountId != null ? baMap.get(sub.billingAccountId) : null),
        escCsv(sub.serviceGroupId != null ? sgMap.get(sub.serviceGroupId) : null),
        escCsv(sub.billerName),
        escCsv(sub.serviceUrl),
        escCsv(sub.note),
        sub.isActive === 1 ? "有効" : "停止中",
      ]);

      const BOM = "\uFEFF";
      const csv = BOM + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
      const filename = `subsq-export-${new Date().toISOString().slice(0, 10)}.csv`;
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.send(csv);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "エラーが発生しました";
      res.status(500).json({ message });
    }
  });

  app.post("/api/subscriptions/import", isAuthenticated, async (req, res) => {
    try {
      const body = req.body as { csv?: unknown };
      const { csv } = body;
      if (!csv || typeof csv !== "string") {
        return res.status(400).json({ message: "CSVデータが必要です" });
      }

      const parseCSVAll = (text: string): string[][] => {
        const rows: string[][] = [];
        let row: string[] = [];
        let current = "";
        let inQuotes = false;
        const src = text.replace(/^\uFEFF/, "");
        for (let i = 0; i < src.length; i++) {
          const ch = src[i];
          if (inQuotes) {
            if (ch === '"' && src[i + 1] === '"') { current += '"'; i++; }
            else if (ch === '"') { inQuotes = false; }
            else { current += ch; }
          } else {
            if (ch === '"') { inQuotes = true; }
            else if (ch === ',') { row.push(current); current = ""; }
            else if (ch === '\r' && src[i + 1] === '\n') {
              row.push(current); current = ""; rows.push(row); row = []; i++;
            } else if (ch === '\n' || ch === '\r') {
              row.push(current); current = ""; rows.push(row); row = [];
            } else { current += ch; }
          }
        }
        row.push(current);
        if (row.some(f => f !== "")) rows.push(row);
        return rows.filter(r => r.some(f => f !== ""));
      };

      const allRows = parseCSVAll(csv);
      if (allRows.length < 2) {
        return res.status(400).json({ message: "CSVにデータ行がありません" });
      }

      const headerLine = allRows[0];
      const idx = (name: string) => headerLine.indexOf(name);
      const iServiceName = idx("サービス名");
      const iPlanName = idx("コース名");
      const iAmount = idx("金額");
      const iCurrency = idx("通貨");
      const iBillingCycle = idx("課金サイクル");
      const iNextBillingDate = idx("次回課金日");
      const iCategory = idx("カテゴリ");
      const iPaymentMethod = idx("支払い方法");
      const iBillingAccount = idx("請求先");
      const iServiceGroup = idx("サービスグループ");
      const iBillerName = idx("請求者名");
      const iServiceUrl = idx("サービスURL");
      const iNote = idx("メモ");
      const iStatus = idx("ステータス");

      if (iServiceName === -1 || iAmount === -1) {
        return res.status(400).json({ message: "CSVに必須列（サービス名・金額）がありません" });
      }

      const existingCats = await storage.getCategories();
      const existingPms = await storage.getPaymentMethods();
      const existingBas = await storage.getBillingAccounts();
      const existingSgs = await storage.getServiceGroups();

      const catByName = new Map(existingCats.map(c => [c.name, c.id]));
      const pmByName = new Map(existingPms.map(p => [p.name, p.id]));
      const baByName = new Map(existingBas.map(b => [b.name, b.id]));
      const sgByName = new Map(existingSgs.map(g => [g.name, g.id]));

      let added = 0;
      const errors: string[] = [];

      for (let i = 1; i < allRows.length; i++) {
        try {
          const cols = allRows[i];
          const serviceName = cols[iServiceName]?.trim();
          const amountStr = cols[iAmount]?.trim();
          if (!serviceName) { errors.push(`行${i + 1}: サービス名が空です`); continue; }
          const amount = parseFloat(amountStr);
          if (isNaN(amount)) { errors.push(`行${i + 1}: 金額が不正です (${amountStr})`); continue; }

          const currency = (iCurrency !== -1 && cols[iCurrency]?.trim()) ? cols[iCurrency].trim() : "JPY";
          const billingCycle = (iBillingCycle !== -1 && cols[iBillingCycle]?.trim()) ? cols[iBillingCycle].trim() : "monthly";
          const nextBillingDate = (iNextBillingDate !== -1 && cols[iNextBillingDate]?.trim()) ? cols[iNextBillingDate].trim() : null;

          let categoryId: number | null = null;
          const catName = iCategory !== -1 ? cols[iCategory]?.trim() : "";
          if (catName) {
            if (catByName.has(catName)) { categoryId = catByName.get(catName)!; }
            else {
              const row = await storage.createCategory({ name: catName, color: "#3b82f6", icon: "folder", sortOrder: 0 });
              catByName.set(catName, row.id); categoryId = row.id;
            }
          }

          let paymentMethodId: number | null = null;
          const pmName = iPaymentMethod !== -1 ? cols[iPaymentMethod]?.trim() : "";
          if (pmName) {
            if (pmByName.has(pmName)) { paymentMethodId = pmByName.get(pmName)!; }
            else {
              const row = await storage.createPaymentMethod({ name: pmName, icon: "credit-card" });
              pmByName.set(pmName, row.id); paymentMethodId = row.id;
            }
          }

          let billingAccountId: number | null = null;
          const baName = iBillingAccount !== -1 ? cols[iBillingAccount]?.trim() : "";
          if (baName) {
            if (!paymentMethodId) {
              errors.push(`行${i + 1}: 請求先「${baName}」を設定するには支払い方法が必要です`);
              continue;
            }
            if (baByName.has(baName)) { billingAccountId = baByName.get(baName)!; }
            else {
              const row = await storage.createBillingAccount({ name: baName, paymentMethodId, actualBillingDestinationId: null });
              baByName.set(baName, row.id); billingAccountId = row.id;
            }
          }

          let serviceGroupId: number | null = null;
          const sgName = iServiceGroup !== -1 ? cols[iServiceGroup]?.trim() : "";
          if (sgName) {
            if (sgByName.has(sgName)) { serviceGroupId = sgByName.get(sgName)!; }
            else {
              const row = await storage.createServiceGroup({ name: sgName, color: "#6366f1", sortOrder: 0 });
              sgByName.set(sgName, row.id); serviceGroupId = row.id;
            }
          }

          const statusStr = iStatus !== -1 ? cols[iStatus]?.trim() : "";
          const isActive = statusStr === "停止中" ? 0 : 1;

          await storage.createSubscription({
            serviceName,
            planName: (iPlanName !== -1 && cols[iPlanName]?.trim()) ? cols[iPlanName].trim() : null,
            billerName: (iBillerName !== -1 && cols[iBillerName]?.trim()) ? cols[iBillerName].trim() : null,
            serviceUrl: (iServiceUrl !== -1 && cols[iServiceUrl]?.trim()) ? cols[iServiceUrl].trim() : null,
            note: (iNote !== -1 && cols[iNote]?.trim()) ? cols[iNote].trim() : null,
            amount,
            currency,
            billingCycle,
            nextBillingDate,
            categoryId,
            paymentMethodId,
            billingAccountId,
            serviceGroupId,
            scheduledAmount: null,
            scheduledDate: null,
            isActive,
          });
          added++;
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : "不明なエラー";
          errors.push(`行${i + 1}: ${msg}`);
        }
      }

      res.json({ added, errors });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "エラーが発生しました";
      res.status(500).json({ message });
    }
  });

  app.get("/api/data/backup", isAuthenticated, async (_req, res) => {
    try {
      const [cats, pms, abds, bas, sgs, ers, subs] = await Promise.all([
        storage.getCategories(),
        storage.getPaymentMethods(),
        storage.getActualBillingDestinations(),
        storage.getBillingAccounts(),
        storage.getServiceGroups(),
        storage.getExchangeRates(),
        storage.getSubscriptions(),
      ]);
      const backup = {
        version: "1",
        exportedAt: new Date().toISOString(),
        data: { categories: cats, paymentMethods: pms, actualBillingDestinations: abds, billingAccounts: bas, serviceGroups: sgs, exchangeRates: ers, subscriptions: subs },
      };
      const filename = `subsq-backup-${new Date().toISOString().slice(0, 10)}.json`;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.json(backup);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "エラーが発生しました";
      res.status(500).json({ message });
    }
  });

  app.post("/api/data/restore", isAuthenticated, async (req, res) => {
    try {
      const body = req.body as { version?: unknown; data?: unknown };
      if (!body || body.version !== "1" || !body.data || typeof body.data !== "object") {
        return res.status(400).json({ message: "バックアップファイルの形式が正しくありません（version: '1' が必要です）" });
      }
      const raw = body.data as Record<string, unknown>;
      const requiredKeys: (keyof BackupPayload)[] = ["categories", "paymentMethods", "actualBillingDestinations", "billingAccounts", "serviceGroups", "exchangeRates", "subscriptions"];
      for (const key of requiredKeys) {
        if (!Array.isArray(raw[key])) {
          return res.status(400).json({ message: `バックアップデータに '${key}' 配列がありません。正しいバックアップファイルか確認してください。` });
        }
      }
      const cats = raw.categories as BackupPayload["categories"];
      const pms = raw.paymentMethods as BackupPayload["paymentMethods"];
      if (cats.some((c) => typeof c.id !== "number" || typeof c.name !== "string")) {
        return res.status(400).json({ message: "categories データの形式が正しくありません（id: number, name: string が必要）" });
      }
      if (pms.some((p) => typeof p.id !== "number" || typeof p.name !== "string")) {
        return res.status(400).json({ message: "paymentMethods データの形式が正しくありません（id: number, name: string が必要）" });
      }
      const subs = raw.subscriptions as BackupPayload["subscriptions"];
      if (subs.some((s) => typeof s.id !== "number" || typeof s.serviceName !== "string" || typeof s.amount !== "number")) {
        return res.status(400).json({ message: "subscriptions データの形式が正しくありません（id, serviceName, amount が必要）" });
      }
      const payload: BackupPayload = {
        categories: raw.categories as BackupPayload["categories"],
        paymentMethods: raw.paymentMethods as BackupPayload["paymentMethods"],
        actualBillingDestinations: raw.actualBillingDestinations as BackupPayload["actualBillingDestinations"],
        billingAccounts: raw.billingAccounts as BackupPayload["billingAccounts"],
        serviceGroups: raw.serviceGroups as BackupPayload["serviceGroups"],
        exchangeRates: raw.exchangeRates as BackupPayload["exchangeRates"],
        subscriptions: raw.subscriptions as BackupPayload["subscriptions"],
      };
      await storage.restoreData(payload);
      res.json({ message: "復元が完了しました" });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "エラーが発生しました";
      res.status(500).json({ message });
    }
  });

  app.post("/api/subscriptions/:id/apply-scheduled", isAuthenticated, async (req, res) => {
    const id = parseInt(req.params.id);
    const sub = await storage.getSubscription(id);
    if (!sub) return res.status(404).json({ message: "Not found" });
    if (sub.scheduledAmount == null) {
      return res.status(400).json({ message: "価格変更予約がありません" });
    }
    const row = await storage.updateSubscription(id, {
      amount: sub.scheduledAmount,
      scheduledAmount: null,
      scheduledDate: null,
    });
    res.json(row);
  });

  return httpServer;
}
