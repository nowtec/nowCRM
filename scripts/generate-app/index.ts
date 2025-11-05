#!/usr/bin/env node

import { mkdir, readFile, writeFile, readdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname, resolve, relative } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface AppConfig {
	name: string;
	nameUpper: string;
	description?: string;
}

const TEMPLATE_DIR = join(__dirname, 'templates', 'node');
const APPS_DIR = resolve(process.cwd(), 'apps');

function processTemplate(content: string, config: AppConfig, filePath: string): string {
	let processed = content
		.replace(/\{\{APP_NAME\}\}/g, config.name)
		.replace(/\{\{APP_DESCRIPTION\}\}/g, config.description || `${config.name} application`)
		.replace(/\{\{APP_NAME_KEBAB\}\}/g, config.name.toLowerCase().replace(/\s+/g, '-'))
		.replace(/\{\{NODE_APP\}\}/g, config.nameUpper)
		// Replace NODE_APP with uppercase app name (for environment variables)
		.replace(/NODE_APP/g, config.nameUpper);

	// Special handling for tsconfig.json - fix the path reference
	if (filePath.includes('tsconfig.json')) {
		processed = processed.replace(
			/"path":\s*"\.\.\/\.\.\/\.\.\/\.\.\/libs\/services"/g,
			'"path": "../../libs/services"'
		);
	}

	return processed;
}

async function writeTemplate(
	targetPath: string,
	content: string,
	config: AppConfig
): Promise<void> {
	const processed = processTemplate(content, config, targetPath);
	const fullPath = join(APPS_DIR, config.name, targetPath);
	const dir = dirname(fullPath);
	await mkdir(dir, { recursive: true });
	await writeFile(fullPath, processed, 'utf-8');
}

async function copyTemplateFiles(
	templateDir: string,
	targetDir: string,
	config: AppConfig
): Promise<void> {
	const entries = await readdir(templateDir, { withFileTypes: true });

	for (const entry of entries) {
		const sourcePath = join(templateDir, entry.name);
		const relativePath = relative(TEMPLATE_DIR, sourcePath);
		const targetPath = join(targetDir, relativePath);

		if (entry.isDirectory()) {
			await mkdir(targetPath, { recursive: true });
			await copyTemplateFiles(sourcePath, targetPath, config);
		} else if (entry.isFile()) {
			const content = await readFile(sourcePath, 'utf-8');
			await writeTemplate(relativePath, content, config);
		}
	}
}

async function generateApp(config: AppConfig): Promise<void> {
	const appDir = join(APPS_DIR, config.name);

	// Check if app already exists
	if (existsSync(appDir)) {
		throw new Error(`App "${config.name}" already exists in ${appDir}`);
	}

	console.log(`Generating node app: ${config.name}...`);

	// Create app directory
	await mkdir(appDir, { recursive: true });

	// Copy all template files recursively
	await copyTemplateFiles(TEMPLATE_DIR, appDir, config);

	console.log(`✅ App "${config.name}" generated successfully at ${appDir}`);
	console.log(`\nInstalling dependencies...`);

	// Run pnpm install automatically
	try {
		const { stdout, stderr } = await execAsync('pnpm install', {
			cwd: process.cwd(),
		});
		if (stdout) console.log(stdout);
		if (stderr) console.error(stderr);
		console.log(`✅ Dependencies installed successfully`);
	} catch (error) {
		console.error(`⚠️  Failed to install dependencies automatically:`);
		console.error(error instanceof Error ? error.message : String(error));
		console.log(`\nPlease run manually: pnpm install`);
	}

	console.log(`\nNext steps:`);
	console.log(`  1. cd apps/${config.name}`);
	console.log(`  2. Update package.json dependencies as needed`);
}

function parseArgs(): AppConfig {
	const args = process.argv.slice(2);

	if (args.length < 1 || !args[0] || args[0].trim() === '') {
		console.error('❌ Error: App name is required');
		console.error('');
		console.error('Usage: generate-app <name> [description]');
		console.error('  name: The name of the app (kebab-case recommended, required)');
		console.error('  description: Optional description for the app');
		process.exit(1);
	}

	const name = args[0].trim();
	const description = args[1]?.trim();

	if (!name) {
		console.error('❌ Error: App name cannot be empty');
		process.exit(1);
	}

	// Convert app name to uppercase for NODE_APP variables
	const nameUpper = name.toUpperCase().replace(/-/g, '_').replace(/\s+/g, '_');

	return { name, nameUpper, description };
}

async function main(): Promise<void> {
	try {
		const config = parseArgs();
		await generateApp(config);
	} catch (error) {
		console.error('Error:', error instanceof Error ? error.message : String(error));
		process.exit(1);
	}
}

main();

