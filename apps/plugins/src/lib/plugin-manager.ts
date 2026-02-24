import { execSync, spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pino } from "pino";

import { env } from "@/common/utils/env-config";

const logger = pino({ name: "plugin-manager" });
const pluginLogger = pino({ name: "plugins" });

type PluginType = "node" | "python";

type PluginConfig = {
	name: string;
	type: PluginType;
	version?: string;
	isGitUrl?: boolean;
	gitUrl?: string;
};

/**
 * Checks if a string is a git URL (git+https:// or git+ssh://)
 */
const isGitUrl = (spec: string): boolean => {
	return spec.startsWith("git+https://") || spec.startsWith("git+ssh://");
};

/**
 * Extracts the plugin name from a git URL with subdirectory parameter
 * Example: git+https://github.com/org/repo@main#subdirectory=plugin-name -> plugin-name
 * If no subdirectory is specified, extracts from the repo URL
 */
const extractPluginNameFromGitUrl = (gitUrl: string): string => {
	// Check for subdirectory parameter
	const subdirectoryMatch = gitUrl.match(/#subdirectory=([^@#]+)/);
	if (subdirectoryMatch) {
		return subdirectoryMatch[1];
	}

	// Fallback: extract from repo path
	const repoMatch = gitUrl.match(/github\.com\/[^/]+\/([^/@]+)/);
	if (repoMatch) {
		return repoMatch[1];
	}

	// Last resort: return a sanitized version of the URL
	return gitUrl.replace(/[^a-zA-Z0-9-]/g, "-");
};

/**
 * Masks credentials in git urls to avoid leaking tokens in logs.
 * Examples:
 *  - git+https://x-access-token:TOKEN@github.com/org/repo -> git+https://***@github.com/org/repo
 *  - git+https://TOKEN@github.com/org/repo              -> git+https://***@github.com/org/repo
 */
const maskGitUrlSecret = (url: string): string => {
	// mask anything between scheme and @github.com/
	return url.replace(/^(git\+https:\/\/)([^@]+)@github\.com\//, "$1***@github.com/");
};

/**
 * Injects GitHub token into git URL for private repositories
 * Input:  git+https://github.com/org/repo@branch#subdirectory=path
 * Output: git+https://x-access-token:TOKEN@github.com/org/repo@branch#subdirectory=path
 *
 * Uses GitHub recommended HTTPS auth username "x-access-token".
 * Token is URL-encoded for safety.
 */
const injectGitToken = (gitUrl: string, token?: string): string => {
	if (!token) return gitUrl;

	// If URL already contains credentials, do not override
	if (/^git\+https:\/\/[^@]+@github\.com\//.test(gitUrl)) {
		return gitUrl;
	}

	// Only inject for github.com https URLs
	if (!gitUrl.startsWith("git+https://github.com/")) {
		return gitUrl;
	}

	const enc = encodeURIComponent(token);

	return gitUrl.replace(
		/^git\+https:\/\/github\.com\//,
		`git+https://x-access-token:${enc}@github.com/`,
	);
};

/**
 * Parses plugin package names from environment variable
 * Format: "node:package1,python:package2@version,python:git+https://github.com/org/repo@main#subdirectory=path"
 * If type prefix is not specified, defaults to "node"
 */
const parsePluginPackages = (packagesString: string): PluginConfig[] => {
	if (!packagesString.trim()) {
		return [];
	}

	return packagesString.split(",").map((pkg) => {
		const trimmed = pkg.trim();

		// Check if type prefix is specified (node: or python:)
		let type: PluginType = "node";
		let packageSpec = trimmed;

		if (trimmed.startsWith("node:")) {
			type = "node";
			packageSpec = trimmed.slice(5); // Remove "node:" prefix
		} else if (trimmed.startsWith("python:")) {
			type = "python";
			packageSpec = trimmed.slice(7); // Remove "python:" prefix
		}

		// Check if it's a git URL
		if (isGitUrl(packageSpec)) {
			return {
				name: packageSpec, // Use full git URL as name
				type,
				isGitUrl: true,
				gitUrl: packageSpec,
			};
		}

		// Parse name and version for regular packages
		const [name, version] = packageSpec.split("@");

		return {
			name: name.trim(),
			type,
			version: version?.trim(),
			isGitUrl: false,
		};
	});
};

/**
 * Creates .npmrc file with GitHub token for private packages
 * Supports both scoped packages (@nowcrm) and general GitHub packages
 */
const setupNpmrc = (pluginsDir: string): void => {
	const npmrcPath = join(pluginsDir, ".npmrc");
	const npmrcContent = `@nowcrm:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${env.PLUGINS_NPMRC_TOKEN}
`;

	writeFileSync(npmrcPath, npmrcContent, "utf-8");
	logger.info("Created .npmrc file for plugin installation");
};

/**
 * Installs a Node.js plugin package using npm
 */
const installNodePlugin = (
	pluginDir: string,
	pluginConfig: PluginConfig,
): void => {
	const packageSpec = pluginConfig.version
		? `${pluginConfig.name}@${pluginConfig.version}`
		: pluginConfig.name;

	logger.info({ packageSpec, type: "node" }, "Installing Node.js plugin");

	try {
		// Use npm install with --save flag to add to package.json
		execSync(`npm install --save ${packageSpec}`, {
			cwd: pluginDir,
			stdio: "inherit",
			env: {
				...process.env,
				NPM_TOKEN: env.PLUGINS_NPMRC_TOKEN,
			},
		});
		logger.info({ packageSpec }, "Node.js plugin installed successfully");
	} catch (error) {
		logger.error({ packageSpec, error }, "Failed to install Node.js plugin");
		throw error;
	}
};

/**
 * Creates Python virtual environment if it doesn't exist
 */
const ensurePythonVenv = (venvDir: string): void => {
	if (!existsSync(venvDir)) {
		logger.info({ venvDir }, "Creating Python virtual environment");
		try {
			execSync(`${env.PLUGINS_PYTHON_PATH} -m venv ${venvDir}`, {
				stdio: "inherit",
			});
			logger.info("Python virtual environment created");
		} catch (error) {
			logger.error({ error }, "Failed to create Python virtual environment");
			throw error;
		}
	}
};

/**
 * Gets the Python executable path from virtual environment
 */
const getPythonExecutable = (venvDir: string): string => {
	const isWindows = process.platform === "win32";
	return isWindows
		? join(venvDir, "Scripts", "python.exe")
		: join(venvDir, "bin", "python");
};

/**
 * Gets the pip executable path from virtual environment
 */
const getPipExecutable = (venvDir: string): string => {
	const isWindows = process.platform === "win32";
	return isWindows
		? join(venvDir, "Scripts", "pip.exe")
		: join(venvDir, "bin", "pip");
};

const installPythonPlugin = (venvDir: string, pluginConfig: PluginConfig): void => {
	ensurePythonVenv(venvDir);
	const pipExecutable = getPipExecutable(venvDir);
  
	let installCommand: string;
	let logSpecSafe: string;
  
	if (pluginConfig.isGitUrl && pluginConfig.gitUrl) {
	  let gitUrl = pluginConfig.gitUrl;
  
	  // Use a dedicated token for cloning repos
	  if (env.PLUGINS_GIT_TOKEN && gitUrl.includes("github.com")) {
		gitUrl = injectGitToken(gitUrl, env.PLUGINS_GIT_TOKEN);
	  }
  
	  installCommand = `${pipExecutable} install "${gitUrl}"`;
	  logSpecSafe = maskGitUrlSecret(gitUrl);
  
	  logger.info({ gitUrl: logSpecSafe, type: "python" }, "Installing Python plugin from Git");
	} else {
	  const pkg = pluginConfig.version ? `${pluginConfig.name}==${pluginConfig.version}` : pluginConfig.name;
	  installCommand = `${pipExecutable} install "${pkg}"`;
	  logSpecSafe = pkg;
  
	  logger.info({ packageSpec: logSpecSafe, type: "python" }, "Installing Python plugin from PyPI");
	}
  
	try {
	  execSync(installCommand, { stdio: "inherit" });
	  logger.info({ packageSpec: logSpecSafe, type: "python" }, "Python plugin installed successfully");
	} catch (error) {
	  // Never log raw command or unmasked URLs
	  logger.error({ packageSpec: logSpecSafe, type: "python", error }, "Failed to install Python plugin");
	  throw error;
	}
  };

/**
 * Installs a plugin based on its type
 */
const installPlugin = (
	nodePluginsDir: string,
	pythonVenvDir: string,
	pluginConfig: PluginConfig,
): void => {
	if (pluginConfig.type === "python") {
		installPythonPlugin(pythonVenvDir, pluginConfig);
	} else {
		installNodePlugin(nodePluginsDir, pluginConfig);
	}
};

/**
 * Initializes package.json in plugins directory if it doesn't exist
 */
const initializePluginDirectory = (pluginsDir: string): void => {
	const packageJsonPath = join(pluginsDir, "package.json");

	if (!existsSync(packageJsonPath)) {
		const packageJson = {
			name: "@nowcrm/plugins-installation",
			version: "1.0.0",
			private: true,
			dependencies: {},
		};

		writeFileSync(
			packageJsonPath,
			JSON.stringify(packageJson, null, 2),
			"utf-8",
		);
		logger.info("Initialized package.json in plugins directory");
	}
};

/**
 * Loads and initializes Node.js plugins from installed packages
 */
const loadNodePlugins = async (pluginsDir: string): Promise<void> => {
	const nodeModulesPath = join(pluginsDir, "node_modules");
	const packageJsonPath = join(pluginsDir, "package.json");

	if (!existsSync(packageJsonPath)) {
		return;
	}

	const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
	const dependencies = packageJson.dependencies || {};

	if (Object.keys(dependencies).length === 0) {
		return;
	}

	logger.info(
		{ plugins: Object.keys(dependencies), type: "node" },
		"Loading Node.js plugins",
	);

	for (const [pluginName, version] of Object.entries(dependencies)) {
		try {
			const pluginPath = join(nodeModulesPath, pluginName);
			if (existsSync(pluginPath)) {
				pluginLogger.info(
					{ pluginName, version, type: "node" },
					"Node.js plugin found",
				);
			}
		} catch (error) {
			logger.error({ pluginName, error, type: "node" }, "Failed to load Node.js plugin");
		}
	}
};

/**
 * Gets the expected plugin name from a plugin config
 * For git URLs, extracts the name from subdirectory parameter
 * For regular packages, returns the package name
 */
const getExpectedPluginName = (pluginConfig: PluginConfig): string => {
	if (pluginConfig.isGitUrl && pluginConfig.gitUrl) {
		return extractPluginNameFromGitUrl(pluginConfig.gitUrl);
	}
	return pluginConfig.name;
};

/**
 * Executes a Python plugin's initialize method and captures its output
 */
const executePythonPlugin = async (
	pythonExecutable: string,
	pluginName: string,
): Promise<void> => {
	return new Promise((resolve, reject) => {
		// Try to import and initialize the plugin
		// Python plugins should have a module that can be imported
		const pluginModule = pluginName.replace(/-/g, "_");
		// Escape plugin name for use in Python string
		const escapedPluginName = pluginName.replace(/"/g, '\\"');
		const pythonScript = `
import sys
import json
plugin_name = "${escapedPluginName}"
plugin_module = "${pluginModule}"
try:
    from ${pluginModule} import plugin
    if hasattr(plugin, 'initialize'):
        result = plugin.initialize()
        if result:
            print(json.dumps(result))
    else:
        print(f"Plugin {plugin_name} loaded (no initialize method)")
except ImportError:
    # Try alternative import paths
    try:
        import ${pluginModule}
        if hasattr(${pluginModule}, 'plugin'):
            plugin = ${pluginModule}.plugin
            if hasattr(plugin, 'initialize'):
                result = plugin.initialize()
                if result:
                    print(json.dumps(result))
        else:
            print(f"Plugin {plugin_name} loaded (no plugin instance found)")
    except Exception as e2:
        print(f"Warning: Could not initialize {plugin_name}: {{e2}}", file=sys.stderr)
except Exception as e:
    print(f"Error initializing {plugin_name}: {{e}}", file=sys.stderr)
    sys.exit(1)
`;

		const child = spawn(pythonExecutable, ["-c", pythonScript], {
			stdio: ["pipe", "pipe", "pipe"],
		});

		let stdout = "";
		let stderr = "";

		child.stdout.on("data", (data) => {
			const output = data.toString();
			stdout += output;
			// Log plugin output line by line
			output
				.split("\n")
				.filter((line: string) => line.trim())
				.forEach((line: string) => {
					try {
						// Try to parse as JSON (structured output)
						const parsed = JSON.parse(line);
						pluginLogger.info(
							{ pluginName, output: parsed, type: "python" },
							"Python plugin initialized",
						);
					} catch {
						// Log as plain text
						pluginLogger.info(
							{ pluginName, message: line.trim(), type: "python" },
							"Python plugin output",
						);
					}
				});
		});

		child.stderr.on("data", (data) => {
			const output = data.toString();
			stderr += output;
			// Log plugin errors
			output
				.split("\n")
				.filter((line: string) => line.trim())
				.forEach((line: string) => {
					pluginLogger.error(
						{ pluginName, error: line.trim(), type: "python" },
						"Python plugin error",
					);
				});
		});

		child.on("close", (code) => {
			if (code === 0) {
				resolve();
			} else {
				// Don't fail if plugin doesn't have initialize method
				if (stderr.includes("Could not initialize")) {
					pluginLogger.warn(
						{ pluginName, stderr, type: "python" },
						"Python plugin initialization skipped",
					);
					resolve();
				} else {
					reject(new Error(`Python plugin ${pluginName} exited with code ${code}: ${stderr}`));
				}
			}
		});

		child.on("error", (error) => {
			reject(error);
		});
	});
};

/**
 * Loads and initializes Python plugins from installed packages
 * Only logs plugins that are configured in PLUGINS_PACKAGE_NAMES
 */
const loadPythonPlugins = async (
	venvDir: string,
	configuredPlugins: PluginConfig[],
): Promise<void> => {
	if (!existsSync(venvDir)) {
		return;
	}

	const pipExecutable = getPipExecutable(venvDir);
	const pythonExecutable = getPythonExecutable(venvDir);

	try {
		const output = execSync(`${pipExecutable} list --format=json`, {
			encoding: "utf-8",
		});

		const packages = JSON.parse(output) as Array<{ name: string; version: string }>;

		if (packages.length === 0) return;

		// Create a set of expected plugin names from configured plugins
		const expectedPluginNames = new Set(
			configuredPlugins
				.filter((p) => p.type === "python")
				.map((p) => getExpectedPluginName(p)),
		);

		// Filter to only actual plugins (not dependencies)
		const actualPlugins = packages.filter((pkg) =>
			expectedPluginNames.has(pkg.name),
		);

		if (actualPlugins.length === 0) {
			logger.info({ type: "python" }, "No configured Python plugins found");
			return;
		}

		logger.info(
			{ plugins: actualPlugins.map((p) => p.name), type: "python" },
			"Loading Python plugins",
		);

		for (const pkg of actualPlugins) {
			pluginLogger.info(
				{ pluginName: pkg.name, version: pkg.version, type: "python" },
				"Python plugin found",
			);

			// Execute plugin initialization and capture output
			try {
				await executePythonPlugin(pythonExecutable, pkg.name);
			} catch (error) {
				logger.error(
					{ pluginName: pkg.name, error, type: "python" },
					"Failed to execute Python plugin",
				);
				// Continue with other plugins even if one fails
			}
		}
	} catch (error) {
		logger.error({ error, type: "python" }, "Failed to list Python plugins");
	}
};

/**
 * Downloads and installs plugins based on configuration
 */
export const initializePlugins = async (): Promise<void> => {
	const pluginsDir = env.PLUGINS_INSTALL_DIR;
	const pythonVenvDir = env.PLUGINS_PYTHON_VENV_DIR;

	logger.info({ pluginsDir, pythonVenvDir }, "Initializing plugins");

	// Create plugins directory if it doesn't exist
	if (!existsSync(pluginsDir)) {
		mkdirSync(pluginsDir, { recursive: true });
		logger.info({ pluginsDir }, "Created plugins directory");
	}

	// Initialize package.json for Node.js plugins
	initializePluginDirectory(pluginsDir);

	// Setup .npmrc if token is provided
	if (env.PLUGINS_NPMRC_TOKEN) {
		setupNpmrc(pluginsDir);
	}

	// Parse and install plugins
	const pluginConfigs = parsePluginPackages(env.PLUGINS_PACKAGE_NAMES);

	if (pluginConfigs.length === 0) {
		logger.info("No plugins configured in PLUGINS_PACKAGE_NAMES");
		return;
	}

	const nodePlugins = pluginConfigs.filter((p) => p.type === "node");
	const pythonPlugins = pluginConfigs.filter((p) => p.type === "python");

	logger.info(
		{
			total: pluginConfigs.length,
			node: nodePlugins.length,
			python: pythonPlugins.length,
			plugins: pluginConfigs,
		},
		"Installing plugins",
	);

	// Track failures (optional: fail-fast in dev)
	let failed = 0;

	for (const pluginConfig of nodePlugins) {
		try {
			installPlugin(pluginsDir, pythonVenvDir, pluginConfig);
		} catch (error) {
			failed++;
			logger.error({ pluginConfig, error }, "Failed to install Node.js plugin, continuing");
		}
	}

	for (const pluginConfig of pythonPlugins) {
		try {
			installPlugin(pluginsDir, pythonVenvDir, pluginConfig);
		} catch (error) {
			failed++;
			logger.error({  error }, "Failed to install Python plugin, continuing");
		}
	}

	if (failed > 0) {
		logger.error({ failed }, "Some plugins failed to install");
		// If you want to stop the service when any plugin fails, uncomment:
		// throw new Error(`Plugin installation failed (${failed} failures)`);
	}

	await loadNodePlugins(pluginsDir);
	await loadPythonPlugins(pythonVenvDir, pluginConfigs);

	logger.info("Plugin initialization completed");
};

/**
 * Exports the plugin logger for use by plugins
 * Plugins can use this logger to log their own messages
 */
export { pluginLogger };