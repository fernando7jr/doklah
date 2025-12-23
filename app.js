// PWA Application Logic

// Register Service Worker
if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("sw.js")
    .then((registration) => {
      console.log("Service Worker registered successfully:", registration);
    })
    .catch((error) => {
      console.error("Service Worker registration failed:", error);
    });
}

// DOM Elements
const form = document.getElementById("assessmentForm");
const resultsContainer = document.getElementById("resultsContainer");
const emptyState = document.getElementById("emptyState");
const formErrors = document.getElementById("formErrors");
const errorList = document.getElementById("errorList");
const chartButton = document.getElementById("chartButton");
const backButton = document.getElementById("backButton");
const ageSelect = document.getElementById("age");
const settingsButton = document.getElementById("settingsButton");
const languageSelect = document.getElementById("languageSelect");
const darkModeToggle = document.getElementById("darkModeToggle");
const chartModal = new bootstrap.Modal(document.getElementById("chartModal"));
const settingsModal = new bootstrap.Modal(
  document.getElementById("settingsModal")
);

// Store current patient data for chart rendering
let currentPatientData = null;

// Initialize app
/**
 * Initialize the Doklah PWA application
 * Sets up i18n, loads data, registers event listeners, and initializes settings
 * @async
 * @returns {Promise<void>}
 * @throws {Error} If initialization fails
 */
async function initApp() {
  console.log("Initializing Doklah PWA...");

  try {
    // Initialize i18n
    await initI18n();
    renderUI();
    console.log("i18n initialized");

    // Load child data
    await loadChildData();
    console.log("Child data loaded successfully");

    // Set language select to current language
    languageSelect.value = currentLanguage;

    // Populate age select
    populateAgeSelect();

    // Setup form handler
    form.addEventListener("submit", handleFormSubmit);

    // Setup chart button
    chartButton.addEventListener("click", handleChartButton);

    // Setup back button
    backButton.addEventListener("click", handleBackButton);

    // Setup settings button
    settingsButton.addEventListener("click", () => {
      settingsModal.show();
    });

    // Setup language change
    languageSelect.addEventListener("change", (e) => {
      changeLanguage(e.target.value);
    });

    // Initialize dark mode
    const isDarkMode = getSetting("darkMode");
    document.documentElement.setAttribute(
      "data-bs-theme",
      isDarkMode ? "dark" : "light"
    );
    darkModeToggle.checked = isDarkMode;

    // Setup dark mode toggle
    darkModeToggle.addEventListener("change", (e) => {
      const isDark = e.target.checked;
      updateSetting("darkMode", isDark);
      document.documentElement.setAttribute(
        "data-bs-theme",
        isDark ? "dark" : "light"
      );
    });

    // Setup chart type toggle
    document.getElementById("weightChart").addEventListener("change", () => {
      if (currentPatientData) {
        renderGrowthChart(
          "weight",
          currentPatientData.gender,
          currentPatientData
        );
      }
    });

    document.getElementById("heightChart").addEventListener("change", () => {
      if (currentPatientData) {
        renderGrowthChart(
          "height",
          currentPatientData.gender,
          currentPatientData
        );
      }
    });
  } catch (error) {
    console.error("Error initializing app:", error);
    showError("Failed to initialize application: " + error.message);
  }
}

/**
 * Populate age select dropdown with unique ages from child data
 * Formats ages for display and sorts chronologically
 * @returns {void}
 */
function populateAgeSelect() {
  const ages = getUniqueAges();

  ages.forEach((ageObj) => {
    const option = document.createElement("option");
    option.value = ageObj.value;
    option.textContent = ageObj.label;
    ageSelect.appendChild(option);
  });
}

/**
 * Handle form submission for patient assessment
 * Validates input, finds matches by age and weight, and displays results
 * @param {Event} e - Form submission event
 * @returns {void}
 */
function handleFormSubmit(e) {
  e.preventDefault();

  // Clear previous errors
  hideErrors();

  try {
    // Get form values
    const gender = document.querySelector(
      'input[name="gender"]:checked'
    )?.value;
    const weight = parseFloat(document.getElementById("weight").value);
    const height = document.getElementById("height").value
      ? parseFloat(document.getElementById("height").value)
      : null;
    const ageValue = document.getElementById("age").value;

    // Validate inputs
    const errors = validateInput(gender, weight, height, ageValue);
    if (errors.length > 0) {
      showErrors(errors);
      return;
    }

    // Parse age if provided
    let age = null;
    if (ageValue) {
      const ageParts = ageValue.split("-");
      age = {
        value: parseInt(ageParts[0]),
        unit: ageParts[1],
      };
    }

    // Find TWO matches
    const ageMatch = findMatchByAge(gender, age.value, age.unit);
    const weightMatch = findMatchByWeightAndHeight(gender, weight, height);

    // Store patient data for chart rendering
    currentPatientData = {
      gender,
      weight,
      height,
      age: age.value,
      ageUnit: age.unit,
    };

    // Format results
    const inputData = { gender, weight, height, age };
    const result = formatResult(inputData, ageMatch, weightMatch);

    // Display results
    displayResults(result);
  } catch (error) {
    console.error("Error processing assessment:", error);
    showErrors([error.message]);
  }
}

