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

    document.getElementById("bmiChart").addEventListener("change", () => {
      if (currentPatientData) {
        renderGrowthChart("bmi", currentPatientData.gender, currentPatientData);
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

  // Clear existing options except the first one
  ageSelect.innerHTML = '<option value="">Select age</option>';

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
async function displayResults(result) {
  // Hide empty state and show results
  emptyState.style.display = "none";
  resultsContainer.style.display = "block";

  // Load z-score data if needed
  await loadZScoreData();

  const growthStage = determineGrowthStage(
    result.input.age.value,
    result.input.age.unit
  );

  // Calculate z-scores for input weight and height
  const weightZScore = interpolateZScore(
    result.input.gender === "Boy" ? "BOY" : "GIRL",
    result.input.age.value,
    result.input.age.unit,
    "weight",
    result.input.weight
  );

  let heightZScore = null;
  let heightPercentage = 0;
  if (result.input.height) {
    heightZScore = interpolateZScore(
      result.input.gender === "Boy" ? "BOY" : "GIRL",
      result.input.age.value,
      result.input.age.unit,
      "height",
      result.input.height
    );
    heightPercentage = calculatePercentageFromZScore(heightZScore);
  } else if (growthStage !== "adolescent") {
    // Use median height for comparison if not provided
    const ageMatchedRecord = findMatchByAge(
      result.input.gender === "Boy" ? "BOY" : "GIRL",
      result.input.age.value,
      result.input.age.unit
    );
    heightZScore = 0; // Assume median if using default
    heightPercentage = 100;
  }

  const weightPercentage = calculatePercentageFromZScore(weightZScore);

  // For adolescents, use BMI instead of weight/height
  let bmiZScore = null;
  let bmiPercentage = 0;
  if (growthStage === "adolescent") {
    const height =
      result.input.height ||
      getMedianHeightForAge(
        result.input.gender === "Boy" ? "BOY" : "GIRL",
        result.input.age.value,
        result.input.age.unit
      );
    if (height) {
      const bmi = calculateBMI(result.input.weight, height);
      bmiZScore = interpolateZScore(
        result.input.gender === "Boy" ? "BOY" : "GIRL",
        result.input.age.value,
        result.input.age.unit,
        "bmi",
        bmi
      );
      bmiPercentage = calculatePercentageFromZScore(bmiZScore);
    }
  }

  // Calculate overall match quality
  let overallPercentage;
  if (growthStage === "adolescent") {
    overallPercentage = bmiPercentage;
  } else {
    overallPercentage = result.input.height
      ? Math.round((weightPercentage + heightPercentage) / 2)
      : weightPercentage;
  }

  // Set closeness label based on percentage
  let translatedLabel;
  if (overallPercentage >= 90) {
    translatedLabel = t("results.closenessExcellent");
  } else if (overallPercentage >= 80) {
    translatedLabel = t("results.closenessVeryGood");
  } else if (overallPercentage >= 70) {
    translatedLabel = t("results.closenessGood");
  } else if (overallPercentage >= 50) {
    translatedLabel = t("results.closenesssFair");
  } else if (overallPercentage >= 30) {
    translatedLabel = t("results.closenessBad");
  } else {
    translatedLabel = t("results.closenessVeryBad");
  }

  // Update closeness indicator
  document.getElementById(
    "closenessPercentage"
  ).textContent = `${overallPercentage}% ${t(
    "results.matchQualityPercentage"
  )}`;

  // Set classification badges
  const weightBadge = document.getElementById("weightClassificationBadge");
  const heightBadge = document.getElementById("heightClassificationBadge");
  const overallBadge = document.getElementById("overallClassificationBadge");

  if (growthStage === "adolescent" && bmiZScore !== null) {
    // For adolescents, only show BMI classification
    const bmiLabel = getZScoreLabel("bmi", bmiZScore);
    const bmiColor = getZScoreBadgeColor(bmiZScore);
    weightBadge.textContent = bmiLabel;
    weightBadge.className = "badge " + bmiColor;
    heightBadge.style.display = "none";
  } else {
    // For infants/children, show weight and height
    if (weightZScore !== null) {
      const weightLabel = getZScoreLabel("weight", weightZScore);
      const weightColor = getZScoreBadgeColor(weightZScore);
      weightBadge.textContent = weightLabel;
      weightBadge.className = "badge " + weightColor;
    }
    if (result.input.height && heightZScore !== null) {
      const heightLabel = getZScoreLabel("height", heightZScore);
      const heightColor = getZScoreBadgeColor(heightZScore);
      heightBadge.textContent = heightLabel;
      heightBadge.className = "badge " + heightColor;
      heightBadge.style.display = "inline-block";
    } else {
      heightBadge.style.display = "none";
    }
  }

  // Set overall match quality badge
  overallBadge.textContent = translatedLabel;
  if (overallPercentage >= 80) {
    overallBadge.className = "badge bg-success";
  } else if (overallPercentage >= 70) {
    overallBadge.className = "badge bg-info";
  } else if (overallPercentage >= 50) {
    overallBadge.className = "badge bg-warning";
  } else {
    overallBadge.className = "badge bg-danger";
  }

  // Update closeness bar color
  const barEl = document.getElementById("closenessBar");
  barEl.style.width = overallPercentage + "%";

  if (overallPercentage >= 80) {
    barEl.className = "progress-bar bg-success";
  } else if (overallPercentage >= 70) {
    barEl.className = "progress-bar bg-info";
  } else if (overallPercentage >= 50) {
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
    document.getElementById("resultInputHeight").textContent = t(
      "results.notProvided"
    );
  }
  const ageDisplay = formatAge(result.input.age.value, result.input.age.unit);
  document.getElementById("resultInputAge").textContent = ageDisplay;
  document.getElementById("resultInputStage").textContent =
    growthStage.charAt(0).toUpperCase() + growthStage.slice(1);

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

  // Update weight-matched (closest match) values
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

  // Handle BMI row for adolescents
  const bmiRow = document.getElementById("bmiRow");
  if (growthStage === "adolescent") {
    bmiRow.style.display = "table-row";

    // Input BMI
    const inputHeight =
      result.input.height ||
      getMedianHeightForAge(
        result.input.gender === "Boy" ? "BOY" : "GIRL",
        result.input.age.value,
        result.input.age.unit
      );
    if (inputHeight) {
      const inputBmi = calculateBMI(result.input.weight, inputHeight);
      document.getElementById("resultInputBmi").textContent =
        inputBmi.toFixed(1) + " kg/m²";
    }

    // Matched age BMI (median)
    const matchedHeight = result.ageMatched.height;
    if (matchedHeight) {
      const matchedBmi = calculateBMI(result.ageMatched.weight, matchedHeight);
      document.getElementById("resultAgeMatchBmi").textContent =
        matchedBmi.toFixed(1) + " kg/m²";
    }

    // Weight-matched (closest match) BMI
    const weightMatchedHeight = result.weightMatched.height;
    if (weightMatchedHeight) {
      const weightMatchedBmi = calculateBMI(result.weightMatched.weight, weightMatchedHeight);
      document.getElementById("resultWeightMatchBmi").textContent =
        weightMatchedBmi.toFixed(1) + " kg/m²";
    }
  } else {
    bmiRow.style.display = "none";
  }

  // Show results and scroll into view
  resultsContainer.style.display = "block";
  emptyState.style.display = "none";
  resultsContainer.scrollIntoView({ behavior: "smooth", block: "start" });
}

/**
 * Get translated z-score classification label
 * @param {string} metric - 'weight', 'height', or 'bmi'
 * @param {number} zScore - The z-score value
 * @returns {string} Translated classification label
 */
function getZScoreLabel(metric, zScore) {
  let labelKey;

  if (metric === "weight") {
    if (zScore < -2) {
      labelKey = "weightSeverelyUnderweight";
    } else if (zScore < -1) {
      labelKey = "weightUnderweight";
    } else if (zScore < 1) {
      labelKey = "weightNormal";
    } else if (zScore < 2) {
      labelKey = "weightOverweight";
    } else {
      labelKey = "weightSeverelyOverweight";
    }
  } else if (metric === "height") {
    if (zScore < -2) {
      labelKey = "heightSeverelyShort";
    } else if (zScore < -1) {
      labelKey = "heightShort";
    } else if (zScore < 1) {
      labelKey = "heightNormal";
    } else if (zScore < 2) {
      labelKey = "heightTall";
    } else {
      labelKey = "heightSeverelyTall";
    }
  } else if (metric === "bmi") {
    if (zScore < -2) {
      labelKey = "bmiSeverelyUnderweight";
    } else if (zScore < -1) {
      labelKey = "bmiUnderweight";
    } else if (zScore < 1) {
      labelKey = "bmiNormal";
    } else if (zScore < 2) {
      labelKey = "bmiOverweight";
    } else {
      labelKey = "bmiSeverelyOverweight";
    }
  }

  return t(`results.${labelKey}`);
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
 * For adolescents, shows BMI chart only. For infants/children, shows weight/height options.
 * @returns {void}
 */
function handleChartButton() {
  if (!currentPatientData) return;

  // Determine growth stage
  const growthStage = determineGrowthStage(
    currentPatientData.age,
    currentPatientData.ageUnit
  );
  const weightChart = document.getElementById("weightChart");
  const heightChart = document.getElementById("heightChart");
  const bmiChart = document.getElementById("bmiChart");

  // Get label elements (next siblings of the input elements)
  const weightLabel = weightChart.nextElementSibling;
  const heightLabel = heightChart.nextElementSibling;
  const bmiLabel = bmiChart.nextElementSibling;

  if (growthStage === "adolescent") {
    // Show only BMI for adolescents
    weightChart.style.display = "none";
    weightLabel.style.display = "none";
    heightChart.style.display = "none";
    heightLabel.style.display = "none";
    bmiChart.style.display = "inline-block";
    bmiLabel.style.display = "inline-block";
    bmiChart.checked = true;
  } else {
    // Show weight and height for infants/children
    weightChart.style.display = "inline-block";
    weightLabel.style.display = "inline-block";
    heightChart.style.display = "inline-block";
    heightLabel.style.display = "inline-block";
    bmiChart.style.display = "none";
    bmiLabel.style.display = "none";
    weightChart.checked = true;
  }

  // Show modal
  chartModal.show();

  // Render initial chart
  setTimeout(() => {
    const metric = growthStage === "adolescent" ? "bmi" : "weight";
    renderGrowthChart(metric, currentPatientData.gender, currentPatientData);
  }, 100);
}

// Start app when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  initApp();
}
