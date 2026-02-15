/**
 * Store exports
 */

// Settings
export {
	settings,
	theme,
	fontSize,
	fontFamily,
	lineHeight,
	lineWidth,
	sidebarOpen,
	bionicReading,
	DEFAULT_SHORTCUTS,
	type Theme,
	type FontSize,
	type FontFamily,
	type LineHeight,
	type LineWidth,
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
	studyStats,
	flashcardSuccessRate,
	weeklyFlashcardStats,
	type FlashcardReviewEntry,
	type FlashcardDailyStats
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
	activeGoals,
	hourlyReadingDistribution,
	type ReadingSession,
	type SectionReadingTime,
	type DailyStats,
	type WeeklySummary,
	type ActivityType,
	type ActivityEntry,
	type GoalType,
	type GoalUnit,
	type StudyGoal,
	type GoalProgress,
	type HourlyReadingData
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

// Offline
export {
	offline,
	currentDownload,
	downloadedBooks,
	downloadBook,
	estimateBookSize,
	formatBytes,
	type BookDownloadState,
	type DownloadProgress
} from './offline';

// Glossary
export {
	glossaryStore,
	glossaryTerms,
	glossaryLoading,
	glossaryError
} from './glossary';
