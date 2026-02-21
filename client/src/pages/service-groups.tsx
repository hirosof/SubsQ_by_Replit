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
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Group } from "lucide-react";
import type { ServiceGroup } from "@shared/schema";

const colorPresets = [
  "#6366f1", "#3b82f6", "#ef4444", "#22c55e", "#f59e0b",
  "#8b5cf6", "#ec4899", "#06b6d4", "#f97316", "#14b8a6",
];

export default function ServiceGroups() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceGroup | null>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState(colorPresets[0]);
  const [deleteTarget, setDeleteTarget] = useState<ServiceGroup | null>(null);

  const { data: groups, isLoading } = useQuery<ServiceGroup[]>({ queryKey: ["/api/service-groups"] });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/service-groups", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/service-groups"] });
      setDialogOpen(false);
      toast({ title: "サービスグループを追加しました" });
    },
    onError: (e: Error) => toast({ title: "エラー", description: e.message, variant: "destructive" }),
  });
  const updateMutation = useMutation({
    mutationFn: (data: any) => apiRequest("PATCH", `/api/service-groups/${editing?.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/service-groups"] });
      setDialogOpen(false);
      setEditing(null);
      toast({ title: "サービスグループを更新しました" });
    },
    onError: (e: Error) => toast({ title: "エラー", description: e.message, variant: "destructive" }),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/service-groups/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/service-groups"] });
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions"] });
      setDeleteTarget(null);
      toast({ title: "サービスグループを削除しました" });
    },
    onError: (e: Error) => toast({ title: "エラー", description: e.message, variant: "destructive" }),
  });

  const openCreate = () => {
    setEditing(null);
    setName("");
    setColor(colorPresets[0]);
    setDialogOpen(true);
  };
  const openEdit = (g: ServiceGroup) => {
    setEditing(g);
    setName(g.name);
    setColor(g.color);
    setDialogOpen(true);
  };
  const handleSubmit = () => {
    if (!name.trim()) {
      toast({ title: "入力エラー", description: "グループ名を入力してください", variant: "destructive" });
      return;
    }
    const payload = { name: name.trim(), color };
    if (editing) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload);
    }
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
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-service-groups-title">サービスグループ</h1>
          <p className="text-muted-foreground text-sm mt-1">同じサービス提供元のサブスクリプションをグルーピングします</p>
        </div>
        <Button onClick={openCreate} data-testid="button-add-service-group">
          <Plus className="h-4 w-4 mr-1" />
          追加
        </Button>
      </div>

      {groups?.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Group className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p className="font-medium">サービスグループがありません</p>
            <p className="text-sm mt-1">「追加」ボタンからグループを作成してください</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {groups?.map(g => (
            <Card key={g.id} className="hover-elevate">
              <CardContent className="p-4 flex items-center justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: g.color }} />
                  <span className="font-medium" data-testid={`text-sg-name-${g.id}`}>{g.name}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(g)} data-testid={`button-edit-sg-${g.id}`}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => setDeleteTarget(g)} data-testid={`button-delete-sg-${g.id}`}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editing ? "サービスグループを編集" : "サービスグループを追加"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>グループ名 *</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="例: GitHub" data-testid="input-service-group-name" />
            </div>
            <div className="space-y-2">
              <Label>カラー</Label>
              <div className="flex items-center gap-2 flex-wrap">
                {colorPresets.map(c => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={`w-7 h-7 rounded-full transition-all cursor-pointer ${color === c ? "ring-2 ring-offset-2 ring-primary" : ""}`}
                    style={{ backgroundColor: c }}
                    data-testid={`button-sg-color-${c}`}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDialogOpen(false)}>キャンセル</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-submit-service-group">
              {(createMutation.isPending || updateMutation.isPending) ? "保存中..." : editing ? "更新" : "追加"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>削除の確認</AlertDialogTitle>
            <AlertDialogDescription>
              サービスグループ「{deleteTarget?.name}」を削除してもよろしいですか？このグループに属するサブスクリプションはグループ未設定になります。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)} data-testid="button-confirm-delete-sg">
              削除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
