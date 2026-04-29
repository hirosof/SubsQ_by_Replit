import {
  categories, type Category, type InsertCategory,
  paymentMethods, type PaymentMethod, type InsertPaymentMethod,
  actualBillingDestinations, type ActualBillingDestination, type InsertActualBillingDestination,
  billingAccounts, type BillingAccount, type InsertBillingAccount,
  subscriptions, type Subscription, type InsertSubscription,
  exchangeRates, type ExchangeRate, type InsertExchangeRate,
  serviceGroups, type ServiceGroup, type InsertServiceGroup,
} from "@shared/schema";
import { db } from "./db";
import { eq, asc, isNull } from "drizzle-orm";
import { randomBytes } from "node:crypto";

export function generateSubId(): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = randomBytes(8);
  return Array.from(bytes, b => alphabet[b % alphabet.length]).join("");
}

export async function backfillManagementIds(): Promise<number> {
  const rows = await db.select({ id: subscriptions.id }).from(subscriptions).where(isNull(subscriptions.managementId));
  let count = 0;
  for (const row of rows) {
    await db.update(subscriptions).set({ managementId: generateSubId() }).where(eq(subscriptions.id, row.id));
    count++;
  }
  if (count > 0) console.log(`[storage] Backfilled managementId for ${count} subscription(s)`);
  return count;
}

export interface BackupCategory { id: number; name: string; color?: string; icon?: string; sortOrder?: number; }
export interface BackupPaymentMethod { id: number; name: string; icon?: string; }
export interface BackupActualBillingDestination { id: number; name: string; color?: string; sortOrder?: number; }
export interface BackupBillingAccount { id: number; name: string; paymentMethodId: number; actualBillingDestinationId?: number | null; }
export interface BackupServiceGroup { id: number; name: string; color?: string; sortOrder?: number; }
export interface BackupExchangeRate { id: number; currency: string; rateToJpy: number; }
export interface BackupSubscription {
  id: number;
  managementId?: string | null;
  serviceName: string;
  serviceUrl?: string | null;
  planName?: string | null;
  billerName?: string | null;
  amount: number;
  currency?: string;
  billingCycle?: string;
  categoryId?: number | null;
  paymentMethodId?: number | null;
  billingAccountId?: number | null;
  serviceGroupId?: number | null;
  note?: string | null;
  nextBillingDate?: string | null;
  scheduledAmount?: number | null;
  scheduledDate?: string | null;
  isActive?: number;
}
export interface BackupPayload {
  categories: BackupCategory[];
  paymentMethods: BackupPaymentMethod[];
  actualBillingDestinations: BackupActualBillingDestination[];
  billingAccounts: BackupBillingAccount[];
  serviceGroups: BackupServiceGroup[];
  exchangeRates: BackupExchangeRate[];
  subscriptions: BackupSubscription[];
}

export interface IStorage {
  getCategories(): Promise<Category[]>;
  getCategory(id: number): Promise<Category | undefined>;
  createCategory(data: InsertCategory): Promise<Category>;
  updateCategory(id: number, data: Partial<InsertCategory>): Promise<Category | undefined>;
  deleteCategory(id: number): Promise<void>;

  getPaymentMethods(): Promise<PaymentMethod[]>;
  getPaymentMethod(id: number): Promise<PaymentMethod | undefined>;
  createPaymentMethod(data: InsertPaymentMethod): Promise<PaymentMethod>;
  updatePaymentMethod(id: number, data: Partial<InsertPaymentMethod>): Promise<PaymentMethod | undefined>;
  deletePaymentMethod(id: number): Promise<void>;

  getActualBillingDestinations(): Promise<ActualBillingDestination[]>;
  getActualBillingDestination(id: number): Promise<ActualBillingDestination | undefined>;
  createActualBillingDestination(data: InsertActualBillingDestination): Promise<ActualBillingDestination>;
  updateActualBillingDestination(id: number, data: Partial<InsertActualBillingDestination>): Promise<ActualBillingDestination | undefined>;
  deleteActualBillingDestination(id: number): Promise<void>;

  getBillingAccounts(): Promise<BillingAccount[]>;
  getBillingAccount(id: number): Promise<BillingAccount | undefined>;
  createBillingAccount(data: InsertBillingAccount): Promise<BillingAccount>;
  updateBillingAccount(id: number, data: Partial<InsertBillingAccount>): Promise<BillingAccount | undefined>;
  deleteBillingAccount(id: number): Promise<void>;

  getExchangeRates(): Promise<ExchangeRate[]>;
  getExchangeRate(id: number): Promise<ExchangeRate | undefined>;
  getExchangeRateByCurrency(currency: string): Promise<ExchangeRate | undefined>;
  createExchangeRate(data: InsertExchangeRate): Promise<ExchangeRate>;
  updateExchangeRate(id: number, data: Partial<InsertExchangeRate>): Promise<ExchangeRate | undefined>;
  deleteExchangeRate(id: number): Promise<void>;

