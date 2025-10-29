import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SKIP_DIRS = new Set(["node_modules", ".git", "dist"]);

async function collectExports(dir: string, rootDir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const exports: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) {
        const subExports = await collectExports(fullPath, rootDir);
        exports.push(...subExports);
      }
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name);
      const name = path.basename(entry.name, ext);

      if ((ext === ".ts" || ext === ".tsx") && name !== "index") {
        const relPath =
          "./" +
          path
            .relative(rootDir, fullPath)
            .replace(/\\/g, "/")
            .replace(/\.(ts|tsx)$/, "");
        exports.push(`export * from '${relPath}';`);
      }
    }
  }

  return exports;
}

/**
 * Generate a file (index.ts, server.ts, client.ts) that exports from specific subfolders.
 */
async function generateCustomIndex(
  rootDir: string,
  targetFile: string,
  includeDirs: string[]
): Promise<void> {
  const allExports: string[] = [];

  for (const dir of includeDirs) {
    const folderPath = path.join(rootDir, dir);
    try {
      const exportsArr = await collectExports(folderPath, rootDir);
      allExports.push(...exportsArr);
    } catch (err: any) {
      if (err.code === "ENOENT") {
        console.warn(`Skipped missing folder: ${dir}`);
      } else {
        throw err;
      }
    }
  }

  if (allExports.length === 0) {
    console.log(`No exports found for ${targetFile}`);
    return;
  }

  const content = allExports.join("\n") + "\n";
  await fs.writeFile(path.join(rootDir, targetFile), content);
  console.log(`Generated ${targetFile}`);
}

async function main(): Promise<void> {
  const rootDir = path.resolve(__dirname, "../src");

  await generateCustomIndex(rootDir, "index.ts", ["types", "static", "api-routes","zod-validators"]);
  await generateCustomIndex(rootDir, "server.ts", ["services"]);
  // await generateCustomIndex(rootDir, "client.ts", ["hooks"]);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
