# Efnafræðilesari

Gagnvirkur veflesari fyrir íslenska þýðingu á OpenStax Chemistry 2e kennslubók.

## 📚 Um verkefnið

Efnafræðilesari er vefforrit sem hannað er til að gera efnafræðinám skemmtilegra og aðgengilegra fyrir íslenska framhaldsskólanema. Lesarinn býður upp á:

- ✨ Hreinan og faglegann lestrargluggaglugga
- 📱 Sveigjanlega hönnun fyrir síma og tölvur
- 🌓 Ljóst og dökkt þema
- 🔖 Lesframvinda og bókamerki
- 🔍 Öfluga leitarvél
- 📖 Gagnvirkt orðasafn
- 🧮 KaTeX stuðningur fyrir stærðfræðijöfnur
- ♿ Aðgengilega hönnun (WCAG 2.1 AA)

## 🚀 Setup

### Requirements

- Node.js 18 or newer
- npm or yarn

### Local Development

```bash
# Clone the repository
git clone https://github.com/SigurdurVilhelmsson/Chemistry-Reader.git
cd Chemistry-Reader

# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Production Build

```bash
# Build
npm run build

# Preview build
npm run preview
```

## 📁 Project Structure

```
efnafraedi-lesari/
├── public/
│   └── content/              # Markdown content and resources
│       ├── toc.json         # Table of contents
│       ├── glossary.json    # Glossary terms
│       └── chapters/        # Chapter sections
├── src/
│   ├── components/          # React components
│   │   ├── layout/         # Layout components (Header, Sidebar)
│   │   ├── reader/         # Reader components (MarkdownRenderer, etc.)
│   │   └── ui/             # UI components (Button, Modal, etc.)
│   ├── hooks/              # Custom React hooks
│   ├── stores/             # Zustand state management
│   ├── types/              # TypeScript type definitions
│   ├── utils/              # Utility functions
│   └── styles/             # CSS and styling
├── DEVELOPMENT.md          # Development roadmap (6 phases)
└── Chemistry_Textbook_Reader_Specification.md  # Technical specification
```

## 🎯 Features

### Phase 1: Core Reader (Completed)

- ✅ Markdown rendering with KaTeX support
- ✅ Light/dark theme with persistence
- ✅ Responsive layout for all screen sizes
- ✅ Chapter navigation
- ✅ Reading progress tracking
- ✅ Bookmarks
- ✅ Custom markdown components (examples, notes, warnings)

### Phase 2: Study Tools (Completed)

- ✅ Settings modal (font size, font family)
- ✅ Search with Ctrl/Cmd+K shortcut
- ✅ Full-text search across all content
- ✅ Glossary system with 15+ terms
- ✅ Alphabetically organized glossary page

### Upcoming Features

See [DEVELOPMENT.md](./DEVELOPMENT.md) for detailed roadmap:

- **Phase 3**: Flashcards, quizzes, spaced repetition
- **Phase 4**: AI tutor integration, analytics
- **Phase 5**: Collaboration features, offline support
- **Phase 6**: Research tools, advanced accessibility

## 🛠️ Tech Stack

- **Frontend**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Routing**: React Router
- **Markdown**: react-markdown with KaTeX support
- **Icons**: Lucide React

## 📝 Adding Content

### Adding a New Chapter

1. Create a folder in `public/content/chapters/`
2. Add markdown files for each section
3. Update `public/content/toc.json`

### Markdown Template

```markdown
---
title: "Section Title"
section: "1.1"
chapter: 1
objectives:
  - Objective 1
  - Objective 2
---

# Main Title

Content here...

## Subtitle

:::example
Example content
:::

:::note
Note content
:::

$$
Math equation here
$$
```

### Custom Markdown Blocks

- `:::example` - Styled example blocks
- `:::note` - Note/information blocks
- `:::warning` - Warning blocks
- `$...$` - Inline math
- `$$...$$` - Block math

## 🎨 Theming

The reader supports light and dark themes with automatic system preference detection. Theme preference is saved in localStorage and applied before first paint to prevent flashing.

### Custom CSS Variables

```css
/* Light theme */
--bg-primary: #faf8f5;
--bg-secondary: #ffffff;
--text-primary: #1a1a1a;
--accent-color: #2563eb;

/* Dark theme */
--bg-primary: #1a1a2e;
--bg-secondary: #16213e;
--text-primary: #e2e8f0;
--accent-color: #3b82f6;
```

## ♿ Accessibility

The project aims for WCAG 2.1 AA compliance:

- Semantic HTML (article, nav, main, aside, header, footer)
- ARIA labels for interactive elements
- Full keyboard navigation (Tab, Enter, Escape)
- Skip to main content link
- Focus indicators
- Alt text for all images
- Sufficient color contrast
- Screen reader friendly

## 🚢 Deployment

### GitHub Actions

The project includes a GitHub Actions workflow for automatic deployment to Linode:

```yaml
# .github/workflows/deploy.yml
- Build on push to main
- Deploy to Linode via SCP
- Reload Nginx
```

### Required Secrets

Set these in GitHub repository settings:
- `LINODE_HOST` - Server IP address
- `LINODE_USER` - SSH username
- `LINODE_SSH_KEY` - SSH private key

### Nginx Configuration

```nginx
server {
    listen 443 ssl http2;
    server_name efnafraedi.kvenno.app;

    root /var/www/efnafraedi-lesari/dist;
    index index.html;

    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License. See [LICENSE](./LICENSE) for details.

## 🙏 Acknowledgments

- **OpenStax** for the excellent open textbook
- **React** and **Vite** teams for outstanding tools
- All contributors to open educational resources

## 📧 Contact

Sigurður E. Vilhelmsson - [GitHub](https://github.com/SigurdurVilhelmsson)

Project Link: [https://github.com/SigurdurVilhelmsson/Chemistry-Reader](https://github.com/SigurdurVilhelmsson/Chemistry-Reader)

---

Gert með ❤️ fyrir íslenska nemendur
