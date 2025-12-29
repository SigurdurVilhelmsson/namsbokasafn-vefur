# Chemistry Textbook Reader - Development Specification

## Project Overview

Build a web-based reader for an Icelandic translation of OpenStax Chemistry 2e textbook. The reader should be clean, professional, and optimized for high school students studying chemistry. This is designed to become a comprehensive study platform with note-taking, flashcards, and AI tutor integration.

**Project Name:** Efnafræðilesari (Chemistry Reader)
**Repository:** `efnafraedi-lesari`
**Target Users:** Icelandic high school students (ages 16-20)
**Content:** ~20 chapters of chemistry content with equations, tables, figures, and glossary terms
**Language:** Icelandic UI and content (must handle characters: á, ð, é, í, ó, ú, ý, þ, æ, ö)

---

## Tech Stack

### Core Framework
- **React 18** with TypeScript
- **Vite** as build tool
- **Tailwind CSS** for styling
- **Lucide React** for icons

### Additional Libraries
- **KaTeX** - For rendering mathematical equations
- **react-markdown** - For markdown content rendering
- **rehype-katex** and **remark-math** - KaTeX integration with markdown
- **zustand** - Lightweight state management (simpler than Redux)
- **react-router-dom** - Client-side routing
- **idb-keyval** - IndexedDB wrapper for offline storage (future)
- **date-fns** - Date formatting for study statistics

### Deployment
- **Server:** Linode (Ubuntu 24.04 LTS)
- **Web Server:** Nginx (static file serving + reverse proxy)
- **SSL:** Let's Encrypt via Certbot
- **CI/CD:** GitHub Actions → SSH deploy to Linode
- **Domain:** `efnafraedi.app` (dedicated domain)

---

## Project Structure

```
efnafraedi-lesari/
├── public/
│   ├── content/
│   │   ├── chapters/
│   │   │   ├── 01-essential-ideas/
│   │   │   │   ├── index.md
│   │   │   │   ├── 1-1-chemistry-in-context.md
│   │   │   │   ├── 1-2-phases-of-matter.md
│   │   │   │   ├── 1-3-physical-chemical-properties.md
│   │   │   │   ├── 1-4-measurements.md
│   │   │   │   └── images/
│   │   │   ├── 02-atoms-molecules-ions/
│   │   │   │   └── ...
│   │   │   └── ...
│   │   ├── glossary.json
│   │   └── toc.json
│   └── favicon.ico
├── src/
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Footer.tsx
│   │   │   └── Layout.tsx
│   │   ├── reader/
│   │   │   ├── ChapterContent.tsx
│   │   │   ├── MarkdownRenderer.tsx
│   │   │   ├── MathBlock.tsx
│   │   │   ├── GlossaryTerm.tsx
│   │   │   ├── Figure.tsx
│   │   │   ├── Table.tsx
│   │   │   ├── Exercise.tsx
│   │   │   └── NavigationButtons.tsx
│   │   ├── ui/
│   │   │   ├── Button.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── SearchBar.tsx
│   │   │   ├── Toast.tsx
│   │   │   └── ThemeToggle.tsx
│   │   └── index.ts
│   ├── hooks/
│   │   ├── useReadingProgress.ts
│   │   ├── useGlossary.ts
│   │   ├── useSearch.ts
│   │   └── useTheme.ts
│   ├── stores/
│   │   ├── readerStore.ts
│   │   └── settingsStore.ts
│   ├── types/
│   │   ├── content.ts
│   │   └── glossary.ts
│   ├── utils/
│   │   ├── contentLoader.ts
│   │   ├── searchIndex.ts
│   │   └── storage.ts
│   ├── styles/
│   │   └── globals.css
│   ├── App.tsx
│   └── main.tsx
├── index.html
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── vite.config.ts
├── .github/
│   └── workflows/
│       └── deploy.yml
├── DEVELOPMENT.md
└── README.md
```

---

## Feature Requirements

### 1. Navigation System

**Sidebar (Left Panel)**
- Collapsible chapter list showing all chapters
- Each chapter expands to show sections
- Current section highlighted
- Reading progress indicator per chapter (percentage or checkmark)
- Collapse/expand toggle for mobile

**Header**
- Book title: "Efnafræði" (or configurable)
- Search button (opens search modal)
- Theme toggle (light/dark)
- Settings button (font size, etc.)

