/**
 * Theme & Settings Persistence Tests
 * Tests: theme toggle, dark mode persistence across page reload, font settings
 */

import { test, expect, type Page } from '@playwright/test';
import { firstModuleSection, publishedBook } from './helpers/content-fixtures';

test.describe('Theme Toggle', () => {
	test('should toggle dark mode on landing page', async ({ page }) => {
		await page.goto('/');
		await page.waitForLoadState('networkidle');
		await expect(page.getByRole('heading', { name: /Námsbækur/i })).toBeVisible({
			timeout: 15000
		});

		// Initially should be light mode (no 'dark' class on html)
		const isDarkInitially = await page.evaluate(() =>
			document.documentElement.classList.contains('dark')
		);
		expect(isDarkInitially).toBe(false);

		// Click theme toggle
		const themeToggle = page.locator('button.theme-toggle');
		await expect(themeToggle).toBeVisible();
		await themeToggle.click();

		// Should now be dark mode
		const isDarkAfterToggle = await page.evaluate(() =>
			document.documentElement.classList.contains('dark')
		);
		expect(isDarkAfterToggle).toBe(true);
	});

	test('should persist theme across page reload', async ({ page }) => {
		await page.goto('/');
		await page.waitForLoadState('networkidle');
		await expect(page.getByRole('heading', { name: /Námsbækur/i })).toBeVisible({
			timeout: 15000
		});

		// Toggle to dark mode
		const themeToggle = page.locator('button.theme-toggle');
		await themeToggle.click();

		// Verify dark class is set
		await expect(page.locator('html.dark')).toBeAttached();

		// Verify localStorage was updated
		const storedSettings = await page.evaluate(() =>
			localStorage.getItem('namsbokasafn:settings')
		);
		expect(storedSettings).toBeTruthy();
		const parsed = JSON.parse(storedSettings!);
		expect(parsed.theme).toBe('dark');

		// Reload the page
		await page.reload();
		await page.waitForLoadState('networkidle');
		await expect(page.getByRole('heading', { name: /Námsbækur/i })).toBeVisible({
			timeout: 15000
		});

		// Should still be dark mode after reload
		const isDarkAfterReload = await page.evaluate(() =>
			document.documentElement.classList.contains('dark')
		);
		expect(isDarkAfterReload).toBe(true);
	});

	test('should persist theme when navigating between pages', async ({ page }) => {
		await page.goto('/');
		await page.waitForLoadState('networkidle');
		await expect(page.getByRole('heading', { name: /Námsbækur/i })).toBeVisible({
			timeout: 15000
		});

		// Toggle to dark mode
		const themeToggle = page.locator('button.theme-toggle');
		await themeToggle.click();
		await expect(page.locator('html.dark')).toBeAttached();

		// Navigate to a book
		const bookLink = page.getByRole('link', { name: /Efnafræði/i }).first();
		if (await bookLink.isVisible({ timeout: 5000 }).catch(() => false)) {
			await bookLink.click();
			await page.waitForLoadState('networkidle');

			// Dark mode should persist on book page
			const isDark = await page.evaluate(() =>
				document.documentElement.classList.contains('dark')
			);
			expect(isDark).toBe(true);
		}
	});

	test('should have accessible theme toggle button', async ({ page }) => {
		await page.goto('/');
		await page.waitForLoadState('networkidle');
		await expect(page.getByRole('heading', { name: /Námsbækur/i })).toBeVisible({
			timeout: 15000
		});

		const themeToggle = page.locator('button[aria-label="Skipta um þema"]');
		await expect(themeToggle).toBeVisible();
		await expect(themeToggle).toBeEnabled();
	});
});

test.describe('Settings Persistence', () => {
	test('should store settings in localStorage', async ({ page }) => {
		await page.goto('/');
		await page.waitForLoadState('networkidle');
		await expect(page.getByRole('heading', { name: /Námsbækur/i })).toBeVisible({
			timeout: 15000
		});

		// Check that settings key exists after page load
		const hasSettings = await page.evaluate(() => {
			const stored = localStorage.getItem('namsbokasafn:settings');
			if (!stored) return false;
			const settings = JSON.parse(stored);
			return (
				typeof settings.theme === 'string' &&
				typeof settings.fontSize === 'string' &&
				typeof settings.fontFamily === 'string'
			);
		});
		expect(hasSettings).toBe(true);
	});

	test('should have default light theme on fresh visit', async ({ page }) => {
		// Clear storage before navigating
		await page.goto('/');
		await page.evaluate(() => localStorage.clear());
		await page.reload();
		await page.waitForLoadState('networkidle');
		await expect(page.getByRole('heading', { name: /Námsbækur/i })).toBeVisible({
			timeout: 15000
		});

		const isDark = await page.evaluate(() =>
			document.documentElement.classList.contains('dark')
		);
		expect(isDark).toBe(false);
	});
});

