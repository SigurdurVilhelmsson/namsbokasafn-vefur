/**
 * Copy content from public folder to static folder
 *
 * This script copies book content from ./public/content to ./static/content
 * It's run before dev and build to ensure content is available.
 *
 * Usage: node scripts/copy-content.js
 */

import { cpSync, existsSync, mkdirSync, rmSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');

// Source: public/content in this project
const sourceDir = resolve(projectRoot, 'public', 'content');
// Destination: static/content for SvelteKit
const destDir = resolve(projectRoot, 'static', 'content');

function copyContent() {
	// Check if source exists
	if (!existsSync(sourceDir)) {
		console.error(`Source directory not found: ${sourceDir}`);
		console.error('Make sure public/content/ exists in the project root.');
		process.exit(1);
	}

	// Remove existing destination if it exists
	if (existsSync(destDir)) {
		console.log('Removing existing static/content...');
		rmSync(destDir, { recursive: true, force: true });
	}

	// Create destination directory
	mkdirSync(destDir, { recursive: true });

	// Copy content
	console.log(`Copying content from ${sourceDir}`);
	console.log(`                  to ${destDir}`);

	try {
		cpSync(sourceDir, destDir, {
			recursive: true,
			preserveTimestamps: true
		});

		console.log('Content copied successfully!');
	} catch (error) {
		console.error('Failed to copy content:', error.message);
		process.exit(1);
	}
}

copyContent();
