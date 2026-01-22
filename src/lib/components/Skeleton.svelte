<!--
  Skeleton - Reusable skeleton loading components

  Provides visual placeholder content while actual content loads,
  reducing perceived loading time and layout shift.
-->
<script lang="ts" context="module">
	export type SkeletonVariant = 'text' | 'heading' | 'paragraph' | 'card' | 'sidebar' | 'content' | 'list-item' | 'chapter';
</script>

<script lang="ts">
	export let variant: SkeletonVariant = 'text';
	export let lines: number = 3;
	export let className: string = '';
</script>

{#if variant === 'text'}
	<!-- Single line of text -->
	<div class="skeleton-line h-4 rounded {className}"></div>

{:else if variant === 'heading'}
	<!-- Heading placeholder -->
	<div class="skeleton-line h-8 w-3/4 rounded {className}"></div>

{:else if variant === 'paragraph'}
	<!-- Multiple lines of text -->
	<div class="space-y-3 {className}">
		{#each Array(lines) as _, i}
			<div
				class="skeleton-line h-4 rounded"
				style="width: {i === lines - 1 ? '60%' : '100%'}"
			></div>
		{/each}
	</div>

{:else if variant === 'list-item'}
	<!-- List item with icon and text -->
	<div class="flex items-center gap-3 {className}">
		<div class="skeleton-line h-6 w-6 rounded-full flex-shrink-0"></div>
		<div class="flex-1 space-y-2">
			<div class="skeleton-line h-4 w-3/4 rounded"></div>
			<div class="skeleton-line h-3 w-1/2 rounded"></div>
		</div>
	</div>

{:else if variant === 'chapter'}
	<!-- Chapter with sections -->
	<div class="space-y-2 {className}">
		<div class="skeleton-line h-6 w-2/3 rounded mb-3"></div>
		{#each Array(4) as _}
			<div class="flex items-center gap-3 pl-4">
				<div class="skeleton-line h-5 w-5 rounded-full flex-shrink-0"></div>
				<div class="skeleton-line h-4 flex-1 rounded"></div>
			</div>
		{/each}
	</div>

{:else if variant === 'card'}
	<!-- Card placeholder -->
	<div class="rounded-xl border border-gray-200 dark:border-gray-700 p-6 {className}">
		<div class="skeleton-line h-6 w-1/3 rounded mb-4"></div>
		<div class="space-y-3">
			<div class="skeleton-line h-4 rounded"></div>
			<div class="skeleton-line h-4 w-5/6 rounded"></div>
			<div class="skeleton-line h-4 w-4/6 rounded"></div>
		</div>
	</div>

{:else if variant === 'sidebar'}
	<!-- Sidebar/TOC placeholder -->
	<div class="space-y-6 p-4 {className}">
		{#each Array(3) as _, chapterIndex}
			<div class="space-y-2">
				<!-- Chapter title -->
				<div class="skeleton-line h-5 w-3/4 rounded"></div>
				<!-- Sections -->
				<div class="space-y-2 pl-4">
					{#each Array(chapterIndex === 0 ? 5 : 3) as _}
						<div class="flex items-center gap-2">
							<div class="skeleton-line h-4 w-4 rounded-full flex-shrink-0"></div>
							<div class="skeleton-line h-3 flex-1 rounded" style="width: {60 + Math.random() * 30}%"></div>
						</div>
					{/each}
				</div>
			</div>
		{/each}
	</div>

{:else if variant === 'content'}
	<!-- Full content area (markdown content) -->
	<div class="space-y-6 {className}">
		<!-- Title -->
		<div class="skeleton-line h-10 w-2/3 rounded"></div>

		<!-- First paragraph -->
		<div class="space-y-3">
			{#each Array(4) as _, i}
				<div
					class="skeleton-line h-4 rounded"
					style="width: {i === 3 ? '70%' : '100%'}"
				></div>
			{/each}
		</div>

		<!-- Subheading -->
		<div class="skeleton-line h-7 w-1/2 rounded mt-8"></div>

		<!-- Second paragraph -->
		<div class="space-y-3">
			{#each Array(3) as _, i}
				<div
					class="skeleton-line h-4 rounded"
					style="width: {i === 2 ? '85%' : '100%'}"
				></div>
			{/each}
		</div>

		<!-- Image placeholder -->
		<div class="skeleton-line h-48 rounded-lg"></div>

		<!-- Third paragraph -->
		<div class="space-y-3">
			{#each Array(5) as _, i}
				<div
					class="skeleton-line h-4 rounded"
					style="width: {i === 4 ? '60%' : '100%'}"
				></div>
			{/each}
		</div>
	</div>
{/if}

<style>
	.skeleton-line {
		background: linear-gradient(
			90deg,
			var(--skeleton-base, #e5e7eb) 0%,
			var(--skeleton-shine, #f3f4f6) 50%,
			var(--skeleton-base, #e5e7eb) 100%
		);
		background-size: 200% 100%;
		animation: skeleton-shimmer 1.5s ease-in-out infinite;
	}

	:global(.dark) .skeleton-line {
		--skeleton-base: #374151;
		--skeleton-shine: #4b5563;
	}

	@keyframes skeleton-shimmer {
		0% {
			background-position: 200% 0;
		}
		100% {
			background-position: -200% 0;
		}
	}
</style>
