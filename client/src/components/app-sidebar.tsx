import { useLocation, Link } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { LayoutDashboard, Package, FolderOpen, CreditCard, ArrowRightLeft, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const navItems = [
  { title: "ダッシュボード", url: "/", icon: LayoutDashboard },
  { title: "サブスクリプション", url: "/subscriptions", icon: Package },
  { title: "カテゴリ", url: "/categories", icon: FolderOpen },
  { title: "支払い方法", url: "/payment-methods", icon: CreditCard },
  { title: "為替レート", url: "/exchange-rates", icon: ArrowRightLeft },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { user } = useAuth();

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
            <Package className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <h2 className="font-bold text-sm leading-tight" data-testid="text-app-name">SubsQ</h2>
            <p className="text-xs text-muted-foreground leading-tight">サブスク管理</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>メニュー</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    data-active={location === item.url}
                    className="data-[active=true]:bg-sidebar-accent"
                  >
                    <Link href={item.url} data-testid={`link-${item.url.replace("/", "") || "dashboard"}`}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <div className="mt-auto p-3 border-t">
        <div className="flex items-center gap-2">
          <Avatar className="h-7 w-7">
            <AvatarImage src={user?.profileImageUrl || undefined} />
            <AvatarFallback className="text-xs">
              {user?.firstName?.[0] || user?.email?.[0] || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0 text-xs">
            <p className="font-medium truncate">{user?.firstName || user?.email || "ユーザー"}</p>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" asChild>
            <a href="/api/logout" title="ログアウト">
              <LogOut className="h-3.5 w-3.5" />
            </a>
          </Button>
        </div>
      </div>
    </Sidebar>
  );
}
