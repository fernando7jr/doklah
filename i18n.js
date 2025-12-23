// Internationalization (i18n) System

let currentLanguage = "en";
let translations = {};

// Available languages
const AVAILABLE_LANGUAGES = {
  en: "English",
  es: "Español",
  pt: "Português",
  fr: "Français",
  id: "Bahasa Indonesia",
  ja: "日本語",
};

/**
 * Load language translations from JSON file and set as current language
 * @async
 * @param {string} lang - Language code (en, es, pt, fr, id, ja)
 * @returns {Promise<boolean>} True if language loaded successfully, false otherwise
 */
async function loadLanguage(lang) {
  try {
    const response = await fetch(`locales/${lang}.json`);
    if (!response.ok) {
      console.error(`Failed to load language: ${lang}`);
      return false;
    }
    translations = await response.json();
    currentLanguage = lang;
    return true;
  } catch (error) {
    console.error(`Error loading language ${lang}:`, error);
    return false;
  }
}

/**
 * Get translated string by dot notation key path
 * Returns the key itself if translation not found
 * @param {string} key - Dot notation path (e.g., 'form.gender', 'results.closenessExcellent')
 * @param {Object} fallback - Optional fallback translations object
 * @returns {string} Translated string or original key if not found
 * @example
 * t('form.gender')        // Returns 'Gender' in current language
 * t('results.matchQuality') // Returns 'Match Quality' in current language
 */
function t(key, fallback = {}) {
  const keys = key.split(".");
  let value = translations;

  for (const k of keys) {
    if (value && typeof value === "object" && k in value) {
      value = value[k];
    } else {
      // Try fallback
      value = fallback;
      for (const fk of keys) {
        if (value && typeof value === "object" && fk in value) {
          value = value[fk];
        } else {
          return key; // Return key if not found
        }
      }
      return value;
    }
  }

  return value || key;
}

/**
 * Initialize i18n system - load saved language from settings
 * Defaults to English if no language preference saved or loading fails
 * @async
 * @returns {Promise<string>} Currently loaded language code
 */
async function initI18n() {
  const savedLanguage = getSettings().language || "en";
  const loaded = await loadLanguage(savedLanguage);

  if (!loaded && savedLanguage !== "en") {
    // Fallback to English if loading fails
    await loadLanguage("en");
  }

  return currentLanguage;
}

/**
 * Change application language and update UI
 * Loads new language, saves preference, and re-renders all text
 * @async
 * @param {string} lang - Language code to switch to
 * @returns {Promise<void>}
 */
async function changeLanguage(lang) {
  const loaded = await loadLanguage(lang);
  if (loaded) {
    const settings = getSettings();
    settings.language = lang;
    saveSettings(settings);
    renderUI();
  }
}

/**
 * Render/update all UI text from current translations
 * Updates all elements with data-i18n attributes and input placeholders
 * Should be called after language change to refresh displayed text
 * @returns {void}
 */
function renderUI() {
  // Update all elements with data-i18n attribute (text content)
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const key = element.getAttribute("data-i18n");
    const translation = t(key);

    // Only update if element has no children (to avoid overwriting form buttons with icons)
    if (element.children.length === 0) {
      element.textContent = translation;
    }
  });

  // Update all placeholders with data-i18n-placeholder attribute
  document.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
    const key = element.getAttribute("data-i18n-placeholder");
    element.placeholder = t(key);
  });
}
