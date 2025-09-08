/**
 * Utility functions for managing user preferences in localStorage
 */

export interface DashboardPreferences {
    timePeriod: 'month' | 'year';
}

const PREFERENCES_KEY = 'accounting_dashboard_preferences';

/**
 * Load dashboard preferences from localStorage
 */
export const loadDashboardPreferences = (): DashboardPreferences => {
    try {
        const stored = localStorage.getItem(PREFERENCES_KEY);
        if (stored) {
            const preferences = JSON.parse(stored) as DashboardPreferences;
            // Validate the timePeriod value
            if (preferences.timePeriod === 'month' || preferences.timePeriod === 'year') {
                return preferences;
            }
        }
    } catch (error) {
        console.warn('Failed to load dashboard preferences:', error);
    }

    // Return default preferences
    return {
        timePeriod: 'month'
    };
};

/**
 * Save dashboard preferences to localStorage
 */
export const saveDashboardPreferences = (preferences: DashboardPreferences): void => {
    try {
        localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
    } catch (error) {
        console.warn('Failed to save dashboard preferences:', error);
    }
};

/**
 * Update a specific preference and save to localStorage
 */
export const updateDashboardPreference = <K extends keyof DashboardPreferences>(
    key: K,
    value: DashboardPreferences[K]
): void => {
    const currentPreferences = loadDashboardPreferences();
    const updatedPreferences = {
        ...currentPreferences,
        [key]: value
    };
    saveDashboardPreferences(updatedPreferences);
};
