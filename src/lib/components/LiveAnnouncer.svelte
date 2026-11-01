<!--
  LiveAnnouncer - the app's one polite status region (plan step S4.2, UI-01). Mounted once in
  the root layout and always present; components speak through announce() in
  $lib/stores/announcer.
-->
<script lang="ts">
	import { announcement } from '$lib/stores/announcer';
</script>

<div class="sr-only" role="status" aria-live="polite" aria-atomic="true">{$announcement}</div>
