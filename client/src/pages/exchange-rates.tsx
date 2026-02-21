import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, ArrowRightLeft, Coins } from "lucide-react";
import type { ExchangeRate } from "@shared/schema";

const commonCurrencies = ["USD", "EUR", "GBP", "CNY", "KRW", "TWD", "AUD", "CAD", "CHF", "SGD", "HKD", "THB", "INR", "BRL", "MXN"];

interface FormData {
  currency: string;
  rateToJpy: string;
}

const defaultForm: FormData = { currency: "", rateToJpy: "" };

export default function ExchangeRates() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRate, setEditingRate] = useState<ExchangeRate | null>(null);
  const [form, setForm] = useState<FormData>(defaultForm);
  const [deleteTarget, setDeleteTarget] = useState<ExchangeRate | null>(null);

  const { data: exchangeRates, isLoading } = useQuery<ExchangeRate[]>({ queryKey: ["/api/exchange-rates"] });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/exchange-rates", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/exchange-rates"] });
      setDialogOpen(false);
      toast({ title: "為替レートを追加しました" });
    },
    onError: (e: Error) => toast({ title: "エラー", description: e.message, variant: "destructive" }),
  });
  const updateMutation = useMutation({
    mutationFn: (data: any) => apiRequest("PATCH", `/api/exchange-rates/${editingRate?.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/exchange-rates"] });
      setDialogOpen(false);
      setEditingRate(null);
      toast({ title: "為替レートを更新しました" });
    },
    onError: (e: Error) => toast({ title: "エラー", description: e.message, variant: "destructive" }),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/exchange-rates/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/exchange-rates"] });
      setDeleteTarget(null);
      toast({ title: "為替レートを削除しました" });
    },
    onError: (e: Error) => toast({ title: "エラー", description: e.message, variant: "destructive" }),
  });

  const openCreate = () => {
    setEditingRate(null);
    setForm(defaultForm);
    setDialogOpen(true);
  };
  const openEdit = (rate: ExchangeRate) => {
    setEditingRate(rate);
    setForm({ currency: rate.currency, rateToJpy: String(rate.rateToJpy) });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    const rateToJpy = parseFloat(form.rateToJpy);
    if (!form.currency || isNaN(rateToJpy) || rateToJpy <= 0) {
      toast({ title: "入力エラー", description: "通貨コードと有効なレートを入力してください", variant: "destructive" });
      return;
    }
    const existing = exchangeRates?.find(r => r.currency === form.currency && r.id !== editingRate?.id);
    if (existing) {
      toast({ title: "入力エラー", description: `${form.currency} のレートは既に登録されています`, variant: "destructive" });
      return;
    }
    const payload = { currency: form.currency.toUpperCase(), rateToJpy };
    if (editingRate) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload);
    }
  };

  const usedCurrencies = exchangeRates?.map(r => r.currency) || [];
  const availableCurrencies = commonCurrencies.filter(c => !usedCurrencies.includes(c));

  if (isLoading) {
    return (
      <div className="p-6 space-y-4 max-w-3xl mx-auto">
        <Skeleton className="h-8 w-48" />
        <div className="space-y-2">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full rounded-md" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-exchange-rates-title">為替レート</h1>
          <p className="text-muted-foreground text-sm mt-1">各通貨の日本円換算レートを管理します</p>
        </div>
        <Button onClick={openCreate} data-testid="button-add-rate">
          <Plus className="h-4 w-4 mr-1" />
          追加
        </Button>
      </div>

      <Card className="border-muted bg-muted/20">
        <CardContent className="py-3 text-sm text-muted-foreground">
          <Coins className="h-4 w-4 inline mr-1.5 -mt-0.5" />
          JPY（日本円）は基準通貨のためレート設定不要です。ここで設定したレートがサブスクリプションの換算に使われます。
        </CardContent>
      </Card>

      {(!exchangeRates || exchangeRates.length === 0) ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <ArrowRightLeft className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p className="font-medium">為替レートが登録されていません</p>
            <p className="text-sm mt-1">外貨建てサブスクを追加する前にレートを設定してください</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {exchangeRates.map(rate => (
            <Card key={rate.id} className="hover-elevate">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-bold text-primary">{rate.currency}</span>
                    </div>
                    <div>
                      <div className="font-semibold" data-testid={`text-rate-currency-${rate.id}`}>
                        1 {rate.currency} = {rate.rateToJpy.toLocaleString("ja-JP")} JPY
                      </div>
                      <div className="text-xs text-muted-foreground">
                        1 JPY = {(1 / rate.rateToJpy).toFixed(6)} {rate.currency}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(rate)} data-testid={`button-edit-rate-${rate.id}`}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => setDeleteTarget(rate)} data-testid={`button-delete-rate-${rate.id}`}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingRate ? "為替レートを編集" : "為替レートを追加"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>通貨コード *</Label>
              {editingRate ? (
                <Input value={form.currency} disabled data-testid="input-currency" />
              ) : (
                availableCurrencies.length > 0 ? (
                  <Select value={form.currency} onValueChange={v => setForm({ ...form, currency: v })}>
                    <SelectTrigger data-testid="select-currency"><SelectValue placeholder="通貨を選択" /></SelectTrigger>
                    <SelectContent>
                      {availableCurrencies.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={form.currency}
                    onChange={e => setForm({ ...form, currency: e.target.value.toUpperCase() })}
                    placeholder="例: USD"
                    maxLength={3}
                    data-testid="input-currency"
                  />
                )
              )}
            </div>
            <div className="space-y-2">
              <Label>1 {form.currency || "???"} = ? JPY *</Label>
              <Input
                type="number"
                step="0.01"
                value={form.rateToJpy}
                onChange={e => setForm({ ...form, rateToJpy: e.target.value })}
                placeholder="例: 150"
                data-testid="input-rate"
              />
              {form.rateToJpy && parseFloat(form.rateToJpy) > 0 && (
                <p className="text-sm text-muted-foreground">
                  例: 100 {form.currency || "???"} = {(100 * parseFloat(form.rateToJpy)).toLocaleString("ja-JP")} JPY
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDialogOpen(false)}>キャンセル</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-submit-rate">
              {(createMutation.isPending || updateMutation.isPending) ? "保存中..." : editingRate ? "更新" : "追加"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>削除の確認</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.currency} のレートを削除してもよろしいですか？この通貨を使用しているサブスクリプションの換算額が算出できなくなります。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)} data-testid="button-confirm-delete-rate">
              削除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
