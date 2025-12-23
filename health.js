/**
 * Health calculation module for pediatric growth assessment
 */

let childData = null;

/**
 * Load WHO pediatric growth reference data from JSON file
 * Caches data after first load to avoid repeated HTTP requests
 * @async
 * @returns {Promise<Array>} Array of growth reference records
 * @throws {Error} If data file cannot be loaded
 */
async function loadChildData() {
  if (childData) return childData;

  try {
    const response = await fetch("data/child.json");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    childData = data.data;
    return childData;
  } catch (error) {
    console.error("Error loading child data:", error);
    throw new Error("Failed to load pediatric reference data");
  }
}

/**
 * Get all unique ages from child data for form select dropdown
 * Returns sorted list of ages from youngest to oldest
 * @returns {Array<Object>} Array of age objects with value, label, age, and unit properties
 * @example
 * [
 *   {value: '0-MONTH', label: 'Newborn', age: 0, unit: 'MONTH'},
 *   {value: '1-MONTH', label: '1 month', age: 1, unit: 'MONTH'},
 *   {value: '1-YEAR', label: '1 year', age: 1, unit: 'YEAR'}
 * ]
 */
function getUniqueAges() {
  if (!childData) return [];

  const ageMap = new Map();

  childData.forEach((record) => {
    const key = `${record.age}-${record.ageUnit}`;
    if (!ageMap.has(key)) {
      ageMap.set(key, {
        value: key,
        age: record.age,
        unit: record.ageUnit,
        label: formatAge(record.age, record.ageUnit),
      });
    }
  });

  // Sort by age in months
  return Array.from(ageMap.values()).sort((a, b) => {
    const aMonths = convertToMonths(a.age, a.unit);
    const bMonths = convertToMonths(b.age, b.unit);
    return aMonths - bMonths;
  });
}

/**
 * Convert age to months for standardized comparison
 * @param {number} age - Age value
 * @param {string} unit - Age unit ('MONTH' or 'YEAR')
 * @returns {number} Age converted to months
 * @example
 * convertToMonths(2, 'YEAR') // Returns 24
 * convertToMonths(6, 'MONTH') // Returns 6
 */
function convertToMonths(age, unit) {
  return unit === "MONTH" ? age : age * 12;
}

/**
 * Format age for human-readable display
 * @param {number} age - Age value
 * @param {string} unit - Age unit ('MONTH' or 'YEAR')
 * @returns {string} Formatted age string
 * @example
 * formatAge(0, 'MONTH') // Returns 'Newborn'
 * formatAge(6, 'MONTH') // Returns '6 months'
 * formatAge(2, 'YEAR')  // Returns '2 years'
 */
function formatAge(age, unit) {
  if (unit === "MONTH") {
    return age === 0 ? "Newborn" : `${age} month${age !== 1 ? "s" : ""}`;
  }
  return `${age} year${age !== 1 ? "s" : ""}`;
}

/**
 * Find WHO growth reference matching patient's age and gender
 * Returns the record with the closest age to input age
 * @param {string} gender - Patient gender ('BOY' or 'GIRL')
 * @param {number} age - Patient age value
 * @param {string} ageUnit - Patient age unit ('MONTH' or 'YEAR')
 * @returns {Object} Closest matching growth reference record
 * @throws {Error} If no data found for the specified gender
 */
function findMatchByAge(gender, age, ageUnit) {
  if (!childData || childData.length === 0) {
    throw new Error("Child data not loaded");
  }

  // Filter by gender
  let candidates = childData.filter((record) => record.gender === gender);

  if (candidates.length === 0) {
    throw new Error(`No data found for gender: ${gender}`);
  }

  // Find closest by age
  const inputAgeMonths = convertToMonths(age, ageUnit);
  let closestByAge = candidates[0];
  let minAgeDiff = Math.abs(
    convertToMonths(candidates[0].age, candidates[0].ageUnit) - inputAgeMonths
  );

  candidates.forEach((record) => {
    const recordAgeMonths = convertToMonths(record.age, record.ageUnit);
    const ageDiff = Math.abs(recordAgeMonths - inputAgeMonths);

    if (ageDiff < minAgeDiff) {
      minAgeDiff = ageDiff;
      closestByAge = record;
    } else if (ageDiff === minAgeDiff) {
      // If tie, prefer the higher age
      if (
        recordAgeMonths >
        convertToMonths(closestByAge.age, closestByAge.ageUnit)
      ) {
        closestByAge = record;
      }
    }
  });

  return closestByAge;
}

