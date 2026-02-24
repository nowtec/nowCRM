import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { env } from "@/common/utils/env-config";

type RunningPlugin = {
  packageName: string;
  pid: number;
  startedAt: string;
  process: ChildProcessWithoutNullStreams;
};

const runningPlugins = new Map<string, RunningPlugin>();

const ensureRuntimePackageJson = async (runtimeDir: string) => {
  const pkgPath = path.join(runtimeDir, "package.json");
  try {
    await readFile(pkgPath, "utf-8");
    return;
  } catch {
    await writeFile(
      pkgPath,
      JSON.stringify(
        {
          name: "nowcrm-plugins-runtime",
          private: true,
          version: "0.0.0",
        },
        null,
        2,
      ),
      "utf-8",
    );
  }
};

const writeNpmRc = async (runtimeDir: string) => {
  const npmrcPath = path.join(runtimeDir, ".npmrc");
  const registryHost = env.GITHUB_PACKAGES_REGISTRY.replace(/^https?:\/\//, "");
  const npmrc = [
    `${env.GITHUB_PACKAGES_SCOPE}:registry=${env.GITHUB_PACKAGES_REGISTRY}`,
    "always-auth=true",
    `//${registryHost}/:_authToken=${env.GITHUB_PACKAGES_TOKEN}`,
  ].join("\n");

  await writeFile(npmrcPath, `${npmrc}\n`, "utf-8");
};

const runInstall = async (runtimeDir: string, packageSpec: string): Promise<string> => {
  return await new Promise((resolve, reject) => {
    const child = spawn("pnpm", ["add", packageSpec], {
      cwd: runtimeDir,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let output = "";

    child.stdout.on("data", (data) => {
      output += String(data);
    });

    child.stderr.on("data", (data) => {
      output += String(data);
    });

    child.on("error", (error) => {
      reject(error);
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve(output);
        return;
      }
      reject(new Error(`pnpm add failed with code ${code}: ${output}`));
    });
  });
};

const getPackageDir = (packageName: string) => {
  if (packageName.startsWith("@")) {
    const [scope, name] = packageName.split("/");
    return path.join(env.PLUGINS_RUNTIME_DIR, "node_modules", scope, name);
  }
  return path.join(env.PLUGINS_RUNTIME_DIR, "node_modules", packageName);
};

const readInstalledPackageJson = async (packageName: string) => {
  const packageDir = getPackageDir(packageName);
  const packageJsonPath = path.join(packageDir, "package.json");
  const raw = await readFile(packageJsonPath, "utf-8");
  return {
    packageDir,
    packageJson: JSON.parse(raw) as {
      main?: string;
      bin?: string | Record<string, string>;
      scripts?: Record<string, string>;
    },
  };
};

const ensureScope = (packageName: string) => {
  if (!packageName.startsWith(`${env.GITHUB_PACKAGES_SCOPE}/`)) {
    throw new Error(
      `Package must be under scope ${env.GITHUB_PACKAGES_SCOPE}. Received: ${packageName}`,
    );
  }
};

const ensureToken = () => {
  if (!env.GITHUB_PACKAGES_TOKEN) {
    throw new Error("GITHUB_PACKAGES_TOKEN is required");
  }
};

export const installPluginFromGitHubPackages = async (
  packageName: string,
  version?: string,
) => {
  ensureToken();
  ensureScope(packageName);

  const runtimeDir = env.PLUGINS_RUNTIME_DIR;
  const packageSpec = version ? `${packageName}@${version}` : packageName;

  await mkdir(runtimeDir, { recursive: true });
  await ensureRuntimePackageJson(runtimeDir);
  await writeNpmRc(runtimeDir);

  const logs = await runInstall(runtimeDir, packageSpec);

  return {
    runtimeDir,
    packageSpec,
    logs,
  };
};

export const stopPlugin = async (packageName: string) => {
  const running = runningPlugins.get(packageName);
  if (!running) {
    return { stopped: false, reason: "not_running" as const };
  }

  running.process.kill("SIGTERM");
  runningPlugins.delete(packageName);
  return { stopped: true as const };
};

const resolveRunCommand = async (packageName: string) => {
  const { packageDir, packageJson } = await readInstalledPackageJson(packageName);

  if (packageJson.scripts?.start) {
    return {
      cmd: "pnpm",
      args: ["run", "start"],
      cwd: packageDir,
    };
  }

  if (typeof packageJson.bin === "string") {
    return {
      cmd: "node",
      args: [path.join(packageDir, packageJson.bin)],
      cwd: packageDir,
    };
  }

  if (packageJson.bin && typeof packageJson.bin === "object") {
    const firstBinPath = Object.values(packageJson.bin)[0];
    if (firstBinPath) {
      return {
        cmd: "node",
        args: [path.join(packageDir, firstBinPath)],
        cwd: packageDir,
      };
    }
  }

  if (packageJson.main) {
    return {
      cmd: "node",
      args: [path.join(packageDir, packageJson.main)],
      cwd: packageDir,
    };
  }

  throw new Error(
    "Cannot resolve plugin entrypoint. Add scripts.start, bin, or main in plugin package.json",
  );
};

export const runPlugin = async (packageName: string) => {
  ensureScope(packageName);

  const running = runningPlugins.get(packageName);
  if (running) {
    return {
      alreadyRunning: true,
      packageName,
      pid: running.pid,
      startedAt: running.startedAt,
    };
  }

  const { cmd, args, cwd } = await resolveRunCommand(packageName);
  const child = spawn(cmd, args, {
    cwd,
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
  });

  child.stdout.on("data", (data) => {
    console.log(`[plugin:${packageName}] ${String(data).trim()}`);
  });

  child.stderr.on("data", (data) => {
    console.error(`[plugin:${packageName}] ${String(data).trim()}`);
  });

  child.on("close", () => {
    runningPlugins.delete(packageName);
  });

  if (!child.pid) {
    throw new Error(`Failed to start plugin process for ${packageName}`);
  }

  const startedAt = new Date().toISOString();
  runningPlugins.set(packageName, {
    packageName,
    pid: child.pid,
    startedAt,
    process: child,
  });

  return {
    packageName,
    pid: child.pid,
    startedAt,
    alreadyRunning: false,
  };
};

export const getPluginsStatus = () => {
  return Array.from(runningPlugins.values()).map((item) => ({
    packageName: item.packageName,
    pid: item.pid,
    startedAt: item.startedAt,
    status: "running" as const,
  }));
};
