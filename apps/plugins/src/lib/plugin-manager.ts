import { execSync, spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve as resolvePath } from "node:path";
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
	return url.replace(
		/^(git\+https:\/\/)([^@]+)@github\.com\//,
		"$1***@github.com/",
	);
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
	// Resolve to absolute path
	const absoluteVenvDir = resolvePath(venvDir);

	// Check if venv exists and is valid
	const venvExists = existsSync(absoluteVenvDir);
	const pythonExecutable = getPythonExecutable(absoluteVenvDir);
	const pipExecutable = getPipExecutable(absoluteVenvDir);
	const venvIsValid =
		venvExists && existsSync(pythonExecutable) && existsSync(pipExecutable);

	if (!venvExists) {
		logger.info(
			{ venvDir: absoluteVenvDir },
			"Creating Python virtual environment",
		);
		try {
			// Ensure parent directory exists
			mkdirSync(absoluteVenvDir, { recursive: true });
			execSync(`${env.PLUGINS_PYTHON_PATH} -m venv "${absoluteVenvDir}"`, {
				stdio: "inherit",
			});
			logger.info(
				{ venvDir: absoluteVenvDir },
				"Python virtual environment created",
			);
		} catch (error) {
			logger.error(
				{ venvDir: absoluteVenvDir, error },
				"Failed to create Python virtual environment",
			);
			throw error;
		}
	} else if (!venvIsValid) {
		logger.warn(
			{
				venvDir: absoluteVenvDir,
				pythonExists: existsSync(pythonExecutable),
				pipExists: existsSync(pipExecutable),
			},
			"Python virtual environment exists but is incomplete, will attempt to fix",
		);
		// If venv exists but is incomplete, try to recreate it
		try {
			// Remove incomplete venv
			const { rmSync } = require("node:fs");
			rmSync(absoluteVenvDir, { recursive: true, force: true });
			logger.info(
				{ venvDir: absoluteVenvDir },
				"Removed incomplete venv, recreating",
			);
			// Recreate
			mkdirSync(absoluteVenvDir, { recursive: true });
			execSync(`${env.PLUGINS_PYTHON_PATH} -m venv "${absoluteVenvDir}"`, {
				stdio: "inherit",
			});
			logger.info(
				{ venvDir: absoluteVenvDir },
				"Python virtual environment recreated",
			);
		} catch (error) {
			logger.error(
				{ venvDir: absoluteVenvDir, error },
				"Failed to recreate Python virtual environment",
			);
			throw error;
		}
	} else {
		logger.debug(
			{ venvDir: absoluteVenvDir },
			"Python virtual environment already exists and is valid",
		);
	}

	// Verify pip exists and bootstrap if needed (double-check after potential recreation)
	if (!existsSync(pipExecutable)) {
		logger.warn(
			{ venvDir: absoluteVenvDir, pipExecutable },
			"pip executable not found in venv, bootstrapping pip",
		);
		try {
			// Method 1: Try ensurepip (may not work in Alpine but worth trying)
			try {
				logger.debug(
					{ venvDir: absoluteVenvDir },
					"Trying ensurepip to bootstrap pip",
				);
				execSync(`${pythonExecutable} -m ensurepip --upgrade --default-pip`, {
					stdio: "inherit",
				});
				if (existsSync(pipExecutable)) {
					logger.info(
						{ venvDir: absoluteVenvDir },
						"pip bootstrapped successfully using ensurepip",
					);
					return;
				}
				logger.debug(
					{ venvDir: absoluteVenvDir },
					"ensurepip completed but pip still not found",
				);
			} catch (ensurepipError) {
				logger.debug(
					{ venvDir: absoluteVenvDir, error: ensurepipError },
					"ensurepip not available, trying get-pip.py",
				);
			}

			// Method 2: Download and run get-pip.py (official bootstrap script)
			const { unlinkSync } = require("node:fs");
			const getPipPath = join(absoluteVenvDir, "get-pip.py");

			logger.info(
				{ venvDir: absoluteVenvDir },
				"Downloading get-pip.py to bootstrap pip",
			);
			try {
				// Download get-pip.py using curl
				execSync(
					`curl -sSL https://bootstrap.pypa.io/get-pip.py -o "${getPipPath}"`,
					{
						stdio: "inherit",
					},
				);

				logger.info(
					{ venvDir: absoluteVenvDir },
					"Running get-pip.py to install pip",
				);
				// Run get-pip.py with venv's python to install pip into the venv
				execSync(`${pythonExecutable} "${getPipPath}"`, {
					stdio: "inherit",
				});

				// Clean up
				if (existsSync(getPipPath)) {
					unlinkSync(getPipPath);
				}
			} catch (getPipError) {
				// Clean up on error
				if (existsSync(getPipPath)) {
					try {
						unlinkSync(getPipPath);
					} catch {
						// Ignore cleanup errors
					}
				}
				logger.error(
					{ venvDir: absoluteVenvDir, error: getPipError },
					"get-pip.py failed",
				);
				throw getPipError;
			}

			logger.info(
				{ venvDir: absoluteVenvDir },
				"pip installed successfully via get-pip.py",
			);

			// Verify pip now exists
			if (!existsSync(pipExecutable)) {
				// Check for pip3 as fallback
				const pip3Executable = join(absoluteVenvDir, "bin", "pip3");
				if (existsSync(pip3Executable)) {
					logger.info(
						{ venvDir: absoluteVenvDir },
						"Found pip3, creating pip symlink",
					);
					// Create symlink from pip3 to pip
					try {
						execSync(`ln -sf pip3 "${pipExecutable}"`, {
							cwd: join(absoluteVenvDir, "bin"),
						});
						logger.info(
							{ venvDir: absoluteVenvDir },
							"Created pip symlink from pip3",
						);
					} catch (symlinkError) {
						logger.warn(
							{ venvDir: absoluteVenvDir, error: symlinkError },
							"Failed to create pip symlink",
						);
					}
				}

				if (!existsSync(pipExecutable)) {
					const error = new Error(
						`pip installation completed but executable still not found at ${pipExecutable}`,
					);
					logger.error(
						{
							venvDir: absoluteVenvDir,
							pipExecutable,
							pip3Exists: existsSync(pip3Executable),
						},
						error.message,
					);
					throw error;
				}
			}
		} catch (pipError) {
			logger.error(
				{ venvDir: absoluteVenvDir, error: pipError },
				"Failed to bootstrap pip in venv",
			);
			throw new Error(
				`Python venv created but pip could not be installed: ${pipError}`,
			);
		}
	} else {
		logger.debug(
			{ venvDir: absoluteVenvDir },
			"pip executable found, no bootstrap needed",
		);
	}
};