/**
 * Find WHO growth reference matching patient's weight and optionally height
 * Uses weight as primary criterion, refines by height if provided
 * @param {string} gender - Patient gender ('BOY' or 'GIRL')
 * @param {number} weight - Patient weight in kg
 * @param {number|null} height - Patient height in cm (optional)
 * @returns {Object} Closest matching growth reference record
 * @throws {Error} If no data found for the specified gender
 */
function findMatchByWeightAndHeight(gender, weight, height = null) {
  if (!childData || childData.length === 0) {
    throw new Error("Child data not loaded");
  }

  // Filter by gender
  let candidates = childData.filter((record) => record.gender === gender);

  if (candidates.length === 0) {
    throw new Error(`No data found for gender: ${gender}`);
  }

  // Find closest by weight first
  let closestByWeight = candidates[0];
  let minWeightDiff = Math.abs(candidates[0].weight - weight);

  candidates.forEach((record) => {
    const weightDiff = Math.abs(record.weight - weight);

    if (weightDiff < minWeightDiff) {
      minWeightDiff = weightDiff;
      closestByWeight = record;
    } else if (weightDiff === minWeightDiff) {
      // If tie, prefer the higher age
      const currentMonths = convertToMonths(
        closestByWeight.age,
        closestByWeight.ageUnit
      );
      const candidateMonths = convertToMonths(record.age, record.ageUnit);
      if (candidateMonths > currentMonths) {
        closestByWeight = record;
      }
    }
  });

  // If height is provided, refine from same weight group
  if (height !== null) {
    const weightGroup = candidates.filter(
      (record) => Math.abs(record.weight - closestByWeight.weight) < 0.1
    );

    if (weightGroup.length > 1) {
      closestByWeight = findClosestInGroup(weightGroup, "height", height);
    }
  }

  return closestByWeight;
}

/**
 * Find closest WHO growth reference by gender and weight with optional age/height refinement
 * Priority: gender → weight → age/height
 * @param {string} gender - Patient gender ('BOY' or 'GIRL')
 * @param {number} weight - Patient weight in kg
 * @param {number|null} age - Patient age for refinement (optional)
 * @param {number|null} height - Patient height in cm for refinement (optional)
 * @returns {Object} Closest matching growth reference record
 * @throws {Error} If no data found for the specified gender
 */
function findClosestMatch(gender, weight, age = null, height = null) {
  if (!childData || childData.length === 0) {
    throw new Error("Child data not loaded");
  }

  // Filter by gender
  let candidates = childData.filter((record) => record.gender === gender);

  if (candidates.length === 0) {
    throw new Error(`No data found for gender: ${gender}`);
  }

  // Find closest by weight
  let closestByWeight = candidates[0];
  let minWeightDiff = Math.abs(candidates[0].weight - weight);

  candidates.forEach((record) => {
    const weightDiff = Math.abs(record.weight - weight);

    if (weightDiff < minWeightDiff) {
      minWeightDiff = weightDiff;
      closestByWeight = record;
    } else if (weightDiff === minWeightDiff) {
      // If tie, prefer the higher age
      const currentMonths = convertToMonths(
        closestByWeight.age,
        closestByWeight.ageUnit
      );
      const candidateMonths = convertToMonths(record.age, record.ageUnit);
      if (candidateMonths > currentMonths) {
        closestByWeight = record;
      }
    }
  });

  // If age or height provided, further filter from same weight group
  if (age !== null || height !== null) {
    const weightGroup = candidates.filter(
      (record) => Math.abs(record.weight - closestByWeight.weight) < 0.1
    );

    if (weightGroup.length > 1) {
      if (age !== null) {
        closestByWeight = findClosestInGroup(
          weightGroup,
          "age",
          age,
          "ageUnit"
        );
      } else if (height !== null) {
        closestByWeight = findClosestInGroup(weightGroup, "height", height);
      }
    }
  }

  return closestByWeight;
}

