import type { PageLoad } from './$types';
import { bookEntries, redirectToBookHome } from '$lib/utils/bookHomeRedirect';

// No page lives at this level; without this stub the live site answered 403
export const prerender = true;
export const entries = bookEntries;
export const load: PageLoad = ({ params }) => redirectToBookHome(params.bookSlug);
