import { storage } from "./storage";

export async function seedDatabase() {
  const existingCategories = await storage.getCategories();
  if (existingCategories.length > 0) return;

  const devTools = await storage.createCategory({ name: "開発ツール", color: "#3b82f6", icon: "folder" });
  const entertainment = await storage.createCategory({ name: "エンタメ", color: "#ef4444", icon: "folder" });
  const productivity = await storage.createCategory({ name: "仕事効率化", color: "#22c55e", icon: "folder" });
  const cloud = await storage.createCategory({ name: "クラウド・インフラ", color: "#8b5cf6", icon: "folder" });

  const paypal = await storage.createPaymentMethod({ name: "PayPal", icon: "credit-card" });
  const visa = await storage.createPaymentMethod({ name: "クレジットカード", icon: "credit-card" });
  const appStore = await storage.createPaymentMethod({ name: "App Store", icon: "credit-card" });

  const paypalVisa = await storage.createBillingAccount({ name: "Visa ****4521", paymentMethodId: paypal.id });
  const paypalBank = await storage.createBillingAccount({ name: "銀行口座 (みずほ)", paymentMethodId: paypal.id });
  const visaMain = await storage.createBillingAccount({ name: "楽天カード ****7890", paymentMethodId: visa.id });

  await storage.createExchangeRate({ currency: "USD", rateToJpy: 150 });
  await storage.createExchangeRate({ currency: "EUR", rateToJpy: 163 });
  await storage.createExchangeRate({ currency: "GBP", rateToJpy: 190 });
  await storage.createExchangeRate({ currency: "KRW", rateToJpy: 0.11 });
  await storage.createExchangeRate({ currency: "CNY", rateToJpy: 21 });

  await storage.createSubscription({
    serviceName: "GitHub Copilot",
    planName: "Pro",
    amount: 10,
    currency: "USD",
    billingCycle: "monthly",
    categoryId: devTools.id,
    paymentMethodId: paypal.id,
    billingAccountId: paypalVisa.id,
    note: null,
    isActive: 1,
  });

  await storage.createSubscription({
    serviceName: "Netflix",
    planName: "スタンダード",
    amount: 1490,
    currency: "JPY",
    billingCycle: "monthly",
    categoryId: entertainment.id,
    paymentMethodId: visa.id,
    billingAccountId: visaMain.id,
    note: null,
    isActive: 1,
  });

  await storage.createSubscription({
    serviceName: "Notion",
    planName: "Plus",
    amount: 8,
    currency: "USD",
    billingCycle: "monthly",
    categoryId: productivity.id,
    paymentMethodId: paypal.id,
    billingAccountId: paypalBank.id,
    note: "チーム用ワークスペース",
    isActive: 1,
  });

  await storage.createSubscription({
    serviceName: "AWS",
    planName: "個人アカウント",
    amount: 25,
    currency: "USD",
    billingCycle: "monthly",
    categoryId: cloud.id,
    paymentMethodId: visa.id,
    billingAccountId: visaMain.id,
    note: "従量課金のため変動あり",
    isActive: 1,
  });

  await storage.createSubscription({
    serviceName: "Spotify",
    planName: "Premium",
    amount: 980,
    currency: "JPY",
    billingCycle: "monthly",
    categoryId: entertainment.id,
    paymentMethodId: appStore.id,
    billingAccountId: null,
    note: null,
    isActive: 1,
  });

  await storage.createSubscription({
    serviceName: "JetBrains",
    planName: "All Products Pack",
    amount: 249,
    currency: "USD",
    billingCycle: "annual",
    categoryId: devTools.id,
    paymentMethodId: paypal.id,
    billingAccountId: paypalVisa.id,
    note: null,
    isActive: 1,
  });

  console.log("Seed data inserted successfully");
}