/**
 * Find closest record in a group by a specific metric
 * @param {Array<Object>} group - Array of records to search
 * @param {string} metric - Metric property name to compare ('weight', 'height', 'age', etc.)
 * @param {number} value - Target value to match
 * @param {string|null} unitMetric - Optional unit metric property for tie-breaking (optional)
 * @returns {Object} Record with closest match to target value
 * @private
 */
function findClosestInGroup(group, metric, value, unitMetric = null) {
  let closest = group[0];
  let minDiff = Math.abs(closest[metric] - value);

  group.forEach((record) => {
    const diff = Math.abs(record[metric] - value);
    if (diff < minDiff) {
      minDiff = diff;
      closest = record;
    } else if (diff === minDiff && unitMetric) {
      // If tie on metric, prefer higher value
      if (record[metric] > closest[metric]) {
        closest = record;
      }
    }
  });

  return closest;
}

/**
 * Calculate closeness percentage comparing input metrics to age-expected values
 * Uses averaged percentage deviation from expected weight and height
 * Score: 100 = ±10% deviation, 90 = ±20%, 75 = ±30%, 60 = ±40%, lower beyond
 * @param {number} inputWeight - Patient input weight in kg
 * @param {number|null} inputHeight - Patient input height in cm (optional)
 * @param {Object} ageMatchedRecord - Age-matched growth reference record
 * @returns {number} Closeness score from 0-100
 */
function calculateCloseness(inputWeight, inputHeight, ageMatchedRecord) {
  if (!ageMatchedRecord) return 0;

  const expectedWeight = ageMatchedRecord.weight;
  const expectedHeight = ageMatchedRecord.height;

  // Calculate weight deviation percentage
  const weightDeviation =
    (Math.abs(inputWeight - expectedWeight) / expectedWeight) * 100;

  let averageDeviation = weightDeviation;

  // If height is provided, include it in the calculation
  if (inputHeight !== null && inputHeight !== undefined) {
    const heightDeviation =
      (Math.abs(inputHeight - expectedHeight) / expectedHeight) * 100;
    averageDeviation = (weightDeviation + heightDeviation) / 2;
  }

  // Map deviation to closeness score
  let closeness;
  if (averageDeviation <= 10) {
    closeness = 100;
  } else if (averageDeviation <= 20) {
    // Linear interpolation between 100 (at 10%) and 90 (at 20%)
    closeness = 100 - (averageDeviation - 10) * 1;
  } else if (averageDeviation <= 30) {
    // Linear interpolation between 90 (at 20%) and 75 (at 30%)
    closeness = 90 - (averageDeviation - 20) * 1.5;
  } else if (averageDeviation <= 40) {
    // Linear interpolation between 75 (at 30%) and 60 (at 40%)
    closeness = 75 - (averageDeviation - 30) * 1.5;
  } else {
    // Beyond 40%, decrease by 1 point per percent
    closeness = 60 - (averageDeviation - 40);
  }

  return Math.round(Math.max(0, closeness));
}

/**
 * Format assessment results for display
 * Combines input data, age-matched expectations, and weight-matched expectations
 * @param {Object} inputData - Patient input data
 * @param {Object} ageMatchedRecord - WHO reference record for patient's age
 * @param {Object} weightMatchedRecord - WHO reference record for patient's weight/height
 * @returns {Object} Formatted result object with all assessment data
 */
