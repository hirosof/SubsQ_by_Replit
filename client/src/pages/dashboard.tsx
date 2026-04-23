import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, Layers, Wallet, CreditCard, ChevronDown, ChevronRight, ExternalLink, Group, CalendarClock, Check, Target } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import type { Subscription, Category, ExchangeRate, PaymentMethod, BillingAccount, ServiceGroup, ActualBillingDestination } from "@shared/schema";
import { getCurrencyLabel } from "@/lib/currency";

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


type PaymentMethodSummary = PaymentMethod & {
  count: number;
  monthlyJpy: number;
  billingBreakdown: (BillingAccount & { count: number; monthlyJpy: number })[];
  unassignedCount: number;
  unassignedMonthly: number;
};

function PaymentMethodCard({ pm, totalMonthlyJpy, hasBillingBreakdown, onNavigate, onNavigateBa }: { pm: PaymentMethodSummary; totalMonthlyJpy: number; hasBillingBreakdown: boolean; onNavigate: () => void; onNavigateBa: (baId: number | null) => void }) {
  const [open, setOpen] = useState(false);

  const cardContent = (
    <>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {hasBillingBreakdown && (
            open ? <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          )}
          <CreditCard className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <span className="font-medium truncate" data-testid={`text-pm-name-${pm.id}`}>{pm.name}</span>
          <Badge variant="secondary" className="text-xs">{pm.count}件</Badge>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="font-bold whitespace-nowrap" data-testid={`text-pm-cost-${pm.id}`}>{formatJpy(pm.monthlyJpy)}/月</span>
          <span
            role="link"
            onClick={(e) => { e.stopPropagation(); onNavigate(); }}
            className="p-1 rounded hover:bg-muted transition-colors cursor-pointer"
            title="サブスク一覧を表示"
            data-testid={`link-pm-subs-${pm.id}`}
          >
            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
          </span>
        </div>
      </div>
      <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${totalMonthlyJpy > 0 ? (pm.monthlyJpy / totalMonthlyJpy) * 100 : 0}%` }}
        />
      </div>
    </>
  );

  if (!hasBillingBreakdown) {
    return (
      <Card className="hover-elevate">
        <CardContent className="p-4">{cardContent}</CardContent>
      </Card>
    );
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className="hover-elevate">
        <CardContent className="p-4">
          <CollapsibleTrigger asChild>
            <button className="w-full text-left cursor-pointer" data-testid={`btn-pm-expand-${pm.id}`}>{cardContent}</button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-3 pl-6 space-y-1 border-l-2 border-muted ml-2">
              {pm.billingBreakdown.map(ba => (
                <div
                  key={ba.id}
                  className="flex items-center justify-between gap-2 text-sm rounded-md px-2 py-1.5 hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => onNavigateBa(ba.id)}
                  data-testid={`row-ba-${ba.id}`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="truncate text-muted-foreground" data-testid={`text-ba-name-${ba.id}`}>{ba.name}</span>
                    <Badge variant="outline" className="text-xs">{ba.count}件</Badge>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="font-semibold whitespace-nowrap" data-testid={`text-ba-cost-${ba.id}`}>{formatJpy(ba.monthlyJpy)}/月</span>
                    <ExternalLink className="h-3 w-3 text-muted-foreground" />
                  </div>
                </div>
              ))}
              {pm.unassignedCount > 0 && (
                <div
                  className="flex items-center justify-between gap-2 text-sm rounded-md px-2 py-1.5 hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => onNavigateBa(null)}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="truncate text-muted-foreground">請求先未設定</span>
                    <Badge variant="outline" className="text-xs">{pm.unassignedCount}件</Badge>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="font-semibold whitespace-nowrap">{formatJpy(pm.unassignedMonthly)}/月</span>
                    <ExternalLink className="h-3 w-3 text-muted-foreground" />
                  </div>
                </div>
              )}
            </div>
          </CollapsibleContent>
        </CardContent>
      </Card>
    </Collapsible>
  );
}

type AbdSummary = ActualBillingDestination & {
  count: number;
  monthlyJpy: number;
  breakdown: (BillingAccount & { pmName: string; count: number; monthlyJpy: number })[];
};

function AbdCard({ abd, totalMonthlyJpy, hasBreakdown, onNavigate }: { abd: AbdSummary; totalMonthlyJpy: number; hasBreakdown: boolean; onNavigate: () => void }) {
  const [open, setOpen] = useState(false);

  const cardContent = (
    <>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {hasBreakdown && (
            open ? <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          )}
          <Target className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <span className="font-medium truncate" data-testid={`text-abd-name-${abd.id}`}>{abd.name}</span>
          <Badge variant="secondary" className="text-xs">{abd.count}件</Badge>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="font-bold whitespace-nowrap" data-testid={`text-abd-cost-${abd.id}`}>{formatJpy(abd.monthlyJpy)}/月</span>
          <span
            role="link"
            onClick={(e) => { e.stopPropagation(); onNavigate(); }}
            className="p-1 rounded hover:bg-muted transition-colors cursor-pointer"
            title="サブスク一覧を表示"
            data-testid={`link-abd-subs-${abd.id}`}
          >
            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
          </span>
        </div>
      </div>
      <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{
            backgroundColor: abd.color,
            width: `${totalMonthlyJpy > 0 ? (abd.monthlyJpy / totalMonthlyJpy) * 100 : 0}%`,
          }}
        />
      </div>
    </>
  );

  if (!hasBreakdown) {
    return (
      <Card className="hover-elevate">
        <CardContent className="p-4">{cardContent}</CardContent>
      </Card>
    );
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className="hover-elevate">
        <CardContent className="p-4">
          <CollapsibleTrigger asChild>
            <button className="w-full text-left cursor-pointer" data-testid={`btn-abd-expand-${abd.id}`}>{cardContent}</button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-3 pl-6 space-y-1 border-l-2 border-muted ml-2">
              {abd.breakdown.map(ba => (
                <div
                  key={ba.id}
                  className="flex items-center justify-between gap-2 text-sm rounded-md px-2 py-1.5 hover:bg-muted/50 transition-colors"
                  data-testid={`row-abd-ba-${ba.id}`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="truncate text-muted-foreground">{ba.pmName} / {ba.name}</span>
                    <Badge variant="outline" className="text-xs">{ba.count}件</Badge>
                  </div>
                  <span className="font-semibold whitespace-nowrap flex-shrink-0">{formatJpy(ba.monthlyJpy)}/月</span>
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </CardContent>
      </Card>
    </Collapsible>
  );
}

function scheduledDateClass(dateStr: string | null): string {
  if (!dateStr) return "text-muted-foreground";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00");
  const days = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (days < 0) return "text-red-500 dark:text-red-400 font-medium";
  if (days <= 3) return "text-amber-600 dark:text-amber-400 font-medium";
  if (days <= 7) return "text-amber-500 dark:text-amber-400";
  return "text-blue-600 dark:text-blue-400";
}

export default function Dashboard() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [actualMonthOpen, setActualMonthOpen] = useState(true);
  const [actualNextMonthOpen, setActualNextMonthOpen] = useState(true);
  const { data: subscriptions, isLoading: subsLoading } = useQuery<Subscription[]>({
    queryKey: ["/api/subscriptions"],
  });
  const { data: categories, isLoading: catsLoading } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });
  const { data: exchangeRates, isLoading: ratesLoading } = useQuery<ExchangeRate[]>({
    queryKey: ["/api/exchange-rates"],
  });
  const { data: paymentMethods, isLoading: pmLoading } = useQuery<PaymentMethod[]>({
    queryKey: ["/api/payment-methods"],
  });
  const { data: billingAccounts, isLoading: baLoading } = useQuery<BillingAccount[]>({
    queryKey: ["/api/billing-accounts"],
  });
  const { data: serviceGroups, isLoading: sgLoading } = useQuery<ServiceGroup[]>({
    queryKey: ["/api/service-groups"],
  });
  const { data: actualBillingDestinations, isLoading: abdLoading } = useQuery<ActualBillingDestination[]>({
    queryKey: ["/api/actual-billing-destinations"],
  });

  const applyScheduledMutation = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/subscriptions/${id}/apply-scheduled`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions"] });
      toast({ title: "価格変更を適用しました" });
    },
    onError: (e: Error) => toast({ title: "エラー", description: e.message, variant: "destructive" }),
  });

  const advanceBillingMutation = useMutation<{ count: number }, Error>({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/subscriptions/advance-billing-dates", {});
      return res.json() as Promise<{ count: number }>;
    },
    onSuccess: (data) => {
      if (data.count > 0) {
        queryClient.invalidateQueries({ queryKey: ["/api/subscriptions"] });
      }
    },
  });

  useEffect(() => {
    advanceBillingMutation.mutate();
  }, []);

  const isLoading = subsLoading || catsLoading || ratesLoading || pmLoading || baLoading || sgLoading || abdLoading;
  const rates = exchangeRates || [];
  const activeSubs = subscriptions?.filter(s => s.isActive === 1) || [];

  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const nextMonthEnd = new Date(now.getFullYear(), now.getMonth() + 2, 0);

  const isShorterThanMonthly = (cycle: string): boolean => {
    const match = cycle.match(/^(\d+)_(days|weeks)$/);
    return match !== null;
  };

  const getCycleIntervalDays = (cycle: string): number => {
    const match = cycle.match(/^(\d+)_(days|weeks)$/);
    if (!match) return 0;
    const num = parseInt(match[1]);
    return match[2] === "days" ? num : num * 7;
  };

  const countOccurrencesInMonth = (nextBillingDate: string, billingCycle: string, monthStart: Date, monthEnd: Date): number => {
    const intervalDays = getCycleIntervalDays(billingCycle);
    if (intervalDays === 0) return 1;
    const intervalMs = intervalDays * 24 * 60 * 60 * 1000;
    let current = new Date(nextBillingDate + "T00:00:00");
    if (current > monthEnd) return 0;
    if (current < monthStart) {
      const diff = monthStart.getTime() - current.getTime();
      const steps = Math.ceil(diff / intervalMs);
      current = new Date(current.getTime() + steps * intervalMs);
    }
    let count = 0;
    while (current <= monthEnd) {
      count++;
      current = new Date(current.getTime() + intervalMs);
    }
    return count;
  };

  const thisMonthActualJpy = (sub: typeof activeSubs[0]): number => {
    if (isShorterThanMonthly(sub.billingCycle) && sub.nextBillingDate) {
      const count = countOccurrencesInMonth(sub.nextBillingDate, sub.billingCycle, thisMonthStart, thisMonthEnd);
      return sub.amount * getRate(sub.currency, rates) * count;
    }
    return monthlyJpy(sub, rates);
  };

  const totalMonthlyJpy = activeSubs.reduce((sum, s) => sum + thisMonthActualJpy(s), 0);
  const totalAnnualJpy = totalMonthlyJpy * 12;

  const categorySummary = categories?.map(cat => {
    const subs = activeSubs.filter(s => s.categoryId === cat.id);
    const monthly = subs.reduce((sum, s) => sum + thisMonthActualJpy(s), 0);
    return { ...cat, count: subs.length, monthlyJpy: monthly };
  }).filter(c => c.count > 0) || [];

  const uncategorized = activeSubs.filter(s => !s.categoryId);
  const uncategorizedMonthly = uncategorized.reduce((sum, s) => sum + thisMonthActualJpy(s), 0);

  const currencyBreakdown: Record<string, { total: number; monthlyJpy: number }> = {};
  activeSubs.forEach(s => {
    const monthlyOriginal = isShorterThanMonthly(s.billingCycle) && s.nextBillingDate
      ? s.amount * countOccurrencesInMonth(s.nextBillingDate, s.billingCycle, thisMonthStart, thisMonthEnd)
      : s.amount * toMonthlyMultiplier(s.billingCycle);
    if (!currencyBreakdown[s.currency]) {
      currencyBreakdown[s.currency] = { total: 0, monthlyJpy: 0 };
    }
    currencyBreakdown[s.currency].total += monthlyOriginal;
    currencyBreakdown[s.currency].monthlyJpy += thisMonthActualJpy(s);
  });

  const paymentMethodSummary = (paymentMethods || []).map(pm => {
    const subs = activeSubs.filter(s => s.paymentMethodId === pm.id);
    const monthly = subs.reduce((sum, s) => sum + thisMonthActualJpy(s), 0);
    const pmBillingAccounts = (billingAccounts || []).filter(ba => ba.paymentMethodId === pm.id);
    const billingBreakdown = pmBillingAccounts.map(ba => {
      const baSubs = subs.filter(s => s.billingAccountId === ba.id);
      const baMonthly = baSubs.reduce((sum, s) => sum + thisMonthActualJpy(s), 0);
      return { ...ba, count: baSubs.length, monthlyJpy: baMonthly };
    }).filter(b => b.count > 0);
    const unassignedSubs = subs.filter(s => !s.billingAccountId);
    const unassignedMonthly = unassignedSubs.reduce((sum, s) => sum + thisMonthActualJpy(s), 0);
    return { ...pm, count: subs.length, monthlyJpy: monthly, billingBreakdown, unassignedCount: unassignedSubs.length, unassignedMonthly };
  }).filter(pm => pm.count > 0);

  const noPaymentMethodSubs = activeSubs.filter(s => !s.paymentMethodId);
  const noPaymentMethodMonthly = noPaymentMethodSubs.reduce((sum, s) => sum + thisMonthActualJpy(s), 0);

  const serviceGroupSummary = (serviceGroups || []).map(sg => {
    const subs = activeSubs.filter(s => s.serviceGroupId === sg.id);
    const monthly = subs.reduce((sum, s) => sum + thisMonthActualJpy(s), 0);
    return { ...sg, count: subs.length, monthlyJpy: monthly };
  }).filter(g => g.count > 0);

  const noGroupSubs = activeSubs.filter(s => !s.serviceGroupId);
  const noGroupMonthly = noGroupSubs.reduce((sum, s) => sum + thisMonthActualJpy(s), 0);

  const abdSummary = (actualBillingDestinations || []).map(abd => {
    const linkedBaIds = (billingAccounts || []).filter(ba => ba.actualBillingDestinationId === abd.id).map(ba => ba.id);
    const subs = activeSubs.filter(s => s.billingAccountId && linkedBaIds.includes(s.billingAccountId));
    const monthly = subs.reduce((sum, s) => sum + thisMonthActualJpy(s), 0);
    const breakdown = (billingAccounts || []).filter(ba => ba.actualBillingDestinationId === abd.id).map(ba => {
      const pm = (paymentMethods || []).find(p => p.id === ba.paymentMethodId);
      const baSubs = subs.filter(s => s.billingAccountId === ba.id);
      const baMonthly = baSubs.reduce((sum, s) => sum + thisMonthActualJpy(s), 0);
      return { ...ba, pmName: pm?.name || "", count: baSubs.length, monthlyJpy: baMonthly };
    }).filter(b => b.count > 0);
    return { ...abd, count: subs.length, monthlyJpy: monthly, breakdown };
  }).filter(a => a.count > 0);

  const missingRates = activeSubs
    .filter(s => s.currency !== "JPY" && getRate(s.currency, rates) === 0)
    .map(s => s.currency)
    .filter((v, i, a) => a.indexOf(v) === i);

  const isLongerThanMonthly = (cycle: string): boolean => {
    if (cycle === "monthly") return false;
    if (cycle === "annual") return true;
    const match = cycle.match(/^(\d+)_(days|weeks|months|years)$/);
    if (!match) return false;
    const num = parseInt(match[1]);
    switch (match[2]) {
      case "days": return false;
      case "weeks": return false;
      case "months": return num > 1;
      case "years": return true;
    }
    return false;
  };

  const toDate = (s: string) => new Date(s + "T00:00:00");

  const upcomingThisMonth = activeSubs.filter(s =>
    isLongerThanMonthly(s.billingCycle) && s.nextBillingDate &&
    toDate(s.nextBillingDate) >= thisMonthStart && toDate(s.nextBillingDate) <= thisMonthEnd
  ).sort((a, b) => (a.nextBillingDate || "").localeCompare(b.nextBillingDate || ""));

  const upcomingNextMonth = activeSubs.filter(s =>
    isLongerThanMonthly(s.billingCycle) && s.nextBillingDate &&
    toDate(s.nextBillingDate) >= nextMonthStart && toDate(s.nextBillingDate) <= nextMonthEnd
  ).sort((a, b) => (a.nextBillingDate || "").localeCompare(b.nextBillingDate || ""));

  const missingDateNonMonthlySubs = activeSubs.filter(s =>
    s.billingCycle !== "monthly" && !s.nextBillingDate
  );

  const thisMonthSubCounts = new Map<number, number>();

  const actualThisMonthSubs = activeSubs.filter(s => {
    if (s.billingCycle === "monthly") {
      thisMonthSubCounts.set(s.id, 1);
      return true;
    }
    if (!s.nextBillingDate) return false;
    if (isShorterThanMonthly(s.billingCycle)) {
      const count = countOccurrencesInMonth(s.nextBillingDate, s.billingCycle, thisMonthStart, thisMonthEnd);
      if (count > 0) {
        thisMonthSubCounts.set(s.id, count);
        return true;
      }
      return false;
    }
    const inMonth = toDate(s.nextBillingDate) >= thisMonthStart && toDate(s.nextBillingDate) <= thisMonthEnd;
    if (inMonth) thisMonthSubCounts.set(s.id, 1);
    return inMonth;
  }).sort((a, b) => {
    if (a.billingCycle === "monthly" && b.billingCycle !== "monthly") return -1;
    if (a.billingCycle !== "monthly" && b.billingCycle === "monthly") return 1;
    return (a.nextBillingDate || "").localeCompare(b.nextBillingDate || "");
  });

  const actualThisMonthTotal = actualThisMonthSubs.reduce(
    (sum, s) => sum + s.amount * getRate(s.currency, rates) * (thisMonthSubCounts.get(s.id) || 1), 0
  );

  const nextMonthSubCounts = new Map<number, number>();

  const actualNextMonthSubs = activeSubs.filter(s => {
    if (s.billingCycle === "monthly") {
      nextMonthSubCounts.set(s.id, 1);
      return true;
    }
    if (!s.nextBillingDate) return false;
    if (isShorterThanMonthly(s.billingCycle)) {
      const count = countOccurrencesInMonth(s.nextBillingDate, s.billingCycle, nextMonthStart, nextMonthEnd);
      if (count > 0) {
        nextMonthSubCounts.set(s.id, count);
        return true;
      }
      return false;
    }
    const inMonth = toDate(s.nextBillingDate) >= nextMonthStart && toDate(s.nextBillingDate) <= nextMonthEnd;
    if (inMonth) nextMonthSubCounts.set(s.id, 1);
    return inMonth;
  }).sort((a, b) => {
    if (a.billingCycle === "monthly" && b.billingCycle !== "monthly") return -1;
    if (a.billingCycle !== "monthly" && b.billingCycle === "monthly") return 1;
    return (a.nextBillingDate || "").localeCompare(b.nextBillingDate || "");
  });

  const actualNextMonthTotal = actualNextMonthSubs.reduce(
    (sum, s) => sum + s.amount * getRate(s.currency, rates) * (nextMonthSubCounts.get(s.id) || 1), 0
  );

  const scheduledChangeSubs = (subscriptions || []).filter(s => s.scheduledAmount != null).sort((a, b) => {
    const da = a.scheduledDate || "9999-12-31";
    const db = b.scheduledDate || "9999-12-31";
    return da.localeCompare(db);
  });

  const scheduledPast = scheduledChangeSubs.filter(s => {
    if (!s.scheduledDate) return false;
    return toDate(s.scheduledDate) < now;
  });
  const scheduledUpcoming = scheduledChangeSubs.filter(s => {
    if (!s.scheduledDate) return true;
    return toDate(s.scheduledDate) >= now;
  });

  const formatDateShort = (dateStr: string | null): string => {
    if (!dateStr) return "-";
    const d = toDate(dateStr);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  const formatDateFull = (dateStr: string | null): string => {
    if (!dateStr) return "日付未設定";
    const d = toDate(dateStr);
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
  };

  const getCycleLabel = (cycle: string): string => {
    if (cycle === "annual") return "年額";
    const match = cycle.match(/^(\d+)_(days|weeks|months|years)$/);
    if (match) {
      const num = parseInt(match[1]);
      const unitMap: Record<string, string> = { days: "日", weeks: "週", months: "ヶ月", years: "年" };
      return `${num}${unitMap[match[2]] || match[2]}ごと`;
    }
    return cycle;
  };

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
                  <Badge variant="secondary" className="text-xs">{getCurrencyLabel(cur)}</Badge>
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
              <Card key={cat.id} className="hover-elevate cursor-pointer" onClick={() => navigate(`/subscriptions?category=${cat.id}`)} data-testid={`card-category-${cat.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                      <span className="font-medium truncate" data-testid={`text-category-name-${cat.id}`}>{cat.name}</span>
                      <Badge variant="secondary" className="text-xs">{cat.count}件</Badge>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="font-bold whitespace-nowrap" data-testid={`text-category-cost-${cat.id}`}>{formatJpy(cat.monthlyJpy)}/月</span>
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
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
              <Card className="hover-elevate cursor-pointer" onClick={() => navigate(`/subscriptions?category=none`)} data-testid="card-category-uncategorized">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-3 h-3 rounded-full flex-shrink-0 bg-muted-foreground/30" />
                      <span className="font-medium truncate text-muted-foreground">未分類</span>
                      <Badge variant="secondary" className="text-xs">{uncategorized.length}件</Badge>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="font-bold whitespace-nowrap">{formatJpy(uncategorizedMonthly)}/月</span>
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
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

      <div>
        <h2 className="text-lg font-semibold mb-3">支払い方法別コスト</h2>
        {paymentMethodSummary.length === 0 && noPaymentMethodSubs.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <CreditCard className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p>サブスクリプションを追加すると支払い方法別の内訳が表示されます</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {paymentMethodSummary.map(pm => {
              const hasBillingBreakdown = pm.billingBreakdown.length > 0 || pm.unassignedCount > 0;
              return (
                <PaymentMethodCard
                  key={pm.id}
                  pm={pm}
                  totalMonthlyJpy={totalMonthlyJpy}
                  hasBillingBreakdown={hasBillingBreakdown}
                  onNavigate={() => navigate(`/subscriptions?paymentMethod=${pm.id}`)}
                  onNavigateBa={(baId) => navigate(`/subscriptions?paymentMethod=${pm.id}&billingAccount=${baId === null ? "none" : baId}`)}
                />
              );
            })}
            {noPaymentMethodSubs.length > 0 && (
              <Card className="hover-elevate cursor-pointer" onClick={() => navigate(`/subscriptions?paymentMethod=none`)} data-testid="card-pm-unset">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <CreditCard className="h-4 w-4 text-muted-foreground/50 flex-shrink-0" />
                      <span className="font-medium truncate text-muted-foreground">未設定</span>
                      <Badge variant="secondary" className="text-xs">{noPaymentMethodSubs.length}件</Badge>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="font-bold whitespace-nowrap">{formatJpy(noPaymentMethodMonthly)}/月</span>
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                  </div>
                  <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-muted-foreground/30 transition-all"
                      style={{ width: `${totalMonthlyJpy > 0 ? (noPaymentMethodMonthly / totalMonthlyJpy) * 100 : 0}%` }}
                    />
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>

      {abdSummary.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">最終請求先別コスト</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {abdSummary.map(abd => {
              const hasBreakdown = abd.breakdown.length > 1;
              return (
                <AbdCard
                  key={abd.id}
                  abd={abd}
                  totalMonthlyJpy={totalMonthlyJpy}
                  hasBreakdown={hasBreakdown}
                  onNavigate={() => navigate(`/subscriptions?actualBillingDestination=${abd.id}`)}
                />
              );
            })}
          </div>
        </div>
      )}

      {(serviceGroupSummary.length > 0 || noGroupSubs.length > 0) && (serviceGroups?.length || 0) > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">サービスグループ別コスト</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {serviceGroupSummary.map(sg => (
              <Card key={sg.id} className="hover-elevate cursor-pointer" onClick={() => navigate(`/subscriptions?serviceGroup=${sg.id}`)} data-testid={`card-service-group-${sg.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: sg.color }} />
                      <span className="font-medium truncate" data-testid={`text-sg-name-${sg.id}`}>{sg.name}</span>
                      <Badge variant="secondary" className="text-xs">{sg.count}件</Badge>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="font-bold whitespace-nowrap" data-testid={`text-sg-cost-${sg.id}`}>{formatJpy(sg.monthlyJpy)}/月</span>
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                  </div>
                  <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        backgroundColor: sg.color,
                        width: `${totalMonthlyJpy > 0 ? (sg.monthlyJpy / totalMonthlyJpy) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
            {noGroupSubs.length > 0 && (
              <Card className="hover-elevate cursor-pointer" onClick={() => navigate(`/subscriptions?serviceGroup=none`)} data-testid="card-sg-unset">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Group className="h-4 w-4 text-muted-foreground/50 flex-shrink-0" />
                      <span className="font-medium truncate text-muted-foreground">未設定</span>
                      <Badge variant="secondary" className="text-xs">{noGroupSubs.length}件</Badge>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="font-bold whitespace-nowrap">{formatJpy(noGroupMonthly)}/月</span>
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                  </div>
                  <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-muted-foreground/30 transition-all"
                      style={{ width: `${totalMonthlyJpy > 0 ? (noGroupMonthly / totalMonthlyJpy) * 100 : 0}%` }}
                    />
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {scheduledChangeSubs.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <CalendarClock className="h-5 w-5" />
              価格変更予定
            </h2>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={() => navigate("/subscriptions?scheduled=yes")}
              data-testid="button-navigate-scheduled-list"
            >
              一覧を見る
              <ExternalLink className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
          <div className="space-y-4">
            {scheduledPast.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-red-600 dark:text-red-400 mb-2">変更日を過ぎています</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {scheduledPast.map(sub => {
                    const cat = categories?.find(c => c.id === sub.categoryId);
                    return (
                      <Card key={sub.id} className="border-red-500/30" data-testid={`card-scheduled-past-${sub.id}`}>
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              {cat && <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />}
                              <span className="font-medium truncate text-sm">{sub.serviceName}</span>
                              {sub.planName && <span className="text-xs text-muted-foreground">({sub.planName})</span>}
                            </div>
                            <Button
                              size="sm"
                              variant="default"
                              className="flex-shrink-0"
                              onClick={() => applyScheduledMutation.mutate(sub.id)}
                              disabled={applyScheduledMutation.isPending}
                              data-testid={`button-apply-scheduled-dash-${sub.id}`}
                            >
                              <Check className="h-3 w-3 mr-1" />
                              適用
                            </Button>
                          </div>
                          <div className={`flex items-center justify-between mt-1 text-xs ${scheduledDateClass(sub.scheduledDate)}`}>
                            <span>{formatDateFull(sub.scheduledDate)} 〜</span>
                            <span>{formatCurrency(sub.amount, sub.currency)} → <strong>{formatCurrency(sub.scheduledAmount!, sub.currency)}</strong></span>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
            {scheduledUpcoming.length > 0 && (
              <div>
                {scheduledPast.length > 0 && <h3 className="text-sm font-medium text-muted-foreground mb-2">今後の予定</h3>}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {scheduledUpcoming.map(sub => {
                    const cat = categories?.find(c => c.id === sub.categoryId);
                    return (
                      <Card key={sub.id} className="hover-elevate" data-testid={`card-scheduled-upcoming-${sub.id}`}>
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              {cat && <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />}
                              <span className="font-medium truncate text-sm">{sub.serviceName}</span>
                              {sub.planName && <span className="text-xs text-muted-foreground">({sub.planName})</span>}
                            </div>
                            <Badge variant="outline" className={`text-xs ${scheduledDateClass(sub.scheduledDate)}`}>
                              {formatDateFull(sub.scheduledDate)}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between mt-1 text-xs text-muted-foreground">
                            <span>価格変更予定</span>
                            <span>{formatCurrency(sub.amount, sub.currency)} → <strong className="text-foreground">{formatCurrency(sub.scheduledAmount!, sub.currency)}</strong></span>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeSubs.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">今月の実請求予定（{now.getMonth() + 1}月）</h2>
          <Collapsible open={actualMonthOpen} onOpenChange={setActualMonthOpen}>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-2xl font-bold" data-testid="text-actual-month-total">{formatJpy(actualThisMonthTotal)}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{actualThisMonthSubs.length}件のサブスクが対象</div>
                  </div>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" data-testid="button-toggle-actual-month">
                      {actualMonthOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </Button>
                  </CollapsibleTrigger>
                </div>
                {missingDateNonMonthlySubs.length > 0 && (
                  <button
                    className="mt-3 w-full text-left text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md px-3 py-2 hover:bg-amber-100 dark:hover:bg-amber-950/50 transition-colors"
                    onClick={() => navigate("/subscriptions")}
                    data-testid="warning-missing-billing-date"
                  >
                    ⚠ {missingDateNonMonthlySubs.length}件は次回課金日が未設定のため含まれていません。クリックして設定する →
                  </button>
                )}
                <CollapsibleContent>
                  <div className="mt-3 space-y-1 border-t pt-3">
                    {actualThisMonthSubs.map(sub => {
                      const cat = categories?.find(c => c.id === sub.categoryId);
                      const count = thisMonthSubCounts.get(sub.id) || 1;
                      const jpyAmount = sub.amount * getRate(sub.currency, rates);
                      const totalJpyAmount = jpyAmount * count;
                      const isMonthly = sub.billingCycle === "monthly";
                      const isShort = isShorterThanMonthly(sub.billingCycle);
                      return (
                        <div key={sub.id} className="flex items-center justify-between gap-2 py-1.5 text-sm" data-testid={`row-actual-month-${sub.id}`}>
                          <div className="flex items-center gap-2 min-w-0">
                            {cat && <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />}
                            <span className="truncate">{sub.serviceName}</span>
                            {sub.planName && <span className="text-xs text-muted-foreground flex-shrink-0">({sub.planName})</span>}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {isMonthly ? (
                              <Badge variant="secondary" className="text-xs">月額</Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">{getCycleLabel(sub.billingCycle)}</span>
                            )}
                            {!isMonthly && sub.nextBillingDate && (
                              <Badge variant="outline" className="text-xs">{formatDateShort(sub.nextBillingDate)}</Badge>
                            )}
                            <span className="font-medium text-right">
                              {isShort ? (
                                <span className="flex flex-col items-end">
                                  <span data-testid={`text-actual-month-total-${sub.id}`}>{formatJpy(totalJpyAmount)}</span>
                                  <span className="text-xs text-muted-foreground font-normal" data-testid={`text-actual-month-breakdown-${sub.id}`}>
                                    {count}回 × {formatCurrency(sub.amount, sub.currency)}
                                    {sub.currency !== "JPY" && jpyAmount > 0 && ` (${formatJpy(jpyAmount)})`}
                                  </span>
                                </span>
                              ) : (
                                <>
                                  {formatCurrency(sub.amount, sub.currency)}
                                  {sub.currency !== "JPY" && jpyAmount > 0 && (
                                    <span className="text-xs text-muted-foreground ml-1">({formatJpy(jpyAmount)})</span>
                                  )}
                                </>
                              )}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CollapsibleContent>
              </CardContent>
            </Card>
          </Collapsible>
        </div>
      )}

      {activeSubs.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">来月の実請求予定（{nextMonthStart.getMonth() + 1}月）</h2>
          <Collapsible open={actualNextMonthOpen} onOpenChange={setActualNextMonthOpen}>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-2xl font-bold" data-testid="text-actual-next-month-total">{formatJpy(actualNextMonthTotal)}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{actualNextMonthSubs.length}件のサブスクが対象</div>
                  </div>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" data-testid="button-toggle-actual-next-month">
                      {actualNextMonthOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </Button>
                  </CollapsibleTrigger>
                </div>
                {missingDateNonMonthlySubs.length > 0 && (
                  <button
                    className="mt-3 w-full text-left text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md px-3 py-2 hover:bg-amber-100 dark:hover:bg-amber-950/50 transition-colors"
                    onClick={() => navigate("/subscriptions")}
                    data-testid="warning-missing-billing-date-next-month"
                  >
                    ⚠ {missingDateNonMonthlySubs.length}件は次回課金日が未設定のため含まれていません。クリックして設定する →
                  </button>
                )}
                <CollapsibleContent>
                  <div className="mt-3 space-y-1 border-t pt-3">
                    {actualNextMonthSubs.map(sub => {
                      const cat = categories?.find(c => c.id === sub.categoryId);
                      const count = nextMonthSubCounts.get(sub.id) || 1;
                      const jpyAmount = sub.amount * getRate(sub.currency, rates);
                      const totalJpyAmount = jpyAmount * count;
                      const isMonthly = sub.billingCycle === "monthly";
                      const isShort = isShorterThanMonthly(sub.billingCycle);
                      return (
                        <div key={sub.id} className="flex items-center justify-between gap-2 py-1.5 text-sm" data-testid={`row-actual-next-month-${sub.id}`}>
                          <div className="flex items-center gap-2 min-w-0">
                            {cat && <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />}
                            <span className="truncate">{sub.serviceName}</span>
                            {sub.planName && <span className="text-xs text-muted-foreground flex-shrink-0">({sub.planName})</span>}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {isMonthly ? (
                              <Badge variant="secondary" className="text-xs">月額</Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">{getCycleLabel(sub.billingCycle)}</span>
                            )}
                            {!isMonthly && sub.nextBillingDate && (
                              <Badge variant="outline" className="text-xs">{formatDateShort(sub.nextBillingDate)}</Badge>
                            )}
                            <span className="font-medium text-right">
                              {isShort ? (
                                <span className="flex flex-col items-end">
                                  <span data-testid={`text-actual-next-month-total-${sub.id}`}>{formatJpy(totalJpyAmount)}</span>
                                  <span className="text-xs text-muted-foreground font-normal" data-testid={`text-actual-next-month-breakdown-${sub.id}`}>
                                    {count}回 × {formatCurrency(sub.amount, sub.currency)}
                                    {sub.currency !== "JPY" && jpyAmount > 0 && ` (${formatJpy(jpyAmount)})`}
                                  </span>
                                </span>
                              ) : (
                                <>
                                  {formatCurrency(sub.amount, sub.currency)}
                                  {sub.currency !== "JPY" && jpyAmount > 0 && (
                                    <span className="text-xs text-muted-foreground ml-1">({formatJpy(jpyAmount)})</span>
                                  )}
                                </>
                              )}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CollapsibleContent>
              </CardContent>
            </Card>
          </Collapsible>
        </div>
      )}

      {(upcomingThisMonth.length > 0 || upcomingNextMonth.length > 0) && (
        <div>
          <h2 className="text-lg font-semibold mb-3">支払い予定（月額以外）</h2>
          <div className="space-y-4">
            {upcomingThisMonth.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">今月（{now.getMonth() + 1}月）</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {upcomingThisMonth.map(sub => {
                    const cat = categories?.find(c => c.id === sub.categoryId);
                    const jpyAmount = sub.amount * getRate(sub.currency, rates);
                    return (
                      <Card key={sub.id} className="hover-elevate cursor-pointer" onClick={() => navigate(`/subscriptions`)} data-testid={`card-upcoming-${sub.id}`}>
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              {cat && <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />}
                              <span className="font-medium truncate text-sm">{sub.serviceName}</span>
                              {sub.planName && <span className="text-xs text-muted-foreground">({sub.planName})</span>}
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <Badge variant="outline" className="text-xs">{formatDateShort(sub.nextBillingDate)}</Badge>
                            </div>
                          </div>
                          <div className="flex items-center justify-between mt-1 text-xs text-muted-foreground">
                            <span>{getCycleLabel(sub.billingCycle)}</span>
                            <span className="font-semibold text-foreground">{formatCurrency(sub.amount, sub.currency)}{sub.currency !== "JPY" && jpyAmount > 0 ? ` (${formatJpy(jpyAmount)})` : ""}</span>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
            {upcomingNextMonth.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">来月（{now.getMonth() + 2 > 12 ? 1 : now.getMonth() + 2}月）</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {upcomingNextMonth.map(sub => {
                    const cat = categories?.find(c => c.id === sub.categoryId);
                    const jpyAmount = sub.amount * getRate(sub.currency, rates);
                    return (
                      <Card key={sub.id} className="hover-elevate cursor-pointer" onClick={() => navigate(`/subscriptions`)} data-testid={`card-upcoming-next-${sub.id}`}>
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              {cat && <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />}
                              <span className="font-medium truncate text-sm">{sub.serviceName}</span>
                              {sub.planName && <span className="text-xs text-muted-foreground">({sub.planName})</span>}
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <Badge variant="outline" className="text-xs">{formatDateShort(sub.nextBillingDate)}</Badge>
                            </div>
                          </div>
                          <div className="flex items-center justify-between mt-1 text-xs text-muted-foreground">
                            <span>{getCycleLabel(sub.billingCycle)}</span>
                            <span className="font-semibold text-foreground">{formatCurrency(sub.amount, sub.currency)}{sub.currency !== "JPY" && jpyAmount > 0 ? ` (${formatJpy(jpyAmount)})` : ""}</span>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
