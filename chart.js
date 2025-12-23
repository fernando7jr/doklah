// Growth Chart SVG Generator

/**
 * Create and render SVG growth chart with z-score curves
 * Plots WHO reference curves with z-scores (-2, -1, 0, +1, +2) and patient data point
 * Chart type adapts based on growth stage and available data
 * @async
 * @param {string} metric - Chart metric: 'weight', 'height', or 'bmi'
 * @param {string} gender - Patient gender: 'BOY' or 'GIRL'
 * @param {Object} patientData - Patient assessment data
 * @param {number} patientData.age - Patient age value
 * @param {string} patientData.ageUnit - Patient age unit ('MONTH' or 'YEAR')
 * @param {number} patientData.weight - Patient weight in kg
 * @param {number|null} patientData.height - Patient height in cm (optional)
 * @returns {Promise<void>}
 */
async function renderGrowthChart(metric, gender, patientData) {
  const svg = document.getElementById("chartSvg");
  svg.innerHTML = ""; // Clear previous chart

  // Load z-score data
  await loadZScoreData();

  // Determine growth stage
  const growthStage = determineGrowthStage(
    patientData.age,
    patientData.ageUnit
  );

  // Get chart data and z-score curves
  const chartData = getChartDataForGender(gender);
  if (!chartData || chartData.length === 0) {
    svg.innerHTML =
      '<text x="50%" y="50%" text-anchor="middle">No data available</text>';
    return;
  }

  // Filter chart data to age range of growth stage
  const ageRangeConfig = zScoreData?.strategy?.[growthStage]?.ageRange;
  let filteredChartData = chartData;

  if (ageRangeConfig) {
    const minAgeMonths = convertToMonths(
      ageRangeConfig.min,
      ageRangeConfig.unit
    );
    const maxAgeMonths = convertToMonths(
      ageRangeConfig.max,
      ageRangeConfig.unit
    );

    filteredChartData = chartData.filter((d) => {
      const ageMonths = convertToMonths(d.age, d.ageUnit);
      return ageMonths >= minAgeMonths && ageMonths <= maxAgeMonths;
    });
  }

  // Chart dimensions
  const width = 800;
  const height = 400;
  const padding = { top: 40, right: 40, bottom: 60, left: 60 };

  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Set SVG dimensions
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);

  // Extract age and metric values
  const ages = filteredChartData.map((d) => d.normalizedAge);
  const metricKey = growthStage === "adolescent" ? "bmi" : metric;
  const values = filteredChartData.map((d) => {
    if (metricKey === "bmi" && d.weight && d.height) {
      return calculateBMI(d.weight, d.height);
    }
    return metricKey === "weight" ? d.weight : d.height;
  });

  // Collect all z-score values to include in scaling
  let allValues = [...values];
  for (let i = 0; i < filteredChartData.length; i++) {
    const dataPoint = filteredChartData[i];
    const zScoreCurves = getZScoreCurves(
      dataPoint.gender ||
        (currentPatientData ? currentPatientData.gender : "BOY"),
      dataPoint.age,
      dataPoint.ageUnit,
      metricKey
    );
    for (const [zScore, curveValue] of Object.entries(zScoreCurves)) {
      if (curveValue !== undefined && curveValue !== null) {
        allValues.push(curveValue);
      }
    }
  }

  const minAge = Math.min(...ages);
  const maxAge = Math.max(...ages);
  const minValue = Math.min(...allValues);
  const maxValue = Math.max(...allValues);

  // Add 10% padding to ranges
  const ageRange = maxAge - minAge || 1;
  const valueRange = maxValue - minValue || 1;
  const minAgePadded = minAge - ageRange * 0.05;
  const maxAgePadded = maxAge + ageRange * 0.05;
  const minValuePadded = Math.max(0, minValue - valueRange * 0.1);
  const maxValuePadded = maxValue + valueRange * 0.1;

  // Helper: Convert data value to SVG coordinate
  const toSvgX = (age) => {
    return (
      padding.left +
      ((age - minAgePadded) / (maxAgePadded - minAgePadded)) * chartWidth
    );
  };

  const toSvgY = (value) => {
    return (
      height -
      padding.bottom -
      ((value - minValuePadded) / (maxValuePadded - minValuePadded)) *
        chartHeight
    );
  };

  // Background
  const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  bg.setAttribute("width", width);
  bg.setAttribute("height", height);
  bg.setAttribute("fill", "white");
  svg.appendChild(bg);

  // Grid lines (horizontal)
  const gridLines = 5;
  for (let i = 0; i <= gridLines; i++) {
    const y = padding.top + (chartHeight / gridLines) * i;
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", padding.left);
    line.setAttribute("x2", width - padding.right);
    line.setAttribute("y1", y);
    line.setAttribute("y2", y);
    line.setAttribute("stroke", "#e0e0e0");
    line.setAttribute("stroke-width", "1");
    svg.appendChild(line);
  }

  // Axes
  const xAxis = document.createElementNS("http://www.w3.org/2000/svg", "line");
  xAxis.setAttribute("x1", padding.left);
  xAxis.setAttribute("x2", width - padding.right);
  xAxis.setAttribute("y1", height - padding.bottom);
  xAxis.setAttribute("y2", height - padding.bottom);
  xAxis.setAttribute("stroke", "#2c3e50");
  xAxis.setAttribute("stroke-width", "2");
  svg.appendChild(xAxis);

  const yAxis = document.createElementNS("http://www.w3.org/2000/svg", "line");
  yAxis.setAttribute("x1", padding.left);
  yAxis.setAttribute("x2", padding.left);
  yAxis.setAttribute("y1", padding.top);
  yAxis.setAttribute("y2", height - padding.bottom);
  yAxis.setAttribute("stroke", "#2c3e50");
  yAxis.setAttribute("stroke-width", "2");
  svg.appendChild(yAxis);

  // Axis labels and ticks
  const tickCount = 5;
  for (let i = 0; i <= tickCount; i++) {
    // X-axis
    const age = minAgePadded + ((maxAgePadded - minAgePadded) / tickCount) * i;
    const xPos = toSvgX(age);

    const xTick = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "line"
    );
    xTick.setAttribute("x1", xPos);
    xTick.setAttribute("x2", xPos);
    xTick.setAttribute("y1", height - padding.bottom);
    xTick.setAttribute("y2", height - padding.bottom + 5);
    xTick.setAttribute("stroke", "#2c3e50");
    svg.appendChild(xTick);

    const xLabel = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "text"
    );
    xLabel.setAttribute("x", xPos);
    xLabel.setAttribute("y", height - padding.bottom + 20);
    xLabel.setAttribute("text-anchor", "middle");
    xLabel.setAttribute("font-size", "12");
    xLabel.setAttribute("fill", "#666");
    const ageMonths = Math.round(age * 12);
    xLabel.textContent =
      ageMonths < 12 ? `${ageMonths}m` : `${Math.round(age)}y`;
    svg.appendChild(xLabel);

    // Y-axis
    const value =
      minValuePadded + ((maxValuePadded - minValuePadded) / tickCount) * i;
    const yPos = toSvgY(value);

    const yTick = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "line"
    );
    yTick.setAttribute("x1", padding.left - 5);
    yTick.setAttribute("x2", padding.left);
    yTick.setAttribute("y1", yPos);
    yTick.setAttribute("y2", yPos);
    yTick.setAttribute("stroke", "#2c3e50");
    svg.appendChild(yTick);

    const yLabel = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "text"
    );
    yLabel.setAttribute("x", padding.left - 10);
    yLabel.setAttribute("y", yPos + 4);
    yLabel.setAttribute("text-anchor", "end");
    yLabel.setAttribute("font-size", "12");
    yLabel.setAttribute("fill", "#666");
    yLabel.textContent = Math.round(value);
    svg.appendChild(yLabel);
  }

  // Axis titles
  const xTitle = document.createElementNS("http://www.w3.org/2000/svg", "text");
  xTitle.setAttribute("x", width / 2);
  xTitle.setAttribute("y", height - 10);
  xTitle.setAttribute("text-anchor", "middle");
  xTitle.setAttribute("font-size", "14");
  xTitle.setAttribute("font-weight", "bold");
  xTitle.setAttribute("fill", "#2c3e50");
  xTitle.textContent = "Age";
  svg.appendChild(xTitle);

  const yTitle = document.createElementNS("http://www.w3.org/2000/svg", "text");
  yTitle.setAttribute("x", 20);
  yTitle.setAttribute("y", padding.top - 10);
  yTitle.setAttribute("text-anchor", "middle");
  yTitle.setAttribute("font-size", "14");
  yTitle.setAttribute("font-weight", "bold");
  yTitle.setAttribute("fill", "#2c3e50");
  yTitle.setAttribute("transform", `rotate(-90 20 ${padding.top - 10})`);

  if (growthStage === "adolescent") {
    yTitle.textContent = "BMI (kg/m²)";
  } else {
    yTitle.textContent = metricKey === "weight" ? "Weight (kg)" : "Height (cm)";
  }
  svg.appendChild(yTitle);

  // Plot z-score curves with colors: -2 (black), -1 (red), 0 (green), +1 (red), +2 (black)
  const zScoreColors = {
    "-2": "#000000",
    "-1": "#dc3545",
    0: "#28a745",
    1: "#dc3545",
    2: "#000000",
  };

  // Plot all z-score curves across all ages
  for (const [zScore, color] of Object.entries(zScoreColors)) {
    let pathData = "";

    for (let i = 0; i < filteredChartData.length; i++) {
      const dataPoint = filteredChartData[i];
      const x = toSvgX(dataPoint.normalizedAge);

      // Get z-score curves for this specific age
      const zScoreCurves = getZScoreCurves(
        gender,
        dataPoint.age,
        dataPoint.ageUnit,
        metricKey
      );
      const curveValue = zScoreCurves[zScore];

      if (curveValue === undefined || curveValue === null) continue;

      let y;
      if (growthStage === "adolescent") {
        // For adolescents, the z-score value IS the BMI value
        y = toSvgY(curveValue);
      } else {
        // For infant/child, the z-score value IS the weight/height value
        y = toSvgY(curveValue);
      }

      pathData += (pathData === "" ? "M" : "L") + x + " " + y;
    }

    if (pathData) {
      const path = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "path"
      );
      path.setAttribute("d", pathData);
      path.setAttribute("stroke", color);
      path.setAttribute("stroke-width", zScore === "0" ? "3" : "2");
      path.setAttribute("fill", "none");
      path.setAttribute("stroke-linecap", "round");
      path.setAttribute("stroke-linejoin", "round");
      path.setAttribute("opacity", zScore === "0" ? "1" : "0.7");
      svg.appendChild(path);
    }
  }

  // Patient point
  if (patientData) {
    const patientAgeYears =
      convertToMonths(patientData.age, patientData.ageUnit) / 12;
    let patientValue = null;

    if (growthStage === "adolescent") {
      // Calculate BMI for adolescent
      const height =
        patientData.height ||
        getMedianHeightForAge(gender, patientData.age, patientData.ageUnit);
      if (height) {
        patientValue = calculateBMI(patientData.weight, height);
      }
    } else {
      // Use weight or height for infant/child
      patientValue =
        metricKey === "weight" ? patientData.weight : patientData.height;
    }

    // Only render patient point if the metric value is available
    if (patientValue !== null && patientValue !== undefined) {
      const px = toSvgX(patientAgeYears);
      const py = toSvgY(patientValue);

      // Highlight circle
      const highlight = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "circle"
      );
      highlight.setAttribute("cx", px);
      highlight.setAttribute("cy", py);
      highlight.setAttribute("r", "8");
      highlight.setAttribute("fill", "none");
      highlight.setAttribute("stroke", "#ffc107");
      highlight.setAttribute("stroke-width", "3");
      svg.appendChild(highlight);

      // Patient point
      const patientPoint = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "circle"
      );
      patientPoint.setAttribute("cx", px);
      patientPoint.setAttribute("cy", py);
      patientPoint.setAttribute("r", "6");
      patientPoint.setAttribute("fill", "#ffc107");
      patientPoint.setAttribute("cursor", "pointer");
      svg.appendChild(patientPoint);

      // Label
      const label = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "text"
      );
      label.setAttribute("x", px);
      label.setAttribute("y", py - 15);
      label.setAttribute("text-anchor", "middle");
      label.setAttribute("font-size", "12");
      label.setAttribute("font-weight", "bold");
      label.setAttribute("fill", "#ffc107");
      if (growthStage === "adolescent") {
        label.textContent = `${patientValue.toFixed(1)} BMI`;
      } else {
        label.textContent = `${patientValue.toFixed(1)} ${
          metricKey === "weight" ? "kg" : "cm"
        }`;
      }
      svg.appendChild(label);
    }
  }

  // Legend
  const legendX = width - 150;
  const legendY = padding.top + 10;
  const legendItems = [
    { label: "z = 0 (Median)", color: "#28a745" },
    { label: "z = ±1", color: "#dc3545" },
    { label: "z = ±2", color: "#000000" },
    { label: "Patient", color: "#ffc107" },
  ];

  legendItems.forEach((item, idx) => {
    const y = legendY + idx * 20;

    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("x", legendX);
    rect.setAttribute("y", y - 6);
    rect.setAttribute("width", 12);
    rect.setAttribute("height", 12);
    rect.setAttribute("fill", item.color);
    svg.appendChild(rect);

    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", legendX + 16);
    text.setAttribute("y", y + 4);
    text.setAttribute("font-size", "11");
    text.setAttribute("fill", "#333");
    text.textContent = item.label;
    svg.appendChild(text);
  });
}
