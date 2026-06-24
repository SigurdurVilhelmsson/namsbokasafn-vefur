<!--
  LicenceBadge — compact, linked per-book licence pill.

  Data-driven: the only difference between a CC BY and a CC BY-NC-SA badge is the
  licence code passed in. Used on the catalogue (Tier-1 cards) and book-home so no
  aggregate view ever presents a blanket licence claim.
-->
<script lang="ts">
	import { getLicence, type LicenceCode } from '$lib/data/licences';

	let {
		code,
		size = 'sm'
	}: {
		code: LicenceCode;
		size?: 'sm' | 'md';
	} = $props();

	let licence = $derived(getLicence(code));
</script>

<a
	class="licence-badge"
	class:restricted={licence.nonCommercial}
	class:md={size === 'md'}
	href={licence.url}
	target="_blank"
	rel="license noopener noreferrer"
	title={licence.fullName}
>
	{licence.name}
</a>

<style>
	.licence-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.125rem 0.5rem;
		font-size: 0.6875rem;
		font-weight: 600;
		line-height: 1.4;
		letter-spacing: 0.01em;
		white-space: nowrap;
		border-radius: var(--radius-sm, 0.375rem);
		border: 1px solid var(--accent-subtle, #e6cfa0);
		background: var(--accent-subtle, #faf3e3);
		color: var(--accent-hover, #a8741a);
		text-decoration: none;
		transition:
			background 0.15s ease,
			border-color 0.15s ease;
	}

	.licence-badge:hover {
		background: var(--accent-light, #f3e3c4);
		border-color: var(--accent-color, #c78c20);
	}

	.licence-badge.md {
		font-size: 0.8125rem;
		padding: 0.1875rem 0.625rem;
	}

	/* NC-SA books get a distinct (non-blue) tone so a restricted licence reads
	   differently at a glance — kept within the warm palette, not semantic blue. */
	.licence-badge.restricted {
		border-color: #d8b4a0;
		background: #f6ece4;
		color: #8a4b2f;
	}

	.licence-badge.restricted:hover {
		background: #f0ddd0;
		border-color: #c08a6a;
	}

	:global(.dark) .licence-badge {
		border-color: #5a4413;
		background: #2a2418;
		color: var(--accent-color, #e8a838);
	}

	:global(.dark) .licence-badge.restricted {
		border-color: #5a3a28;
		background: #2a1f18;
		color: #d9a584;
	}
</style>
