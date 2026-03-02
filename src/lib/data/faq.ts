/**
 * FAQ items for the landing page.
 * All text in Icelandic (UI language). Code comments in English.
 * Answers use HTML strings for inline links — safe because data is static/developer-controlled.
 */

export interface FaqItem {
	id: string;
	question: string;
	answer: string;
}

export const faqItems: FaqItem[] = [
	{
		id: 'hvad-er',
		question: 'Hvað er Námsbókasafn?',
		answer:
			'Námsbókasafn er safn íslenskra þýðinga á opnum kennslubókum frá OpenStax, Rice University. Verkefnið miðar að því að gera hágæða námsefni aðgengilegt öllum íslenskum nemendum og kennurum, gjaldfrjálst og á íslensku.'
	},
	{
		id: 'okeypis',
		question: 'Er þetta ókeypis?',
		answer:
			'Já, allt efni er gjaldfrjálst. Bækurnar eru gefnar út undir <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">Creative Commons Attribution 4.0 (CC BY 4.0)</a> leyfi, sem þýðir að þú mátt nota, afrita, aðlaga og dreifa efninu að vild, svo framarlega sem þú tilgreinir hvaðan efnið kemur.'
	},
	{
		id: 'kennsla',
		question: 'Má ég nota þetta í kennslunni minni?',
		answer:
			'Auðvitað! Þú getur notað efnið beint í kennslu, aðlagað það að þínum þörfum, búið til verkefni út frá því, eða notað það sem viðbótarefni. CC BY 4.0 leyfið tryggir að kennarar hafi fullan ráðstöfunarrétt yfir efninu.'
	},
	{
		id: 'thyding',
		question: 'Hvernig er efnið þýtt?',
		answer:
			'Við notum blöndu af gervigreindarþýðingu (Miðeind/Erlendur) og yfirlestri sérfræðinga. Vélþýðing gefur góðan grunn sem yfirlesari með sérþekkingu á efninu fer yfir og lagar. Þetta tryggir bæði hröð afköst og gæði, sérstaklega hvað varðar faghugtök í raungreinum.'
	},
	{
		id: 'forskodun',
		question: 'Hvað eru vélþýddir kaflar (forskoðun)?',
		answer:
			'Sumir kaflar eru merktir sem „forskoðun" — þeir hafa verið vélþýddir en hafa ekki farið í gegnum yfirlestur. Gæði þeirra eru því misjöfn, en þeir gefa góða hugmynd um efnið. Ef þú hefur áhuga á að taka þátt í að lesa yfir efni, hafðu samband!'
	},
	{
		id: 'gervigreind',
		question: 'Get ég notað efnið með gervigreind eins og NotebookLM?',
		answer:
			'Já! Efnið hentar vel til notkunar með gervigreindarverkfærum. Þú getur til dæmis hlaðið efninu inn í Google NotebookLM og fengið íslenskan gervigreindaraðstoðarkennara í efnafræði sem byggir á námsefninu.'
	},
	{
		id: 'studningur',
		question: 'Hvernig get ég stutt verkefnið?',
		answer:
			'Besta leiðin er að nota efnið og deila því! Ef þú ert kennari, segðu samstarfsfólki frá. Ef þú hefur áhuga á að aðstoða við þýðingar eða yfirlestur, sendu póst á <a href="mailto:sigurdurev@kvenno.is">sigurdurev@kvenno.is</a>. Við erum alltaf að leita að fólki sem vill leggja sitt af mörkum.'
	},
	{
		id: 'hvers-vegna-openstax',
		question: 'Hvers vegna OpenStax?',
		answer:
			'OpenStax gefur út ritrýndar námsbækur fyrir framhalds- og háskóla, sem eru opnar og ókeypis. Þær eru notaðar af milljónum nemenda um allan heim. CC BY 4.0 leyfið gerir okkur kleift að þýða og aðlaga efnið löglega og án kostnaðar. Þetta er sama leið og OpenStax Polska hefur farið með góðum árangri.'
	},
	{
		id: 'tengt-openstax',
		question: 'Er Námsbókasafn tengt OpenStax?',
		answer:
			'Námsbókasafn er sjálfstætt verkefni og ekki formlega tengt OpenStax eða Rice University. Við byggjum á opnu efni þeirra samkvæmt CC BY 4.0 leyfi og höfum verið í samskiptum við OpenStax sem hefur lýst yfir stuðningi við verkefnið.'
	}
];
