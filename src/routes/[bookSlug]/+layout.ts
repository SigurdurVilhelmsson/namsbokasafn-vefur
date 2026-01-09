import type { LayoutLoad } from './$types';

// Book configurations - would be loaded from a config file in production
const BOOKS: Record<
	string,
	{
		title: string;
		slug: string;
		color: string;
		features?: {
			periodicTable?: boolean;
		};
	}
> = {
	efnafraedi: {
		title: 'Efnafræði',
		slug: 'efnafraedi',
		color: 'blue',
		features: {
			periodicTable: true
		}
	},
	liffraeði: {
		title: 'Líffræði',
		slug: 'liffraedi',
		color: 'green'
	}
};

export const load: LayoutLoad = async ({ params }) => {
	const book = BOOKS[params.bookSlug] || null;

	return {
		book,
		bookSlug: params.bookSlug
	};
};
