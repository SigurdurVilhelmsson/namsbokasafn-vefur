<!--
  Gögnin þín og persónuvernd: what the reader stores, what leaves the device,
  and how to erase it (plan step S3.3; register PED-14, PED-39; decision D03).

  Written from a request log of a production-env build, 2026-10-26: the only
  requests to another host were GoatCounter's script and one /count per full
  page load. If a feature ever sends anything else, D03's data rule in
  CLAUDE.md needs a new decision first, and this page must change with it.

  D20: proposed. Every string on this page is new and waits for [USER]'s check.
-->
<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { getAvailableBooks } from '$lib/types/book';

	// The erase button is on every book's Námsgreining page and clears every book,
	// so any published book's page will do.
	const firstBook = getAvailableBooks()[0];
	const greiningHref = firstBook ? `/${firstBook.slug}/greining/` : null;

	const description =
		'Hvað Námsbókasafn geymir í vafranum þínum, hvað fer af tækinu og hvernig þú eyðir því.';
</script>

<svelte:head>
	<title>Gögnin þín og persónuvernd | Námsbókasafn</title>
	<meta name="description" content={description} />
	<meta property="og:title" content="Gögnin þín og persónuvernd | Námsbókasafn" />
	<meta property="og:description" content={description} />
	<meta property="og:type" content="website" />
	<link rel="canonical" href="https://namsbokasafn.is/personuvernd/" />
	<meta property="og:url" content="https://namsbokasafn.is/personuvernd/" />
</svelte:head>