**Bottom Navigation**
- Previous/Next section buttons
- Current location breadcrumb: "Kafli 1 > 1.4 Mælingar"

### 2. Content Display

**Typography**
- Clean, readable serif font for body text (e.g., Source Serif Pro or system serif)
- Sans-serif for headings (e.g., Inter or system sans)
- Comfortable line height (1.6-1.8)
- Maximum content width: 720px (optimal reading width)
- Responsive font sizes

**Markdown Rendering**
Support for:
- Headings (h1-h4)
- Paragraphs with proper spacing
- Bold, italic, underline
- Ordered and unordered lists
- Block quotes (for important notes/warnings)
- Code blocks (for chemical formulas written as text)
- Horizontal rules
- Links (internal chapter links and external)

**Math Equations**
- Inline math: `$E = mc^2$` renders inline
- Block math: `$$\frac{-b \pm \sqrt{b^2-4ac}}{2a}$$` renders centered
- Use KaTeX for fast rendering
- Support for chemical equations and formulas

**Tables**
- Responsive tables that scroll horizontally on mobile
- Zebra striping for readability
- Caption support
- Header row styling

**Figures/Images**
- Centered display with caption below
- Click to zoom/expand in modal
- Alt text for accessibility
- Lazy loading for performance

### 3. Glossary System

**Inline Term Highlighting**
- Glossary terms in content are automatically detected
- Displayed with subtle underline or highlight
- Hover shows definition tooltip
- Click opens full glossary entry

**Glossary Panel**
- Accessible via sidebar or dedicated page
- Alphabetically sorted
- Search/filter functionality
- Links back to where term appears in text

**Data Format (glossary.json)**
```json
{
  "terms": [
    {
      "term": "eðlismassi",
      "english": "density",
      "definition": "Hlutfall massa og rúmmáls fyrir efni eða hlut",
      "chapter": "1",
      "section": "1.4"
    },
    {
      "term": "SI-einingar",
      "english": "SI Units",
      "definition": "Alþjóðlegt einingakerfi...",
      "chapter": "1", 
      "section": "1.4"
    }
  ]
}
```

### 4. Reading Progress

**Progress Tracking**
- Track which sections user has read
- Store in localStorage
- Visual indicators in sidebar (checkmark or progress bar)
- "Continue reading" button on home/landing page

**Bookmarks (Optional Enhancement)**
- Allow users to bookmark specific sections
- Quick access from sidebar or dedicated panel

### 5. Search

**Search Modal**
- Keyboard shortcut: Cmd/Ctrl + K
- Search across all chapter content
- Show matching text snippets with highlights
- Click result to navigate directly to section
- Recent searches remembered

**Implementation**
- Build search index at build time or on first load
- Simple text matching is sufficient for MVP
- Consider Fuse.js for fuzzy search

### 6. Theme Support

**Light Mode**
- White/cream background
- Dark text
- Subtle accent colors for links and highlights

