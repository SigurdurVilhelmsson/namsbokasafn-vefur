/**
 * Analytics Store - Reading sessions, activity tracking, and statistics
 * Ported from React/Zustand analyticsStore.ts
 */

import { writable, derived, get } from 'svelte/store';
import { browser } from '$app/environment';
import { safeSetItem, onStorageChange } from '$lib/utils/localStorage';
import { validateStoreData, isArray, isObject, isNumber, isNullOrString } from '$lib/utils/storeValidation';
import {
	createSectionKey,
	getCurrentTimestamp,
	getTodayDateString,
	generateId
} from '$lib/utils/storeHelpers';

const STORAGE_KEY = 'namsbokasafn:analytics';

export interface ReadingSession {
	sectionKey: string;
	startTime: string;
	endTime: string | null;
	durationSeconds: number;
	bookSlug: string;
	chapterSlug: string;
	sectionSlug: string;
	hourOfDay?: number; // 0-23, for reading pattern analysis
}

export interface SectionReadingTime {
	totalSeconds: number;
	sessionCount: number;
	lastRead: string;
	averageSessionSeconds: number;
}

export interface DailyStats {
	date: string;
	totalReadingSeconds: number;
	sectionsVisited: number;
	flashcardsReviewed: number;
	quizzesTaken: number;
	objectivesCompleted: number;
}

export interface WeeklySummary {
	weekStart: string;
	totalReadingSeconds: number;
	averageReadingSeconds: number;
	sectionsVisited: number;
	daysActive: number;
}

export type ActivityType = 'reading' | 'flashcard' | 'quiz' | 'objective' | 'annotation';

export interface ActivityEntry {
	id: string;
	type: ActivityType;
	timestamp: string;
	details: {
		bookSlug?: string;
		chapterSlug?: string;
		sectionSlug?: string;
		action?: string;
		count?: number;
	};
}

// Study goal types
export type GoalType = 'daily_reading_time' | 'daily_flashcards' | 'weekly_sections' | 'streak_days';
export type GoalUnit = 'minutes' | 'cards' | 'sections' | 'days';

export interface StudyGoal {
	id: string;
	type: GoalType;
	target: number;
	unit: GoalUnit;
	createdAt: string;
	isActive: boolean;
}

export interface GoalProgress {
	goal: StudyGoal;
	current: number;
	percentage: number;
	isComplete: boolean;
}

// Hourly reading distribution
export interface HourlyReadingData {
	hour: number; // 0-23
	totalSeconds: number;
	sessionCount: number;
}

interface AnalyticsState {
	sessions: ReadingSession[];
	currentSession: ReadingSession | null;
	sectionReadingTimes: Record<string, SectionReadingTime>;
	dailyStats: Record<string, DailyStats>;
	activityLog: ActivityEntry[];
	currentStreak: number;
	longestStreak: number;
	lastActiveDate: string | null;
	goals: StudyGoal[];
	hourlyReadingData: Record<number, { totalSeconds: number; sessionCount: number }>;
}

const defaultState: AnalyticsState = {
	sessions: [],
	currentSession: null,
	sectionReadingTimes: {},
	dailyStats: {},
	activityLog: [],
	currentStreak: 0,
	longestStreak: 0,
	lastActiveDate: null,
	goals: [],
	hourlyReadingData: {}
};

function getWeekStart(date: Date): string {
	const d = new Date(date);
	const day = d.getDay();
	const diff = d.getDate() - day + (day === 0 ? -6 : 1);
	d.setDate(diff);
	return d.toISOString().split('T')[0];
}

function createEmptyDailyStats(date: string): DailyStats {
	return {
		date,
		totalReadingSeconds: 0,
		sectionsVisited: 0,
		flashcardsReviewed: 0,
		quizzesTaken: 0,
		objectivesCompleted: 0
	};
}

const isNullOrObject = (v: unknown): boolean => v === null || isObject(v);

