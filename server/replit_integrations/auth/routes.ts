import type { Express } from "express";
import { isAuthenticated } from "./replitAuth";

export function registerAuthRoutes(app: Express): void {
  app.get("/api/auth/user", isAuthenticated, (req, res) => {
    res.json({ username: process.env.ADMIN_USERNAME ?? "admin" });
  });
}