**Dark Mode**
- Dark gray background (#1a1a2e or similar)
- Light text
- Adjusted accent colors for contrast
- Respects system preference by default
- Manual toggle available

**Persistence**
- Store preference in localStorage
- Apply before first paint to avoid flash

### 7. Settings

**Font Size**
- Small / Medium / Large options
- Stored in localStorage
- Applied via CSS custom properties

**Other Settings (Optional)**
- Line spacing adjustment
- Font family choice (serif vs sans-serif)

---

## Content Format

### Table of Contents (toc.json)
```json
{
  "title": "Efnafræði 2e",
  "chapters": [
    {
      "number": 1,
      "title": "Grunnhugmyndir",
      "slug": "01-essential-ideas",
      "sections": [
        {
          "number": "1.1",
          "title": "Efnafræði í samhengi",
          "slug": "1-1-chemistry-in-context",
          "file": "1-1-chemistry-in-context.md"
        },
        {
          "number": "1.2", 
          "title": "Fasar efna",
          "slug": "1-2-phases-of-matter",
          "file": "1-2-phases-of-matter.md"
        },
        {
          "number": "1.3",
          "title": "Eðlis- og efnafræðilegir eiginleikar",
          "slug": "1-3-physical-chemical-properties",
          "file": "1-3-physical-chemical-properties.md"
        },
        {
          "number": "1.4",
          "title": "Mælingar",
          "slug": "1-4-measurements",
          "file": "1-4-measurements.md"
        }
      ]
    }
  ]
}
```

### Markdown Content Format

Each section file follows this structure:

```markdown
---
title: "Mælingar"
section: "1.4"
chapter: 1
objectives:
  - Útskýra ferli mælinga
  - Greina þrjá grunnþætti stærðar
  - Lýsa eiginleikum og einingum lengdar, massa, rúmmáls, eðlismassa, hitastigs og tíma
---

# Mælingar

Mælingar veita mikið af þeim upplýsingum sem liggja til grundvallar tilgátum, kenningum og lögmálum...

## Grunneiningar SI-kerfisins

| Mælistærð | Heiti einingar | Tákn |
|-----------|---------------|------|
| lengd | metri | m |
| massi | kílógramm | kg |
| tími | sekúnda | s |

Hitastig er hægt að reikna með formúlunni:

$$T_K = T_C + 273.15$$

Þar sem $T_K$ er hitastig í kelvin og $T_C$ er hitastig í celsíus.

::glossary[eðlismassi]

![Myndræn framsetning á SI-einingum](./images/si-units.jpg)
*Mynd 1.4.1: SI-grunneiningar og afleiddar einingar*

:::example
**Dæmi 1.4.1: Umreikningur hitastigs**

Reiknið hitastigið í kelvin ef hitastigið er 25°C.

**Lausn:**
$$T_K = 25 + 273.15 = 298.15 \text{ K}$$
:::
```

### Custom Markdown Extensions

**Glossary Reference**
```markdown
::glossary[term]
```
Renders as hoverable/clickable glossary term.

**Example Block**
```markdown
:::example
Content here...
:::
```
Renders as styled example box with "Dæmi" header.

**Note/Warning Blocks**
```markdown
:::note
Important information...
:::

:::warning
Safety warning...
:::
```

---

## Routing Structure

```
/                           → Landing page with "Continue Reading" or Chapter 1
/kafli/1                    → Chapter 1 overview (list of sections)
/kafli/1/1-4-maelingar      → Section 1.4 content
/leit                       → Search results page (if not using modal)
/ordabok                    → Full glossary page
/um                         → About page (credits, license, etc.)
```

---

## Responsive Breakpoints

```css
/* Mobile first approach */
sm: 640px   /* Sidebar becomes overlay */
md: 768px   /* Sidebar visible, narrower */
lg: 1024px  /* Full layout */
xl: 1280px  /* Wider content area */
```

**Mobile Behavior:**
- Sidebar hidden by default, hamburger menu to open
- Bottom navigation always visible
- Search via floating button or header icon
- Full-width content

**Desktop Behavior:**
- Sidebar always visible (collapsible)
- Fixed header
- Centered content with comfortable margins

---

## Accessibility Requirements

- Semantic HTML (article, nav, main, aside, header, footer)
- ARIA labels for interactive elements
- Keyboard navigation (Tab, Enter, Escape)
- Skip to main content link
- Focus indicators
- Alt text for all images
- Sufficient color contrast (WCAG AA)
- Screen reader friendly glossary tooltips

---

## Performance Targets

- First Contentful Paint: < 1.5s
- Largest Contentful Paint: < 2.5s
- Cumulative Layout Shift: < 0.1
- Bundle size: < 200KB (excluding content)

**Optimizations:**
- Lazy load images
- Code split by route
- Preload next/previous sections
- Cache content in service worker (optional PWA)

---

## Icelandic UI Text

All UI elements should use Icelandic. Key translations:

```typescript
const uiText = {
  // Navigation
  search: "Leita",
  searchPlaceholder: "Leita í bókinni...",
  contents: "Efnisyfirlit",
  glossary: "Orðasafn",
  settings: "Stillingar",
  previousSection: "Fyrri kafli",
  nextSection: "Næsti kafli",
  chapter: "Kafli",
  backToTop: "Til baka efst",
  
  // Theme
  darkMode: "Dökkt þema",
  lightMode: "Ljóst þema",
  
  // Settings
  fontSize: "Leturstærð",
  small: "Lítið",
  medium: "Miðlungs", 
  large: "Stórt",
  extraLarge: "Mjög stórt",
  lineHeight: "Línubil",
  fontFamily: "Leturgerð",
  serif: "Serif",
  sansSerif: "Sans-serif",
  dyslexiaFriendly: "Lesblindu-vænlegt",
  
  // Progress
  continueReading: "Halda áfram að lesa",
  readingProgress: "Framvinda",
  completed: "Lokið",
  inProgress: "Í vinnslu",
  notStarted: "Ekki byrjað",
  
  // Content
  objectives: "Markmið kaflans",
  example: "Dæmi",
  exercise: "Æfing",
  solution: "Lausn",
  showSolution: "Sýna lausn",
  hideSolution: "Fela lausn",
  figure: "Mynd",
  table: "Tafla",
  note: "Athugið",
  warning: "Viðvörun",
  
  // Study Tools
  bookmarks: "Bókamerki",
  addBookmark: "Bæta við bókamerki",
  removeBookmark: "Fjarlægja bókamerki",
  highlights: "Áherslur",
  notes: "Glósur",
  addNote: "Bæta við glósu",
  editNote: "Breyta glósu",
  deleteNote: "Eyða glósu",
  exportNotes: "Flytja út glósur",
  
  // Flashcards
  flashcards: "Minniskort",
  flipCard: "Snúa korti",
  nextCard: "Næsta kort",
  previousCard: "Fyrra kort",
  easy: "Auðvelt",
  medium: "Miðlungs",
  hard: "Erfitt",
  cardsToReview: "Kort til að fara yfir",
  deckProgress: "Framvinda",
  
  // Quiz
  quiz: "Próf",
  startQuiz: "Byrja próf",
  checkAnswer: "Athuga svar",
  correct: "Rétt!",
  incorrect: "Rangt",
  tryAgain: "Reyna aftur",
  score: "Einkunn",
  
  // AI
  askAI: "Spyrja gervigreind",
  explainThis: "Útskýrðu þetta",
  simplify: "Einfalda",
  giveExample: "Gefa dæmi",
  generatePractice: "Búa til æfingu",
  
  // Analytics
  studyStats: "Námstölfræði",
  timeSpent: "Tími í námi",
  sessionsCompleted: "Lokaðar lotur",
  streak: "Dagaröð",
  
  // General
  loading: "Hleður...",
  error: "Villa kom upp",
  noResults: "Engar niðurstöður fundust",
  save: "Vista",
  cancel: "Hætta við",
  close: "Loka",
  delete: "Eyða",
  edit: "Breyta",
  share: "Deila",
  export: "Flytja út",
  print: "Prenta"
};
```

---

## Development Phases (Quick Reference)

**Full roadmap with all features: See `DEVELOPMENT.md`**

### Phase 1: Core Reader (3-4 hours)
1. Project setup (Vite + React + TypeScript + Tailwind)
2. Basic layout (Header, Sidebar, Content area)
3. Markdown rendering with KaTeX
4. Single chapter display
5. Navigation between sections
6. Dark/light theme toggle
7. Deploy to Linode

### Phase 2: Study Tools Foundation (4-6 hours)
1. Complete TOC implementation
2. Chapter/section routing
3. Previous/Next navigation
4. Mobile responsive sidebar
5. Reading progress tracking
6. Bookmarks system
7. Highlighting and annotations

### Phase 3+: See DEVELOPMENT.md
- Search functionality, Glossary system, Flashcards
- AI Integration, Spaced Repetition, Study Analytics
- Collaboration features, Offline support, Accessibility

---

## Sample Content for Testing

Use this sample markdown to test rendering during development:

```markdown
---
title: "Mælingar"
section: "1.4"
---

# Mælingar

Mælingar veita mikið af þeim upplýsingum sem liggja til grundvallar tilgátum, kenningum og lögmálum sem lýsa hegðun efna og orku.

## SI-einingakerfið

Mælieiningarnar fyrir sjö grundvallareiginleika eru taldar upp í töflu 1.

| Mælistærð | Heiti einingar | Tákn |
|-----------|---------------|------|
| lengd | metri | m |
| massi | kílógramm | kg |
| tími | sekúnda | s |
| hitastig | kelvin | K |

## Stærðfræðilegar jöfnur

Eðlismassi er skilgreindur sem:

$$\rho = \frac{m}{V}$$

Þar sem $\rho$ er eðlismassi, $m$ er massi og $V$ er rúmmál.

:::example
**Dæmi 1.4.1**

Hvert er eðlismassi hlutar með massa 25,0 g og rúmmál 10,0 mL?

**Lausn:**

$$\rho = \frac{25,0 \text{ g}}{10,0 \text{ mL}} = 2,50 \text{ g/mL}$$
:::

:::note
SI-kerfið er alþjóðlegt einingakerfi sem notað er í vísindum um allan heim.
:::
```

---

## Getting Started Commands

```bash
# Create new project
npm create vite@latest efnafraedi-lesari -- --template react-ts

# Navigate to project
cd efnafraedi-lesari

# Install dependencies
npm install
npm install -D tailwindcss postcss autoprefixer
npm install react-router-dom zustand
npm install react-markdown remark-math rehype-katex katex
npm install lucide-react
npm install remark-gfm  # For tables support

# Initialize Tailwind
npx tailwindcss init -p

# Start development
npm run dev
```

---

## Linode Deployment Configuration

### Nginx Configuration

Create `/etc/nginx/sites-available/efnafraedi.app`:

```nginx
server {
    listen 80;
    server_name efnafraedi.app www.efnafraedi.app;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name efnafraedi.app www.efnafraedi.app;

    ssl_certificate /etc/letsencrypt/live/efnafraedi.app/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/efnafraedi.app/privkey.pem;

    root /var/www/efnafraedi-lesari/dist;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript;

    # Cache static assets
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Cache content (images, etc.)
    location /content/ {
        expires 7d;
        add_header Cache-Control "public";
    }

    # SPA routing - serve index.html for all routes
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
```

### GitHub Actions Deployment

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Linode

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build
        run: npm run build
      
      - name: Deploy to Linode
        uses: appleboy/scp-action@v0.1.7
        with:
          host: ${{ secrets.LINODE_HOST }}
          username: ${{ secrets.LINODE_USER }}
          key: ${{ secrets.LINODE_SSH_KEY }}
          source: "dist/*"
          target: "/var/www/efnafraedi-lesari/"
          strip_components: 1
      
      - name: Reload Nginx
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.LINODE_HOST }}
          username: ${{ secrets.LINODE_USER }}
          key: ${{ secrets.LINODE_SSH_KEY }}
          script: sudo systemctl reload nginx
