/**
 * Canonical icon registry — single source for the unified icon set.
 *
 * Per docs/design/icon-guidance-2026-06.md: one Lucide set, one wrapper
 * (`Icon.svelte`), three sizes. Glyphs are bundled from the `lucide` package
 * (no runtime CDN), so a set-wide change is one import here.
 *
 * Each entry is a Lucide `IconNode`: an array of [tag, attributes] children
 * that `Icon.svelte` renders inside its own standard `<svg>`.
 */

import {
	Search,
	Settings,
	Sun,
	Moon,
	Menu,
	X,
	ExternalLink,
	ChevronLeft,
	ChevronRight,
	ChevronDown,
	Info,
	TriangleAlert,
	Lightbulb,
	CircleCheck,
	BookMarked,
	SquarePen,
	BookOpen,
	Download,
	CreditCard,
	ClipboardCheck,
	Grid2x2,
	ChartColumn,
	Timer,
	CircleHelp,
	Target,
	RectangleEllipsis,
	Atom,
	Check,
	Clock,
	RefreshCw,
	Sparkles,
	Trash2,
	Funnel,
	Plus,
	FileText,
	List,
	House,
	Minimize,
	LayoutGrid,
	Keyboard,
	ArrowLeft,
	ArrowRight,
	CircleAlert,
	Wifi,
	WifiOff,
	ShieldCheck,
	Eye,
	EyeOff,
	Star,
	BadgeCheck,
	Flame,
	CircleX,
	CirclePlay,
	TrendingUp,
	FlaskConical,
	CircleDot,
	Zap,
	Box,
	Highlighter,
	MessageSquareText,
	type IconNode
} from 'lucide';

/** A Lucide icon node: [tag, attributes] children of an `<svg>`. */
export type { IconNode };

/**
 * Canonical Lucide names (icon-guidance §4). The `name` prop of `Icon.svelte`
 * is one of these — semantic roles that share a glyph reuse the same name.
 */
export const ICON_NODES = {
	// Navigation & chrome
	search: Search,
	settings: Settings,
	sun: Sun,
	moon: Moon,
	menu: Menu,
	x: X,
	'external-link': ExternalLink,
	'chevron-left': ChevronLeft,
	'chevron-right': ChevronRight,
	'chevron-down': ChevronDown,
	// Reading & content blocks
	info: Info,
	'triangle-alert': TriangleAlert,
	lightbulb: Lightbulb,
	'circle-check': CircleCheck,
	'book-marked': BookMarked,
	'square-pen': SquarePen,
	'book-open': BookOpen,
	download: Download,
	// Study tools
	'credit-card': CreditCard,
	'clipboard-check': ClipboardCheck,
	'grid-2x2': Grid2x2,
	'chart-column': ChartColumn,
	timer: Timer,
	// Learning interventions
	'circle-help': CircleHelp,
	target: Target,
	'rectangle-ellipsis': RectangleEllipsis,
	// Extended set — discretionary additions (2026-06-23); see icon-handback §8.
	// Lucide glyphs for app roles the §4 inventory didn't cover (`atom` ratified §7).
	atom: Atom,
	check: Check,
	clock: Clock,
	'refresh-cw': RefreshCw,
	sparkles: Sparkles,
	'trash-2': Trash2,
	funnel: Funnel,
	plus: Plus,
	'file-text': FileText,
	list: List,
	house: House,
	minimize: Minimize,
	'layout-grid': LayoutGrid,
	keyboard: Keyboard,
	'arrow-left': ArrowLeft,
	'arrow-right': ArrowRight,
	'circle-alert': CircleAlert,
	wifi: Wifi,
	'wifi-off': WifiOff,
	'shield-check': ShieldCheck,
	eye: Eye,
	'eye-off': EyeOff,
	star: Star,
	'badge-check': BadgeCheck,
	flame: Flame,
	'circle-x': CircleX,
	'circle-play': CirclePlay,
	'trending-up': TrendingUp,
	'flask-conical': FlaskConical,
	'circle-dot': CircleDot,
	zap: Zap,
	box: Box,
	highlighter: Highlighter,
	'message-square-text': MessageSquareText
} satisfies Record<string, IconNode>;

export type IconName = keyof typeof ICON_NODES;

export const ICON_NAMES = Object.keys(ICON_NODES) as IconName[];

/** Icon size step (icon-guidance §2). Maps to `--icon-sm/md/lg`. */
export type IconSize = 'sm' | 'md' | 'lg';

const ICON_SIZES: readonly IconSize[] = ['sm', 'md', 'lg'];

/** Default size for an unspecified icon (icon-guidance §2: md). */
export const DEFAULT_ICON_SIZE: IconSize = 'md';

/**
 * Return the icon node for a name, or null if the name is not in the set.
 * Lets `Icon.svelte` fail soft (render nothing) instead of throwing.
 */
export function getIconNode(name: string): IconNode | null {
	return Object.prototype.hasOwnProperty.call(ICON_NODES, name)
		? ICON_NODES[name as IconName]
		: null;
}

/** Normalise a size prop to a valid step, defaulting to md. */
export function resolveIconSize(size?: string): IconSize {
	return ICON_SIZES.includes(size as IconSize) ? (size as IconSize) : DEFAULT_ICON_SIZE;
}