/**
 * Display assessment results in the results container
 * Updates closeness indicator, progress bar, and results table with assessment data
 * @param {Object} result - Formatted result object from formatResult()
 * @param {Object} result.input - Patient input data
 * @param {Object} result.ageMatched - Expected values for patient's age
 * @param {Object} result.weightMatched - Expected values for patient's weight/height
 * @param {number} result.closeness - Closeness percentage (0-100)
 * @returns {void}
 */
function displayResults(result) {
  // Hide empty state and show results
  emptyState.style.display = "none";
  resultsContainer.style.display = "block";

  // Update closeness indicator
  const closenessPercent = result.closeness;
  document.getElementById(
    "closenessPercentage"
  ).textContent = `${closenessPercent}% match quality`;

  // Set closeness label with translation
  let translatedLabel;
  if (closenessPercent >= 90) {
    translatedLabel = t("results.closenessExcellent");
  } else if (closenessPercent >= 75) {
    translatedLabel = t("results.closenessVeryGood");
  } else if (closenessPercent >= 60) {
    translatedLabel = t("results.closenessGood");
  } else {
    translatedLabel = t("results.closenesssFair");
  }
  document.getElementById("closenessLabel").textContent = translatedLabel;

  // Update closeness bar color based on percentage
  const barEl = document.getElementById("closenessBar");
  barEl.style.width = closenessPercent + "%";

  if (closenessPercent >= 75) {
    barEl.className = "progress-bar bg-success";
  } else if (closenessPercent >= 60) {
    barEl.className = "progress-bar bg-info";
  } else if (closenessPercent >= 40) {
    barEl.className = "progress-bar bg-warning";
  } else {
    barEl.className = "progress-bar bg-danger";
  }

  // Update input values
  document.getElementById("resultInputGender").textContent =
    result.input.gender;
  document.getElementById("resultInputWeight").textContent =
    result.input.weight.toFixed(2) + " kg";
  if (result.input.height) {
    document.getElementById("resultInputHeight").textContent =
      result.input.height.toFixed(1) + " cm";
  } else {
    document.getElementById("resultInputHeight").textContent = "Not provided";
  }
  const ageDisplay = formatAge(result.input.age.value, result.input.age.unit);
  document.getElementById("resultInputAge").textContent = ageDisplay;
  const inputStage = calculateGrowthStage(
    result.input.age.value,
    result.input.age.unit
  );
  document.getElementById("resultInputStage").textContent = inputStage;

  // Update age-matched values
  document.getElementById("resultAgeMatchGender").textContent =
    result.ageMatched.gender;
  document.getElementById("resultAgeMatchWeight").textContent =
    result.ageMatched.weight.toFixed(2) + " kg";
  document.getElementById("resultAgeMatchHeight").textContent =
    result.ageMatched.height.toFixed(1) + " cm";
  document.getElementById("resultAgeMatchAge").textContent =
    result.ageMatched.ageLabel;
  document.getElementById("resultAgeMatchStage").textContent =
    result.ageMatched.ageType;

  // Update weight-matched values
  document.getElementById("resultWeightMatchGender").textContent =
    result.weightMatched.gender;
  document.getElementById("resultWeightMatchWeight").textContent =
    result.weightMatched.weight.toFixed(2) + " kg";
  document.getElementById("resultWeightMatchHeight").textContent =
    result.weightMatched.height.toFixed(1) + " cm";
  document.getElementById("resultWeightMatchAge").textContent =
    result.weightMatched.ageLabel;
  document.getElementById("resultWeightMatchStage").textContent =
    result.weightMatched.ageType;

  // Show results and scroll into view
  resultsContainer.style.display = "block";
  emptyState.style.display = "none";
  resultsContainer.scrollIntoView({ behavior: "smooth", block: "start" });
}

/**
 * Display validation error messages
 * Shows error list and scrolls into view
 * @param {string[]} errors - Array of error messages to display
 * @returns {void}
 */
function showErrors(errors) {
  if (!errors || errors.length === 0) return;

  errorList.innerHTML = errors.map((error) => `<div>• ${error}</div>`).join("");
  formErrors.style.display = "block";

  // Scroll to errors
  formErrors.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

/**
 * Hide error messages and clear error list
 * @returns {void}
 */
function hideErrors() {
  formErrors.style.display = "none";
  errorList.innerHTML = "";
}

/**
 * Display a single error message
 * @param {string} message - Error message to display
 * @returns {void}
 */
function showError(message) {
  showErrors([message]);
}

/**
 * Handle back button click - reset form and show empty state
 * Clears all form inputs and hides results
 * @returns {void}
 */
function handleBackButton() {
  // Reset form
  form.reset();

  // Hide results, show empty state
  resultsContainer.style.display = "none";
  emptyState.style.display = "block";

  // Scroll back to form
  form.scrollIntoView({ behavior: "smooth", block: "start" });
}

/**
 * Handle chart button click - open chart modal and render growth chart
 * Renders weight chart by default and allows user to toggle between weight/height
 * @returns {void}
 */
function handleChartButton() {
  if (!currentPatientData) return;

  // Reset to weight chart
  document.getElementById("weightChart").checked = true;

  // Show modal
  chartModal.show();

  // Render initial weight chart
  setTimeout(() => {
    renderGrowthChart("weight", currentPatientData.gender, currentPatientData);
  }, 100);
}

// Start app when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  initApp();
}
