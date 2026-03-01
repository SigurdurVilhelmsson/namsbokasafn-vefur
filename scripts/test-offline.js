/**
 * Test script to verify offline caching functionality
 * Run with: node scripts/test-offline.js
 */

const BASE_URL = 'http://localhost:4175';

/**
 * Extract image URLs from markdown content (mirrors offline.ts logic)
 */
function extractImageUrls(markdown, basePath) {
	const imageRegex = /!\[.*?\]\((.*?)\)/g;
	const urls = [];
	let match;

	while ((match = imageRegex.exec(markdown)) !== null) {
		let url = match[1];
		// Handle relative paths
		if (url.startsWith('./') || url.startsWith('../') || !url.startsWith('/')) {
			url = url.replace(/^\.\//, '');
			url = `${basePath}/${url}`;
		}
		// Normalize paths
		url = url.replace(/\/+/g, '/');
		urls.push(url);
	}

	return urls;
}

async function testOfflineCache() {
	console.log('Testing offline caching functionality...\n');

	// 1. Fetch the TOC
	console.log('1. Fetching table of contents...');
	const tocResponse = await fetch(`${BASE_URL}/content/efnafraedi/toc.json`);
	if (!tocResponse.ok) {
		console.error('   FAIL: Could not fetch TOC');
		return false;
	}
	const toc = await tocResponse.json();
	console.log(`   OK: Found ${toc.chapters.length} chapters`);

	// 2. Collect all content URLs (simulating downloadBook)
	const contentUrls = [`/content/efnafraedi/toc.json`, `/content/efnafraedi/glossary.json`];
	const allImageUrls = new Set();

	for (const chapter of toc.chapters) {
		for (const section of chapter.sections) {
			const sectionUrl = `/content/efnafraedi/chapters/${chapter.slug}/${section.file}`;
			contentUrls.push(sectionUrl);
		}
	}
	console.log(`\n2. Total content files: ${contentUrls.length}`);

	// 3. Fetch all content and extract images
	console.log('\n3. Fetching all content files and extracting images...');
	let successCount = 0;
	let failCount = 0;

	for (const url of contentUrls) {
		try {
			const response = await fetch(`${BASE_URL}${url}`);
			if (response.ok) {
				const content = await response.text();
				successCount++;

				// Extract images from markdown files
				if (url.endsWith('.md')) {
					const basePath = url.substring(0, url.lastIndexOf('/'));
					const images = extractImageUrls(content, basePath);
					images.forEach((img) => allImageUrls.add(img));
				}
			} else {
				console.log(`   FAIL: ${url} (status ${response.status})`);
				failCount++;
			}
		} catch (e) {
			console.log(`   ERROR: ${url} - ${e.message}`);
			failCount++;
		}
	}
	console.log(`   Content: ${successCount} OK, ${failCount} FAIL`);
	console.log(`   Found ${allImageUrls.size} unique images across all content`);

	// 4. Test all image URLs
	console.log('\n4. Verifying all image URLs are accessible...');
	let imageSuccess = 0;
	let imageFail = 0;
	const failedImages = [];

	for (const url of allImageUrls) {
		try {
			const response = await fetch(`${BASE_URL}${url}`);
			if (response.ok) {
				imageSuccess++;
			} else {
				imageFail++;
				failedImages.push({ url, status: response.status });
			}
		} catch (e) {
			imageFail++;
			failedImages.push({ url, error: e.message });
		}
	}
	console.log(`   Images: ${imageSuccess} OK, ${imageFail} FAIL`);

	if (failedImages.length > 0) {
		console.log('\n   Failed images:');
		failedImages.forEach((f) => {
			console.log(`   - ${f.url} (${f.status || f.error})`);
		});
	}

	// 5. Calculate total size
	console.log('\n5. Calculating total download size...');
	let totalBytes = 0;

	for (const url of contentUrls) {
		try {
			const response = await fetch(`${BASE_URL}${url}`);
			if (response.ok) {
				const content = await response.text();
				totalBytes += content.length;
			}
		} catch {
			// ignore
		}
	}

	for (const url of allImageUrls) {
		try {
			const response = await fetch(`${BASE_URL}${url}`);
			if (response.ok) {
				const blob = await response.blob();
				totalBytes += blob.size;
			}
		} catch {
			// ignore
		}
	}

	const sizeMB = (totalBytes / 1024 / 1024).toFixed(2);
	console.log(`   Total size: ${totalBytes} bytes (${sizeMB} MB)`);

	// 6. Summary
	console.log('\n================================');
	console.log('SUMMARY');
	console.log('================================');
	console.log(`Total chapters: ${toc.chapters.length}`);
	console.log(`Total content files: ${contentUrls.length}`);
	console.log(`Total images: ${allImageUrls.size}`);
	console.log(`Total download size: ${sizeMB} MB`);
	console.log(`Content success rate: ${((successCount / contentUrls.length) * 100).toFixed(1)}%`);
	console.log(
		`Image success rate: ${((imageSuccess / allImageUrls.size) * 100).toFixed(1)}%`
	);

	const allSuccess = failCount === 0 && imageFail === 0;
	if (allSuccess) {
		console.log('\n✓ All files accessible - offline caching should work correctly');
	} else {
		console.log('\n✗ Some files failed - check the failures above');
	}

	return allSuccess;
}

testOfflineCache()
	.then((success) => {
		process.exit(success ? 0 : 1);
	})
	.catch((e) => {
		console.error('Test failed:', e);
		process.exit(1);
	});
