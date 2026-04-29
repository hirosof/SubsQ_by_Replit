import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { Download, Upload, FileJson, FileSpreadsheet, ChevronDown, ChevronRight, AlertTriangle, Eye } from "lucide-react";

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function DataManagement() {
  const { toast } = useToast();

  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const restoreInputRef = useRef<HTMLInputElement>(null);

  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<{ added: number; updated: number; skipped: number; errors: string[] } | null>(null);
  const [importConfirmOpen, setImportConfirmOpen] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);

  const [specOpen, setSpecOpen] = useState(false);

  const backupMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/data/backup", { credentials: "include" });
      if (!res.ok) throw new Error((await res.json()).message || "バックアップ取得に失敗しました");
      return res.blob();
    },
    onSuccess: (blob) => {
      const filename = `subsq-backup-${new Date().toISOString().slice(0, 10)}.json`;
      triggerDownload(blob, filename);
      toast({ title: "バックアップをダウンロードしました" });
    },
    onError: (e: Error) => toast({ title: "エラー", description: e.message, variant: "destructive" }),
  });

  const restoreMutation = useMutation({
    mutationFn: async (file: File) => {
      const text = await file.text();
      let parsed: unknown;
      try { parsed = JSON.parse(text); } catch { throw new Error("JSONの解析に失敗しました。ファイルが正しいバックアップJSONか確認してください。"); }
      const res = await apiRequest("POST", "/api/data/restore", parsed as Record<string, unknown>);
      if (!res.ok) throw new Error((await res.json()).message || "復元に失敗しました");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      setRestoreFile(null);
      if (restoreInputRef.current) restoreInputRef.current.value = "";
      toast({ title: "復元が完了しました", description: "全データが復元されました" });
    },
    onError: (e: Error) => toast({ title: "復元エラー", description: e.message, variant: "destructive" }),
  });

  const exportMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/subscriptions/export", { credentials: "include" });
      if (!res.ok) throw new Error((await res.json()).message || "エクスポートに失敗しました");
      return res.blob();
    },
    onSuccess: (blob) => {
      const filename = `subsq-export-${new Date().toISOString().slice(0, 10)}.csv`;
      triggerDownload(blob, filename);
      toast({ title: "CSVをダウンロードしました" });
    },
    onError: (e: Error) => toast({ title: "エラー", description: e.message, variant: "destructive" }),
  });

  const previewMutation = useMutation({
    mutationFn: async (file: File) => {
      const text = await file.text();
      const res = await apiRequest("POST", "/api/subscriptions/import-preview", { csv: text });
      const data = await res.json() as { added?: number; updated?: number; skipped?: number; errors?: string[]; message?: string };
      if (!res.ok) throw new Error(data.message || "プレビューの取得に失敗しました");
      return { added: data.added ?? 0, updated: data.updated ?? 0, skipped: data.skipped ?? 0, errors: data.errors ?? [] };
    },
    onSuccess: (data) => {
      setImportPreview(data);
    },
    onError: (e: Error) => {
      setImportPreview(null);
      toast({ title: "プレビューエラー", description: e.message, variant: "destructive" });
    },
  });

  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const text = await file.text();
      const res = await apiRequest("POST", "/api/subscriptions/import", { csv: text });
      const data = await res.json() as { added?: number; updated?: number; skipped?: number; errors?: string[]; message?: string };
      if (!res.ok) throw new Error(data.message || "インポートに失敗しました");
      return { added: data.added ?? 0, updated: data.updated ?? 0, skipped: data.skipped ?? 0, errors: data.errors ?? [] };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions"] });
      setImportFile(null);
      setImportPreview(null);
      if (importInputRef.current) importInputRef.current.value = "";
      const parts: string[] = [];
      if (data.added > 0) parts.push(`${data.added}件追加`);
      if (data.updated > 0) parts.push(`${data.updated}件更新`);
      if (data.skipped > 0) parts.push(`${data.skipped}件スキップ（重複）`);
      const title = parts.length > 0 ? parts.join("、") : "変更なし";
      const desc = data.errors.length > 0 ? `${data.errors.length}件のエラー: ${data.errors.slice(0, 3).join(" / ")}` : undefined;
      toast({ title: `インポート完了: ${title}`, description: desc });
    },
    onError: (e: Error) => toast({ title: "インポートエラー", description: e.message, variant: "destructive" }),
  });

  const handleRestoreFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setRestoreFile(file);
  };

  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setImportFile(file);
    setImportPreview(null);
    if (file) {
      previewMutation.mutate(file);
    }
  };

  const specJson = `{
  "version": "1",
  "exportedAt": "2026-04-28T22:00:00.000Z",
  "data": {
    "categories": [
      { "id": 1, "name": "開発ツール", "color": "#808080", "icon": "folder", "sortOrder": 0 }
    ],
    "paymentMethods": [
      { "id": 1, "name": "クレジットカード", "icon": "credit-card" }
    ],
    "actualBillingDestinations": [
      { "id": 1, "name": "楽天カード", "color": "#10b981", "sortOrder": 0 }
    ],
    "billingAccounts": [
      { "id": 1, "name": "楽天カード ****1234", "paymentMethodId": 1, "actualBillingDestinationId": 1 }
    ],
    "serviceGroups": [
      { "id": 1, "name": "Adobe", "color": "#ef4444", "sortOrder": 0 }
    ],
    "exchangeRates": [
      { "id": 1, "currency": "USD", "rateToJpy": 155.0 }
    ],
    "subscriptions": [
      {
        "id": 9,
        "serviceName": "GitHub Copilot",
        "serviceUrl": "https://github.com/features/copilot",
        "planName": "Pro",
        "billerName": "GITHUB INC.",
        "amount": 10.0,
        "currency": "USD",
        "billingCycle": "monthly",
        "categoryId": 1,
        "paymentMethodId": 1,
        "billingAccountId": 1,
        "serviceGroupId": null,
        "note": null,
        "nextBillingDate": "2026-04-15",
        "scheduledAmount": null,
        "scheduledDate": null,
        "isActive": 1
      }
    ]
  }
}`;

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" data-testid="text-data-management-title">データ管理</h1>
        <p className="text-muted-foreground text-sm mt-1">データのバックアップ・復元・エクスポート・インポートを行います</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileJson className="h-5 w-5 text-primary" />
            <CardTitle>バックアップ</CardTitle>
          </div>
          <CardDescription>全データ（サブスク・カテゴリ・支払い方法など）をJSONファイルとして保存します</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={() => backupMutation.mutate()}
            disabled={backupMutation.isPending}
            data-testid="button-backup-download"
          >
            <Download className="h-4 w-4 mr-2" />
            {backupMutation.isPending ? "準備中..." : "バックアップをダウンロード"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            <CardTitle>復元</CardTitle>
          </div>
          <CardDescription>バックアップJSONをアップロードして全データを上書き復元します。現在のデータはすべて削除されます。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 p-3 rounded-md bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-sm">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>復元すると現在のデータはすべて上書きされます。事前にバックアップを取ることをおすすめします。</span>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                ref={restoreInputRef}
                type="file"
                accept=".json,application/json"
                className="sr-only"
                onChange={handleRestoreFileChange}
                data-testid="input-restore-file"
              />
              <Button variant="outline" type="button" onClick={() => restoreInputRef.current?.click()}>
                <FileJson className="h-4 w-4 mr-2" />
                JSONファイルを選択
              </Button>
            </label>
            {restoreFile && (
              <span className="text-sm text-muted-foreground truncate max-w-xs">{restoreFile.name}</span>
            )}
            <Button
              variant="destructive"
              disabled={!restoreFile || restoreMutation.isPending}
              onClick={() => setRestoreDialogOpen(true)}
              data-testid="button-restore"
            >
              {restoreMutation.isPending ? "復元中..." : "復元する"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            <CardTitle>エクスポート（CSV）</CardTitle>
          </div>
          <CardDescription>サブスクリプション一覧をCSVファイルでダウンロードします。BOM付きUTF-8形式でExcelでも文字化けしません。</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            onClick={() => exportMutation.mutate()}
            disabled={exportMutation.isPending}
            data-testid="button-export-csv"
          >
            <Download className="h-4 w-4 mr-2" />
            {exportMutation.isPending ? "準備中..." : "CSVをダウンロード"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            <CardTitle>インポート（CSV）</CardTitle>
          </div>
          <CardDescription>CSVファイルからサブスクリプションを一括追加します。カテゴリ・支払い方法は名前で照合し、存在しない場合は自動作成します。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                ref={importInputRef}
                type="file"
                accept=".csv,text/csv"
                className="sr-only"
                onChange={handleImportFileChange}
                data-testid="input-import-file"
              />
              <Button variant="outline" type="button" onClick={() => importInputRef.current?.click()}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                CSVファイルを選択
              </Button>
            </label>
            {importFile && (
              <span className="text-sm text-muted-foreground truncate max-w-xs" data-testid="text-import-filename">{importFile.name}</span>
            )}
          </div>
          {previewMutation.isPending && (
            <p className="text-sm text-muted-foreground" data-testid="text-import-preview-loading">
              プレビューを取得中...
            </p>
          )}
          {importPreview && (
            <div className="rounded-md border bg-muted/40 p-4 space-y-3" data-testid="section-import-preview">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Eye className="h-4 w-4 text-primary" />
                インポートプレビュー
              </div>
              <div className="flex flex-wrap gap-2" data-testid="preview-counts">
                <Badge variant="default" className="gap-1" data-testid="badge-preview-added">
                  追加: {importPreview.added}件
                </Badge>
                <Badge variant="secondary" className="gap-1" data-testid="badge-preview-updated">
                  更新: {importPreview.updated}件
                </Badge>
                <Badge variant="outline" className="gap-1" data-testid="badge-preview-skipped">
                  スキップ: {importPreview.skipped}件
                </Badge>
              </div>
              {importPreview.errors.length > 0 && (
                <div className="text-xs text-destructive space-y-0.5" data-testid="preview-errors">
                  <p className="font-medium">{importPreview.errors.length}件のエラーがあります:</p>
                  {importPreview.errors.slice(0, 5).map((err, i) => (
                    <p key={i} data-testid={`preview-error-${i}`}>{err}</p>
                  ))}
                  {importPreview.errors.length > 5 && (
                    <p>…他 {importPreview.errors.length - 5}件</p>
                  )}
                </div>
              )}
            </div>
          )}
          <div className="flex gap-2 flex-wrap">
            <Button
              disabled={!importFile || !importPreview || importMutation.isPending || previewMutation.isPending}
              onClick={() => setImportConfirmOpen(true)}
              data-testid="button-import"
            >
              <Upload className="h-4 w-4 mr-2" />
              {importMutation.isPending ? "インポート中..." : "インポートする"}
            </Button>
            {importFile && (
              <Button
                variant="ghost"
                disabled={importMutation.isPending}
                onClick={() => {
                  setImportFile(null);
                  setImportPreview(null);
                  if (importInputRef.current) importInputRef.current.value = "";
                }}
                data-testid="button-import-cancel"
              >
                キャンセル
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Collapsible open={specOpen} onOpenChange={setSpecOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-start gap-2 px-0 text-muted-foreground hover:text-foreground" data-testid="button-spec-toggle">
            {specOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            バックアップJSONフォーマット仕様
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-2 rounded-md border bg-muted/40 p-4 space-y-3 text-sm">
            <div className="space-y-1">
              <p className="font-medium">フィールド仕様</p>
              <ul className="space-y-1 text-muted-foreground list-disc list-inside">
                <li><code>version</code>: バックアップ形式のバージョン（現在は <code>"1"</code> 固定）</li>
                <li><code>exportedAt</code>: エクスポート日時（ISO 8601形式）</li>
                <li><code>billingCycle</code>: <code>"monthly"</code> / <code>"annual"</code> / <code>"{'{'}N{'}'}_{'{'}days|weeks|months|years{'}'}"</code> 形式</li>
                <li><code>isActive</code>: <code>1</code>（有効）または <code>0</code>（停止中）</li>
              </ul>
            </div>
            <div className="space-y-1">
              <p className="font-medium">復元時の挙動</p>
              <ul className="space-y-1 text-muted-foreground list-disc list-inside">
                <li>全テーブルを削除後、マスタ→子テーブルの順で再挿入</li>
                <li>IDは新規採番し、外部キー参照は新IDに自動再マップ</li>
                <li><code>version</code> フィールドが存在しない場合は拒否</li>
              </ul>
            </div>
            <pre className="overflow-x-auto text-xs bg-background border rounded p-3 leading-relaxed">{specJson}</pre>
          </div>
        </CollapsibleContent>
      </Collapsible>

      <AlertDialog open={importConfirmOpen} onOpenChange={setImportConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>インポートを実行しますか？</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>以下の内容でインポートが実行されます。</p>
                {importPreview && (
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="default" data-testid="dialog-badge-added">追加: {importPreview.added}件</Badge>
                    <Badge variant="secondary" data-testid="dialog-badge-updated">更新: {importPreview.updated}件</Badge>
                    <Badge variant="outline" data-testid="dialog-badge-skipped">スキップ: {importPreview.skipped}件</Badge>
                  </div>
                )}
                {importPreview && importPreview.errors.length > 0 && (
                  <p className="text-destructive text-xs">{importPreview.errors.length}件の行はエラーのためスキップされます。</p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-import-confirm-cancel">キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setImportConfirmOpen(false);
                if (importFile) importMutation.mutate(importFile);
              }}
              data-testid="button-import-confirm-execute"
            >
              実行する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>データを復元しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              現在のデータはすべて削除され、バックアップファイルの内容で上書きされます。この操作は取り消せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-restore-cancel">キャンセル</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { setRestoreDialogOpen(false); if (restoreFile) restoreMutation.mutate(restoreFile); }}
              data-testid="button-restore-confirm"
            >
              復元する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
