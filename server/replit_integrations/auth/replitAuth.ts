import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import bcrypt from "bcryptjs";
import { timingSafeEqual } from "crypto";

declare module "express-session" {
  interface SessionData {
    authenticated: boolean;
  }
}

let passwordHash: string | null = null;

async function initPasswordHash() {
  const plain = process.env.ADMIN_PASSWORD;
  if (!plain) return;
  passwordHash = await bcrypt.hash(plain, 12);
}

function safeCompareUsername(a: string, b: string): boolean {
  const buf1 = Buffer.from(a);
  const buf2 = Buffer.from(b);
  if (buf1.length !== buf2.length) return false;
  return timingSafeEqual(buf1, buf2);
}

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000;
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: sessionTtl,
    },
  });
}

export async function setupAuth(app: Express) {
  await initPasswordHash();

  app.set("trust proxy", 1);
  app.use(getSession());

  app.post("/api/login", async (req, res) => {
    const { username, password } = req.body as { username?: string; password?: string };
    const adminUsername = process.env.ADMIN_USERNAME;

    if (!adminUsername || !passwordHash) {
      return res.status(500).json({ message: "サーバーの認証設定が不完全です（ADMIN_USERNAME / ADMIN_PASSWORD が未設定）" });
    }

    if (!username || !password) {
      return res.status(401).json({ message: "ユーザー名またはパスワードが正しくありません" });
    }

    const usernameOk = safeCompareUsername(username, adminUsername);
    const passwordOk = await bcrypt.compare(password, passwordHash);

    if (usernameOk && passwordOk) {
      req.session.authenticated = true;
      req.session.save((err) => {
        if (err) return res.status(500).json({ message: "セッション保存に失敗しました" });
        return res.json({ ok: true });
      });
    } else {
      return res.status(401).json({ message: "ユーザー名またはパスワードが正しくありません" });
    }
  });

  app.get("/api/logout", (req, res) => {
    req.session.destroy(() => {
      res.redirect("/");
    });
  });
}

export const isAuthenticated: RequestHandler = (req, res, next) => {
  if (req.session.authenticated) return next();
  return res.status(401).json({ message: "Unauthorized" });
};