  getServiceGroups(): Promise<ServiceGroup[]>;
  getServiceGroup(id: number): Promise<ServiceGroup | undefined>;
  createServiceGroup(data: InsertServiceGroup): Promise<ServiceGroup>;
  updateServiceGroup(id: number, data: Partial<InsertServiceGroup>): Promise<ServiceGroup | undefined>;
  deleteServiceGroup(id: number): Promise<void>;

  getSubscriptions(): Promise<Subscription[]>;
  getSubscription(id: number): Promise<Subscription | undefined>;
  createSubscription(data: InsertSubscription): Promise<Subscription>;
  updateSubscription(id: number, data: Partial<InsertSubscription>): Promise<Subscription | undefined>;
  deleteSubscription(id: number): Promise<void>;
  advanceBillingDates(): Promise<number>;
  restoreData(data: BackupPayload): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getCategories(): Promise<Category[]> {
    return db.select().from(categories).orderBy(asc(categories.sortOrder), asc(categories.id));
  }
  async getCategory(id: number): Promise<Category | undefined> {
    const [row] = await db.select().from(categories).where(eq(categories.id, id));
    return row || undefined;
  }
  async createCategory(data: InsertCategory): Promise<Category> {
    const [row] = await db.insert(categories).values(data).returning();
    return row;
  }
  async updateCategory(id: number, data: Partial<InsertCategory>): Promise<Category | undefined> {
    const [row] = await db.update(categories).set(data).where(eq(categories.id, id)).returning();
    return row || undefined;
  }
  async deleteCategory(id: number): Promise<void> {
    await db.delete(categories).where(eq(categories.id, id));
  }

  async getPaymentMethods(): Promise<PaymentMethod[]> {
    return db.select().from(paymentMethods);
  }
  async getPaymentMethod(id: number): Promise<PaymentMethod | undefined> {
    const [row] = await db.select().from(paymentMethods).where(eq(paymentMethods.id, id));
    return row || undefined;
  }
  async createPaymentMethod(data: InsertPaymentMethod): Promise<PaymentMethod> {
    const [row] = await db.insert(paymentMethods).values(data).returning();
    return row;
  }
  async updatePaymentMethod(id: number, data: Partial<InsertPaymentMethod>): Promise<PaymentMethod | undefined> {
    const [row] = await db.update(paymentMethods).set(data).where(eq(paymentMethods.id, id)).returning();
    return row || undefined;
  }
  async deletePaymentMethod(id: number): Promise<void> {
    await db.delete(paymentMethods).where(eq(paymentMethods.id, id));
  }

  async getActualBillingDestinations(): Promise<ActualBillingDestination[]> {
    return db.select().from(actualBillingDestinations).orderBy(asc(actualBillingDestinations.sortOrder), asc(actualBillingDestinations.id));
  }
  async getActualBillingDestination(id: number): Promise<ActualBillingDestination | undefined> {
    const [row] = await db.select().from(actualBillingDestinations).where(eq(actualBillingDestinations.id, id));
    return row || undefined;
  }
  async createActualBillingDestination(data: InsertActualBillingDestination): Promise<ActualBillingDestination> {
    const [row] = await db.insert(actualBillingDestinations).values(data).returning();
    return row;
  }
  async updateActualBillingDestination(id: number, data: Partial<InsertActualBillingDestination>): Promise<ActualBillingDestination | undefined> {
    const [row] = await db.update(actualBillingDestinations).set(data).where(eq(actualBillingDestinations.id, id)).returning();
    return row || undefined;
  }
  async deleteActualBillingDestination(id: number): Promise<void> {
    await db.delete(actualBillingDestinations).where(eq(actualBillingDestinations.id, id));
  }

  async getBillingAccounts(): Promise<BillingAccount[]> {
    return db.select().from(billingAccounts);
  }
  async getBillingAccount(id: number): Promise<BillingAccount | undefined> {
    const [row] = await db.select().from(billingAccounts).where(eq(billingAccounts.id, id));
    return row || undefined;
  }
  async createBillingAccount(data: InsertBillingAccount): Promise<BillingAccount> {
    const [row] = await db.insert(billingAccounts).values(data).returning();
    return row;
  }
  async updateBillingAccount(id: number, data: Partial<InsertBillingAccount>): Promise<BillingAccount | undefined> {
    const [row] = await db.update(billingAccounts).set(data).where(eq(billingAccounts.id, id)).returning();
    return row || undefined;
  }
  async deleteBillingAccount(id: number): Promise<void> {
    await db.delete(billingAccounts).where(eq(billingAccounts.id, id));
  }

