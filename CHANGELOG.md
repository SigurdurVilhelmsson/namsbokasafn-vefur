# Changelog

All notable changes to the Efnafræðilesari (Chemistry Reader) project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Created CHANGELOG.md to track project changes

### Changed
- **MAJOR**: Upgraded React from 18.3.1 to 19.2.0
- **MAJOR**: Upgraded Vite from 6.4.1 to 7.2.4
- **MAJOR**: Upgraded Tailwind CSS from 3.4.18 to 4.1.17
- **MAJOR**: Upgraded react-markdown from 9.1.0 to 10.1.0
- **MAJOR**: Upgraded eslint-plugin-react-hooks from 5.2.0 to 7.0.1
- **MAJOR**: Upgraded globals from 15.15.0 to 16.5.0
- Upgraded @vitejs/plugin-react from 4.7.0 to 5.1.1
- Upgraded @types/react from 18.3.27 to 19.2.7
- Upgraded @types/react-dom from 18.3.7 to 19.2.3
- Upgraded lucide-react from 0.469.0 to 0.555.0
- Added @tailwindcss/postcss 4.1.17 (required for Tailwind CSS 4)
- Added typescript-eslint 8.48.0 (required for ESLint 9 compatibility)
- Updated postcss.config.js to use new `@tailwindcss/postcss` plugin
- Refactored Sidebar component to compute expanded chapters during render instead of in effects (React 19 compatibility)
- Refactored SectionView effect to use async function pattern (React 19 compatibility)
- Refactored SearchModal effect to move setState inside async function (React 19 compatibility)
- Improved TypeScript strictness by replacing `any` types with proper types in MarkdownRenderer and contentLoader
- Updated all source files with Prettier formatting

### Fixed
- React 19 compatibility issues with setState in effects
- TypeScript strict mode compliance in utility functions
- ESLint warnings related to React hooks usage patterns

## [0.1.0] - 2025-11-30

### Added
- Initial release with Phase 1 & 2 features complete
- Core markdown reader with KaTeX math support
- Light/dark theme with system preference detection
- Responsive layout for mobile and desktop
- Chapter navigation and table of contents
- Reading progress tracking
- Bookmarking system
- Search functionality with Ctrl/Cmd+K shortcut
- Glossary system with alphabetical organization
- Settings modal for font customization
- Repository health monitoring system
- ESLint, TypeScript, and Prettier configuration
- GitHub Actions workflow for deployment

### Technical Stack
- React 18.3.1 with TypeScript
- Vite 6.4.1 build tool
- Tailwind CSS 3.4.18 for styling
- Zustand for state management
- React Router for navigation
- react-markdown with KaTeX support
- Lucide React for icons

[Unreleased]: https://github.com/SigurdurVilhelmsson/Chemistry-Reader/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/SigurdurVilhelmsson/Chemistry-Reader/releases/tag/v0.1.0