```

### SSL Setup (One-time on Linode)

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d efnafraedi.app -d www.efnafraedi.app

# Auto-renewal is configured automatically
```

### Directory Structure on Linode

```
/var/www/efnafraedi-lesari/
├── dist/                    # Built React app (deployed via GitHub Actions)
│   ├── index.html
│   ├── assets/
│   └── content/
└── logs/                    # Optional: app-specific logs
```

---

## Future Integration Points

This reader is designed to integrate with the AI Chemistry Tutor in the future:

1. **Shared Authentication** (if needed later)
2. **"Ask AI" Button** - On each section, button to ask AI tutor about current content
3. **Context Passing** - Pass current chapter/section to AI tutor for contextual answers
4. **Shared Deployment** - Dedicated domain (`efnafraedi.app`) on Linode
5. **Study Analytics API** - Backend endpoint to aggregate learning data (future phases)

For now, build as standalone static site. Integration can be added later without major refactoring.

---

## Development Roadmap

**See `DEVELOPMENT.md` for the complete 6-phase development plan.**

The roadmap supports grant applications with clear deliverables:

- **Phase 1:** Core Reader (MVP)
- **Phase 2:** Study Tools Foundation  
- **Phase 3:** Active Learning Features
- **Phase 4:** AI Integration & Analytics
- **Phase 5:** Collaboration & Advanced Features
- **Phase 6:** Research & Accessibility

---

## Success Criteria

The reader is complete when:

- [ ] All 20 chapters can be navigated
- [ ] Math equations render correctly
- [ ] Tables display properly on all screen sizes
- [ ] Images load and can be expanded
- [ ] Glossary terms show definitions
- [ ] Search finds content across chapters
- [ ] Dark/light mode works
- [ ] Reading progress is tracked
- [ ] Mobile experience is good
- [ ] Lighthouse score > 90 (Performance, Accessibility)
- [ ] Loads in < 2 seconds on 3G connection