  async getExchangeRates(): Promise<ExchangeRate[]> {
    return db.select().from(exchangeRates);
  }
  async getExchangeRate(id: number): Promise<ExchangeRate | undefined> {
    const [row] = await db.select().from(exchangeRates).where(eq(exchangeRates.id, id));
    return row || undefined;
  }
  async getExchangeRateByCurrency(currency: string): Promise<ExchangeRate | undefined> {
    const [row] = await db.select().from(exchangeRates).where(eq(exchangeRates.currency, currency));
    return row || undefined;
  }
  async createExchangeRate(data: InsertExchangeRate): Promise<ExchangeRate> {
    const [row] = await db.insert(exchangeRates).values(data).returning();
    return row;
  }
  async updateExchangeRate(id: number, data: Partial<InsertExchangeRate>): Promise<ExchangeRate | undefined> {
    const [row] = await db.update(exchangeRates).set(data).where(eq(exchangeRates.id, id)).returning();
    return row || undefined;
  }
  async deleteExchangeRate(id: number): Promise<void> {
    await db.delete(exchangeRates).where(eq(exchangeRates.id, id));
  }

  async getServiceGroups(): Promise<ServiceGroup[]> {
    return db.select().from(serviceGroups).orderBy(asc(serviceGroups.sortOrder), asc(serviceGroups.id));
  }
  async getServiceGroup(id: number): Promise<ServiceGroup | undefined> {
    const [row] = await db.select().from(serviceGroups).where(eq(serviceGroups.id, id));
    return row || undefined;
  }
  async createServiceGroup(data: InsertServiceGroup): Promise<ServiceGroup> {
    const [row] = await db.insert(serviceGroups).values(data).returning();
    return row;
  }
  async updateServiceGroup(id: number, data: Partial<InsertServiceGroup>): Promise<ServiceGroup | undefined> {
    const [row] = await db.update(serviceGroups).set(data).where(eq(serviceGroups.id, id)).returning();
    return row || undefined;
  }
  async deleteServiceGroup(id: number): Promise<void> {
    await db.delete(serviceGroups).where(eq(serviceGroups.id, id));
  }

  async getSubscriptions(): Promise<Subscription[]> {
    return db.select().from(subscriptions);
  }
  async getSubscription(id: number): Promise<Subscription | undefined> {
    const [row] = await db.select().from(subscriptions).where(eq(subscriptions.id, id));
    return row || undefined;
  }
  async createSubscription(data: InsertSubscription): Promise<Subscription> {
    const managementId = (data.managementId as string | null | undefined) || generateSubId();
    const [row] = await db.insert(subscriptions).values({ ...data, managementId }).returning();
    return row;
  }
  async updateSubscription(id: number, data: Partial<InsertSubscription>): Promise<Subscription | undefined> {
    const { managementId: _ignored, ...safeData } = data as Partial<InsertSubscription> & { managementId?: unknown };
    const [row] = await db.update(subscriptions).set(safeData).where(eq(subscriptions.id, id)).returning();
    return row || undefined;
  }
  async deleteSubscription(id: number): Promise<void> {
    await db.delete(subscriptions).where(eq(subscriptions.id, id));
  }

  async advanceBillingDates(): Promise<number> {
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonthStartStr = `${thisMonthStart.getFullYear()}-${String(thisMonthStart.getMonth() + 1).padStart(2, "0")}-01`;

    const allSubs = await db.select().from(subscriptions);
    let updatedCount = 0;

    for (const sub of allSubs) {
      if (!sub.nextBillingDate) continue;
      if (sub.nextBillingDate >= thisMonthStartStr) continue;

      let current = new Date(sub.nextBillingDate + "T00:00:00");
      const cycle = sub.billingCycle;

      const addMonthsClamped = (d: Date, months: number): Date => {
        const day = d.getDate();
        const targetYear = d.getFullYear() + Math.floor((d.getMonth() + months) / 12);
        const targetMonth = (d.getMonth() + months) % 12;
        const lastDay = new Date(targetYear, targetMonth + 1, 0).getDate();
        return new Date(targetYear, targetMonth, Math.min(day, lastDay));
      };

      const advance = (d: Date): Date => {
        if (cycle === "monthly") {
          return addMonthsClamped(d, 1);
        } else if (cycle === "annual") {
          return addMonthsClamped(d, 12);
        } else {
          const match = cycle.match(/^(\d+)_(days|weeks|months|years)$/);
          if (match) {
            const num = parseInt(match[1]);
            switch (match[2]) {
              case "days": {
                const next = new Date(d);
                next.setDate(next.getDate() + num);
                return next;
              }
              case "weeks": {
                const next = new Date(d);
                next.setDate(next.getDate() + num * 7);
                return next;
              }
              case "months":
                return addMonthsClamped(d, num);
              case "years":
                return addMonthsClamped(d, num * 12);
            }
          }
        }
        return d;
      };

      let advanced = false;
      let iterations = 0;
      const maxIterations = 10000;
      while (iterations < maxIterations) {
        iterations++;
        const next = advance(current);
        const nextStr = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(next.getDate()).padStart(2, "0")}`;
        if (nextStr >= thisMonthStartStr) {
          current = next;
          advanced = true;
          break;
        }
        if (next.getTime() === current.getTime()) break;
        current = next;
      }

      if (advanced) {
        const newDateStr = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}-${String(current.getDate()).padStart(2, "0")}`;
        await db.update(subscriptions).set({ nextBillingDate: newDateStr }).where(eq(subscriptions.id, sub.id));
        updatedCount++;
      }
    }

