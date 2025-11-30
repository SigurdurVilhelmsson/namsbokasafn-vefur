# Efnafræðilesari

Gagnvirkur veflesari fyrir íslenska þýðingu á OpenStax Chemistry 2e kennslubók.

## 📚 Um verkefnið

Efnafræðilesari er vefforrit sem hannað er til að gera efnafræðinám skemmtilegra og aðgengilegra fyrir íslenska framhaldsskólanema. Lesarinn býður upp á:

- ✨ Hreinan og faglegann lestrargluggaglugga
- 📱 Sveigjanlega hönnun fyrir síma og tölvur
- 🌓 Ljóst og dökkt þema
- 🔖 Lesframvinda og bókamerki
- 🧮 KaTeX stuðningur fyrir stærðfræðijöfnur
- 📖 Auðvelda leiðsögn milli kafla
- ♿ Aðgengilega hönnun (WCAG 2.1 AA)

## 🚀 Uppsetning

### Kröfur

- Node.js 18 eða nýrri
- npm eða yarn

### Setja upp staðbundið

```bash
# Klóna verkefnið
git clone https://github.com/yourusername/Chemistry-Reader.git
cd Chemistry-Reader

# Setja upp dependencies
npm install

# Keyra þróunarþjón
npm run dev
```

Opnaðu síðan [http://localhost:5173](http://localhost:5173) í vafranum þínum.

### Bygja fyrir framleiðslu

```bash
# Byggja
npm run build

# Forskoða byggingu
npm run preview
```

## 📁 Verkefnaskipan

```
efnafraedi-lesari/
├── public/
│   └── content/              # Markdown efni og auðlindir
│       ├── toc.json         # Efnisyfirlit
│       └── chapters/        # Kaflar og kaflahlutir
├── src/
│   ├── components/          # React components
│   │   ├── layout/         # Útlit components (Header, Sidebar, etc.)
│   │   ├── reader/         # Lestrar components (MarkdownRenderer, etc.)
│   │   └── ui/             # UI components (Button, Modal, etc.)
│   ├── hooks/              # Custom React hooks
│   ├── stores/             # Zustand state management
│   ├── types/              # TypeScript type definitions
│   ├── utils/              # Hjálparföll
│   └── styles/             # CSS og styling
├── DEVELOPMENT.md          # Þróunaráætlun (6 áfangar)
└── Chemistry_Textbook_Reader_Specification.md  # Tæknileg hönnun
```

## 🎯 Eiginleikar

### Núverandi eiginleikar (Áfangi 1)

- ✅ Markdown rendering með KaTeX stuðningi
- ✅ Ljóst/dökkt þema með viðhaldi
- ✅ Sveigjanlegt útlit fyrir allar skjástærðir
- ✅ Leiðsögn milli kafla
- ✅ Lesframvinda tracking
- ✅ Bókamerki
- ✅ Sérsniðnar markdown þættir (dæmi, athugasemdir, viðvaranir)

### Væntanlegir eiginleikar

Sjá [DEVELOPMENT.md](./DEVELOPMENT.md) fyrir ítarlega áætlun um framtíðarþróun:

- **Áfangi 2**: Orðasafn, leit, áherslur, glósur
- **Áfangi 3**: Minniskort, próf, spaced repetition
- **Áfangi 4**: AI tútor samþætting, greiningarkerfi
- **Áfangi 5**: Samvinnueiginleikar, offline stuðningur
- **Áfangi 6**: Rannsóknarverkfæri, aðgengilegir eiginleikar

## 🛠️ Tæknilegur stafli

- **Frontend**: React 18 með TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Routing**: React Router
- **Markdown**: react-markdown með KaTeX stuðningi
- **Icons**: Lucide React

## 📝 Bæta við efni

### Bæta við nýjum kafla

1. Búa til möppu í `public/content/chapters/`
2. Bæta við markdown skrám fyrir hvern kaflahlutu
3. Uppfæra `public/content/toc.json`

### Markdown sniðmát

```markdown
---
title: "Titill kaflans"
section: "1.1"
chapter: 1
objectives:
  - Markmið 1
  - Markmið 2
---

# Aðal titill

Efni hér...

## Undirtitill

:::example
Dæmi hér
:::

:::note
Athugasemd hér
:::

$$
\text{Stærðfræði hér}
$$
```

## 🎨 Þema og stíll

Lesarinn styður ljóst og dökkt þema með sjálfvirkri greiningu á kerfisval. Þema er vistað í localStorage og beitt áður en síðan birtist til að forðast blikkun.

## ♿ Aðgengi

Verkefnið miðar að WCAG 2.1 AA samræmi:

- Semantic HTML
- ARIA labels
- Lyklaborðsleiðsögn
- Nægilegur litamunur
- Focus indicators
- Alt texti fyrir myndir

## 🤝 Framlag

Við hvetjum til framlags! Vinsamlegast:

1. Fork-aðu verkefnið
2. Búðu til feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit-aðu breytingunum (`git commit -m 'Bæta við AmazingFeature'`)
4. Push-aðu til branch-sins (`git push origin feature/AmazingFeature`)
5. Opnaðu Pull Request

## 📄 Leyfi

Þetta verkefni er gefið út undir MIT leyfinu. Sjá [LICENSE](./LICENSE) skrána fyrir nánari upplýsingar.

## 🙏 Þakklæti

- **OpenStax** fyrir frábæra opna kennslubók
- **React** og **Vite** teymi fyrir framúrskarandi verkfæri
- Allir þeir sem leggja sitt af mörkum til opinna námsefna

## 📧 Samband

Sigurður E. Vilhelmsson - [GitHub](https://github.com/SigurdurVilhelmsson)

Verkefna tengill: [https://github.com/SigurdurVilhelmsson/Chemistry-Reader](https://github.com/SigurdurVilhelmsson/Chemistry-Reader)

---

Gert með ❤️ fyrir íslenska nemendur
