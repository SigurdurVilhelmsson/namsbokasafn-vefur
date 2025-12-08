# Efnafræðilesari (Chemistry Reader)

[![Live Site](https://img.shields.io/badge/live-efnafraedi.app-blue)](https://efnafraedi.app)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Content License: CC BY 4.0](https://img.shields.io/badge/Content%20License-CC%20BY%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by/4.0/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.2-blue)](https://reactjs.org/)

Gagnvirkur veflesari fyrir íslenska þýðingu á OpenStax Chemistry 2e kennslubók.

---

## 📚 Um verkefnið

**Efnafræðilesari** er opinn og aðgengilegur veflesari sem gerir efnafræðinám skemmtilegra og aðgengilegra fyrir íslenska framhaldsskólanema. Verkefnið er íslensk þýðing og aðlögun á frábærri opnu kennslubók OpenStax: [Chemistry 2e](https://openstax.org/details/books/chemistry-2e).

### ✨ Helstu eiginleikar

- **📖 Hrein lesupplifun** - Faglegur lestrargluggur hannaður fyrir lengri námslestur
- **📱 Sveigjanlegt** - Fullkomlega hannað fyrir síma, spjaldtölvur og tölvur
- **🌓 Tvö þemu** - Ljóst og dökkt þema með sjálfvirkri greining á kerfisstillingum
- **🔖 Lesframvinda** - Fylgist með framvindu og vistar bókamerki
- **🔍 Öflug leit** - Leitarvél í öllu efni með Ctrl/Cmd+K flýtilykli
- **📖 Orðasafn** - Gagnvirkt orðasafn með 15+ hugtökum
- **🧮 Stærðfræði** - Fullkominn stuðningur fyrir stærðfræðijöfnur með KaTeX
- **♿ Aðgengilegt** - Hannað með WCAG 2.1 AA staðla í huga
- **🎨 Sérsniðið** - Stillanlegt leturgerð og leturstærð
- **⚡ Hraðvirkt** - Byggir á nútíma veftækni fyrir hámarks hraða

### 📊 Staða verkefnis

**Núverandi efni:**
- ✅ **Kafli 1**: Grunnhugmyndir (11 kaflar)
- ✅ **Kafli 2**: Atóm og sameindir (11 kaflar)
- 🔄 **Kafli 3-21**: Í vinnslu

**Þróunarstig:**
- ✅ **Phase 1**: Grunnlesari (lokið)
- ✅ **Phase 2**: Námstól (lokið)
- 🔄 **Phase 3**: Spjald og próf (í þróun)
- 📋 **Phase 4-6**: Áætlað (sjá [DEVELOPMENT.md](./DEVELOPMENT.md))

---

## 🚀 Byrjaðu að nota

### Forsendur

- **Node.js** 18 eða nýrra
- **npm** eða **yarn**

### Staðbundin þróun

```bash
# Klóna gagnasafnið
git clone https://github.com/SigurdurVilhelmsson/Chemistry-Reader.git
cd Chemistry-Reader

# Setja upp dependencies
npm install

# Keyra development server
npm run dev
```

Opnaðu [http://localhost:5173](http://localhost:5173) í vafranum.

### Framleiðslubygging

```bash
# Byggja verkefnið
npm run build

# Forskoða byggingu
npm run preview
```

### Gagnlegar skipanir

```bash
npm run lint          # Keyra ESLint
npm run lint:fix      # Laga ESLint villur sjálfvirkt
npm run type-check    # Athuga TypeScript týpur
npm run format        # Forsníða kóða með Prettier
npm run test          # Keyra próf
npm run test:watch    # Keyra próf í watch mode
npm run check:all     # Keyra allar athuganir (security, quality, deps)
```

---

## 📁 Uppbygging verkefnis

```
Chemistry-Reader/
├── public/
│   └── content/                    # Efni kennslubókar
│       ├── toc.json               # Efnisyfirlit með attribution
│       ├── glossary.json          # Orðasafn
│       └── chapters/              # Kaflar
│           ├── 01-grunnhugmyndir/
│           │   ├── *.md          # Markdown efni með CC BY 4.0 attribution
│           │   └── images/       # Myndir fyrir kaflann
│           └── 02-atom-og-sameindir/
│               ├── *.md
│               └── images/
├── src/
│   ├── components/
│   │   ├── layout/               # Grunnuppsetning (Header, Sidebar, Layout)
│   │   ├── reader/               # Lestraríhlutir
│   │   │   ├── HomePage.tsx
│   │   │   ├── SectionView.tsx
│   │   │   ├── MarkdownRenderer.tsx
│   │   │   ├── ContentAttribution.tsx  # CC BY 4.0 attribution
│   │   │   └── ...
│   │   └── ui/                   # Endurnýtanlegir UI íhlutir
│   ├── hooks/                    # Sérsniðin React hooks
│   ├── stores/                   # Zustand state management
│   ├── types/                    # TypeScript týpur
│   ├── utils/                    # Hjálparföll
│   └── styles/                   # CSS og stílar
├── docs/                         # Skjölun
├── LICENSE                       # Dual license (MIT + CC BY 4.0)
├── CONTENT-LICENSE.md           # Nákvæm CC BY 4.0 skjölun
├── README.md                    # Þessi skrá
├── DEVELOPMENT.md               # Þróunaráætlun
└── package.json                 # Dependencies og scripts
```

---

## 🛠️ Tæknistafl

### Core Technologies
- **[React](https://reactjs.org/)** 19.2.0 - UI framework
- **[TypeScript](https://www.typescriptlang.org/)** 5.7.2 - Type safety
- **[Vite](https://vitejs.dev/)** 7.2.4 - Build tool og dev server
- **[Tailwind CSS](https://tailwindcss.com/)** 4.1.17 - Utility-first CSS

### Libraries
- **[React Router](https://reactrouter.com/)** 7.1.1 - Routing
- **[Zustand](https://github.com/pmndrs/zustand)** 5.0.2 - State management
- **[react-markdown](https://github.com/remarkjs/react-markdown)** 10.1.0 - Markdown rendering
- **[KaTeX](https://katex.org/)** 0.16.11 - Math rendering
- **[Lucide React](https://lucide.dev/)** 0.555.0 - Icons

### Development Tools
- **[ESLint](https://eslint.org/)** 9.17.0 - Linting
- **[Prettier](https://prettier.io/)** 3.7.3 - Code formatting
- **[Vitest](https://vitest.dev/)** 4.0.14 - Testing framework
- **[Testing Library](https://testing-library.com/)** 16.3.0 - React testing

---

## 📝 Bæta við efni

### Markdown sniðmát með attribution

Öll efnisskjöl skulu innihalda CC BY 4.0 attribution í frontmatter:

```markdown
---
title: "Titill kaflans"
section: "1.1"
chapter: 1
objectives:
  - Markmið 1
  - Markmið 2
source:
  original: "Chemistry 2e by OpenStax"
  authors: "Paul Flowers, Klaus Theopold, Richard Langley, William R. Robinson"
  license: "CC BY 4.0"
  licenseUrl: "https://creativecommons.org/licenses/by/4.0/"
  originalUrl: "https://openstax.org/details/books/chemistry-2e"
  translator: "Sigurður E. Vilhelmsson"
  translationYear: 2025
  modifications: "Translated to Icelandic, adapted for Icelandic high school students"
---

# Aðaltitill

Efni hér...

## Undirtitill

:::example
Dæmi
:::

:::note
Athugasemd
:::

:::warning
Viðvörun
:::

$$
\text{Stærðfræðijafna}
$$
```

### Sérsniðnir Markdown blokkir

- `:::example` - Dæmablokk með gulum bakgrunni
- `:::note` - Upplýsingablokk með bláum bakgrunni
- `:::warning` - Viðvörunarblokk með rauðum bakgrunni
- `$...$` - Inline stærðfræði
- `$$...$$` - Block stærðfræði

### Bæta við nýjum kafla

1. Búðu til möppu í `public/content/chapters/` (t.d. `03-samsetningar`)
2. Bættu við markdown skrám fyrir hvern hluta
3. Búðu til `images/` möppu fyrir myndir
4. Uppfærðu `public/content/toc.json` með kaflanum
5. Gakktu úr skugga um að öll skjöl innihaldi source attribution í frontmatter

---

## 🎨 Þemu og stílar

### Tvö þemu

Lesarinn styður ljóst og dökkt þema með:
- Sjálfvirkri greining á kerfisstillingum
- LocalStorage viðvarandi
- Flashing-free umskiptingu

### CSS breytur

```css
/* Ljóst þema */
--bg-primary: #faf8f5;
--bg-secondary: #ffffff;
--text-primary: #1a1a1a;
--text-secondary: #666666;
--accent-color: #2563eb;
--accent-hover: #1d4ed8;
--border-color: #e5e7eb;

/* Dökkt þema */
--bg-primary: #1a1a2e;
--bg-secondary: #16213e;
--text-primary: #e2e8f0;
--text-secondary: #94a3b8;
--accent-color: #3b82f6;
--accent-hover: #2563eb;
--border-color: #334155;
```

---

## ♿ Aðgengi

Verkefnið miðar að **WCAG 2.1 AA** samræmi:

- ✅ Semantic HTML elements (article, nav, main, section)
- ✅ ARIA labels á öllum gagnvirkum íhlutum
- ✅ Fullkominn lyklaborðsstuðningur (Tab, Enter, Escape)
- ✅ Skip-to-content linkur
- ✅ Focus indicators á öllum íhlutum
- ✅ Alt texti á öllum myndum
- ✅ Nægilegur litaskiptingur (contrast ratio)
- ✅ Skjálestrarastuðningur

**Aðgengisskor:** 85/100 (samkvæmt verkefnisstöðu)

---

## 🚢 Deployment

### Live site

Verkefnið er keyrt á [efnafraedi.app](https://efnafraedi.app) á Linode með:
- Nginx web server
- Let's Encrypt SSL vottorð
- Sjálfvirk deployment með GitHub Actions

### GitHub Actions

Sjálfvirk deployment workflow:

```yaml
# .github/workflows/deploy.yml
on:
  push:
    branches: [main]

steps:
  - Build verkefnis
  - Deploy til Linode með SCP
  - Reload Nginx
```

### Nauðsynleg GitHub Secrets

Settu þessi í repository settings:
- `LINODE_HOST` - IP tala server
- `LINODE_USER` - SSH notandanafn
- `LINODE_SSH_KEY` - SSH private key

### Nginx Configuration

```nginx
server {
    listen 443 ssl http2;
    server_name efnafraedi.app www.efnafraedi.app;

    root /var/www/efnafraedi-lesari/dist;
    index index.html;

    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # SSL configuration
    ssl_certificate /etc/letsencrypt/live/efnafraedi.app/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/efnafraedi.app/privkey.pem;
}
```

---

## 📄 License og Attribution

### Dual Licensing

Þetta verkefni notar **tvöfalt leyfi**:

1. **Application Code (MIT License)**
   - Öll forritunarkóði (TypeScript, JavaScript, CSS, config)
   - Frjáls notkun, breyting og dreifing
   - Sjá [LICENSE](./LICENSE) fyrir fullar upplýsingar

2. **Educational Content (CC BY 4.0)**
   - Allt efni í `public/content/` möppunni
   - Creative Commons Attribution 4.0 International
   - Sjá [CONTENT-LICENSE.md](./CONTENT-LICENSE.md) fyrir nákvæmar upplýsingar

### Content Attribution

Allt kennslubókarefni er íslensk þýðing og aðlögun á **"Chemistry 2e"** eftir OpenStax.

#### Upprunalegt verk:
- **Titill:** Chemistry 2e
- **Höfundar:** Paul Flowers, Klaus Theopold, Richard Langley, William R. Robinson
- **Útgefandi:** OpenStax
- **Heimild:** https://openstax.org/details/books/chemistry-2e
- **Leyfi:** Creative Commons Attribution 4.0 International (CC BY 4.0)
- **Leyfisvefur:** https://creativecommons.org/licenses/by/4.0/

#### Þessi aðlögun:
- **Þýðandi:** Sigurður E. Vilhelmsson
- **Ár:** 2025
- **Breytingar:** Þýtt á íslensku, aðlagað fyrir íslenska framhaldsskólanema
- **Leyfi:** Creative Commons Attribution 4.0 International (CC BY 4.0)

#### Hvernig á að vitna í verkið

Þegar efnið er notað eða dreift, vinsamlegast vitnið bæði í upprunalega verkið og þýðinguna:

```
Byggt á "Chemistry 2e" eftir Paul Flowers, Klaus Theopold, Richard Langley
og William R. Robinson (OpenStax, CC BY 4.0). Íslensk þýðing eftir
Sigurður E. Vilhelmsson (2025, CC BY 4.0).

Upprunaleg heimild: https://openstax.org/details/books/chemistry-2e
Þýðing: https://github.com/SigurdurVilhelmsson/Chemistry-Reader
Leyfi: https://creativecommons.org/licenses/by/4.0/
```

### License Compliance Features

✅ **Comprehensive attribution** - Sýnilegt á hverri síðu í UI
✅ **Source-level attribution** - Attribution í frontmatter allra .md skráa
✅ **Metadata attribution** - Attribution í toc.json
✅ **Documentation** - Nákvæm skjölun í LICENSE og CONTENT-LICENSE.md
✅ **Machine-readable** - TypeScript types fyrir attribution metadata

---

## 🙏 Þakklæti

- **[OpenStax](https://openstax.org/)** fyrir frábær opin kennslugögn og fyrir að gera menntun aðgengilegri öllum
- **Chemistry 2e höfundar** (Paul Flowers, Klaus Theopold, Richard Langley, William R. Robinson) fyrir framúrskarandi kennslubók
- **[React](https://reactjs.org/)** og **[Vite](https://vitejs.dev/)** teymi fyrir frábær þróunarverkfæri
- Allir sem leggja sitt af mörkum til opinna menntagagna (OER)

---

## 🤝 Leggja til kóða

Framlag er vel þegið! Vinsamlegast:

1. Forkið repository-ið
2. Búðu til feature branch (`git checkout -b feature/FrábærEiginleiki`)
3. Commitaðu breytingar (`git commit -m 'Bæta við frábærum eiginleika'`)
4. Pushað til branches (`git push origin feature/FrábærEiginleiki`)
5. Opnaðu Pull Request

### Leiðbeiningar fyrir framlag

- Fylgdu núverandi kóðastíl (ESLint + Prettier)
- Bættu við prófum fyrir nýja eiginleika
- Uppfærðu skjölun eftir þörfum
- Tryggðu að öll próf standist (`npm run test`)
- Fylgdu CC BY 4.0 attribution kröfum fyrir efni

---

## 📧 Hafa samband

**Sigurður E. Vilhelmsson**
- GitHub: [@SigurdurVilhelmsson](https://github.com/SigurdurVilhelmsson)
- Verkefni: [Chemistry-Reader](https://github.com/SigurdurVilhelmsson/Chemistry-Reader)
- Vefur: [efnafraedi.app](https://efnafraedi.app)

---

## 📚 Tengd skjöl

- [DEVELOPMENT.md](./DEVELOPMENT.md) - Þróunaráætlun (6 phases)
- [CONTENT-LICENSE.md](./CONTENT-LICENSE.md) - Nákvæmar CC BY 4.0 upplýsingar
- [LICENSE](./LICENSE) - Dual license (MIT + CC BY 4.0)
- [DEPLOYMENT-GUIDE.md](./DEPLOYMENT-GUIDE.md) - Deployment leiðbeiningar
- [MARKDOWN-GUIDE.md](./MARKDOWN-GUIDE.md) - Markdown sniðmátsleiðbeiningar

---

<div align="center">

**Gert með ❤️ fyrir íslenska nemendur**

*Opið verkefni sem stuðlar að aðgengi að gæða kennslugögnum á íslensku*

[![OpenStax](https://img.shields.io/badge/Built%20with-OpenStax-orange)](https://openstax.org/)
[![CC BY 4.0](https://img.shields.io/badge/Content-CC%20BY%204.0-lightgrey)](https://creativecommons.org/licenses/by/4.0/)
[![MIT](https://img.shields.io/badge/Code-MIT-yellow)](https://opensource.org/licenses/MIT)

</div>
