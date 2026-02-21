import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Filter, PackageOpen, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import type { Subscription, Category, PaymentMethod, BillingAccount, ExchangeRate, ServiceGroup } from "@shared/schema";
import { getCurrencyLabel } from "@/lib/currency";

type SortKey = "name" | "cycleAmount" | "monthly" | "annual" | "nextBilling";
type SortDir = "asc" | "desc";

const cycleSelectOptions = [
  { value: "monthly", label: "月額" },
  { value: "annual", label: "年額" },
  { value: "other", label: "その他" },
];

const cycleUnitOptions = [
  { value: "days", label: "日" },
  { value: "weeks", label: "週" },
  { value: "months", label: "ヶ月" },
  { value: "years", label: "年" },
];

const unitLabels: Record<string, string> = {
  days: "日", weeks: "週", months: "ヶ月", years: "年",
};

function isStandardCycle(cycle: string): boolean {
  return cycle === "monthly" || cycle === "annual";
}

function parseCustomCycle(cycle: string): { number: string; unit: string } | null {
  const match = cycle.match(/^(\d+)_(days|weeks|months|years)$/);
  if (match) return { number: match[1], unit: match[2] };
  return null;
}

function getCycleDisplayLabel(cycle: string): string {
  if (cycle === "monthly") return "月額";
  if (cycle === "annual") return "年額";
  const parsed = parseCustomCycle(cycle);
  if (parsed) {
    const unitLabel = unitLabels[parsed.unit] || parsed.unit;
    return `${parsed.number}${unitLabel}ごと`;
  }
  return cycle;
}

const commonCurrencies = ["JPY", "USD", "EUR", "GBP", "CNY", "KRW", "TWD", "AUD", "CAD", "CHF"];

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
  return sub.amount * getRate(sub.currency, rates) * toMonthlyMultiplier(sub.billingCycle);
}

