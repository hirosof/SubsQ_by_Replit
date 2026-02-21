import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, Layers, Wallet } from "lucide-react";
import type { Subscription, Category, ExchangeRate } from "@shared/schema";

function formatJpy(amount: number): string {
  return new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY", maximumFractionDigits: 0 }).format(amount);
}

function formatCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("ja-JP", { style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function getRate(currency: string, rates: ExchangeRate[]): number {
  if (currency === "JPY") return 1;
  const found = rates.find(r => r.currency === currency);
  return found ? found.rateToJpy : 0;
}

function toMonthlyMultiplier(cycle: string): number {
  if (cycle === "monthly") return 1;
  if (cycle === "annual") return 1 / 12;
  const match = cycle.match(/^(\d+)_(days|weeks|months|years)$/);
  if (match) {
    const num = parseInt(match[1]);
    switch (match[2]) {
      case "days": return 30 / num;
      case "weeks": return 4.33 / num;
      case "months": return 1 / num;
      case "years": return 1 / (num * 12);
    }
  }
  return 1;
}

function monthlyJpy(sub: Subscription, rates: ExchangeRate[]): number {
  const rate = getRate(sub.currency, rates);
  return sub.amount * rate * toMonthlyMultiplier(sub.billingCycle);
}

const unitLabels: Record<string, string> = {
  days: "日", weeks: "週", months: "ヶ月", years: "年",
};

function getCycleDisplayLabel(cycle: string): string {
  if (cycle === "monthly") return "月額";
  if (cycle === "annual") return "年額";
  const match = cycle.match(/^(\d+)_(days|weeks|months|years)$/);
  if (match) return `${match[1]}${unitLabels[match[2]] || match[2]}ごと`;
  return cycle;
}

export default function Dashboard() {
  const { data: subscriptions, isLoading: subsLoading } = useQuery<Subscription[]>({
    queryKey: ["/api/subscriptions"],
  });
  const { data: categories, isLoading: catsLoading } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });
  const { data: exchangeRates, isLoading: ratesLoading } = useQuery<ExchangeRate[]>({
    queryKey: ["/api/exchange-rates"],
  });

  const isLoading = subsLoading || catsLoading || ratesLoading;
  const rates = exchangeRates || [];
  const activeSubs = subscriptions?.filter(s => s.isActive === 1) || [];

  const totalMonthlyJpy = activeSubs.reduce((sum, s) => sum + monthlyJpy(s, rates), 0);
  const totalAnnualJpy = totalMonthlyJpy * 12;

  const categorySummary = categories?.map(cat => {
    const subs = activeSubs.filter(s => s.categoryId === cat.id);
    const monthly = subs.reduce((sum, s) => sum + monthlyJpy(s, rates), 0);
    return { ...cat, count: subs.length, monthlyJpy: monthly };
  }).filter(c => c.count > 0) || [];

  const uncategorized = activeSubs.filter(s => !s.categoryId);
  const uncategorizedMonthly = uncategorized.reduce((sum, s) => sum + monthlyJpy(s, rates), 0);

  const currencyBreakdown: Record<string, { total: number; monthlyJpy: number }> = {};
  activeSubs.forEach(s => {
    const monthlyOriginal = s.amount * toMonthlyMultiplier(s.billingCycle);
    if (!currencyBreakdown[s.currency]) {
      currencyBreakdown[s.currency] = { total: 0, monthlyJpy: 0 };
    }
    currencyBreakdown[s.currency].total += monthlyOriginal;
    currencyBreakdown[s.currency].monthlyJpy += monthlyJpy(s, rates);
  });

  const missingRates = activeSubs
    .filter(s => s.currency !== "JPY" && getRate(s.currency, rates) === 0)
    .map(s => s.currency)
    .filter((v, i, a) => a.indexOf(v) === i);

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardHeader className="pb-2"><Skeleton className="h-4 w-24" /></CardHeader>
              <CardContent><Skeleton className="h-8 w-32" /></CardContent>
            </Card>
          ))}
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full rounded-md" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" data-testid="text-dashboard-title">ダッシュボード</h1>
        <p className="text-muted-foreground text-sm mt-1">サブスクリプションの全体像を把握できます</p>
      </div>

      {missingRates.length > 0 && (
        <Card className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="py-3 text-sm text-amber-800 dark:text-amber-200">
            以下の通貨の為替レートが未設定です: <strong>{missingRates.join(", ")}</strong>。「為替レート」ページで設定してください。
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">月額合計（日本円）</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-monthly-total">{formatJpy(totalMonthlyJpy)}</div>
            <p className="text-xs text-muted-foreground mt-1">有効なサブスク {activeSubs.length} 件</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">年額合計（日本円）</CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-annual-total">{formatJpy(totalAnnualJpy)}</div>
            <p className="text-xs text-muted-foreground mt-1">月額を12倍した概算</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">通貨別内訳</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {Object.entries(currencyBreakdown).map(([cur, data]) => (
                <div key={cur} className="flex items-center justify-between gap-1 text-sm">
                  <Badge variant="secondary" className="text-xs">{cur}</Badge>
                  <span className="font-medium">{formatCurrency(data.total, cur)}/月</span>
                </div>
              ))}
              {Object.keys(currencyBreakdown).length === 0 && (
                <p className="text-sm text-muted-foreground">まだサブスクがありません</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3">カテゴリ別コスト</h2>
        {categorySummary.length === 0 && uncategorized.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <Layers className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p>サブスクリプションを追加するとカテゴリ別の内訳が表示されます</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {categorySummary.map(cat => (
              <Card key={cat.id} className="hover-elevate">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                      <span className="font-medium truncate" data-testid={`text-category-name-${cat.id}`}>{cat.name}</span>
                      <Badge variant="secondary" className="text-xs">{cat.count}件</Badge>
                    </div>
                    <span className="font-bold whitespace-nowrap" data-testid={`text-category-cost-${cat.id}`}>{formatJpy(cat.monthlyJpy)}/月</span>
                  </div>
                  <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        backgroundColor: cat.color,
                        width: `${totalMonthlyJpy > 0 ? (cat.monthlyJpy / totalMonthlyJpy) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
            {uncategorized.length > 0 && (
              <Card className="hover-elevate">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-3 h-3 rounded-full flex-shrink-0 bg-muted-foreground/30" />
                      <span className="font-medium truncate text-muted-foreground">未分類</span>
                      <Badge variant="secondary" className="text-xs">{uncategorized.length}件</Badge>
                    </div>
                    <span className="font-bold whitespace-nowrap">{formatJpy(uncategorizedMonthly)}/月</span>
                  </div>
                  <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-muted-foreground/30 transition-all"
                      style={{ width: `${totalMonthlyJpy > 0 ? (uncategorizedMonthly / totalMonthlyJpy) * 100 : 0}%` }}
                    />
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>

      {activeSubs.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">サブスクリプション一覧</h2>
          <div className="space-y-2">
            {activeSubs.map(sub => {
              const cat = categories?.find(c => c.id === sub.categoryId);
              const amtJpy = sub.amount * getRate(sub.currency, rates);
              return (
                <Card key={sub.id} className="hover-elevate">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 min-w-0">
                        {cat && <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />}
                        <span className="font-medium" data-testid={`text-sub-name-${sub.id}`}>{sub.serviceName}</span>
                        {sub.planName && <span className="text-sm text-muted-foreground">({sub.planName})</span>}
                        <Badge variant="outline" className="text-xs">{getCycleDisplayLabel(sub.billingCycle)}</Badge>
                      </div>
                      <div className="flex items-center gap-3">
                        {sub.currency !== "JPY" && (
                          <span className="text-sm text-muted-foreground">{formatCurrency(sub.amount, sub.currency)}</span>
                        )}
                        <span className="font-bold" data-testid={`text-sub-jpy-${sub.id}`}>{formatJpy(amtJpy)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
