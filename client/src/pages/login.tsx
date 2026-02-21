import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Wallet, Shield, BarChart3, LogIn } from "lucide-react";

export default function Login() {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <div className="lg:w-1/2 bg-gradient-to-br from-primary/10 via-primary/5 to-background flex flex-col justify-between p-8 lg:p-12">
        <div>
          <div className="flex items-center gap-2 mb-12">
            <Wallet className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold tracking-tight">SubTracker</span>
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
        <div className="w-full max-w-sm text-center space-y-6">
          <div>
            <h2 className="text-2xl font-bold mb-2">ログイン</h2>
            <p className="text-muted-foreground">アカウントにログインして管理を始めましょう</p>
          </div>
          <Button asChild size="lg" className="w-full gap-2 text-base">
            <a href="/api/login">
              <LogIn className="h-5 w-5" />
              ログインする
            </a>
          </Button>
          <p className="text-xs text-muted-foreground">
            Replitアカウントで安全に認証されます
          </p>
        </div>
      </div>
    </div>
  );
}