function annualJpy(sub: Subscription, rates: ExchangeRate[]): number {
  return monthlyJpy(sub, rates) * 12;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00");
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function billingDateClass(dateStr: string | null): string {
  const days = daysUntil(dateStr);
  if (days === null) return "text-muted-foreground";
  if (days < 0) return "text-red-500 dark:text-red-400";
  if (days <= 3) return "text-amber-600 dark:text-amber-400 font-medium";
  if (days <= 7) return "text-amber-500 dark:text-amber-400";
  return "";
}

interface FormData {
  serviceName: string;
  planName: string;
  amount: string;
  currency: string;
  billingCycle: string;
  customCycleNumber: string;
  customCycleUnit: string;
  categoryId: string;
  paymentMethodId: string;
  billingAccountId: string;
  serviceGroupId: string;
  note: string;
  nextBillingDate: string;
  isActive: number;
}

const defaultForm: FormData = {
  serviceName: "", planName: "", amount: "", currency: "JPY",
  billingCycle: "monthly", customCycleNumber: "", customCycleUnit: "months", categoryId: "none", paymentMethodId: "none", billingAccountId: "none", serviceGroupId: "none", note: "", nextBillingDate: "", isActive: 1,
};

export default function Subscriptions() {
  const { toast } = useToast();
  const searchParams = new URLSearchParams(window.location.search);

  const [filterCategory, setFilterCategory] = useState<string>(searchParams.get("category") || "all");
  const [filterPaymentMethod, setFilterPaymentMethod] = useState<string>(searchParams.get("paymentMethod") || "all");
  const [filterBillingAccount, setFilterBillingAccount] = useState<string>(searchParams.get("billingAccount") || "all");
  const [filterServiceGroup, setFilterServiceGroup] = useState<string>(searchParams.get("serviceGroup") || "all");
  const [filterCurrency, setFilterCurrency] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("monthly");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSub, setEditingSub] = useState<Subscription | null>(null);
  const [form, setForm] = useState<FormData>(defaultForm);
  const [deleteTarget, setDeleteTarget] = useState<Subscription | null>(null);

  const { data: subscriptions, isLoading } = useQuery<Subscription[]>({ queryKey: ["/api/subscriptions"] });
  const { data: categories } = useQuery<Category[]>({ queryKey: ["/api/categories"] });
  const { data: paymentMethods } = useQuery<PaymentMethod[]>({ queryKey: ["/api/payment-methods"] });
  const { data: billingAccounts } = useQuery<BillingAccount[]>({ queryKey: ["/api/billing-accounts"] });
  const { data: serviceGroups } = useQuery<ServiceGroup[]>({ queryKey: ["/api/service-groups"] });
  const { data: exchangeRates } = useQuery<ExchangeRate[]>({ queryKey: ["/api/exchange-rates"] });

  const rates = exchangeRates || [];

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/subscriptions", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions"] });
      setDialogOpen(false);
      toast({ title: "サブスクリプションを追加しました" });
    },
    onError: (e: Error) => toast({ title: "エラー", description: e.message, variant: "destructive" }),
  });
  const updateMutation = useMutation({
    mutationFn: (data: any) => apiRequest("PATCH", `/api/subscriptions/${editingSub?.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions"] });
      setDialogOpen(false);
      setEditingSub(null);
      toast({ title: "サブスクリプションを更新しました" });
    },
    onError: (e: Error) => toast({ title: "エラー", description: e.message, variant: "destructive" }),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/subscriptions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions"] });
      setDeleteTarget(null);
      toast({ title: "サブスクリプションを削除しました" });
    },
    onError: (e: Error) => toast({ title: "エラー", description: e.message, variant: "destructive" }),
  });

  const openCreate = () => {
    setEditingSub(null);
    setForm(defaultForm);
    setDialogOpen(true);
  };
  const openEdit = (sub: Subscription) => {
    setEditingSub(sub);
    const standard = isStandardCycle(sub.billingCycle);
    const parsed = standard ? null : parseCustomCycle(sub.billingCycle);
    setForm({
      serviceName: sub.serviceName,
      planName: sub.planName || "",
      amount: String(sub.amount),
      currency: sub.currency,
      billingCycle: standard ? sub.billingCycle : "other",
      customCycleNumber: parsed ? parsed.number : (standard ? "" : "1"),
      customCycleUnit: parsed ? parsed.unit : (standard ? "months" : "months"),
      categoryId: sub.categoryId ? String(sub.categoryId) : "none",
      paymentMethodId: sub.paymentMethodId ? String(sub.paymentMethodId) : "none",
      billingAccountId: sub.billingAccountId ? String(sub.billingAccountId) : "none",
      serviceGroupId: sub.serviceGroupId ? String(sub.serviceGroupId) : "none",
      note: sub.note || "",
      nextBillingDate: sub.nextBillingDate || "",
      isActive: sub.isActive,
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    const amount = parseFloat(form.amount);
    if (!form.serviceName || isNaN(amount)) {
      toast({ title: "入力エラー", description: "サービス名と金額は必須です", variant: "destructive" });
      return;
    }
    let resolvedCycle = form.billingCycle;
    if (form.billingCycle === "other") {
      const num = parseInt(form.customCycleNumber);
      if (!num || num < 1) {
        toast({ title: "入力エラー", description: "課金サイクルの数値を1以上で入力してください", variant: "destructive" });
        return;
      }
      resolvedCycle = `${num}_${form.customCycleUnit}`;
    }
    const payload = {
      serviceName: form.serviceName,
      planName: form.planName || null,
      amount,
      currency: form.currency,
      billingCycle: resolvedCycle,
      categoryId: form.categoryId && form.categoryId !== "none" ? parseInt(form.categoryId) : null,
      paymentMethodId: form.paymentMethodId && form.paymentMethodId !== "none" ? parseInt(form.paymentMethodId) : null,
      billingAccountId: form.billingAccountId && form.billingAccountId !== "none" ? parseInt(form.billingAccountId) : null,
      serviceGroupId: form.serviceGroupId && form.serviceGroupId !== "none" ? parseInt(form.serviceGroupId) : null,
      note: form.note || null,
      nextBillingDate: form.nextBillingDate || null,
      isActive: form.isActive,
    };
    if (editingSub) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload);
    }
  };

  const filterBillingAccountsForPm = billingAccounts?.filter(
    ba => filterPaymentMethod !== "all" && filterPaymentMethod !== "none" && ba.paymentMethodId === parseInt(filterPaymentMethod)
  ) || [];

  const availableCurrencies = Array.from(new Set(subscriptions?.map(s => s.currency) || [])).sort();

  const filteredSubs = subscriptions?.filter(s => {
    if (filterCategory !== "all") {
      if (filterCategory === "none" ? s.categoryId : s.categoryId !== parseInt(filterCategory)) return false;
    }
    if (filterPaymentMethod !== "all") {
      if (filterPaymentMethod === "none" ? s.paymentMethodId : s.paymentMethodId !== parseInt(filterPaymentMethod)) return false;
    }
    if (filterBillingAccount !== "all") {
      if (filterBillingAccount === "none" ? s.billingAccountId : s.billingAccountId !== parseInt(filterBillingAccount)) return false;
    }
    if (filterServiceGroup !== "all") {
      if (filterServiceGroup === "none" ? s.serviceGroupId : s.serviceGroupId !== parseInt(filterServiceGroup)) return false;
    }
    if (filterCurrency !== "all" && s.currency !== filterCurrency) return false;
    if (filterStatus !== "all" && s.isActive !== parseInt(filterStatus)) return false;
    return true;
  }) || [];

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir(key === "name" ? "asc" : "desc");
    }
  };

  const sortedSubs = [...filteredSubs].sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case "name":
        cmp = a.serviceName.localeCompare(b.serviceName, "ja");
        break;
      case "cycleAmount": {
        const aJpy = a.amount * getRate(a.currency, rates);
        const bJpy = b.amount * getRate(b.currency, rates);
        cmp = aJpy - bJpy;
        break;
      }
      case "monthly":
        cmp = monthlyJpy(a, rates) - monthlyJpy(b, rates);
        break;
      case "annual":
        cmp = annualJpy(a, rates) - annualJpy(b, rates);
        break;
      case "nextBilling": {
        const da = a.nextBillingDate || "9999-12-31";
        const db = b.nextBillingDate || "9999-12-31";
        cmp = da.localeCompare(db);
        break;
      }
    }
    return sortDir === "asc" ? cmp : -cmp;
  });

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
    return sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
  };

  const filteredBillingAccounts = billingAccounts?.filter(
    ba => form.paymentMethodId && form.paymentMethodId !== "none" && ba.paymentMethodId === parseInt(form.paymentMethodId)
  ) || [];

  const currentRate = getRate(form.currency, rates);

  if (isLoading) {
    return (
      <div className="p-6 space-y-4 max-w-5xl mx-auto">
        <Skeleton className="h-8 w-48" />
        <div className="space-y-2">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20 w-full rounded-md" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-subscriptions-title">サブスクリプション</h1>
          <p className="text-muted-foreground text-sm mt-1">契約中のサービスを管理します</p>
        </div>
        <Button onClick={openCreate} data-testid="button-add-subscription">
          <Plus className="h-4 w-4 mr-1" />
          追加
        </Button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-40" data-testid="select-filter-category">
            <SelectValue placeholder="カテゴリ" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">カテゴリ: すべて</SelectItem>
            <SelectItem value="none">未分類</SelectItem>
            {categories?.map(c => (
              <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterPaymentMethod} onValueChange={v => { setFilterPaymentMethod(v); setFilterBillingAccount("all"); }}>
          <SelectTrigger className="w-44" data-testid="select-filter-payment-method">
            <SelectValue placeholder="支払い方法" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">支払い方法: すべて</SelectItem>
            <SelectItem value="none">未設定</SelectItem>
            {paymentMethods?.map(p => (
              <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {filterPaymentMethod !== "all" && filterPaymentMethod !== "none" && filterBillingAccountsForPm.length > 0 && (
          <Select value={filterBillingAccount} onValueChange={setFilterBillingAccount}>
            <SelectTrigger className="w-48" data-testid="select-filter-billing-account">
              <SelectValue placeholder="請求先" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">請求先: すべて</SelectItem>
              <SelectItem value="none">未設定</SelectItem>
              {filterBillingAccountsForPm.map(b => (
                <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {(serviceGroups?.length || 0) > 0 && (
          <Select value={filterServiceGroup} onValueChange={setFilterServiceGroup}>
            <SelectTrigger className="w-44" data-testid="select-filter-service-group">
              <SelectValue placeholder="グループ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">グループ: すべて</SelectItem>
              <SelectItem value="none">未設定</SelectItem>
              {serviceGroups?.map(g => (
                <SelectItem key={g.id} value={String(g.id)}>{g.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {availableCurrencies.length > 1 && (
          <Select value={filterCurrency} onValueChange={setFilterCurrency}>
            <SelectTrigger className="w-32" data-testid="select-filter-currency">
              <SelectValue placeholder="通貨" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">通貨: すべて</SelectItem>
              {availableCurrencies.map(c => (
                <SelectItem key={c} value={c}>{getCurrencyLabel(c)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-36" data-testid="select-filter-status">
            <SelectValue placeholder="ステータス" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ステータス: すべて</SelectItem>
            <SelectItem value="1">有効</SelectItem>
            <SelectItem value="0">停止中</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {sortedSubs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <PackageOpen className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p className="font-medium">サブスクリプションがありません</p>
            <p className="text-sm mt-1">「追加」ボタンから新しいサブスクを登録してください</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="hidden md:block">
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 font-medium text-muted-foreground">
                        <button onClick={() => toggleSort("name")} className="flex items-center gap-1 cursor-pointer" data-testid="sort-name">
                          サービス <SortIcon k="name" />
                        </button>
                      </th>
                      <th className="text-right p-3 font-medium text-muted-foreground">
                        <button onClick={() => toggleSort("cycleAmount")} className="flex items-center gap-1 cursor-pointer ml-auto" data-testid="sort-cycle">
                          課金額 <SortIcon k="cycleAmount" />
                        </button>
                      </th>
                      <th className="text-right p-3 font-medium text-muted-foreground">
                        <button onClick={() => toggleSort("monthly")} className="flex items-center gap-1 cursor-pointer ml-auto" data-testid="sort-monthly">
                          月額換算 <SortIcon k="monthly" />
                        </button>
                      </th>
                      <th className="text-right p-3 font-medium text-muted-foreground">
                        <button onClick={() => toggleSort("annual")} className="flex items-center gap-1 cursor-pointer ml-auto" data-testid="sort-annual">
                          年額換算 <SortIcon k="annual" />
                        </button>
                      </th>
                      <th className="text-right p-3 font-medium text-muted-foreground">
                        <button onClick={() => toggleSort("nextBilling")} className="flex items-center gap-1 cursor-pointer ml-auto" data-testid="sort-next-billing">
                          次回課金日 <SortIcon k="nextBilling" />
                        </button>
                      </th>
                      <th className="p-3 w-24"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedSubs.map(sub => {
                      const cat = categories?.find(c => c.id === sub.categoryId);
                      const pm = paymentMethods?.find(p => p.id === sub.paymentMethodId);
                      const ba = billingAccounts?.find(b => b.id === sub.billingAccountId);
                      const sg = serviceGroups?.find(g => g.id === sub.serviceGroupId);
                      const mJpy = monthlyJpy(sub, rates);
                      const aJpy = annualJpy(sub, rates);
                      return (
                        <tr key={sub.id} className="border-b last:border-b-0 hover:bg-muted/30 transition-colors" data-testid={`row-sub-${sub.id}`}>
                          <td className="p-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              {cat && <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />}
                              <span className="font-semibold" data-testid={`text-sub-name-${sub.id}`}>{sub.serviceName}</span>
                              {sub.planName && <span className="text-muted-foreground">({sub.planName})</span>}
                              {sub.isActive === 0 && <Badge variant="secondary" className="text-xs">停止中</Badge>}
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
                              {cat && <span>{cat.name}</span>}
                              {pm && <span className="flex items-center gap-1"><CreditCardIcon />{pm.name}{ba ? ` / ${ba.name}` : ""}</span>}
                              {sg && <Badge variant="outline" className="text-xs" style={{ borderColor: sg.color, color: sg.color }}>{sg.name}</Badge>}
                              {sub.note && <span className="truncate max-w-[180px]">{sub.note}</span>}
                            </div>
                          </td>
                          <td className="p-3 text-right align-top">
                            <div className="font-medium">
                              {formatCurrency(sub.amount, sub.currency)}
                            </div>
                            <div className="text-xs text-muted-foreground">{getCycleDisplayLabel(sub.billingCycle)}</div>
                          </td>
                          <td className="p-3 text-right align-top">
                            <div className="font-medium" data-testid={`text-sub-monthly-${sub.id}`}>{formatJpy(mJpy)}</div>
                          </td>
                          <td className="p-3 text-right align-top">
                            <div className="font-medium" data-testid={`text-sub-annual-${sub.id}`}>{formatJpy(aJpy)}</div>
                          </td>
                          <td className={`p-3 text-right align-top text-sm ${billingDateClass(sub.nextBillingDate)}`} data-testid={`text-sub-next-billing-${sub.id}`}>
                            {formatDate(sub.nextBillingDate)}
                          </td>
                          <td className="p-3 text-right align-top">
                            <div className="flex items-center justify-end gap-1">
                              <Button size="icon" variant="ghost" onClick={() => openEdit(sub)} data-testid={`button-edit-sub-${sub.id}`}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button size="icon" variant="ghost" onClick={() => setDeleteTarget(sub)} data-testid={`button-delete-sub-${sub.id}`}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          <div className="md:hidden space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground">並び替え:</span>
              {([["name", "名前"], ["monthly", "月額"], ["annual", "年額"], ["cycleAmount", "課金額"], ["nextBilling", "課金日"]] as [SortKey, string][]).map(([k, label]) => (
                <button
                  key={k}
                  onClick={() => toggleSort(k)}
                  className={`text-xs px-2 py-1 rounded-md cursor-pointer transition-colors ${sortKey === k ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                  data-testid={`sort-mobile-${k}`}
                >
                  {label} {sortKey === k && (sortDir === "asc" ? "↑" : "↓")}
                </button>
              ))}
            </div>
            {sortedSubs.map(sub => {
              const cat = categories?.find(c => c.id === sub.categoryId);
              const pm = paymentMethods?.find(p => p.id === sub.paymentMethodId);
              const ba = billingAccounts?.find(b => b.id === sub.billingAccountId);
              const sg = serviceGroups?.find(g => g.id === sub.serviceGroupId);
              const mJpy = monthlyJpy(sub, rates);
              const aJpy = annualJpy(sub, rates);
              return (
                <Card key={sub.id} className="hover-elevate">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {cat && <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />}
                          <span className="font-semibold" data-testid={`text-sub-name-${sub.id}`}>{sub.serviceName}</span>
                          {sub.planName && <span className="text-sm text-muted-foreground">({sub.planName})</span>}
                          {sub.isActive === 0 && <Badge variant="secondary" className="text-xs">停止中</Badge>}
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
                          {cat && <span>{cat.name}</span>}
                          {pm && <span className="flex items-center gap-1"><CreditCardIcon />{pm.name}{ba ? ` / ${ba.name}` : ""}</span>}
                          {sg && <Badge variant="outline" className="text-xs" style={{ borderColor: sg.color, color: sg.color }}>{sg.name}</Badge>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(sub)} data-testid={`button-edit-sub-${sub.id}`}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => setDeleteTarget(sub)} data-testid={`button-delete-sub-${sub.id}`}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                      <div className="bg-muted/40 rounded-md px-2 py-1.5">
                        <div className="text-[10px] text-muted-foreground">{getCycleDisplayLabel(sub.billingCycle)}</div>
                        <div className="text-sm font-medium">{formatCurrency(sub.amount, sub.currency)}</div>
                      </div>
                      <div className="bg-muted/40 rounded-md px-2 py-1.5">
                        <div className="text-[10px] text-muted-foreground">月額換算</div>
                        <div className="text-sm font-medium">{formatJpy(mJpy)}</div>
                      </div>
                      <div className="bg-muted/40 rounded-md px-2 py-1.5">
                        <div className="text-[10px] text-muted-foreground">年額換算</div>
                        <div className="text-sm font-medium">{formatJpy(aJpy)}</div>
                      </div>
                    </div>
                    {sub.nextBillingDate && (
                      <div className={`mt-2 text-xs ${billingDateClass(sub.nextBillingDate)}`}>
                        次回課金日: {formatDate(sub.nextBillingDate)}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingSub ? "サブスクリプションを編集" : "サブスクリプションを追加"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>サービス名 *</Label>
              <Input value={form.serviceName} onChange={e => setForm({ ...form, serviceName: e.target.value })} placeholder="例: GitHub Copilot" data-testid="input-service-name" />
            </div>
            <div className="space-y-2">
              <Label>コース名</Label>
              <Input value={form.planName} onChange={e => setForm({ ...form, planName: e.target.value })} placeholder="例: Pro" data-testid="input-plan-name" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>金額 *</Label>
                <Input type="number" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="10.00" data-testid="input-amount" />
              </div>
              <div className="space-y-2">
                <Label>通貨</Label>
                <Select value={form.currency} onValueChange={v => setForm({ ...form, currency: v })}>
                  <SelectTrigger data-testid="select-currency"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {commonCurrencies.map(c => <SelectItem key={c} value={c}>{getCurrencyLabel(c)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {form.currency !== "JPY" && (
              <div className="rounded-md border p-3 bg-muted/30">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">適用レート: 1 {form.currency} = {currentRate > 0 ? `${currentRate} JPY` : "未設定"}</span>
                  {form.amount && currentRate > 0 && (
                    <span className="font-medium">換算額: {formatJpy(parseFloat(form.amount) * currentRate)}</span>
                  )}
                </div>
                {currentRate === 0 && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">「為替レート」ページでレートを設定してください</p>
                )}
              </div>
            )}
            <div className="space-y-2">
              <Label>課金サイクル</Label>
              <Select value={form.billingCycle} onValueChange={v => setForm({ ...form, billingCycle: v })}>
                <SelectTrigger data-testid="select-billing-cycle"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {cycleSelectOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
              {form.billingCycle === "other" && (
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min="1"
                    value={form.customCycleNumber}
                    onChange={e => setForm({ ...form, customCycleNumber: e.target.value })}
                    placeholder="数値"
                    className="w-24"
                    data-testid="input-custom-cycle-number"
                  />
                  <Select value={form.customCycleUnit} onValueChange={v => setForm({ ...form, customCycleUnit: v })}>
                    <SelectTrigger className="flex-1" data-testid="select-custom-cycle-unit"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {cycleUnitOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label>次回課金日</Label>
              <Input
                type="date"
                value={form.nextBillingDate}
                onChange={e => setForm({ ...form, nextBillingDate: e.target.value })}
                data-testid="input-next-billing-date"
              />
            </div>
            <div className="space-y-2">
              <Label>カテゴリ</Label>
              <Select value={form.categoryId} onValueChange={v => setForm({ ...form, categoryId: v })}>
                <SelectTrigger data-testid="select-category"><SelectValue placeholder="選択なし" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">なし</SelectItem>
                  {categories?.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>支払い方法</Label>
              <Select value={form.paymentMethodId} onValueChange={v => setForm({ ...form, paymentMethodId: v, billingAccountId: "none" })}>
                <SelectTrigger data-testid="select-payment-method"><SelectValue placeholder="選択なし" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">なし</SelectItem>
                  {paymentMethods?.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {form.paymentMethodId !== "none" && filteredBillingAccounts.length > 0 && (
              <div className="space-y-2">
                <Label>請求先</Label>
                <Select value={form.billingAccountId} onValueChange={v => setForm({ ...form, billingAccountId: v })}>
                  <SelectTrigger data-testid="select-billing-account"><SelectValue placeholder="選択なし" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">なし</SelectItem>
                    {filteredBillingAccounts.map(b => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            {(serviceGroups?.length || 0) > 0 && (
              <div className="space-y-2">
                <Label>サービスグループ</Label>
                <Select value={form.serviceGroupId} onValueChange={v => setForm({ ...form, serviceGroupId: v })}>
                  <SelectTrigger data-testid="select-service-group"><SelectValue placeholder="選択なし" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">なし</SelectItem>
                    {serviceGroups?.map(g => <SelectItem key={g.id} value={String(g.id)}>{g.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>メモ</Label>
              <Textarea value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} placeholder="任意のメモ" data-testid="input-note" />
            </div>
            {editingSub && (
              <div className="flex items-center gap-2">
                <Label>ステータス</Label>
                <Select value={String(form.isActive)} onValueChange={v => setForm({ ...form, isActive: parseInt(v) })}>
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">有効</SelectItem>
                    <SelectItem value="0">停止中</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDialogOpen(false)}>キャンセル</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-submit-subscription">
              {(createMutation.isPending || updateMutation.isPending) ? "保存中..." : editingSub ? "更新" : "追加"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>削除の確認</AlertDialogTitle>
            <AlertDialogDescription>
              「{deleteTarget?.serviceName}」を削除してもよろしいですか？この操作は取り消せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)} data-testid="button-confirm-delete">
              削除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function CreditCardIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="14" x="2" y="5" rx="2" />
      <line x1="2" x2="22" y1="10" y2="10" />
    </svg>
  );
}