const analyticsValidators = {
	sessions: isArray,
	currentSession: isNullOrObject,
	sectionReadingTimes: isObject,
	dailyStats: isObject,
	activityLog: isArray,
	currentStreak: isNumber,
	longestStreak: isNumber,
	lastActiveDate: isNullOrString,
	goals: isArray,
	hourlyReadingData: isObject
};

function loadState(): AnalyticsState {
	if (!browser) return defaultState;

	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored) {
			return validateStoreData(JSON.parse(stored), defaultState, analyticsValidators);
		}
	} catch (e) {
		console.warn('Failed to load analytics state:', e);
	}
	return defaultState;
}

function createAnalyticsStore() {
	const { subscribe, set, update } = writable<AnalyticsState>(loadState());

	// Persist to localStorage
	let _externalUpdate = false;
	if (browser) {
		subscribe((state) => {
			if (!_externalUpdate) {
				safeSetItem(STORAGE_KEY, JSON.stringify(state));
			}
		});

		// Cross-tab synchronization
		onStorageChange(STORAGE_KEY, (newValue) => {
			try {
				_externalUpdate = true;
				set(validateStoreData(JSON.parse(newValue), defaultState, analyticsValidators));
			} catch { /* ignore */ }
			finally { _externalUpdate = false; }
		});
	}

	const logActivityInternal = (type: ActivityType, details: ActivityEntry['details']) => {
		update((state) => {
			const entry: ActivityEntry = {
				id: generateId(),
				type,
				timestamp: getCurrentTimestamp(),
				details
			};

			const updatedLog = [...state.activityLog, entry].slice(-500);
			const today = getTodayDateString();
			const todayStats = state.dailyStats[today] || createEmptyDailyStats(today);
			const updatedDailyStats = { ...todayStats };

			switch (type) {
				case 'flashcard':
					updatedDailyStats.flashcardsReviewed += details.count || 1;
					break;
				case 'quiz':
					updatedDailyStats.quizzesTaken += 1;
					break;
				case 'objective':
					if (details.action === 'completed') {
						updatedDailyStats.objectivesCompleted += 1;
					}
					break;
			}

			return {
				...state,
				activityLog: updatedLog,
				dailyStats:
					type !== 'reading'
						? { ...state.dailyStats, [today]: updatedDailyStats }
						: state.dailyStats
			};
		});
	};

	const updateStreakInternal = () => {
		update((state) => {
			const today = getTodayDateString();
			if (state.lastActiveDate === today) {
				return state;
			}

			const yesterday = new Date();
			yesterday.setDate(yesterday.getDate() - 1);
			const yesterdayStr = yesterday.toISOString().split('T')[0];

			let newStreak = state.currentStreak;
			if (state.lastActiveDate === yesterdayStr) {
				newStreak = state.currentStreak + 1;
			} else if (state.lastActiveDate !== today) {
				newStreak = 1;
			}

			return {
				...state,
				currentStreak: newStreak,
				longestStreak: Math.max(state.longestStreak, newStreak),
				lastActiveDate: today
			};
		});
	};

	return {
		subscribe,

		// Session management
		startReadingSession: (bookSlug: string, chapterSlug: string, sectionSlug: string) => {
			update((state) => {
				// End any existing session first (handled inline to avoid recursion)
				let updatedState = state;
				if (state.currentSession) {
					const endTime = getCurrentTimestamp();
					const durationSeconds = Math.round(
						(new Date(endTime).getTime() - new Date(state.currentSession.startTime).getTime()) /
							1000
					);

					if (durationSeconds >= 5) {
						const sectionKey = state.currentSession.sectionKey;
						const existingTime = state.sectionReadingTimes[sectionKey] || {
							totalSeconds: 0,
							sessionCount: 0,
							lastRead: '',
							averageSessionSeconds: 0
						};

						const newTotalSeconds = existingTime.totalSeconds + durationSeconds;
						const newSessionCount = existingTime.sessionCount + 1;

						updatedState = {
							...state,
							sessions: [
								...state.sessions,
								{ ...state.currentSession, endTime, durationSeconds }
							].slice(-1000),
							sectionReadingTimes: {
								...state.sectionReadingTimes,
								[sectionKey]: {
									totalSeconds: newTotalSeconds,
									sessionCount: newSessionCount,
									lastRead: endTime,
									averageSessionSeconds: Math.round(newTotalSeconds / newSessionCount)
								}
							}
						};
					}
				}

				const sectionKey = createSectionKey(chapterSlug, sectionSlug);
				const now = new Date();
				const newSession: ReadingSession = {
					sectionKey,
					startTime: getCurrentTimestamp(),
					endTime: null,
					durationSeconds: 0,
					bookSlug,
					chapterSlug,
					sectionSlug,
					hourOfDay: now.getHours()
				};

				return {
					...updatedState,
					currentSession: newSession
				};
			});

			logActivityInternal('reading', {
				bookSlug,
				chapterSlug,
				sectionSlug,
				action: 'started'
			});

			updateStreakInternal();
		},

		endReadingSession: () => {
			update((state) => {
				if (!state.currentSession) return state;

				const endTime = getCurrentTimestamp();
				const durationSeconds = Math.round(
					(new Date(endTime).getTime() - new Date(state.currentSession.startTime).getTime()) / 1000
				);

				if (durationSeconds < 5) {
					return { ...state, currentSession: null };
				}

				const sectionKey = state.currentSession.sectionKey;
				const existingTime = state.sectionReadingTimes[sectionKey] || {
					totalSeconds: 0,
					sessionCount: 0,
					lastRead: '',
					averageSessionSeconds: 0
				};

				const newTotalSeconds = existingTime.totalSeconds + durationSeconds;
				const newSessionCount = existingTime.sessionCount + 1;

				const today = getTodayDateString();
				const todayStats = state.dailyStats[today] || createEmptyDailyStats(today);
				const visitedToday = state.sessions.some(
					(s) => s.sectionKey === sectionKey && s.startTime.startsWith(today)
				);

				// Update hourly reading data
				const hourOfDay = state.currentSession.hourOfDay ?? new Date(state.currentSession.startTime).getHours();
				const existingHourlyData = state.hourlyReadingData[hourOfDay] || { totalSeconds: 0, sessionCount: 0 };

				return {
					...state,
					currentSession: null,
					sessions: [
						...state.sessions,
						{ ...state.currentSession, endTime, durationSeconds }
					].slice(-1000),
					sectionReadingTimes: {
						...state.sectionReadingTimes,
						[sectionKey]: {
							totalSeconds: newTotalSeconds,
							sessionCount: newSessionCount,
							lastRead: endTime,
							averageSessionSeconds: Math.round(newTotalSeconds / newSessionCount)
						}
					},
					dailyStats: {
						...state.dailyStats,
						[today]: {
							...todayStats,
							totalReadingSeconds: todayStats.totalReadingSeconds + durationSeconds,
							sectionsVisited: visitedToday
								? todayStats.sectionsVisited
								: todayStats.sectionsVisited + 1
						}
					},
					hourlyReadingData: {
						...state.hourlyReadingData,
						[hourOfDay]: {
							totalSeconds: existingHourlyData.totalSeconds + durationSeconds,
							sessionCount: existingHourlyData.sessionCount + 1
						}
					}
				};
			});
		},

		logActivity: logActivityInternal,
		updateStreak: updateStreakInternal,

		// Statistics getters
		getTotalReadingTime: (): number => {
			const { sectionReadingTimes } = get({ subscribe });
			return Object.values(sectionReadingTimes).reduce(
				(total, section) => total + section.totalSeconds,
				0
			);
		},

		getSectionReadingTime: (
			chapterSlug: string,
			sectionSlug: string
		): SectionReadingTime | null => {
			const sectionKey = createSectionKey(chapterSlug, sectionSlug);
			return get({ subscribe }).sectionReadingTimes[sectionKey] || null;
		},

		getChapterReadingTime: (chapterSlug: string): number => {
			const { sectionReadingTimes } = get({ subscribe });
			const prefix = `${chapterSlug}/`;
			return Object.entries(sectionReadingTimes)
				.filter(([key]) => key.startsWith(prefix))
				.reduce((total, [, section]) => total + section.totalSeconds, 0);
		},

		getDailyStats: (date?: string): DailyStats => {
			const targetDate = date || getTodayDateString();
			return get({ subscribe }).dailyStats[targetDate] || createEmptyDailyStats(targetDate);
		},

		getWeeklyStats: (): WeeklySummary => {
			const { dailyStats } = get({ subscribe });
			const weekStart = getWeekStart(new Date());

			let totalReadingSeconds = 0;
			let sectionsVisited = 0;
			let daysActive = 0;

			const weekDates: string[] = [];
			const startDate = new Date(weekStart);
			for (let i = 0; i < 7; i++) {
				const d = new Date(startDate);
				d.setDate(d.getDate() + i);
				weekDates.push(d.toISOString().split('T')[0]);
			}

			weekDates.forEach((date) => {
				const stats = dailyStats[date];
				if (stats) {
					totalReadingSeconds += stats.totalReadingSeconds;
					sectionsVisited += stats.sectionsVisited;
					if (stats.totalReadingSeconds > 0) {
						daysActive++;
					}
				}
			});

			return {
				weekStart,
				totalReadingSeconds,
				averageReadingSeconds: daysActive > 0 ? Math.round(totalReadingSeconds / daysActive) : 0,
				sectionsVisited,
				daysActive
			};
		},

		getRecentActivity: (limit = 20): ActivityEntry[] => {
			return get({ subscribe }).activityLog.slice(-limit).reverse();
		},

		getStreakInfo: (): { current: number; longest: number; lastActive: string | null } => {
			const state = get({ subscribe });
			return {
				current: state.currentStreak,
				longest: state.longestStreak,
				lastActive: state.lastActiveDate
			};
		},

		// Goal management
		addGoal: (type: GoalType, target: number, unit: GoalUnit) => {
			update((state) => ({
				...state,
				goals: [
					...state.goals,
					{
						id: generateId(),
						type,
						target,
						unit,
						createdAt: getCurrentTimestamp(),
						isActive: true
					}
				]
			}));
		},

		updateGoal: (goalId: string, updates: Partial<Pick<StudyGoal, 'target' | 'isActive'>>) => {
			update((state) => ({
				...state,
				goals: state.goals.map((g) =>
					g.id === goalId ? { ...g, ...updates } : g
				)
			}));
		},

		removeGoal: (goalId: string) => {
			update((state) => ({
				...state,
				goals: state.goals.filter((g) => g.id !== goalId)
			}));
		},

		getActiveGoals: (): StudyGoal[] => {
			return get({ subscribe }).goals.filter((g) => g.isActive);
		},

		getGoalProgress: (goalId: string): GoalProgress | null => {
			const state = get({ subscribe });
			const goal = state.goals.find((g) => g.id === goalId);
			if (!goal) return null;

			const today = getTodayDateString();
			const todayStats = state.dailyStats[today] || createEmptyDailyStats(today);

			let current = 0;

			switch (goal.type) {
				case 'daily_reading_time':
					current = Math.floor(todayStats.totalReadingSeconds / 60); // Convert to minutes
					break;
				case 'daily_flashcards':
					current = todayStats.flashcardsReviewed;
					break;
				case 'weekly_sections':
					// Sum sections visited for the current week
					const weekStart = getWeekStart(new Date());
					const weekDates: string[] = [];
					const startDate = new Date(weekStart);
					for (let i = 0; i < 7; i++) {
						const d = new Date(startDate);
						d.setDate(d.getDate() + i);
						weekDates.push(d.toISOString().split('T')[0]);
					}
					current = weekDates.reduce((sum, date) => {
						const stats = state.dailyStats[date];
						return sum + (stats?.sectionsVisited || 0);
					}, 0);
					break;
				case 'streak_days':
					current = state.currentStreak;
					break;
			}

			const percentage = Math.min(100, Math.round((current / goal.target) * 100));

			return {
				goal,
				current,
				percentage,
				isComplete: current >= goal.target
			};
		},

		getAllGoalsProgress: (): GoalProgress[] => {
			const state = get({ subscribe });
			const result: GoalProgress[] = [];

			for (const goal of state.goals.filter((g) => g.isActive)) {
				const today = getTodayDateString();
				const todayStats = state.dailyStats[today] || createEmptyDailyStats(today);

				let current = 0;

				switch (goal.type) {
					case 'daily_reading_time':
						current = Math.floor(todayStats.totalReadingSeconds / 60);
						break;
					case 'daily_flashcards':
						current = todayStats.flashcardsReviewed;
						break;
					case 'weekly_sections':
						const weekStart = getWeekStart(new Date());
						const weekDates: string[] = [];
						const startDate = new Date(weekStart);
						for (let i = 0; i < 7; i++) {
							const d = new Date(startDate);
							d.setDate(d.getDate() + i);
							weekDates.push(d.toISOString().split('T')[0]);
						}
						current = weekDates.reduce((sum, date) => {
							const stats = state.dailyStats[date];
							return sum + (stats?.sectionsVisited || 0);
						}, 0);
						break;
					case 'streak_days':
						current = state.currentStreak;
						break;
				}

				const percentage = Math.min(100, Math.round((current / goal.target) * 100));

				result.push({
					goal,
					current,
					percentage,
					isComplete: current >= goal.target
				});
			}

			return result;
		},

		// Hourly reading distribution
		getHourlyReadingDistribution: (): HourlyReadingData[] => {
			const state = get({ subscribe });
			const result: HourlyReadingData[] = [];

			for (let hour = 0; hour < 24; hour++) {
				const data = state.hourlyReadingData[hour];
				result.push({
					hour,
					totalSeconds: data?.totalSeconds || 0,
					sessionCount: data?.sessionCount || 0
				});
			}

			return result;
		},

		// Export
		exportAnalytics: (): string => {
			const state = get({ subscribe });
			const totalReadingTime = Object.values(state.sectionReadingTimes).reduce(
				(total, section) => total + section.totalSeconds,
				0
			);

			const exportData = {
				exportDate: getCurrentTimestamp(),
				summary: {
					totalReadingTime,
					totalSessions: state.sessions.length,
					currentStreak: state.currentStreak,
					longestStreak: state.longestStreak
				},
				sectionReadingTimes: state.sectionReadingTimes,
				dailyStats: state.dailyStats,
				recentActivity: state.activityLog.slice(-100),
				goals: state.goals,
				hourlyReadingData: state.hourlyReadingData
			};

			return JSON.stringify(exportData, null, 2);
		},

		clearAllData: () => set(defaultState),
		reset: () => set(defaultState)
	};
}

export const analyticsStore = createAnalyticsStore();

// Derived stores
export const streakInfo = derived(analyticsStore, ($store) => ({
	current: $store.currentStreak,
	longest: $store.longestStreak,
	lastActive: $store.lastActiveDate
}));

export const todayStats = derived(analyticsStore, ($store) => {
	const today = getTodayDateString();
	return $store.dailyStats[today] || createEmptyDailyStats(today);
});

export const isSessionActive = derived(analyticsStore, ($store) => $store.currentSession !== null);

// Derived store for active goals
export const activeGoals = derived(analyticsStore, ($store) =>
	$store.goals.filter((g) => g.isActive)
);

// Derived store for hourly reading distribution
export const hourlyReadingDistribution = derived(analyticsStore, ($store) => {
	const result: HourlyReadingData[] = [];
	for (let hour = 0; hour < 24; hour++) {
		const data = $store.hourlyReadingData[hour];
		result.push({
			hour,
			totalSeconds: data?.totalSeconds || 0,
			sessionCount: data?.sessionCount || 0
		});
	}
	return result;
});