// ---------------------------------------------------------------------------------------
// Settings groups say which option is selected (plan step S1.3, register UI-03)
// ---------------------------------------------------------------------------------------

const SECTION = (() => {
	const book = publishedBook();
	return book ? firstModuleSection(book) : null;
})();

const SEGMENTS = {
	Línubil: { key: 'lineHeight', labels: { normal: 'Venjulegt', relaxed: 'Rýmra', loose: 'Rúmt' } },
	Línubreidd: { key: 'lineWidth', labels: { narrow: 'Þröngt', medium: 'Miðlungs', wide: 'Breitt' } }
} as const;

async function openSettings(page: Page) {
	await page.goto(SECTION!);
	await page.waitForLoadState('networkidle');
	await page.getByRole('button', { name: 'Stillingar', exact: true }).filter({ visible: true }).first().click();
	const dialog = page.getByRole('dialog');
	await expect(dialog).toBeVisible();
	return dialog;
}

async function stored(page: Page, key: string): Promise<string> {
	return page.evaluate((k) => JSON.parse(localStorage.getItem('namsbokasafn:settings') || '{}')[k], key);
}

test.describe('Settings groups say which option is selected (UI-03)', () => {
	test.use({ serviceWorkers: 'block' });

	for (const viewport of [
		{ width: 390, height: 844 },
		{ width: 1280, height: 800 }
	]) {
		test(`at ${viewport.width} px: Leturgerð, Línubil and Línubreidd are named groups`, async ({ page }) => {
			test.skip(!SECTION, 'no published book is synced');
			await page.setViewportSize(viewport);
			const dialog = await openSettings(page);
			for (const name of ['Leturgerð', 'Línubil', 'Línubreidd']) {
				await expect(dialog.getByRole('group', { name, exact: true })).toBeVisible();
			}
		});

		for (const [group, { key, labels }] of Object.entries(SEGMENTS)) {
			test(`at ${viewport.width} px: ${group} marks the stored value, with aria-pressed and a check mark`, async ({
				page
			}) => {
				test.skip(!SECTION, 'no published book is synced');
				await page.setViewportSize(viewport);
				const dialog = await openSettings(page);
				const buttons = dialog.getByRole('group', { name: group, exact: true }).getByRole('button');
				const label = (value: string) => labels[value as keyof typeof labels];

				const check = async () => {
					const value = await stored(page, key);
					for (const [v, text] of Object.entries(labels)) {
						const button = buttons.filter({ hasText: text });
						await expect(button, `${text}`).toHaveAttribute('aria-pressed', v === value ? 'true' : 'false');
						await expect(button.locator('svg'), `${text}'s check mark`).toHaveCount(v === value ? 1 : 0);
					}
				};

				await check();
				const current = await stored(page, key);
				const target = Object.keys(labels).find((v) => v !== current)!;
				await buttons.filter({ hasText: label(target) }).click();
				await expect.poll(() => stored(page, key)).toBe(target);
				await check();
			});
		}
	}

	test('the Leturgerð radios take the ring colour (--focus-ring), not the browser default', async ({ page }) => {
		test.skip(!SECTION, 'no published book is synced');
		const dialog = await openSettings(page);
		const radio = dialog.getByRole('group', { name: 'Leturgerð', exact: true }).getByRole('radio').first();
		const { accent, token } = await radio.evaluate((el) => {
			// Resolve --focus-ring beside the radio, then remove the probe.
			const probe = document.createElement('span');
			probe.style.color = 'var(--focus-ring)';
			el.parentElement!.append(probe);
			const token = getComputedStyle(probe).color;
			probe.remove();
			return { accent: getComputedStyle(el).accentColor, token };
		});
		expect(accent, 'not the browser default').not.toBe('auto');
		expect(accent, 'var(--focus-ring)').toBe(token);
	});

	// The switches are named by their visible labels (WCAG 2.5.3) and described by their
	// help lines, so PED-27's disclaimer under the bionic switch is heard too.
	for (const [name, description] of [
		['Orðasafnsmerkingar', 'Undirstrika hugtök úr orðasafni í texta'],
		['Enskt heiti hugtaka', /^Sýna enska heitið á eftir hugtaki/],
		['Feitletra upphaf orða', 'Útlitsstilling. Ekki hefur verið sýnt að hún bæti lestur']
	] as const) {
		test(`the '${name}' switch is named by its label and described by its help line`, async ({ page }) => {
			test.skip(!SECTION, 'no published book is synced');
			const dialog = await openSettings(page);
			const sw = dialog.getByRole('switch', { name, exact: true });
			await expect(sw).toBeVisible();
			await expect(sw).toHaveAccessibleDescription(description);
			const checked = await sw.getAttribute('aria-checked');
			await sw.click();
			await expect(sw, 'the name stays the same when the switch flips').toHaveAccessibleName(name);
			await expect(sw).toHaveAttribute('aria-checked', checked === 'true' ? 'false' : 'true');
			await sw.click();
		});
	}
});
