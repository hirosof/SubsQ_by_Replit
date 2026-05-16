import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wallet, Shield, BarChart3 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export default function Login() {
  const queryClient = useQueryClient();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, password }),
      });
      if (res.ok) {
        await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      } else {
        const data = await res.json() as { message?: string };
        setError(data.message ?? "ログインに失敗しました");
      }
    } catch {
      setError("ネットワークエラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-dvh flex flex-col lg:flex-row" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="lg:w-1/2 bg-gradient-to-br from-primary/10 via-primary/5 to-background flex flex-col justify-between p-8 lg:p-12">
        <div>
          <div className="flex items-center gap-2 mb-12">
            <Wallet className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold tracking-tight">SubsQ</span>
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold tracking-tight mb-4">
            サブスクリプションを
            <br />
            スマートに管理
          </h1>
          <p className="text-muted-foreground text-lg max-w-md">
            月額・年額のサブスク費用を一覧で把握。カテゴリ別・支払方法別のコスト分析で、無駄な出費を見つけましょう。
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
          <Card className="bg-background/60 backdrop-blur">
            <CardContent className="p-4 flex flex-col items-center text-center gap-2">
              <BarChart3 className="h-6 w-6 text-primary" />
              <span className="text-sm font-medium">コスト分析</span>
            </CardContent>
          </Card>
          <Card className="bg-background/60 backdrop-blur">
            <CardContent className="p-4 flex flex-col items-center text-center gap-2">
              <Wallet className="h-6 w-6 text-primary" />
              <span className="text-sm font-medium">多通貨対応</span>
            </CardContent>
          </Card>
          <Card className="bg-background/60 backdrop-blur">
            <CardContent className="p-4 flex flex-col items-center text-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              <span className="text-sm font-medium">安全な管理</span>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="lg:w-1/2 flex items-center justify-center p-8 lg:p-12">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">ログイン</h2>
            <p className="text-muted-foreground">ユーザー名とパスワードでログインしてください</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">ユーザー名</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="ユーザー名を入力"
                required
                disabled={isLoading}
                data-testid="input-username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">パスワード</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="パスワードを入力"
                required
                disabled={isLoading}
                data-testid="input-password"
              />
            </div>
            {error && (
              <p className="text-sm text-destructive" data-testid="text-login-error">{error}</p>
            )}
            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={isLoading}
              data-testid="button-login"
            >
              {isLoading ? "ログイン中..." : "ログイン"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