    return updatedCount;
  }

  async restoreData(data: BackupPayload): Promise<void> {
    await db.transaction(async (tx) => {
      await tx.delete(subscriptions);
      await tx.delete(billingAccounts);
      await tx.delete(paymentMethods);
      await tx.delete(actualBillingDestinations);
      await tx.delete(categories);
      await tx.delete(serviceGroups);
      await tx.delete(exchangeRates);

      const pmMap = new Map<number, number>();
      for (const pm of data.paymentMethods) {
        const [row] = await tx.insert(paymentMethods).values({ name: pm.name, icon: pm.icon || "credit-card" }).returning();
        pmMap.set(pm.id, row.id);
      }

      const abdMap = new Map<number, number>();
      for (const abd of data.actualBillingDestinations) {
        const [row] = await tx.insert(actualBillingDestinations).values({ name: abd.name, color: abd.color || "#10b981", sortOrder: abd.sortOrder ?? 0 }).returning();
        abdMap.set(abd.id, row.id);
      }

      const catMap = new Map<number, number>();
      for (const cat of data.categories) {
        const [row] = await tx.insert(categories).values({ name: cat.name, color: cat.color || "#3b82f6", icon: cat.icon || "folder", sortOrder: cat.sortOrder ?? 0 }).returning();
        catMap.set(cat.id, row.id);
      }

      const sgMap = new Map<number, number>();
      for (const sg of data.serviceGroups) {
        const [row] = await tx.insert(serviceGroups).values({ name: sg.name, color: sg.color || "#6366f1", sortOrder: sg.sortOrder ?? 0 }).returning();
        sgMap.set(sg.id, row.id);
      }

      const baMap = new Map<number, number>();
      for (const ba of data.billingAccounts) {
        const newPmId = pmMap.get(ba.paymentMethodId);
        if (!newPmId) continue;
        const newAbdId = ba.actualBillingDestinationId != null ? (abdMap.get(ba.actualBillingDestinationId) ?? null) : null;
        const [row] = await tx.insert(billingAccounts).values({ name: ba.name, paymentMethodId: newPmId, actualBillingDestinationId: newAbdId }).returning();
        baMap.set(ba.id, row.id);
      }

      for (const er of data.exchangeRates) {
        await tx.insert(exchangeRates).values({ currency: er.currency, rateToJpy: er.rateToJpy });
      }

      const usedMgmtIds = new Set<string>();
      for (const sub of data.subscriptions) {
        const newCatId = sub.categoryId != null ? (catMap.get(sub.categoryId) ?? null) : null;
        const newPmId = sub.paymentMethodId != null ? (pmMap.get(sub.paymentMethodId) ?? null) : null;
        const newBaId = sub.billingAccountId != null ? (baMap.get(sub.billingAccountId) ?? null) : null;
        const newSgId = sub.serviceGroupId != null ? (sgMap.get(sub.serviceGroupId) ?? null) : null;
        let managementId = sub.managementId || null;
        if (!managementId || usedMgmtIds.has(managementId)) {
          managementId = generateSubId();
        }
        usedMgmtIds.add(managementId);
        await tx.insert(subscriptions).values({
          managementId,
          serviceName: sub.serviceName,
          serviceUrl: sub.serviceUrl ?? null,
          planName: sub.planName ?? null,
          billerName: sub.billerName ?? null,
          amount: sub.amount,
          currency: sub.currency || "JPY",
          billingCycle: sub.billingCycle || "monthly",
          categoryId: newCatId,
          paymentMethodId: newPmId,
          billingAccountId: newBaId,
          serviceGroupId: newSgId,
          note: sub.note ?? null,
          nextBillingDate: sub.nextBillingDate ?? null,
          scheduledAmount: sub.scheduledAmount ?? null,
          scheduledDate: sub.scheduledDate ?? null,
          isActive: sub.isActive ?? 1,
        });
      }
    });
  }
}

export const storage = new DatabaseStorage();
