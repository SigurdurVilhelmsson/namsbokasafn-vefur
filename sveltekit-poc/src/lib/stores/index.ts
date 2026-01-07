/**
 * Store exports
 */

// Settings
export {
	settings,
	theme,
	fontSize,
	fontFamily,
	sidebarOpen,
	DEFAULT_SHORTCUTS,
	type Theme,
	type FontSize,
	type FontFamily,
	type ShortcutAction,
	type ShortcutPreferences
} from './settings';

// Reader
export { reader, currentLocation, bookmarks } from './reader';

// Flashcard
export {
	flashcardStore,
	currentDeck,
	currentCard,
	studyProgress,
	studyStats
} from './flashcard';

// Annotation
export { annotationStore, totalAnnotations, annotationsWithNotes } from './annotation';

// Quiz
export { quizStore, currentQuizSession, quizProgress } from './quiz';

// Analytics
export {
	analyticsStore,
	streakInfo,
	todayStats,
	isSessionActive,
	type ReadingSession,
	type SectionReadingTime,
	type DailyStats,
	type WeeklySummary,
	type ActivityType,
	type ActivityEntry
} from './analytics';

// Objectives
export {
	objectivesStore,
	totalCompletedObjectives,
	objectivesWithLowConfidence,
	type ConfidenceLevel
} from './objectives';

// Reference
export {
	referenceStore,
	parseReferenceString,
	getReferenceUrl,
	type ReferenceType,
	type ReferenceItem,
	type ReferenceIndex
} from './reference';
