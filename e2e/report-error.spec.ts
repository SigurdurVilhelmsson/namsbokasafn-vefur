/**
 * 'Tilkynna villu' on a machine-translated section, the /feedback prefill and the
 * privacy page (plan step S3.3; register PED-15, PED-14).
 *
 * Before S3.3 the MT notice was text only, /feedback had no prefill, and neither
 * /feedback, /for-teachers nor any privacy note could be reached from the reader.
 * The section is found from toc.json (the first one without `reviewed: true`),
 * never by slug, and its expected fields come from its own URL.
 */
import { expect, test } from '@playwright/test';
import { machineTranslatedSection, publishedBook } from './helpers/content-fixtures';

const BOOK = publishedBook();
const SECTION = BOOK ? machineTranslatedSection(BOOK) : null;

test.use({ viewport: { width: 390, height: 844 } });

test.describe("'Tilkynna villu' (PED-15)", () => {
	test("the MT notice links /feedback with the section's own route params, and the form opens prefilled", async ({
		page
	}) => {
		test.skip(!SECTION, 'no machine-translated section in a published book');
		const [bok, , kafli, hluti] = SECTION!.split('/').filter(Boolean);

		await page.goto(SECTION!);
		const link = page.locator('aside.preview-banner').getByRole('link', { name: 'Tilkynna villu' });
		await expect(link).toBeVisible();
		const href = new URL((await link.getAttribute('href'))!, page.url());
		expect(href.pathname).toBe('/feedback/');
		expect(Object.fromEntries(href.searchParams)).toEqual({ tegund: 'translation_error', bok, kafli, hluti });

		await link.click();
		await expect(page).toHaveURL((u) => u.pathname === '/feedback/');
		await expect(page.locator('#book')).toHaveValue(bok);
		await expect(page.locator('#chapter')).toHaveValue(kafli);
		await expect(page.locator('#section')).toHaveValue(hluti);
		await expect(page.getByRole('radio', { name: /Villa í þýðingu/ })).toBeChecked();
	});

	test('a hard load of the link prefills the form too', async ({ page }) => {
		test.skip(!SECTION, 'no machine-translated section in a published book');
		const [bok, , kafli, hluti] = SECTION!.split('/').filter(Boolean);
		await page.goto(`/feedback/?tegund=translation_error&bok=${bok}&kafli=${kafli}&hluti=${hluti}`);
		await expect(page.locator('#section')).toHaveValue(hluti);
		await expect(page.locator('#book')).toHaveValue(bok);
	});

	test('values the form does not offer are dropped, not shown', async ({ page }) => {
		// The valid type proves the prefill ran: the empty fields are then its verdict,
		// not the server-rendered form before hydration. (A <select> cannot show a value
		// it does not offer, so #book proves nothing here.)
		await page.goto('/feedback/?tegund=translation_error&bok=not-a-book&kafli=%3Cb%3E1%3C%2Fb%3E&hluti=a%20b');
		await expect(page.getByRole('radio', { name: /Villa í þýðingu/ })).toBeChecked();
		await expect(page.locator('#chapter')).toHaveValue('');
		await expect(page.locator('#section')).toHaveValue('');
		await expect(page.locator('.back-link')).toHaveAttribute('href', '/');
	});

	test("'Til baka' returns to the section the report came from", async ({ page }) => {
		test.skip(!SECTION, 'no machine-translated section in a published book');
		const [bok, , kafli, hluti] = SECTION!.split('/').filter(Boolean);
		await page.goto(`/feedback/?tegund=translation_error&bok=${bok}&kafli=${kafli}&hluti=${hluti}`);
		await expect(page.locator('.back-link')).toHaveAttribute('href', SECTION!);
	});

	test('the form says it opens the e-mail before the student sends anything', async ({ page }) => {
		await page.goto('/feedback/');
		const note = page.locator('.email-note');
		await expect(note).toContainText('opnast tölvupóstforritið þitt');
		// Above the button, so it is read first.
		const noteBox = (await note.boundingBox())!;
		const buttonBox = (await page.getByRole('button', { name: 'Senda endurgjöf' }).boundingBox())!;
		expect(noteBox.y).toBeLessThan(buttonBox.y);
	});
});

test.describe('The privacy page (PED-14)', () => {
	test("is reachable from the reader's navigation, with /feedback and /for-teachers", async ({ page }) => {
		test.skip(!SECTION, 'no machine-translated section in a published book');
		await page.goto(SECTION!);
		// The toggle's handler exists only once the page has hydrated (as in focus-sidebar-tabs).
		await page.waitForLoadState('networkidle');
		await page.getByRole('button', { name: 'Opna/loka valmynd', exact: true }).click();
		const sidebar = page.locator('aside.sidebar');
		await expect(sidebar).toHaveCSS('visibility', 'visible');
		await expect(sidebar.getByRole('link', { name: 'Endurgjöf' })).toHaveAttribute('href', '/feedback/');
		await expect(sidebar.getByRole('link', { name: 'Leiðbeiningar fyrir kennara' })).toHaveAttribute('href', '/for-teachers/');
		await expect(sidebar.getByRole('link', { name: 'Námsgreining' })).toHaveAttribute('href', /\/greining\/$/);
		await sidebar.getByRole('link', { name: 'Gögnin þín og persónuvernd' }).click();
		await expect(page).toHaveURL((u) => u.pathname === '/personuvernd/');
		await expect(page.getByRole('heading', { level: 1 })).toHaveText('Gögnin þín og persónuvernd');
	});

	test('is linked from the catalogue footer', async ({ page }) => {
		await page.goto('/');
		await page.locator('footer').getByRole('link', { name: 'Gögnin þín og persónuvernd' }).click();
		await expect(page).toHaveURL((u) => u.pathname === '/personuvernd/');
		await expect(page.getByRole('heading', { level: 1 })).toHaveText('Gögnin þín og persónuvernd');
	});

	test('names GoatCounter, the feedback e-mail and the erase button, and says it is not legal advice', async ({
		page
	}) => {
		await page.goto('/personuvernd/');
		const main = page.locator('main');
		await expect(main).toContainText('GoatCounter');
		await expect(main).toContainText('opnar tölvupóstforritið');
		await expect(main).toContainText('Eyða öllum gögnum á þessu tæki');
		await expect(main.getByRole('link', { name: 'Námsgreiningu' })).toHaveAttribute('href', /\/greining\/$/);
		await expect(main).toContainText('ekki lögfræðiráðgjöf');
	});
});
