import { Router } from "express";

export const healthCheckRouter = Router();

healthCheckRouter.get("/", (_req, res) => {
  res.status(200).json({ ok: true, service: "plugins" });
});