/**
 * Gets the Python executable path from virtual environment
 */
const getPythonExecutable = (venvDir: string): string => {
	const absoluteVenvDir = resolvePath(venvDir);
	const isWindows = process.platform === "win32";
	return isWindows
		? join(absoluteVenvDir, "Scripts", "python.exe")
		: join(absoluteVenvDir, "bin", "python");
};

/**
 * Gets the pip executable path from virtual environment
 */
const getPipExecutable = (venvDir: string): string => {
	const absoluteVenvDir = resolvePath(venvDir);
	const isWindows = process.platform === "win32";
	return isWindows
		? join(absoluteVenvDir, "Scripts", "pip.exe")
		: join(absoluteVenvDir, "bin", "pip");
};

const installPythonPlugin = (
	venvDir: string,
	pluginConfig: PluginConfig,
): void => {
	const absoluteVenvDir = resolvePath(venvDir);
	ensurePythonVenv(absoluteVenvDir);
	const pipExecutable = getPipExecutable(absoluteVenvDir);

	// Verify pip exists
	if (!existsSync(pipExecutable)) {
		const errorMsg = `pip executable not found at ${pipExecutable}. Virtual environment may be incomplete.`;
		logger.error({ venvDir: absoluteVenvDir, pipExecutable }, errorMsg);
		throw new Error(errorMsg);
	}

	let installCommand: string;
	let logSpecSafe: string;

	if (pluginConfig.isGitUrl && pluginConfig.gitUrl) {
		let gitUrl = pluginConfig.gitUrl;

		// Use a dedicated token for cloning repos
		if (env.PLUGINS_GIT_TOKEN && gitUrl.includes("github.com")) {
			gitUrl = injectGitToken(gitUrl, env.PLUGINS_GIT_TOKEN);
		}

		installCommand = `"${pipExecutable}" install "${gitUrl}"`;
		logSpecSafe = maskGitUrlSecret(gitUrl);

		logger.info(
			{ gitUrl: logSpecSafe, type: "python", venvDir: absoluteVenvDir },
			"Installing Python plugin from Git",
		);
	} else {
		const pkg = pluginConfig.version
			? `${pluginConfig.name}==${pluginConfig.version}`
			: pluginConfig.name;
		installCommand = `"${pipExecutable}" install "${pkg}"`;
		logSpecSafe = pkg;

		logger.info(
			{ packageSpec: logSpecSafe, type: "python", venvDir: absoluteVenvDir },
			"Installing Python plugin from PyPI",
		);
	}

	try {
		execSync(installCommand, { stdio: "inherit", cwd: absoluteVenvDir });
		logger.info(
			{ packageSpec: logSpecSafe, type: "python" },
			"Python plugin installed successfully",
		);
	} catch (error) {
		// Never log raw command or unmasked URLs
		logger.error(
			{
				packageSpec: logSpecSafe,
				type: "python",
				error,
				venvDir: absoluteVenvDir,
			},
			"Failed to install Python plugin",
		);
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
			logger.error(
				{ pluginName, error, type: "node" },
				"Failed to load Node.js plugin",
			);
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
	venvDir: string,
): Promise<void> => {
	return new Promise((resolve, reject) => {
		// Resolve venvDir to absolute path
		const absoluteVenvDir: string = resolvePath(venvDir);

		// Use the separate Python script file instead of inline code
		// Resolve script path relative to dist directory (more reliable than __dirname)
		const distDir = process.cwd();
		const scriptPath = join(distDir, "dist", "lib", "plugin-loader.py");

		if (!existsSync(scriptPath)) {
			const errorMsg = `Plugin loader script not found at ${scriptPath}`;
			pluginLogger.error({ pluginName, scriptPath }, errorMsg);
			reject(new Error(errorMsg));
			return;
		}

		// Verify Python executable exists
		if (!existsSync(pythonExecutable)) {
			const errorMsg = `Python executable not found at ${pythonExecutable}. Virtual environment may not be properly set up.`;
			pluginLogger.error(
				{ pluginName, pythonExecutable, venvDir: absoluteVenvDir },
				errorMsg,
			);
			reject(new Error(errorMsg));
			return;
		}

		// Get site-packages directory from venv using pip show
		const isWindows = process.platform === "win32";
		let actualSitePackages: string = isWindows
			? join(absoluteVenvDir, "Lib", "site-packages")
			: join(absoluteVenvDir, "lib", "python3", "site-packages");

		pluginLogger.debug(
			{ pluginName, venvDir: absoluteVenvDir, defaultPath: actualSitePackages },
			"Locating Python site-packages directory",
		);

		try {
			const pipExecutable = getPipExecutable(absoluteVenvDir);

			// Verify pip exists before using it
			if (!existsSync(pipExecutable)) {
				pluginLogger.warn(
					{ pluginName, pipExecutable, venvDir: absoluteVenvDir },
					"pip executable not found, will try to discover site-packages manually",
				);
			} else {
				pluginLogger.debug(
					{ pluginName, pipExecutable },
					"Querying pip for package location",
				);

				const output = execSync(`"${pipExecutable}" show ${pluginName}`, {
					encoding: "utf-8",
					cwd: absoluteVenvDir,
				});
				// Parse Location from pip show output
				const locationMatch = output.match(/^Location:\s*(.+)$/m);
				if (locationMatch) {
					actualSitePackages = locationMatch[1].trim();
					pluginLogger.debug(
						{ pluginName, sitePackages: actualSitePackages },
						"Found site-packages from pip show",
					);
				}
			}
		} catch (error) {
			pluginLogger.debug(
				{ pluginName, error },
				"Could not query pip, will try fallback paths",
			);
		}

		// If pip show didn't work, try to discover site-packages manually
		if (!existsSync(actualSitePackages)) {
			pluginLogger.debug(
				{ pluginName, attemptedPath: actualSitePackages },
				"Default site-packages path doesn't exist, searching for Python version directory",
			);

			const libDir = join(absoluteVenvDir, isWindows ? "Lib" : "lib");
			if (existsSync(libDir)) {
				try {
					// Try to find Python version directory
					const libContents = execSync(`ls -1 "${libDir}"`, {
						encoding: "utf-8",
					})
						.trim()
						.split("\n");
					pluginLogger.debug(
						{ pluginName, libDir, contents: libContents },
						"Checking lib directory for Python version",
					);
					for (const item of libContents) {
						const testPath = join(libDir, item, "site-packages");
						if (existsSync(testPath)) {
							actualSitePackages = testPath;
							pluginLogger.debug(
								{ pluginName, sitePackages: actualSitePackages },
								"Found site-packages in lib subdirectory",
							);
							break;
						}
					}
				} catch (error) {
					pluginLogger.debug(
						{ pluginName, libDir, error },
						"Could not list lib directory",
					);
				}
			}
		}

		// Verify the path exists before running Python script
		if (!existsSync(actualSitePackages)) {
			const errorMsg = `Site-packages directory does not exist: ${actualSitePackages}. Virtual environment may not be properly set up. Please ensure plugins are installed.`;
			pluginLogger.error(
				{
					pluginName,
					sitePackages: actualSitePackages,
					venvDir: absoluteVenvDir,
					pythonExecutable,
					venvExists: existsSync(absoluteVenvDir),
				},
				errorMsg,
			);
			reject(new Error(errorMsg));
			return;
		}

		pluginLogger.info(
			{
				pluginName,
				scriptPath,
				pythonExecutable,
				sitePackages: actualSitePackages,
			},
			"Executing Python plugin loader script",
		);

		// Use unbuffered Python output (-u flag) to ensure print statements are flushed immediately
		// Pass environment variables to Python subprocess
		const child = spawn(
			pythonExecutable,
			["-u", scriptPath, pluginName, actualSitePackages],
			{
				stdio: ["pipe", "pipe", "pipe"],
				env: {
					...process.env,
				},
			},
		);

		let _stdout = "";
		let stderr = "";

		child.stdout.on("data", (data) => {
			const output = data.toString();
			_stdout += output;
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
			// Parse stderr output - Info/Debug messages vs actual errors
			output
				.split("\n")
				.filter((line: string) => line.trim())
				.forEach((line: string) => {
					const trimmed = line.trim();
					// Check if it's an Info or Debug message
					if (trimmed.startsWith("Info:") || trimmed.startsWith("Debug:")) {
						const level = trimmed.startsWith("Info:") ? "info" : "debug";
						const message = trimmed.replace(/^(Info|Debug):\s*/, "");
						pluginLogger[level](
							{ pluginName, message, type: "python" },
							`Python plugin ${level}`,
						);
					} else if (
						trimmed.startsWith("Error:") ||
						trimmed.startsWith("Warning:")
					) {
						const level = trimmed.startsWith("Error:") ? "error" : "warn";
						const message = trimmed.replace(/^(Error|Warning):\s*/, "");
						pluginLogger[level](
							{ pluginName, error: message, type: "python" },
							`Python plugin ${level}`,
						);
					} else {
						// Unknown format, log as debug
						pluginLogger.debug(
							{ pluginName, output: trimmed, type: "python" },
							"Python plugin stderr output",
						);
					}
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
					reject(
						new Error(
							`Python plugin ${pluginName} exited with code ${code}: ${stderr}`,
						),
					);
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
	const absoluteVenvDir = resolvePath(venvDir);

	// Ensure venv exists and pip is bootstrapped before trying to use it
	ensurePythonVenv(absoluteVenvDir);

	const pipExecutable = getPipExecutable(absoluteVenvDir);
	const pythonExecutable = getPythonExecutable(absoluteVenvDir);

	try {
		const output = execSync(`${pipExecutable} list --format=json`, {
			encoding: "utf-8",
		});

		const packages = JSON.parse(output) as Array<{
			name: string;
			version: string;
		}>;

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
				await executePythonPlugin(pythonExecutable, pkg.name, absoluteVenvDir);

				// Register plugin for scheduling
				const { registerPlugin } = await import("./plugin-scheduler");
				registerPlugin(pkg.name, "python", async () => {
					await executePythonPluginMain(
						pythonExecutable,
						pkg.name,
						absoluteVenvDir,
					);
				});
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
			logger.error(
				{ pluginConfig, error },
				"Failed to install Node.js plugin, continuing",
			);
		}
	}

	for (const pluginConfig of pythonPlugins) {
		try {
			installPlugin(pluginsDir, pythonVenvDir, pluginConfig);
		} catch (error) {
			failed++;
			logger.error({ error }, "Failed to install Python plugin, continuing");
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
 * Executes a Python plugin's main() function
 */
const executePythonPluginMain = async (
	pythonExecutable: string,
	pluginName: string,
	venvDir: string,
): Promise<void> => {
	return new Promise((resolve, reject) => {
		const absoluteVenvDir: string = resolvePath(venvDir);
		// Resolve script path relative to dist directory (more reliable than __dirname)
		const distDir = process.cwd();
		const scriptPath = join(distDir, "dist", "lib", "plugin-runner.py");

		if (!existsSync(scriptPath)) {
			const errorMsg = `Plugin runner script not found at ${scriptPath}`;
			pluginLogger.error({ pluginName, scriptPath }, errorMsg);
			reject(new Error(errorMsg));
			return;
		}

		if (!existsSync(pythonExecutable)) {
			const errorMsg = `Python executable not found at ${pythonExecutable}`;
			pluginLogger.error({ pluginName, pythonExecutable }, errorMsg);
			reject(new Error(errorMsg));
			return;
		}

		// Get site-packages directory
		const isWindows = process.platform === "win32";
		let actualSitePackages: string = isWindows
			? join(absoluteVenvDir, "Lib", "site-packages")
			: join(absoluteVenvDir, "lib", "python3", "site-packages");

		// Try to discover site-packages
		try {
			const pipExecutable = getPipExecutable(absoluteVenvDir);
			if (existsSync(pipExecutable)) {
				const output = execSync(`"${pipExecutable}" show ${pluginName}`, {
					encoding: "utf-8",
					cwd: absoluteVenvDir,
				});
				const locationMatch = output.match(/^Location:\s*(.+)$/m);
				if (locationMatch) {
					actualSitePackages = locationMatch[1].trim();
				}
			}
		} catch (_error) {
			// Fallback to default path
		}

		// If default path doesn't exist, try to find it
		if (!existsSync(actualSitePackages)) {
			const libDir = join(absoluteVenvDir, isWindows ? "Lib" : "lib");
			if (existsSync(libDir)) {
				try {
					const libContents = execSync(`ls -1 "${libDir}"`, {
						encoding: "utf-8",
					})
						.trim()
						.split("\n");
					for (const item of libContents) {
						const testPath = join(libDir, item, "site-packages");
						if (existsSync(testPath)) {
							actualSitePackages = testPath;
							break;
						}
					}
				} catch {
					// Ignore errors
				}
			}
		}

		if (!existsSync(actualSitePackages)) {
			reject(
				new Error(
					`Site-packages directory does not exist: ${actualSitePackages}`,
				),
			);
			return;
		}

		pluginLogger.info(
			{
				pluginName,
				scriptPath,
				pythonExecutable,
				sitePackages: actualSitePackages,
			},
			"Executing Python plugin main() function",
		);

		// Pass environment variables to the Python subprocess
		// Include all current process environment variables
		// Map plugin-specific env vars to plugin-expected names
		const childEnv = {
			...process.env,
			// Map PLUGINS_STRAPI_API_TOKEN to STRAPI_API_TOKEN if plugin expects it
			STRAPI_API_TOKEN: env.PLUGINS_STRAPI_API_TOKEN || "",
			STRAPI_API_URL: env.STRAPI_URL || "http://localhost:1337/api",
		};

		const child = spawn(
			pythonExecutable,
			["-u", scriptPath, pluginName, actualSitePackages],
			{
				stdio: ["pipe", "pipe", "pipe"],
				env: childEnv,
			},
		);

		let stdout = "";
		let stderr = "";

		child.stdout.on("data", (data) => {
			const output = data.toString();
			stdout += output;
			output
				.split("\n")
				.filter((line: string) => line.trim())
				.forEach((line: string) => {
					pluginLogger.info(
						{ pluginName, message: line.trim(), type: "python" },
						"Python plugin output",
					);
				});
		});

		child.stderr.on("data", (data) => {
			const output = data.toString();
			stderr += output;
			output
				.split("\n")
				.filter((line: string) => line.trim())
				.forEach((line: string) => {
					const trimmed = line.trim();
					if (trimmed.startsWith("Info:") || trimmed.startsWith("Debug:")) {
						const level = trimmed.startsWith("Info:") ? "info" : "debug";
						const message = trimmed.replace(/^(Info|Debug):\s*/, "");
						pluginLogger[level](
							{ pluginName, message, type: "python" },
							`Python plugin ${level}`,
						);
					} else if (trimmed.startsWith("Error:")) {
						const message = trimmed.replace(/^Error:\s*/, "");
						pluginLogger.error(
							{ pluginName, error: message, type: "python" },
							"Python plugin error",
						);
					} else if (
						trimmed.includes("Traceback") ||
						trimmed.includes("Exception") ||
						trimmed.includes("Error")
					) {
						// Log tracebacks and exceptions as errors
						pluginLogger.error(
							{ pluginName, error: trimmed, type: "python" },
							"Python plugin error/traceback",
						);
					} else {
						pluginLogger.debug(
							{ pluginName, output: trimmed, type: "python" },
							"Python plugin stderr output",
						);
					}
				});
		});

		child.on("close", (code) => {
			if (code === 0) {
				resolve();
			} else {
				const errorMessage =
					stderr.trim() || stdout.trim() || `Process exited with code ${code}`;
				const error = new Error(
					`Python plugin ${pluginName} main() exited with code ${code}: ${errorMessage}`,
				);
				pluginLogger.error(
					{ pluginName, exitCode: code, stderr, stdout, type: "python" },
					"Python plugin main() execution failed",
				);
				reject(error);
			}
		});

		child.on("error", (error) => {
			pluginLogger.error(
				{ pluginName, error: error.message, type: "python" },
				"Failed to spawn Python plugin process",
			);
			reject(error);
		});
	});
};

/**
 * Exports the plugin logger for use by plugins
 * Plugins can use this logger to log their own messages
 */
export { pluginLogger, executePythonPluginMain };
