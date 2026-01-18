# Námsbókasafn (Textbook Library)

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](https://www.typescriptlang.org/)
[![SvelteKit](https://img.shields.io/badge/SvelteKit-2.21-orange)](https://kit.svelte.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Content License: CC BY 4.0](https://img.shields.io/badge/Content%20License-CC%20BY%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by/4.0/)

Opnar kennslubækur á íslensku - gagnvirkur veflesari fyrir íslenskar þýðingar á OpenStax kennslubókum.

---

## Um verkefnið

**Námsbókasafn** er opið verkefni sem gerir hágæða kennslubækur aðgengilegar íslenskum nemendum og kennurum án endurgjalds. Verkefnið byggir á opnum kennslubókum frá OpenStax og býður upp á gagnvirkan veflesara með fjölmörgum námsverkfærum.

### Tiltækar bækur

| Bók | Staða | Framvinda |
|-----|-------|-----------|
| **Efnafræði** (Chemistry 2e) | Í boði | 2 af 21 köflum |
| **Líffræði** (Biology 2e) | Væntanlegt | - |

### Helstu eiginleikar

- **Fjölbókakerfi** - Einn lesari fyrir margar kennslubækur
- **Hrein lesupplifun** - Faglegur lestrargluggur hannaður fyrir lengri námslestur
- **Minniskort (SRS)** - Gagnvirk minniskort með bilun endurtekningu (spaced repetition)
- **Orðasafn** - Ítarlegt orðasafn fyrir hverja bók með íslenskri stafrófsröðun
- **Lesframvinda** - Fylgist með framvindu og vistar bókamerki
- **Leit** - Öflug leit í öllu efni með Ctrl/Cmd+K flýtilykli
- **Stærðfræði** - Fullkominn stuðningur fyrir stærðfræðijöfnur með KaTeX
- **Sveigjanlegt** - Hannað fyrir síma, spjaldtölvur og tölvur
- **Ljóst/dökkt þema** - Sjálfvirk greining á kerfisstillingum
- **PWA stuðningur** - Virkar án nettengingar eftir fyrstu heimsókn
- **Gagnvirkt lotukerfi** - 118 frumefni með ítarlegum upplýsingum

---

## Byrjaðu að nota

### Forsendur

- **Node.js** 22 eða nýrra
- **npm**

### Staðbundin þróun

```bash
# Klóna gagnasafnið
git clone https://github.com/SigurdurVilhelmsson/namsbokasafn-vefur.git
cd namsbokasafn-vefur

# Setja upp dependencies
npm install

# Keyra development server
npm run dev
```

Opnaðu [http://localhost:5173](http://localhost:5173) í vafranum.

### Framleiðslubygging

```bash
npm run build
npm run preview
```

---

## Uppbygging verkefnis

```
namsbokasafn-vefur/
├── public/
│   └── content/
│       └── efnafraedi/               # Efni efnafræðibókar
│           ├── toc.json              # Efnisyfirlit
│           ├── glossary.json         # Orðasafn
│           └── chapters/             # Kaflar
│               ├── 01-grunnhugmyndir/
│               └── 02-atom-og-sameindir/
├── static/
│   ├── covers/                       # Forsíðumyndir fyrir bækur
│   │   ├── efnafraedi.svg
│   │   └── liffraedi.svg
│   └── icons/                        # PWA icons
├── src/
│   ├── app.html                      # HTML template
│   ├── app.css                       # Global styles (Tailwind)
│   ├── lib/
│   │   ├── components/               # Svelte components
│   │   │   ├── layout/               # Header, Sidebar, etc.
│   │   │   ├── BookCard.svelte
│   │   │   ├── FlashcardStudy.svelte
│   │   │   ├── MarkdownRenderer.svelte
│   │   │   └── ...
│   │   ├── stores/                   # Svelte stores (state management)
│   │   │   ├── settings.ts
│   │   │   ├── reader.ts
│   │   │   ├── flashcard.ts
│   │   │   └── ...
│   │   ├── actions/                  # Svelte actions
│   │   ├── types/                    # TypeScript types
│   │   └── utils/                    # Utility functions
│   │       ├── contentLoader.ts
│   │       ├── srs.ts                # Spaced repetition algorithm
│   │       └── ...
│   └── routes/                       # SvelteKit file-based routing
│       ├── +layout.svelte            # Root layout
│       ├── +page.svelte              # Landing page
│       └── [bookSlug]/               # Dynamic book routes
│           ├── +layout.svelte
│           ├── +page.svelte          # Book home
│           ├── ordabok/              # Glossary
│           ├── minniskort/           # Flashcards
│           ├── lotukerfi/            # Periodic table
│           └── kafli/                # Chapters
└── package.json
```

### Routing

| Slóð | Lýsing |
|------|--------|
| `/` | Landingssíða - bókasafn |
| `/:bookSlug` | Forsíða bókar |
| `/:bookSlug/kafli/:chapter` | Kaflayfirlit |
| `/:bookSlug/kafli/:chapter/:section` | Kaflaefni |
| `/:bookSlug/ordabok` | Orðasafn bókar |
| `/:bookSlug/minniskort` | Minniskort bókar |
| `/:bookSlug/lotukerfi` | Lotukerfið |
| `/:bookSlug/prof` | Próf og æfingar |

---

## Bæta við nýrri bók

Sjá [docs/guides/adding-books.md](docs/guides/adding-books.md) fyrir ítarlegar leiðbeiningar um að bæta við nýrri þýddri bók.

---

## Tæknistafl

### Core
- **SvelteKit** 2.21
- **Svelte** 5.33
- **TypeScript** 5.7
- **Vite** 6.3
- **Tailwind CSS** 4.1

### Libraries
- **unified/remark/rehype** - Markdown processing
- **KaTeX** 0.16 - Math rendering
- **Lucide Svelte** - Icons
- **@vite-pwa/sveltekit** - PWA support

---

## Skipanir

```bash
npm run dev              # Start dev server (localhost:5173)
npm run build            # Production build to build/
npm run preview          # Preview production build
npm run test             # Run unit tests (Vitest)
npm run test:e2e         # Run E2E tests (Playwright)
npm run check            # SvelteKit sync + type check
npm run lint             # ESLint
npm run format           # Prettier
```

---

## License og Attribution

### Tvöfalt leyfi

1. **Application Code (MIT License)**
   - Öll forritunarkóði
   - Sjá [LICENSE](./LICENSE)

2. **Educational Content (CC BY 4.0)**
   - Allt efni í `public/content/`
   - Sjá [CONTENT-LICENSE.md](./CONTENT-LICENSE.md)

### Content Attribution

Kennslubókaefni er íslensk þýðing og aðlögun á opnum kennslubókum frá **OpenStax**.

#### Efnafræði
- **Upprunalegt verk:** Chemistry 2e
- **Höfundar:** Paul Flowers, Klaus Theopold, Richard Langley, William R. Robinson
- **Útgefandi:** OpenStax
- **Heimild:** https://openstax.org/details/books/chemistry-2e
- **Leyfi:** CC BY 4.0

#### Þessi aðlögun
- **Þýðandi:** Sigurður E. Vilhelmsson
- **Leyfi:** CC BY 4.0

---

## Þakklæti

- **[OpenStax](https://openstax.org/)** fyrir frábær opin kennslugögn
- **Chemistry 2e höfundar** fyrir framúrskarandi kennslubók
- Allir sem leggja sitt af mörkum til opinna menntagagna (OER)

---

## Hafa samband

**Sigurður E. Vilhelmsson**
- GitHub: [@SigurdurVilhelmsson](https://github.com/SigurdurVilhelmsson)
- Verkefni: [namsbokasafn-vefur](https://github.com/SigurdurVilhelmsson/namsbokasafn-vefur)

---

<div align="center">

**Gert fyrir íslenska nemendur**

*Opið verkefni sem stuðlar að aðgengi að gæða kennslugögnum á íslensku*

[![OpenStax](https://img.shields.io/badge/Built%20with-OpenStax-orange)](https://openstax.org/)
[![CC BY 4.0](https://img.shields.io/badge/Content-CC%20BY%204.0-lightgrey)](https://creativecommons.org/licenses/by/4.0/)
[![MIT](https://img.shields.io/badge/Code-MIT-yellow)](https://opensource.org/licenses/MIT)

</div>
