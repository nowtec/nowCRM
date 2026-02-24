import cron from "node-cron";
import { env } from "@/common/utils/env-config";
import { pluginLogger } from "./plugin-manager";
import { logger } from "@/server";

type PluginInstance = {
	name: string;
	type: "python" | "node";
	execute: () => Promise<void>;
};

const pluginInstances = new Map<string, PluginInstance>();
const scheduledTasks = new Map<string, cron.ScheduledTask>();

/**
 * Parses plugin schedules from environment variable
 * Format: JSON object with plugin names as keys and cron expressions as values
 * Example: {"bexio-sync-plugin": "0 2 * * *"}
 */
const parsePluginSchedules = (): Record<string, string> => {
	try {
		let schedulesJson = env.PLUGINS_SCHEDULES || "{}";
		
		// Remove surrounding quotes if present (common in .env files)
		schedulesJson = schedulesJson.trim();
		if (
			(schedulesJson.startsWith('"') && schedulesJson.endsWith('"')) ||
			(schedulesJson.startsWith("'") && schedulesJson.endsWith("'"))
		) {
			schedulesJson = schedulesJson.slice(1, -1);
		}
		
		// Unescape quotes if they were escaped
		schedulesJson = schedulesJson.replace(/\\"/g, '"').replace(/\\'/g, "'");
		
		const parsed = JSON.parse(schedulesJson) as Record<string, string>;
		
		// Validate that all values are strings
		const result: Record<string, string> = {};
		for (const [key, value] of Object.entries(parsed)) {
			if (typeof value === "string") {
				result[key] = value;
			} else {
				logger.warn(
					{ pluginName: key, value },
					"Invalid schedule value (must be string), skipping",
				);
			}
		}
		
		return result;
	} catch (error) {
		logger.error(
			{ error, schedulesJson: env.PLUGINS_SCHEDULES },
			"Failed to parse plugin schedules",
		);
		return {};
	}
};

/**
 * Registers a plugin instance for scheduling
 */
export const registerPlugin = (
	pluginName: string,
	type: "python" | "node",
	execute: () => Promise<void>,
): void => {
	pluginInstances.set(pluginName, {
		name: pluginName,
		type,
		execute,
	});
	logger.info({ pluginName, type }, "Plugin registered for scheduling");
};

/**
 * Executes a scheduled plugin
 */
const executeScheduledPlugin = async (pluginName: string): Promise<void> => {
	const plugin = pluginInstances.get(pluginName);
	if (!plugin) {
		pluginLogger.warn({ pluginName }, "Plugin not found for scheduled execution");
		return;
	}

	pluginLogger.info({ pluginName, type: plugin.type }, "Executing scheduled plugin");
	
	try {
		await plugin.execute();
		pluginLogger.info({ pluginName, type: plugin.type }, "Scheduled plugin execution completed");
	} catch (error) {
		pluginLogger.error(
			{ pluginName, type: plugin.type, error },
			"Scheduled plugin execution failed",
		);
	}
};

/**
 * Starts the plugin scheduler
 */
export const startPluginScheduler = (): void => {
	const schedules = parsePluginSchedules();
	
	if (Object.keys(schedules).length === 0) {
		logger.info("No plugin schedules configured");
		return;
	}

	logger.info({ schedules }, "Starting plugin scheduler");

	for (const [pluginName, cronExpression] of Object.entries(schedules)) {
		// Validate cron expression
		if (!cron.validate(cronExpression)) {
			logger.error(
				{ pluginName, cronExpression },
				"Invalid cron expression, skipping schedule",
			);
			continue;
		}

		// Check if plugin is registered
		if (!pluginInstances.has(pluginName)) {
			logger.warn(
				{ pluginName, cronExpression },
				"Plugin not registered, skipping schedule",
			);
			continue;
		}

		// Schedule the plugin
		const task = cron.schedule(cronExpression, () => {
			executeScheduledPlugin(pluginName).catch((error) => {
				logger.error({ pluginName, error }, "Unhandled error in scheduled plugin");
			});
		});

		scheduledTasks.set(pluginName, task);
		logger.info(
			{ pluginName, cronExpression },
			"Plugin scheduled successfully",
		);
	}

	logger.info(
		{ scheduledCount: scheduledTasks.size },
		"Plugin scheduler started",
	);
};

/**
 * Stops all scheduled tasks (for graceful shutdown)
 */
export const stopPluginScheduler = (): void => {
	for (const [pluginName, task] of scheduledTasks.entries()) {
		task.stop();
		logger.info({ pluginName }, "Stopped scheduled plugin task");
	}
	scheduledTasks.clear();
	pluginInstances.clear();
};
