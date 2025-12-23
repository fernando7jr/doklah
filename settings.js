// Settings Management

const SETTINGS_KEY = "doklah_settings";

// Default settings
const DEFAULT_SETTINGS = {
  language: "en",
  darkMode: false,
};

/**
 * Get all settings from localStorage
 * Merges stored settings with default settings
 * @returns {Object} Current settings object with language and darkMode properties
 */
function getSettings() {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    }
  } catch (error) {
    console.error("Error reading settings from localStorage:", error);
  }
  return DEFAULT_SETTINGS;
}

/**
 * Save settings object to localStorage
 * @param {Object} settings - Settings object to save
 * @param {string} settings.language - Language code (en, es, pt, fr, id, ja)
 * @param {boolean} settings.darkMode - Dark mode enabled/disabled
 * @returns {void}
 */
function saveSettings(settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error("Error saving settings to localStorage:", error);
  }
}

/**
 * Update a single setting and persist to localStorage
 * @param {string} key - Setting key (e.g., 'language', 'darkMode')
 * @param {*} value - New value for the setting
 * @returns {void}
 */
function updateSetting(key, value) {
  const settings = getSettings();
  settings[key] = value;
  saveSettings(settings);
}

/**
 * Get a specific setting value
 * @param {string} key - Setting key to retrieve
 * @returns {*} Setting value or default if not found
 */
function getSetting(key) {
  return getSettings()[key] ?? DEFAULT_SETTINGS[key];
}
