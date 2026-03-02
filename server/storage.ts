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
import { eq, asc } from "drizzle-orm";

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
    const [row] = await db.insert(subscriptions).values(data).returning();
    return row;
  }
  async updateSubscription(id: number, data: Partial<InsertSubscription>): Promise<Subscription | undefined> {
    const [row] = await db.update(subscriptions).set(data).where(eq(subscriptions.id, id)).returning();
    return row || undefined;
  }
  async deleteSubscription(id: number): Promise<void> {
    await db.delete(subscriptions).where(eq(subscriptions.id, id));
  }
}

export const storage = new DatabaseStorage();
