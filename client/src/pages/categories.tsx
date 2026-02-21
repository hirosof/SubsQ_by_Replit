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
import { Plus, Pencil, Trash2, FolderOpen, GripVertical, ArrowUpDown, Check } from "lucide-react";
import type { Category } from "@shared/schema";
import { ColorPicker, colorPresets } from "@/components/color-picker";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

function SortableItem({ cat, reorderMode, onEdit, onDelete }: {
  cat: Category;
  reorderMode: boolean;
  onEdit: (cat: Category) => void;
  onDelete: (cat: Category) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: cat.id, disabled: !reorderMode });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Card className={reorderMode ? "" : "hover-elevate"}>
        <CardContent className="p-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            {reorderMode && (
              <button
                {...attributes}
                {...listeners}
                className="touch-none p-1 rounded hover:bg-muted cursor-grab active:cursor-grabbing"
                data-testid={`button-drag-cat-${cat.id}`}
              >
                <GripVertical className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
            <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
            <span className="font-medium" data-testid={`text-cat-name-${cat.id}`}>{cat.name}</span>
          </div>
          {!reorderMode && (
            <div className="flex items-center gap-1">
              <Button size="icon" variant="ghost" onClick={() => onEdit(cat)} data-testid={`button-edit-cat-${cat.id}`}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => onDelete(cat)} data-testid={`button-delete-cat-${cat.id}`}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function Categories() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState(colorPresets[0]);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [reorderMode, setReorderMode] = useState(false);

  const { data: categories, isLoading } = useQuery<Category[]>({ queryKey: ["/api/categories"] });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/categories", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      setDialogOpen(false);
      toast({ title: "カテゴリを追加しました" });
    },
    onError: (e: Error) => toast({ title: "エラー", description: e.message, variant: "destructive" }),
  });
  const updateMutation = useMutation({
    mutationFn: (data: any) => apiRequest("PATCH", `/api/categories/${editing?.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      setDialogOpen(false);
      setEditing(null);
      toast({ title: "カテゴリを更新しました" });
    },
    onError: (e: Error) => toast({ title: "エラー", description: e.message, variant: "destructive" }),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/categories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions"] });
      setDeleteTarget(null);
      toast({ title: "カテゴリを削除しました" });
    },
    onError: (e: Error) => toast({ title: "エラー", description: e.message, variant: "destructive" }),
  });
  const reorderMutation = useMutation({
    mutationFn: (ids: number[]) => apiRequest("PUT", "/api/categories/reorder", { ids }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
    },
    onError: (e: Error) => toast({ title: "エラー", description: e.message, variant: "destructive" }),
  });

  const openCreate = () => {
    setEditing(null);
    setName("");
    setColor(colorPresets[0]);
    setDialogOpen(true);
  };
  const openEdit = (cat: Category) => {
    setEditing(cat);
    setName(cat.name);
    setColor(cat.color);
    setDialogOpen(true);
  };
  const handleSubmit = () => {
    if (!name.trim()) {
      toast({ title: "入力エラー", description: "カテゴリ名を入力してください", variant: "destructive" });
      return;
    }
    const payload = { name: name.trim(), color };
    if (editing) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !categories) return;
    const oldIndex = categories.findIndex(c => c.id === active.id);
    const newIndex = categories.findIndex(c => c.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const newOrder = arrayMove(categories, oldIndex, newIndex);
    reorderMutation.mutate(newOrder.map(c => c.id));
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
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-categories-title">カテゴリ</h1>
          <p className="text-muted-foreground text-sm mt-1">サブスクリプションを分類するカテゴリを管理します</p>
        </div>
        <div className="flex items-center gap-2">
          {(categories?.length || 0) > 1 && (
            <Button
              variant={reorderMode ? "default" : "outline"}
              size="sm"
              onClick={() => setReorderMode(!reorderMode)}
              data-testid="button-toggle-reorder-categories"
            >
              {reorderMode ? <><Check className="h-4 w-4 mr-1" />完了</> : <><ArrowUpDown className="h-4 w-4 mr-1" />並び替え</>}
            </Button>
          )}
          {!reorderMode && (
            <Button onClick={openCreate} data-testid="button-add-category">
              <Plus className="h-4 w-4 mr-1" />
              追加
            </Button>
          )}
        </div>
      </div>

      {categories?.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <FolderOpen className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p className="font-medium">カテゴリがありません</p>
            <p className="text-sm mt-1">「追加」ボタンからカテゴリを作成してください</p>
          </CardContent>
        </Card>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={categories?.map(c => c.id) || []} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {categories?.map(cat => (
                <SortableItem
                  key={cat.id}
                  cat={cat}
                  reorderMode={reorderMode}
                  onEdit={openEdit}
                  onDelete={setDeleteTarget}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editing ? "カテゴリを編集" : "カテゴリを追加"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>カテゴリ名 *</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="例: 開発ツール" data-testid="input-category-name" />
            </div>
            <div className="space-y-2">
              <Label>カラー</Label>
              <ColorPicker value={color} onChange={setColor} testIdPrefix="cat-color" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDialogOpen(false)}>キャンセル</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-submit-category">
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
              カテゴリ「{deleteTarget?.name}」を削除してもよろしいですか？このカテゴリに属するサブスクリプションは未分類になります。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}>削除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