<div class="privacy-page">
	<header class="privacy-header">
		<div class="container">
			<a href="/" class="back-link">
				<Icon name="arrow-left" size="sm" />
				Til baka
			</a>
		</div>
	</header>

	<main class="privacy-content">
		<div class="container">
			<h1>Gögnin þín og persónuvernd</h1>
			<p class="lead">
				Framvinda þín, athugasemdir, minniskort og annað sem þú gerir í Námsbókasafni eru geymd í
				þessum vafra, á þessu tæki, og eru ekki send til okkar. Af tækinu fara aðeins beiðnir um
				síðurnar sjálfar, talning síðuflettinga og endurgjöf ef þú sendir hana. Nánar hér fyrir neðan.
			</p>

			<section aria-labelledby="stored">
				<h2 id="stored">Það sem vafrinn geymir</h2>
				<p>Vafrinn geymir þetta svo þú getir haldið áfram þar sem frá var horfið:</p>
				<ul>
					<li>framvindu í bókunum: hvaða hlutar eru lesnir, hvar þú varst og bókamerki;</li>
					<li>yfirstrikanir og athugasemdir sem þú skrifar;</li>
					<li>minniskort og hvernig þér gekk að rifja þau upp;</li>
					<li>námsmarkmið sem þú hefur merkt sem lokið, og hve vel þú telur þig kunna þau;</li>
					<li>æfingadæmi sem þú hefur opnað og hvernig þér gekk með þau;</li>
					<li>lestrartölfræði í Námsgreiningu: hve lengi og hvenær þú lest, lotur, röð daga og markmið;</li>
					<li>síðustu leitarorð;</li>
					<li>stillingar, til dæmis letur, línubil og litaþema;</li>
					<li>bækur sem þú hefur sótt til að lesa án nettengingar.</li>
				</ul>
				<p>
					Vafrinn geymir líka afrit af síðum og myndum sem þú hefur skoðað, svo þær opnist hraðar.
					Námsbókasafn notar engar vafrakökur.
				</p>
			</section>

			<section aria-labelledby="leaves">
				<h2 id="leaves">Það sem fer af tækinu</h2>
				<h3>Vefþjónn Námsbókasafns</h3>
				<p>
					Síðurnar og efni bókanna eru sótt af vefþjóni Námsbókasafns. Eins og flestir vefþjónar
					skráir hann beiðnir um síðurnar og texta bókanna (ekki myndir): IP-tölu, tíma, slóð,
					upplýsingar um vafrann og hvaðan var vísað á síðuna. Skrárnar eru geymdar í um 90 daga.
				</p>
				<h3>Talning síðuflettinga</h3>
				<p>
					Við teljum síðuflettingar með
					<a href="https://www.goatcounter.com/help/privacy" target="_blank" rel="noopener noreferrer"
						>GoatCounter</a
					>, án vafrakaka. Þegar síða er hlaðin inn í vafrann (oftast ekki þegar þú smellir á tengil
					innan vefsins) sendir vafrinn GoatCounter slóð hennar, líka það sem stendur á eftir „?“ í
					henni, titil hennar, breidd skjásins, síðuna sem vísaði þér hingað ef hún er til, og merki
					um hvort vafrinn virðist sjálfvirkur. Sendingin ber líka, eins og allar beiðnir á netinu, IP-tölu þína og upplýsingar
					um vafrann. Samkvæmt persónuverndarstefnu GoatCounter vistar það hvorki IP-töluna né allar
					upplýsingarnar um vafrann, heldur les úr þeim land, tungumál, vafra og stýrikerfi.
					IP-töluna geymir það aðeins í vinnsluminni, í allt að 8 klukkustundir, svo að sami gestur sé
					ekki talinn tvisvar. Gögnin eru geymd á netþjónum í Finnlandi og Þýskalandi.
				</p>
				<h3>Endurgjöf</h3>
				<p>
					<a href="/feedback/">Endurgjafarformið</a> sendir ekkert sjálft. Það opnar tölvupóstforritið
					þitt með skilaboðunum, og þau berast okkur aðeins ef þú sendir póstinn. Þá sjáum við
					netfangið þitt og það sem þú skrifaðir.
				</p>
				<h3>Útflutningur</h3>
				<p>
					Ef þú flytur út athugasemdir eða tölfræði verður skráin til á tækinu þínu. Hún fer ekki
					lengra nema þú sendir hana.
				</p>
				<p>Annað sem þú gerir hér fer ekki af tækinu.</p>
			</section>

			<section aria-labelledby="erase">
				<h2 id="erase">Að eyða gögnunum</h2>
				<ul>
					<li>
						Í {#if greiningHref}<a href={greiningHref}>Námsgreiningu</a>{:else}Námsgreiningu{/if} er
						hnappurinn „Eyða öllum gögnum á þessu tæki“. Hann eyðir öllu sem talið er upp hér að ofan,
						í öllum bókunum, líka niðurhöluðum bókum og afritum vefsins af síðum og myndum. Eftir standa
						forrit vefsins sjálfs, listi yfir síður og myndir sem vefurinn sótti nýlega, og afrit sem
						vafrinn geymir sjálfur í skyndiminni sínu.
					</li>
					<li>
						Til að eyða öllu, líka því, skaltu eyða gögnum vefsvæðisins namsbokasafn.is og skyndiminni
						vafrans í stillingum hans.
					</li>
					<li>
						Á sameiginlegu tæki, til dæmis í skólanum, er best að nota einkaglugga (huliðsglugga).
						Þá eyðist allt þegar öllum einkagluggum er lokað. Skrár sem þú flytur út eða vistar á
						tækinu, til dæmis myndir, verða þó eftir.
					</li>
					<li>Gögnin fylgja vafranum: þau flytjast ekki á milli tækja eða vafra.</li>
				</ul>
			</section>

			<section aria-labelledby="more">
				<h2 id="more">Gott að vita</h2>
				<p>Þessi síða lýsir því hvernig vefurinn virkar. Hún er ekki lögfræðiráðgjöf.</p>
				<p>Spurningar? Sendu okkur línu með <a href="/feedback/">endurgjafarforminu</a>.</p>
				<p class="updated">Síðast uppfært 26. október 2026.</p>
			</section>
		</div>
	</main>

	<footer class="privacy-footer">
		<div class="container">
			<p>Námsbókasafn - Opnar kennslubækur á íslensku</p>
		</div>
	</footer>
</div>

<style>
	.privacy-page {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		background: var(--bg-primary);
	}

	.container {
		max-width: 42rem;
		margin: 0 auto;
		padding: 0 1rem;
	}

	.privacy-header {
		background: var(--bg-secondary);
		border-bottom: 1px solid var(--border-color);
		padding: 1rem 0;
	}

	.back-link {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		color: var(--text-secondary);
		text-decoration: none;
		font-size: 0.875rem;
	}

	.back-link:hover {
		color: var(--text-primary);
		text-decoration: underline;
	}

	.privacy-content {
		flex: 1;
		padding: 2rem 0 3rem;
		color: var(--text-primary);
		line-height: 1.65;
	}

	h1 {
		font-size: 1.75rem;
		font-weight: 600;
		margin: 0 0 0.75rem;
	}

	.lead {
		font-size: 1.0625rem;
		color: var(--text-secondary);
		margin: 0 0 2rem;
	}

	section {
		margin-bottom: 2rem;
	}

	h2 {
		font-size: 1.25rem;
		font-weight: 600;
		margin: 0 0 0.75rem;
		padding-bottom: 0.375rem;
		border-bottom: 1px solid var(--border-color);
	}

	h3 {
		font-size: 1rem;
		font-weight: 600;
		margin: 1.25rem 0 0.375rem;
	}

	p {
		margin: 0 0 0.75rem;
	}

	ul {
		margin: 0 0 0.75rem;
		padding-left: 1.25rem;
		list-style: disc;
	}

	li {
		margin-bottom: 0.375rem;
	}

	/* Links in running text: bronze, underlined at rest (S2.1). */
	.privacy-content a {
		color: var(--accent-strong);
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	.privacy-content a:hover {
		text-decoration-thickness: 2px;
	}

	.updated {
		font-size: 0.875rem;
		color: var(--text-secondary);
	}

	.privacy-footer {
		background: var(--bg-secondary);
		border-top: 1px solid var(--border-color);
		padding: 1rem 0;
		text-align: center;
	}

	.privacy-footer p {
		font-size: 0.8rem;
		color: var(--text-secondary);
		margin: 0;
	}
</style>
