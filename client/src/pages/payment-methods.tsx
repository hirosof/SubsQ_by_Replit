import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight, CreditCard, Wallet, Target } from "lucide-react";
import type { PaymentMethod, BillingAccount, ActualBillingDestination } from "@shared/schema";

export default function PaymentMethods() {
  const { toast } = useToast();
  const [pmDialogOpen, setPmDialogOpen] = useState(false);
  const [editingPm, setEditingPm] = useState<PaymentMethod | null>(null);
  const [pmName, setPmName] = useState("");
  const [deletePmTarget, setDeletePmTarget] = useState<PaymentMethod | null>(null);

  const [baDialogOpen, setBaDialogOpen] = useState(false);
  const [editingBa, setEditingBa] = useState<BillingAccount | null>(null);
  const [baName, setBaName] = useState("");
  const [baParentId, setBaParentId] = useState<number>(0);
  const [baActualDestId, setBaActualDestId] = useState<string>("none");
  const [deleteBaTarget, setDeleteBaTarget] = useState<BillingAccount | null>(null);

  const [abdDialogOpen, setAbdDialogOpen] = useState(false);
  const [editingAbd, setEditingAbd] = useState<ActualBillingDestination | null>(null);
  const [abdName, setAbdName] = useState("");
  const [deleteAbdTarget, setDeleteAbdTarget] = useState<ActualBillingDestination | null>(null);

  const [openPms, setOpenPms] = useState<Set<number>>(new Set());

  const { data: paymentMethods, isLoading: pmLoading } = useQuery<PaymentMethod[]>({ queryKey: ["/api/payment-methods"] });
  const { data: billingAccounts, isLoading: baLoading } = useQuery<BillingAccount[]>({ queryKey: ["/api/billing-accounts"] });
  const { data: actualBillingDestinations, isLoading: abdLoading } = useQuery<ActualBillingDestination[]>({ queryKey: ["/api/actual-billing-destinations"] });

  const isLoading = pmLoading || baLoading || abdLoading;

  const createPm = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/payment-methods", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payment-methods"] });
      setPmDialogOpen(false);
      toast({ title: "支払い方法を追加しました" });
    },
    onError: (e: Error) => toast({ title: "エラー", description: e.message, variant: "destructive" }),
  });
  const updatePm = useMutation({
    mutationFn: (data: any) => apiRequest("PATCH", `/api/payment-methods/${editingPm?.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payment-methods"] });
      setPmDialogOpen(false);
      setEditingPm(null);
      toast({ title: "支払い方法を更新しました" });
    },
    onError: (e: Error) => toast({ title: "エラー", description: e.message, variant: "destructive" }),
  });
  const deletePm = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/payment-methods/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payment-methods"] });
      queryClient.invalidateQueries({ queryKey: ["/api/billing-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions"] });
      setDeletePmTarget(null);
      toast({ title: "支払い方法を削除しました" });
    },
    onError: (e: Error) => toast({ title: "エラー", description: e.message, variant: "destructive" }),
  });

  const createBa = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/billing-accounts", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/billing-accounts"] });
      setBaDialogOpen(false);
      toast({ title: "請求先を追加しました" });
    },
    onError: (e: Error) => toast({ title: "エラー", description: e.message, variant: "destructive" }),
  });
  const updateBa = useMutation({
    mutationFn: (data: any) => apiRequest("PATCH", `/api/billing-accounts/${editingBa?.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/billing-accounts"] });
      setBaDialogOpen(false);
      setEditingBa(null);
      toast({ title: "請求先を更新しました" });
    },
    onError: (e: Error) => toast({ title: "エラー", description: e.message, variant: "destructive" }),
  });
  const deleteBa = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/billing-accounts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/billing-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions"] });
      setDeleteBaTarget(null);
      toast({ title: "請求先を削除しました" });
    },
    onError: (e: Error) => toast({ title: "エラー", description: e.message, variant: "destructive" }),
  });

  const createAbd = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/actual-billing-destinations", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/actual-billing-destinations"] });
      setAbdDialogOpen(false);
      toast({ title: "最終請求先を追加しました" });
    },
    onError: (e: Error) => toast({ title: "エラー", description: e.message, variant: "destructive" }),
  });
  const updateAbd = useMutation({
    mutationFn: (data: any) => apiRequest("PATCH", `/api/actual-billing-destinations/${editingAbd?.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/actual-billing-destinations"] });
      setAbdDialogOpen(false);
      setEditingAbd(null);
      toast({ title: "最終請求先を更新しました" });
    },
    onError: (e: Error) => toast({ title: "エラー", description: e.message, variant: "destructive" }),
  });
  const deleteAbd = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/actual-billing-destinations/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/actual-billing-destinations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/billing-accounts"] });
      setDeleteAbdTarget(null);
      toast({ title: "最終請求先を削除しました" });
    },
    onError: (e: Error) => toast({ title: "エラー", description: e.message, variant: "destructive" }),
  });

  const openCreatePm = () => { setEditingPm(null); setPmName(""); setPmDialogOpen(true); };
  const openEditPm = (pm: PaymentMethod) => { setEditingPm(pm); setPmName(pm.name); setPmDialogOpen(true); };
  const handleSubmitPm = () => {
    if (!pmName.trim()) { toast({ title: "入力エラー", description: "支払い方法名を入力してください", variant: "destructive" }); return; }
    if (editingPm) { updatePm.mutate({ name: pmName.trim() }); }
    else { createPm.mutate({ name: pmName.trim() }); }
  };

  const openCreateBa = (pmId: number) => { setEditingBa(null); setBaName(""); setBaParentId(pmId); setBaActualDestId("none"); setBaDialogOpen(true); };
  const openEditBa = (ba: BillingAccount) => { setEditingBa(ba); setBaName(ba.name); setBaParentId(ba.paymentMethodId); setBaActualDestId(ba.actualBillingDestinationId ? String(ba.actualBillingDestinationId) : "none"); setBaDialogOpen(true); };
  const handleSubmitBa = () => {
    if (!baName.trim()) { toast({ title: "入力エラー", description: "請求先名を入力してください", variant: "destructive" }); return; }
    const payload: any = { name: baName.trim(), paymentMethodId: baParentId, actualBillingDestinationId: baActualDestId !== "none" ? parseInt(baActualDestId) : null };
    if (editingBa) { updateBa.mutate(payload); }
    else { createBa.mutate(payload); }
  };

  const handleBaActualDestChange = (value: string) => {
    setBaActualDestId(value);
    if (value !== "none" && !baName.trim()) {
      const dest = actualBillingDestinations?.find(d => d.id === parseInt(value));
      if (dest) { setBaName(dest.name); }
    }
  };

  const openCreateAbd = () => { setEditingAbd(null); setAbdName(""); setAbdDialogOpen(true); };
  const openEditAbd = (abd: ActualBillingDestination) => { setEditingAbd(abd); setAbdName(abd.name); setAbdDialogOpen(true); };
  const handleSubmitAbd = () => {
    if (!abdName.trim()) { toast({ title: "入力エラー", description: "最終請求先名を入力してください", variant: "destructive" }); return; }
    if (editingAbd) { updateAbd.mutate({ name: abdName.trim() }); }
    else { createAbd.mutate({ name: abdName.trim() }); }
  };

  const togglePm = (id: number) => {
    setOpenPms(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const getAbdName = (abdId: number | null) => {
    if (!abdId) return null;
    return actualBillingDestinations?.find(d => d.id === abdId)?.name || null;
  };

  const getAbdLinkedCount = (abdId: number) => {
    return billingAccounts?.filter(ba => ba.actualBillingDestinationId === abdId).length || 0;
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4 max-w-3xl mx-auto">
        <Skeleton className="h-8 w-40" />
        <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full rounded-md" />)}</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 max-w-3xl mx-auto">
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold tracking-tight" data-testid="text-payment-methods-title">支払い方法</h1>
            <p className="text-muted-foreground text-sm mt-1">支払い方法と請求先を階層的に管理します</p>
          </div>
          <Button onClick={openCreatePm} data-testid="button-add-payment-method">
            <Plus className="h-4 w-4 mr-1" />
            支払い方法を追加
          </Button>
        </div>

        {paymentMethods?.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Wallet className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p className="font-medium">支払い方法がありません</p>
              <p className="text-sm mt-1">「支払い方法を追加」ボタンから登録してください</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {paymentMethods?.map(pm => {
              const pmBillingAccounts = billingAccounts?.filter(ba => ba.paymentMethodId === pm.id) || [];
              const isOpen = openPms.has(pm.id);
              return (
                <Card key={pm.id}>
                  <CardContent className="p-0">
                    <Collapsible open={isOpen} onOpenChange={() => togglePm(pm.id)}>
                      <div className="p-4 flex items-center justify-between gap-2">
                        <CollapsibleTrigger asChild>
                          <button className="flex items-center gap-2 min-w-0 hover-elevate rounded-md px-2 py-1 -ml-2">
                            {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
                            <CreditCard className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <span className="font-medium" data-testid={`text-pm-name-${pm.id}`}>{pm.name}</span>
                            {pmBillingAccounts.length > 0 && (
                              <Badge variant="secondary" className="text-xs">{pmBillingAccounts.length} 請求先</Badge>
                            )}
                          </button>
                        </CollapsibleTrigger>
                        <div className="flex items-center gap-1">
                          <Button size="icon" variant="ghost" onClick={() => openCreateBa(pm.id)} data-testid={`button-add-ba-${pm.id}`}>
                            <Plus className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => openEditPm(pm)} data-testid={`button-edit-pm-${pm.id}`}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => setDeletePmTarget(pm)} data-testid={`button-delete-pm-${pm.id}`}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <CollapsibleContent>
                        {pmBillingAccounts.length > 0 ? (
                          <div className="px-4 pb-3 space-y-1">
                            {pmBillingAccounts.map(ba => {
                              const abdName = getAbdName(ba.actualBillingDestinationId);
                              return (
                                <div key={ba.id} className="flex items-center justify-between gap-2 pl-10 py-2 rounded-md hover-elevate">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className="text-sm" data-testid={`text-ba-name-${ba.id}`}>{ba.name}</span>
                                    {abdName && (
                                      <Badge variant="outline" className="text-xs flex items-center gap-1" data-testid={`badge-ba-abd-${ba.id}`}>
                                        <Target className="h-2.5 w-2.5" />
                                        {abdName}
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Button size="icon" variant="ghost" onClick={() => openEditBa(ba)} data-testid={`button-edit-ba-${ba.id}`}>
                                      <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button size="icon" variant="ghost" onClick={() => setDeleteBaTarget(ba)} data-testid={`button-delete-ba-${ba.id}`}>
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="px-4 pb-3 pl-14">
                            <p className="text-sm text-muted-foreground">請求先が登録されていません</p>
                          </div>
                        )}
                      </CollapsibleContent>
                    </Collapsible>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <h2 className="text-xl font-bold tracking-tight" data-testid="text-abd-title">最終請求先</h2>
            <p className="text-muted-foreground text-sm mt-1">異なる支払い方法の請求先を同一のカード/口座として紐づけます</p>
          </div>
          <Button onClick={openCreateAbd} data-testid="button-add-abd">
            <Plus className="h-4 w-4 mr-1" />
            最終請求先を追加
          </Button>
        </div>

        {(!actualBillingDestinations || actualBillingDestinations.length === 0) ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <Target className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium">最終請求先がありません</p>
              <p className="text-sm mt-1">「最終請求先を追加」ボタンから登録してください</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {actualBillingDestinations.map(abd => {
              const linkedCount = getAbdLinkedCount(abd.id);
              return (
                <Card key={abd.id}>
                  <CardContent className="p-4 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Target className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="font-medium" data-testid={`text-abd-name-${abd.id}`}>{abd.name}</span>
                      {linkedCount > 0 && (
                        <Badge variant="secondary" className="text-xs">{linkedCount} 件紐づけ</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button size="icon" variant="ghost" onClick={() => openEditAbd(abd)} data-testid={`button-edit-abd-${abd.id}`}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => setDeleteAbdTarget(abd)} data-testid={`button-delete-abd-${abd.id}`}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={pmDialogOpen} onOpenChange={setPmDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingPm ? "支払い方法を編集" : "支払い方法を追加"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>名前 *</Label>
              <Input value={pmName} onChange={e => setPmName(e.target.value)} placeholder="例: PayPal" data-testid="input-pm-name" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setPmDialogOpen(false)}>キャンセル</Button>
            <Button onClick={handleSubmitPm} disabled={createPm.isPending || updatePm.isPending} data-testid="button-submit-pm">
              {(createPm.isPending || updatePm.isPending) ? "保存中..." : editingPm ? "更新" : "追加"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={baDialogOpen} onOpenChange={setBaDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingBa ? "請求先を編集" : "請求先を追加"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {(actualBillingDestinations?.length || 0) > 0 && (
              <div className="space-y-2">
                <Label>最終請求先</Label>
                <Select value={baActualDestId} onValueChange={handleBaActualDestChange}>
                  <SelectTrigger data-testid="select-ba-abd">
                    <SelectValue placeholder="選択なし" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">なし</SelectItem>
                    {actualBillingDestinations?.map(d => (
                      <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>名前 *</Label>
              <Input value={baName} onChange={e => setBaName(e.target.value)} placeholder="例: Visa ****1234" data-testid="input-ba-name" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setBaDialogOpen(false)}>キャンセル</Button>
            <Button onClick={handleSubmitBa} disabled={createBa.isPending || updateBa.isPending} data-testid="button-submit-ba">
              {(createBa.isPending || updateBa.isPending) ? "保存中..." : editingBa ? "更新" : "追加"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={abdDialogOpen} onOpenChange={setAbdDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingAbd ? "最終請求先を編集" : "最終請求先を追加"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>名前 *</Label>
              <Input value={abdName} onChange={e => setAbdName(e.target.value)} placeholder="例: クレジットカードA" data-testid="input-abd-name" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setAbdDialogOpen(false)}>キャンセル</Button>
            <Button onClick={handleSubmitAbd} disabled={createAbd.isPending || updateAbd.isPending} data-testid="button-submit-abd">
              {(createAbd.isPending || updateAbd.isPending) ? "保存中..." : editingAbd ? "更新" : "追加"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletePmTarget} onOpenChange={open => !open && setDeletePmTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>削除の確認</AlertDialogTitle>
            <AlertDialogDescription>
              「{deletePmTarget?.name}」と関連するすべての請求先を削除してもよろしいですか？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={() => deletePmTarget && deletePm.mutate(deletePmTarget.id)}>削除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteBaTarget} onOpenChange={open => !open && setDeleteBaTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>削除の確認</AlertDialogTitle>
            <AlertDialogDescription>
              請求先「{deleteBaTarget?.name}」を削除してもよろしいですか？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteBaTarget && deleteBa.mutate(deleteBaTarget.id)}>削除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteAbdTarget} onOpenChange={open => !open && setDeleteAbdTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>削除の確認</AlertDialogTitle>
            <AlertDialogDescription>
              最終請求先「{deleteAbdTarget?.name}」を削除してもよろしいですか？紐づけられている請求先は「最終請求先なし」になります。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteAbdTarget && deleteAbd.mutate(deleteAbdTarget.id)}>削除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