function formatResult(inputData, ageMatchedRecord, weightMatchedRecord) {
  const closeness = calculateCloseness(
    inputData.weight,
    inputData.height || null,
    ageMatchedRecord
  );

  return {
    input: {
      gender: inputData.gender === "BOY" ? "Boy" : "Girl",
      weight: inputData.weight,
      height: inputData.height || null,
      age: inputData.age || null,
    },
    ageMatched: {
      gender: ageMatchedRecord.gender === "BOY" ? "Boy" : "Girl",
      weight: ageMatchedRecord.weight,
      height: ageMatchedRecord.height,
      age: ageMatchedRecord.age,
      ageUnit: ageMatchedRecord.ageUnit,
      ageType: ageMatchedRecord.ageType,
      ageLabel: formatAge(ageMatchedRecord.age, ageMatchedRecord.ageUnit),
    },
    weightMatched: {
      gender: weightMatchedRecord.gender === "BOY" ? "Boy" : "Girl",
      weight: weightMatchedRecord.weight,
      height: weightMatchedRecord.height,
      age: weightMatchedRecord.age,
      ageUnit: weightMatchedRecord.ageUnit,
      ageType: weightMatchedRecord.ageType,
      ageLabel: formatAge(weightMatchedRecord.age, weightMatchedRecord.ageUnit),
    },
    closeness: closeness,
    closenessLabel: getClosenessLabel(closeness),
  };
}

/**
 * Get descriptive label for closeness percentage
 * @param {number} closeness - Closeness percentage (0-100)
 * @returns {string} Descriptive label (e.g., 'Excellent match', 'Very close')
 */
function getClosenessLabel(closeness) {
  if (closeness >= 90) return "Excellent match";
  if (closeness >= 75) return "Very close";
  if (closeness >= 60) return "Close match";
  if (closeness >= 40) return "Moderate";
  return "Some difference";
}

/**
 * Calculate WHO growth stage classification based on age
 * Stages: INFANT (0-23 months), CHILD (2-5 years), ADOLESCENT (6+ years)
 * @param {number} age - Age value
 * @param {string} unit - Age unit ('MONTH' or 'YEAR')
 * @returns {string} Growth stage classification ('INFANT', 'CHILD', or 'ADOLESCENT')
 */
function calculateGrowthStage(age, unit) {
  const months = convertToMonths(age, unit);

  if (months < 24) {
    return "INFANT";
  } else if (age >= 6) {
    return "ADOLESCENT";
  } else {
    return "CHILD";
  }
}

/**
 * Validate patient assessment input data
 * Checks for required fields and valid value ranges
 * @param {string|null} gender - Patient gender ('BOY', 'GIRL', or null)
 * @param {number|null} weight - Patient weight in kg
 * @param {number|null} height - Patient height in cm (optional)
 * @param {string|null} age - Patient age as 'value-unit' string
 * @returns {string[]} Array of error messages (empty if valid)
 */
function validateInput(gender, weight, height = null, age = null) {
  const errors = [];

  if (!gender) {
    errors.push("Gender is required");
  }

  if (!weight || isNaN(weight)) {
    errors.push("Weight is required");
  } else if (weight < 0.01 || weight > 150) {
    errors.push("Weight must be between 0.01 and 150 kg");
  }

  if (!age) {
    errors.push("Age is required");
  }

  if (height !== null && height !== "") {
    if (isNaN(height)) {
      errors.push("Height must be a valid number");
    } else if (height < 0.01 || height > 220) {
      errors.push("Height must be between 0.01 and 220 cm");
    }
  }

  return errors;
}

/**
 * Get all WHO reference data for a specific gender filtered for chart rendering
 * Normalizes ages to years and sorts chronologically for smooth curve plotting
 * @param {string} gender - Gender filter ('BOY' or 'GIRL')
 * @returns {Array<Object>} Sorted array of growth records with normalizedAge property
 */
function getChartDataForGender(gender) {
  if (!childData) return [];
  const filtered = childData
    .filter((d) => d.gender === gender)
    .map((d) => {
      const normalizedAge = convertToMonths(d.age, d.ageUnit) / 12; // normalize to years
      return { ...d, normalizedAge };
    });

  // Sort by age in the nornalized unit
  return filtered.sort((a, b) => a.normalizedAge - b.normalizedAge);
}
