// Growth Chart SVG Generator

/**
 * Create and render SVG growth chart (weight or height by age)
 * Plots WHO reference curve with patient data point highlighted
 * @async
 * @param {string} metric - Chart metric: 'weight' or 'height'
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

  // Get data filtered by gender
  const chartData = getChartDataForGender(gender);
  if (!chartData || chartData.length === 0) {
    svg.innerHTML =
      '<text x="50%" y="50%" text-anchor="middle">No data available</text>';
    return;
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
  const ages = chartData.map((d) => d.normalizedAge);
  const values = chartData.map((d) =>
    metric === "weight" ? d.weight : d.height
  );

  const minAge = Math.min(...ages);
  const maxAge = Math.max(...ages);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);

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
  yTitle.textContent = metric === "weight" ? "Weight (kg)" : "Height (cm)";
  svg.appendChild(yTitle);

  // Main curve (growth data)
  let pathData = "";
  for (let i = 0; i < chartData.length; i++) {
    const x = toSvgX(chartData[i].normalizedAge);
    const y = toSvgY(
      metric === "weight" ? chartData[i].weight : chartData[i].height
    );
    pathData += (i === 0 ? "M" : "L") + x + " " + y;
  }

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", pathData);
  path.setAttribute("stroke", "#2c3e50");
  path.setAttribute("stroke-width", "2");
  path.setAttribute("fill", "none");
  path.setAttribute("stroke-linecap", "round");
  path.setAttribute("stroke-linejoin", "round");
  svg.appendChild(path);

  // Plot all data points
  for (const point of chartData) {
    const x = toSvgX(point.normalizedAge);
    const y = toSvgY(metric === "weight" ? point.weight : point.height);

    const circle = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "circle"
    );
    circle.setAttribute("cx", x);
    circle.setAttribute("cy", y);
    circle.setAttribute("r", "2");
    circle.setAttribute("fill", "#2c3e50");
    circle.setAttribute("opacity", "0.3");
    svg.appendChild(circle);
  }

  // Patient point
  if (patientData) {
    const patientAgeYears =
      convertToMonths(patientData.age, patientData.ageUnit) / 12;
    const patientValue =
      metric === "weight" ? patientData.weight : patientData.height;

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
      highlight.setAttribute("stroke", "#dc3545");
      highlight.setAttribute("stroke-width", "2");
      svg.appendChild(highlight);

      // Patient point
      const patientPoint = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "circle"
      );
      patientPoint.setAttribute("cx", px);
      patientPoint.setAttribute("cy", py);
      patientPoint.setAttribute("r", "5");
      patientPoint.setAttribute("fill", "#dc3545");
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
      label.setAttribute("fill", "#dc3545");
      label.textContent = `${patientValue.toFixed(1)} ${
        metric === "weight" ? "kg" : "cm"
      }`;
      svg.appendChild(label);
    }
  }
}
