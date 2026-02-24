import { Router } from "express";
import { z } from "zod";
import {
  getPluginsStatus,
  installPluginFromGitHubPackages,
  runPlugin,
  stopPlugin,
} from "./plugins-service";

const installSchema = z.object({
  packageName: z.string().min(1),
  version: z.string().min(1).optional(),
});

const packageSchema = z.object({
  packageName: z.string().min(1),
});

export const pluginsRouter = Router();

pluginsRouter.post("/install", async (req, res) => {
  const parsed = installSchema.safeParse(req.body ?? {});

  if (!parsed.success) {
    res.status(400).json({
      ok: false,
      error: "Invalid payload",
      issues: parsed.error.flatten(),
    });
    return;
  }

  try {
    const installResult = await installPluginFromGitHubPackages(
      parsed.data.packageName,
      parsed.data.version,
    );
    const runResult = await runPlugin(parsed.data.packageName);

    res.status(200).json({
      ok: true,
      packageSpec: installResult.packageSpec,
      runtimeDir: installResult.runtimeDir,
      run: runResult,
    });
  } catch (error: any) {
    res.status(500).json({
      ok: false,
      error: error?.message ?? "Failed to install plugin",
    });
  }
});

pluginsRouter.post("/run", async (req, res) => {
  const parsed = packageSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ ok: false, error: "Invalid payload" });
    return;
  }

  try {
    const runResult = await runPlugin(parsed.data.packageName);
    res.status(200).json({ ok: true, run: runResult });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error?.message ?? "Failed to run plugin" });
  }
});

pluginsRouter.post("/stop", async (req, res) => {
  const parsed = packageSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ ok: false, error: "Invalid payload" });
    return;
  }

  try {
    const stopResult = await stopPlugin(parsed.data.packageName);
    res.status(200).json({ ok: true, stop: stopResult });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error?.message ?? "Failed to stop plugin" });
  }
});

pluginsRouter.get("/status", (_req, res) => {
  res.status(200).json({ ok: true, plugins: getPluginsStatus() });
});
