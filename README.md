# Námsbókasafn (Textbook Library)

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.2-blue)](https://reactjs.org/)
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
- **Orðasafn** - Ítarlegt orðasafn fyrir hverja bók
- **Lesframvinda** - Fylgist með framvindu og vistar bókamerki
- **Leit** - Öflug leit í öllu efni með Ctrl/Cmd+K flýtilykli
- **Stærðfræði** - Fullkominn stuðningur fyrir stærðfræðijöfnur með KaTeX
- **Sveigjanlegt** - Hannað fyrir síma, spjaldtölvur og tölvur
- **Ljóst/dökkt þema** - Sjálfvirk greining á kerfisstillingum

### Nýlega bætt við (desember 2025)

- **Yfirstrikun og athugasemdir** - Merkja texta með litum og bæta við glósum
- **Lestur á rödd** - Lesa efni upphátt með Web Speech API
- **Flýtilyklar** - Ítarlegir flýtilyklar fyrir flýtinotendur (ýttu á `?`)
- **Einbeitingarhamur** - Hreinn leshamur án truflana (ýttu á `F`)
- **Aðgengi (WCAG 2.2)** - Bætt aðgengi fyrir alla notendur

---

## Byrjaðu að nota

### Forsendur

- **Node.js** 18 eða nýrra
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
│   ├── covers/                        # Forsíðumyndir fyrir bækur
│   │   ├── efnafraedi.svg
│   │   └── liffraedi.svg
│   └── content/
│       └── efnafraedi/               # Efni efnafræðibókar
│           ├── toc.json              # Efnisyfirlit
│           ├── glossary.json         # Orðasafn
│           └── chapters/             # Kaflar
│               ├── 01-grunnhugmyndir/
│               └── 02-atom-og-sameindir/
├── src/
│   ├── config/
│   │   └── books.ts                  # Stillingar fyrir allar bækur
│   ├── components/
│   │   ├── catalog/                  # Landingssíða og bókakort
│   │   │   ├── LandingPage.tsx
│   │   │   ├── BookCard.tsx
│   │   │   └── BookGrid.tsx
│   │   ├── layout/                   # Layout íhlutir
│   │   │   ├── BookLayout.tsx        # Bóka-meðvitað layout
│   │   │   ├── Header.tsx
│   │   │   └── Sidebar.tsx
│   │   ├── reader/                   # Lestraríhlutir
│   │   └── ui/                       # UI íhlutir
│   ├── hooks/
│   │   ├── useBook.ts               # Book context hook
│   │   ├── useGlossary.ts
│   │   └── useTheme.ts
│   ├── stores/                       # Zustand state management
│   ├── utils/
│   │   ├── contentLoader.ts         # Efnishleðsla
│   │   └── srs.ts                   # Spaced repetition algorithm
│   └── types/
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
| `/:bookSlug/aefingar` | Æfingadæmi bókar |

---

## Bæta við nýrri bók

### 1. Bættu við stillingu í `src/config/books.ts`

```typescript
{
  id: 'liffraedi',
  slug: 'liffraedi',
  title: 'Líffræði',
  subtitle: 'Þýðing á OpenStax Biology 2e',
  description: 'Kennslubók í líffræði...',
  subject: 'raunvisindi',
  coverImage: '/covers/liffraedi.svg',
  translator: 'Nafn Þýðanda',
  status: 'available', // 'available' | 'in-progress' | 'coming-soon'
  source: {
    title: 'Biology 2e',
    publisher: 'OpenStax',
    url: 'https://openstax.org/details/books/biology-2e',
    authors: ['...'],
    license: 'CC BY 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/'
  },
  stats: {
    totalChapters: 47,
    translatedChapters: 0
  },
  features: {
    glossary: true,
    flashcards: true,
    exercises: true
  }
}
```

### 2. Búðu til efnismöppu

```
public/content/liffraedi/
├── toc.json
├── glossary.json
└── chapters/
    └── 01-introduction/
        ├── 1-1-section.md
        └── images/
```

### 3. Búðu til forsíðumynd

Bættu við SVG eða PNG mynd í `public/covers/liffraedi.svg`

---

## Tæknistafl

### Core
- **React** 19.2.0
- **TypeScript** 5.7.2
- **Vite** 7.2.4
- **Tailwind CSS** 4.1.17

### Libraries
- **React Router** 7.1.1 - Routing
- **Zustand** 5.0.2 - State management
- **react-markdown** 10.1.0 - Markdown rendering
- **KaTeX** 0.16.11 - Math rendering
- **Lucide React** 0.555.0 - Icons

---

## Þróunaráætlun

Þetta verkefni er í virkri þróun. Sjá ítarlegri skjöl:

| Skjal | Lýsing |
|-------|--------|
| [RECOMMENDATIONS.md](./RECOMMENDATIONS.md) | Ítarlegar umbótaráætlanir í 4 þrepum |
| [IMPLEMENTATION_PROGRESS.md](./IMPLEMENTATION_PROGRESS.md) | Framvindumæling fyrir öll verkefni |
| [MARKDOWN-GUIDE.md](./MARKDOWN-GUIDE.md) | Leiðbeiningar um markdown snið |
| [LANGUAGE_GUIDE.md](./LANGUAGE_GUIDE.md) | Tungumálastefna (íslenska/enska) |
| [DEPLOYMENT-GUIDE.md](./DEPLOYMENT-GUIDE.md) | Leiðbeiningar um uppsetningu |

### Staða framvindu

| Þrep | Lýsing | Framvinda |
|------|--------|-----------|
| Þrep 1 | Grunnupplifun (aðgengi, yfirstrikun, TTS) | 69% |
| Þrep 2 | Námsaðstoð (minniskort, próf) | 18% |
| Þrep 3 | Vísindalegir eiginleikar | 0% |
| Þrep 4 | Háþróaðir eiginleikar | 0% |

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
