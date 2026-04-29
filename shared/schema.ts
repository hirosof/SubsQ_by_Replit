export * from "./models/auth";
import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, real, serial, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  color: text("color").notNull().default("#3b82f6"),
  icon: text("icon").notNull().default("folder"),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const categoriesRelations = relations(categories, ({ many }) => ({
  subscriptions: many(subscriptions),
}));

export const paymentMethods = pgTable("payment_methods", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  icon: text("icon").notNull().default("credit-card"),
});

export const paymentMethodsRelations = relations(paymentMethods, ({ many }) => ({
  billingAccounts: many(billingAccounts),
  subscriptions: many(subscriptions),
}));

export const actualBillingDestinations = pgTable("actual_billing_destinations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  color: text("color").notNull().default("#10b981"),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const actualBillingDestinationsRelations = relations(actualBillingDestinations, ({ many }) => ({
  billingAccounts: many(billingAccounts),
}));

export const billingAccounts = pgTable("billing_accounts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  paymentMethodId: integer("payment_method_id").notNull().references(() => paymentMethods.id, { onDelete: "cascade" }),
  actualBillingDestinationId: integer("actual_billing_destination_id").references(() => actualBillingDestinations.id, { onDelete: "set null" }),
});

export const billingAccountsRelations = relations(billingAccounts, ({ one, many }) => ({
  paymentMethod: one(paymentMethods, {
    fields: [billingAccounts.paymentMethodId],
    references: [paymentMethods.id],
  }),
  actualBillingDestination: one(actualBillingDestinations, {
    fields: [billingAccounts.actualBillingDestinationId],
    references: [actualBillingDestinations.id],
  }),
  subscriptions: many(subscriptions),
}));

export const serviceGroups = pgTable("service_groups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  color: text("color").notNull().default("#6366f1"),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const serviceGroupsRelations = relations(serviceGroups, ({ many }) => ({
  subscriptions: many(subscriptions),
}));

export const exchangeRates = pgTable("exchange_rates", {
  id: serial("id").primaryKey(),
  currency: text("currency").notNull().unique(),
  rateToJpy: real("rate_to_jpy").notNull(),
});

export const insertExchangeRateSchema = createInsertSchema(exchangeRates).omit({ id: true });
export type ExchangeRate = typeof exchangeRates.$inferSelect;
export type InsertExchangeRate = z.infer<typeof insertExchangeRateSchema>;

export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  managementId: text("management_id").unique(),
  serviceName: text("service_name").notNull(),
  serviceUrl: text("service_url"),
  planName: text("plan_name"),
  billerName: text("biller_name"),
  amount: real("amount").notNull(),
  currency: text("currency").notNull().default("JPY"),
  billingCycle: text("billing_cycle").notNull().default("monthly"),
  categoryId: integer("category_id").references(() => categories.id, { onDelete: "set null" }),
  paymentMethodId: integer("payment_method_id").references(() => paymentMethods.id, { onDelete: "set null" }),
  billingAccountId: integer("billing_account_id").references(() => billingAccounts.id, { onDelete: "set null" }),
  serviceGroupId: integer("service_group_id").references(() => serviceGroups.id, { onDelete: "set null" }),
  note: text("note"),
  nextBillingDate: date("next_billing_date"),
  scheduledAmount: real("scheduled_amount"),
  scheduledDate: date("scheduled_date"),
  isActive: integer("is_active").notNull().default(1),
});

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  category: one(categories, {
    fields: [subscriptions.categoryId],
    references: [categories.id],
  }),
  paymentMethod: one(paymentMethods, {
    fields: [subscriptions.paymentMethodId],
    references: [paymentMethods.id],
  }),
  billingAccount: one(billingAccounts, {
    fields: [subscriptions.billingAccountId],
    references: [billingAccounts.id],
  }),
  serviceGroup: one(serviceGroups, {
    fields: [subscriptions.serviceGroupId],
    references: [serviceGroups.id],
  }),
}));

export const insertCategorySchema = createInsertSchema(categories).omit({ id: true });
export const insertPaymentMethodSchema = createInsertSchema(paymentMethods).omit({ id: true });
export const insertActualBillingDestinationSchema = createInsertSchema(actualBillingDestinations).omit({ id: true });
export const insertBillingAccountSchema = createInsertSchema(billingAccounts).omit({ id: true });
export const insertServiceGroupSchema = createInsertSchema(serviceGroups).omit({ id: true });
export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({ id: true, managementId: true });

export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type PaymentMethod = typeof paymentMethods.$inferSelect;
export type InsertPaymentMethod = z.infer<typeof insertPaymentMethodSchema>;
export type ActualBillingDestination = typeof actualBillingDestinations.$inferSelect;
export type InsertActualBillingDestination = z.infer<typeof insertActualBillingDestinationSchema>;
export type BillingAccount = typeof billingAccounts.$inferSelect;
export type InsertBillingAccount = z.infer<typeof insertBillingAccountSchema>;
export type ServiceGroup = typeof serviceGroups.$inferSelect;
export type InsertServiceGroup = z.infer<typeof insertServiceGroupSchema>;
export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
