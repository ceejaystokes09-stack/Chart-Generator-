(() => {
  "use strict";

  const palette = [
    "#7657e8",
    "#38b99b",
    "#f1a35a",
    "#ec7188",
    "#538bd9",
    "#b084d8",
    "#75b5c7",
    "#d2b348",
  ];
  const sampleData = `Month,Website visits,Sign ups
January,820,120
February,960,148
March,760,105
April,1180,190
May,1040,165
June,1420,238
July,1280,211`;

  const elements = {
    input: document.querySelector("#data-input"),
    fileInput: document.querySelector("#file-input"),
    chartType: document.querySelector("#chart-type"),
    labelColumn: document.querySelector("#label-column"),
    valueColumn: document.querySelector("#value-column"),
    additionalSeriesField: document.querySelector("#additional-series-field"),
    seriesOptions: document.querySelector("#series-options"),
    seriesHelp: document.querySelector("#series-help"),
    summaryToggle: document.querySelector("#summary-toggle"),
    summaryOptions: document.querySelector("#summary-options"),
    groupColumn: document.querySelector("#group-column"),
    summaryMethod: document.querySelector("#summary-method"),
    summaryHint: document.querySelector("#summary-hint"),
    sizeColumn: document.querySelector("#size-column"),
    bubbleField: document.querySelector("#bubble-field"),
    showLegend: document.querySelector("#show-legend"),
    smoothLine: document.querySelector("#smooth-line"),
    smoothOption: document.querySelector("#smooth-option"),
    generate: document.querySelector("#generate-chart"),
    loadExample: document.querySelector("#load-example"),
    rowCount: document.querySelector("#row-count"),
    chartCanvas: document.querySelector("#chart-canvas"),
    emptyState: document.querySelector("#empty-state"),
    copyImage: document.querySelector("#copy-image"),
    downloadImage: document.querySelector("#download-image"),
    toast: document.querySelector("#toast"),
    chartTitle: document.querySelector("#chart-heading"),
    chartDescription: document.querySelector("#chart-description"),
    chartKicker: document.querySelector("#chart-kicker"),
    chartBadge: document.querySelector("#chart-badge"),
    chartFootnote: document.querySelector("#chart-footnote"),
    previewTitle: document.querySelector("#preview-title"),
  };

  let chart = null;
  let columns = [];
  let rows = [];
  let toastTimer;

  function notify(message, isError = false) {
    elements.toast.textContent = message;
    elements.toast.classList.toggle("error", isError);
    elements.toast.classList.add("visible");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(
      () => elements.toast.classList.remove("visible"),
      3200,
    );
  }

  function setRows(data, headers) {
    const previousSeries = selectedSeries();
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error(
        "No data rows found. Add a header row and at least one row of data.",
      );
    }

    const normalized = data.map((row, index) => {
      if (!row || typeof row !== "object" || Array.isArray(row)) {
        throw new Error(
          `Row ${index + 1} must be an object with named columns.`,
        );
      }
      return row;
    });
    const keys =
      headers && headers.length
        ? headers
        : [...new Set(normalized.flatMap((row) => Object.keys(row)))];
    if (keys.length === 0)
      throw new Error("No column names were found in your data.");

    rows = normalized;
    columns = keys.map(String);
    elements.rowCount.textContent = `${rows.length} ${rows.length === 1 ? "row" : "rows"}`;
    fillSelect(elements.labelColumn, columns, "Choose a label column");
    fillSelect(elements.sizeColumn, columns, "Choose a size column");
    fillSelect(elements.groupColumn, columns, "Choose a category");
    elements.labelColumn.disabled = false;
    elements.sizeColumn.disabled = false;
    elements.groupColumn.disabled = false;
    updateSeriesOptions(previousSeries);
  }

  function fillSelect(select, options, placeholder) {
    const previousValue = select.value;
    select.replaceChildren();
    const first = document.createElement("option");
    first.value = "";
    first.textContent = placeholder;
    select.append(first);
    for (const option of options) {
      const item = document.createElement("option");
      item.value = option;
      item.textContent = option;
      select.append(item);
    }
    if (options.includes(previousValue)) select.value = previousValue;
    else if (options.length) select.value = options[0];
  }

  function parseData(text) {
    const source = text.trim();
    if (!source)
      throw new Error("Paste or upload some data before generating a chart.");

    if (source.startsWith("[") || source.startsWith("{")) {
      try {
        const json = JSON.parse(source);
        if (Array.isArray(json)) {
          if (json.length && json.every((item) => Array.isArray(item))) {
            return rowsFromTable(json);
          }
          if (
            json.length &&
            json.every(
              (item) =>
                item && typeof item === "object" && !Array.isArray(item),
            )
          ) {
            return {
              rows: json,
              headers: [...new Set(json.flatMap((item) => Object.keys(item)))],
            };
          }
          throw new Error(
            'JSON data must be an array of objects, such as [{"month":"Jan","sales":42}].',
          );
        }
        if (json && typeof json === "object") {
          const arrayValue = Object.values(json).find(Array.isArray);
          if (
            arrayValue &&
            arrayValue.length &&
            arrayValue.every(
              (item) =>
                item && typeof item === "object" && !Array.isArray(item),
            )
          ) {
            return {
              rows: arrayValue,
              headers: [
                ...new Set(arrayValue.flatMap((item) => Object.keys(item))),
              ],
            };
          }
          const values = Object.entries(json);
          if (
            values.length &&
            values.every(([, value]) => Array.isArray(value))
          ) {
            const length = Math.max(...values.map(([, value]) => value.length));
            const objectRows = Array.from({ length }, (_, index) =>
              Object.fromEntries(
                values.map(([key, value]) => [key, value[index]]),
              ),
            );
            return { rows: objectRows, headers: values.map(([key]) => key) };
          }
          return { rows: [json], headers: Object.keys(json) };
        }
      } catch (error) {
        if (error instanceof SyntaxError) {
          const lines = source.split(/\r?\n/).filter((line) => line.trim());
          if (lines.length > 1) {
            try {
              const records = lines.map((line) => JSON.parse(line));
              if (
                records.every(
                  (record) =>
                    record &&
                    typeof record === "object" &&
                    !Array.isArray(record),
                )
              ) {
                return {
                  rows: records,
                  headers: [
                    ...new Set(
                      records.flatMap((record) => Object.keys(record)),
                    ),
                  ],
                };
              }
            } catch {
              // Preserve the regular JSON syntax error below.
            }
          }
          throw new Error(`Invalid JSON: ${error.message}`);
        }
        throw error;
      }
    }

    const firstLine = source.split(/\r?\n/, 1)[0];
    const delimiter = firstLine.includes("\t")
      ? "\t"
      : firstLine.includes(";") && !firstLine.includes(",")
        ? ";"
        : ",";
    if (delimiter === ",") {
      const result = Papa.parse(source, {
        header: true,
        skipEmptyLines: "greedy",
        transformHeader: (header) => header.trim(),
      });
      if (result.errors.length)
        throw new Error(`Could not read the data: ${result.errors[0].message}`);
      const parsedRows = result.data.filter((row) =>
        Object.values(row).some((value) => String(value ?? "").trim()),
      );
      return { rows: parsedRows, headers: result.meta.fields || [] };
    }

    const table = source
      .split(/\r?\n/)
      .filter((line) => line.trim())
      .map((line) => splitDelimitedLine(line, delimiter));
    return rowsFromTable(table);
  }

  function splitDelimitedLine(line, delimiter) {
    const fields = [];
    let field = "";
    let quoted = false;
    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];
      if (char === '"') {
        if (quoted && line[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          quoted = !quoted;
        }
      } else if (char === delimiter && !quoted) {
        fields.push(field.trim());
        field = "";
      } else {
        field += char;
      }
    }
    if (quoted) throw new Error("A quoted value is missing its closing quote.");
    fields.push(field.trim());
    return fields;
  }

  function rowsFromTable(table) {
    if (table.length < 2)
      throw new Error("Add a header row and at least one row of data.");
    const headers = table[0].map((value, index) =>
      String(value || `Column ${index + 1}`).trim(),
    );
    const data = table
      .slice(1)
      .filter((row) => row.some((value) => String(value ?? "").trim()))
      .map((row) => {
        return Object.fromEntries(
          headers.map((header, index) => [header, row[index] ?? ""]),
        );
      });
    return { rows: data, headers };
  }

  function inferData() {
    const text = elements.input.value.trim();
    if (!text) {
      rows = [];
      columns = [];
      elements.rowCount.textContent = "0 rows";
      elements.labelColumn.replaceChildren(
        new Option("Add data to choose a column", ""),
      );
      elements.labelColumn.disabled = true;
      elements.valueColumn.replaceChildren(
        new Option("Add numeric data to choose a column", ""),
      );
      elements.valueColumn.disabled = true;
      elements.sizeColumn.replaceChildren(
        new Option("Choose a size column", ""),
      );
      elements.sizeColumn.disabled = true;
      elements.groupColumn.replaceChildren(new Option("Choose a category", ""));
      elements.groupColumn.disabled = true;
      elements.seriesOptions.textContent =
        "Your data columns will appear here.";
      elements.seriesOptions.className = "series-options empty-series";
      elements.additionalSeriesField.hidden = false;
      return;
    }
    try {
      const parsed = parseData(text);
      setRows(parsed.rows, parsed.headers);
    } catch {
      elements.rowCount.textContent = "Check data format";
    }
  }

  function updateSeriesOptions(previouslySelected = selectedSeries()) {
    const labelKey = elements.labelColumn.value;
    const numericColumns = columns.filter(
      (column) =>
        column !== labelKey && rows.some((row) => isNumeric(row[column])),
    );
    const wasConfigured = previouslySelected.length > 0;
    fillSelect(
      elements.valueColumn,
      numericColumns,
      numericColumns.length ? "Choose a Y-axis" : "No numeric columns found",
    );
    elements.valueColumn.disabled = numericColumns.length === 0;
    elements.seriesOptions.replaceChildren();
    elements.seriesOptions.className = "series-options";
    if (!numericColumns.length) {
      elements.seriesOptions.textContent =
        "No numeric columns found. Include numbers for chart values.";
      elements.seriesOptions.className = "series-options empty-series";
      return;
    }

    const isSingleSeries = ["pie", "doughnut", "polarArea"].includes(
      elements.chartType.value,
    );
    elements.additionalSeriesField.hidden = isSingleSeries;
    elements.seriesHelp.textContent = "Optional extra Y-axes";
    numericColumns
      .filter((column) => column !== elements.valueColumn.value)
      .forEach((column) => {
        const label = document.createElement("label");
        label.className = "series-option";
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.name = "series";
        checkbox.value = column;
        checkbox.checked =
          !isSingleSeries &&
          (wasConfigured ? previouslySelected.includes(column) : true);
        const text = document.createElement("span");
        text.textContent = column;
        label.append(checkbox, text);
        elements.seriesOptions.append(label);
      });
  }

  function isNumeric(value) {
    if (value === null || value === undefined || String(value).trim() === "")
      return false;
    return Number.isFinite(Number(String(value).replace(/,/g, "")));
  }

  function numberValue(value, rowIndex, column) {
    if (!isNumeric(value))
      throw new Error(
        `"${column}" contains a non-numeric value on row ${rowIndex + 1}.`,
      );
    return Number(String(value).replace(/,/g, ""));
  }

  function selectedSeries() {
    const primary = elements.valueColumn.value;
    const comparison = [
      ...elements.seriesOptions.querySelectorAll("input:checked"),
    ]
      .map((input) => input.value)
      .filter((column) => column !== primary);
    return primary ? [primary, ...comparison] : comparison;
  }

  function updateSummaryHint() {
    const method = elements.summaryMethod.value;
    const hints = {
      count: "Counts how many records belong to each group.",
      sum: "Adds the selected Y-axis values within each group.",
      average: "Averages the selected Y-axis values within each group.",
      min: "Finds the smallest selected Y-axis value in each group.",
      max: "Finds the largest selected Y-axis value in each group.",
    };
    elements.summaryHint.textContent = hints[method];
  }

  function summarizeRows(sourceRows, groupColumn, method, valueColumns) {
    const groups = new Map();
    sourceRows.forEach((row, index) => {
      const rawLabel = row[groupColumn];
      const key =
        rawLabel === null ||
        rawLabel === undefined ||
        String(rawLabel).trim() === ""
          ? "(blank)"
          : String(rawLabel);
      if (!groups.has(key)) groups.set(key, { rows: [], firstIndex: index });
      groups.get(key).rows.push({ row, index });
    });

    if (method === "count") {
      return [...groups].map(([label, group]) => ({
        [groupColumn]: label,
        "Record count": group.rows.length,
      }));
    }

    if (!valueColumns.length)
      throw new Error("Choose a numeric Y-axis value to summarize.");
    return [...groups].map(([label, group]) => {
      const result = { [groupColumn]: label };
      for (const column of valueColumns) {
        const values = group.rows
          .filter(
            ({ row }) =>
              row[column] !== null &&
              row[column] !== undefined &&
              String(row[column]).trim() !== "",
          )
          .map(({ row, index }) => numberValue(row[column], index + 1, column));
        if (!values.length) {
          result[column] = null;
          continue;
        }
        if (method === "sum")
          result[column] = values.reduce((sum, value) => sum + value, 0);
        else if (method === "average")
          result[column] =
            values.reduce((sum, value) => sum + value, 0) / values.length;
        else if (method === "min")
          result[column] = values.reduce((minimum, value) =>
            Math.min(minimum, value),
          );
        else if (method === "max")
          result[column] = values.reduce((maximum, value) =>
            Math.max(maximum, value),
          );
      }
      return result;
    });
  }

  function renderChart() {
    if (!window.Chart || !window.Papa) {
      notify(
        "Chart libraries did not load. Check your internet connection and refresh the page.",
        true,
      );
      return;
    }
    try {
      const parsed = parseData(elements.input.value);
      setRows(parsed.rows, parsed.headers);
      const type = elements.chartType.value;
      const summarizing = elements.summaryToggle.checked;
      const summaryMethod = elements.summaryMethod.value;
      const labelKey = summarizing
        ? elements.groupColumn.value
        : elements.labelColumn.value;
      if (!labelKey)
        throw new Error(
          summarizing
            ? "Choose a column to group rows by."
            : "Choose a label or X-axis column.",
        );
      if (summarizing && ["scatter", "bubble"].includes(type)) {
        throw new Error(
          "Summarizing is not available for scatter or bubble charts. Turn it off or choose another chart type.",
        );
      }
      const series =
        summarizing && summaryMethod === "count"
          ? ["Record count"]
          : selectedSeries();
      if (!series.length) throw new Error("Choose a numeric Y-axis value.");
      const chartRows = summarizing
        ? summarizeRows(
            rows,
            labelKey,
            summaryMethod,
            summaryMethod === "count" ? [] : series,
          )
        : rows;
      const chartLabels = chartRows.map((row) => String(row[labelKey] ?? ""));
      const isScatter = type === "scatter" || type === "bubble";
      const datasets = series.map((key, seriesIndex) => {
        const values = chartRows.map((row, index) =>
          row[key] === null ? null : numberValue(row[key], index + 1, key),
        );
        if (isScatter) {
          const points = chartRows.map((row, index) => {
            const x = numberValue(row[labelKey], index + 1, labelKey);
            const y = numberValue(row[key], index + 1, key);
            if (type === "bubble") {
              const radiusColumn = elements.sizeColumn.value;
              if (!radiusColumn)
                throw new Error("Choose a bubble size column.");
              const radius = numberValue(
                row[radiusColumn],
                index + 1,
                radiusColumn,
              );
              return {
                x,
                y,
                r: Math.max(3, Math.sqrt(Math.max(0, radius)) * 2),
              };
            }
            return { x, y };
          });
          return {
            label: key,
            data: points,
            backgroundColor: palette[seriesIndex % palette.length],
            borderColor: palette[seriesIndex % palette.length],
          };
        }
        const color = palette[seriesIndex % palette.length];
        return {
          label: key,
          data: values,
          backgroundColor: ["pie", "doughnut", "polarArea"].includes(type)
            ? values.map((_, index) => palette[index % palette.length])
            : type === "line"
              ? `${color}22`
              : `${color}c9`,
          borderColor: ["pie", "doughnut", "polarArea"].includes(type)
            ? values.map((_, index) => palette[index % palette.length])
            : color,
          borderWidth: type === "line" ? 2.5 : 1,
          borderRadius: type === "bar" ? 5 : 0,
          fill: type === "line",
          tension: elements.smoothLine.checked ? 0.38 : 0,
        };
      });

      const axisIsNumeric = isScatter;
      const chartConfig = {
        type,
        data: { labels: axisIsNumeric ? undefined : chartLabels, datasets },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: { duration: 500 },
          plugins: {
            legend: {
              display:
                elements.showLegend.checked &&
                (series.length > 1 ||
                  ["pie", "doughnut", "polarArea"].includes(type)),
              position: "bottom",
              labels: {
                usePointStyle: true,
                pointStyle: "circle",
                boxWidth: 7,
                boxHeight: 7,
                padding: 18,
                color: "#777b8c",
                font: { family: "DM Sans", size: 10 },
              },
            },
            tooltip: {
              backgroundColor: "#252438",
              padding: 10,
              titleFont: { family: "DM Sans" },
              bodyFont: { family: "DM Sans" },
              cornerRadius: 7,
            },
          },
          scales: ["pie", "doughnut", "polarArea", "radar"].includes(type)
            ? {}
            : {
                x: {
                  type: axisIsNumeric ? "linear" : "category",
                  title: {
                    display: true,
                    text: labelKey,
                    color: "#85899a",
                    font: { family: "DM Sans", size: 10 },
                  },
                  grid: { display: false },
                  ticks: {
                    color: "#9397a5",
                    font: { family: "DM Sans", size: 9 },
                    maxRotation: 0,
                    autoSkip: true,
                    maxTicksLimit: 10,
                  },
                },
                y: {
                  beginAtZero: type !== "scatter" && type !== "bubble",
                  title: {
                    display: true,
                    text: series.length === 1 ? series[0] : "Values",
                    color: "#85899a",
                    font: { family: "DM Sans", size: 10 },
                  },
                  grid: { color: "#f0f0f5", drawBorder: false },
                  ticks: {
                    color: "#9397a5",
                    font: { family: "DM Sans", size: 9 },
                  },
                },
              },
        },
      };
      if (chart) chart.destroy();
      elements.emptyState.hidden = true;
      elements.chartCanvas.hidden = false;
      chart = new Chart(elements.chartCanvas, chartConfig);
      const readableType =
        elements.chartType.options[elements.chartType.selectedIndex].text;
      elements.previewTitle.textContent = "Chart preview";
      elements.chartKicker.textContent = `${rows.length} ${rows.length === 1 ? "ROW" : "ROWS"} · ${columns.length} COLUMNS`;
      elements.chartTitle.textContent =
        summarizing && summaryMethod === "count"
          ? `Record count by ${keyTitle(labelKey)}`
          : `${keyTitle(series[0])}${series.length > 1 ? ` + ${series.length - 1} more` : ""}`;
      const summaryLabel = summarizing
        ? `${elements.summaryMethod.options[elements.summaryMethod.selectedIndex].text} · `
        : "";
      elements.chartDescription.textContent = `${summaryLabel}${readableType} · ${labelKey} by ${series.join(", ")}`;
      elements.chartBadge.textContent = readableType;
      elements.chartFootnote.textContent = summarizing
        ? `${chartRows.length} ${chartRows.length === 1 ? "group" : "groups"} summarized from ${rows.length} rows`
        : `${chartRows.length} data ${chartRows.length === 1 ? "point" : "points"} visualized`;
      elements.copyImage.disabled = false;
      elements.downloadImage.disabled = false;
      notify("Your chart is ready!");
    } catch (error) {
      notify(error.message, true);
    }
  }

  function keyTitle(value) {
    return value.length > 32 ? `${value.slice(0, 29)}…` : value;
  }

  elements.input.addEventListener("input", inferData);
  elements.labelColumn.addEventListener("change", () =>
    updateSeriesOptions(selectedSeries()),
  );
  elements.valueColumn.addEventListener("change", () =>
    updateSeriesOptions(selectedSeries()),
  );
  elements.chartType.addEventListener("change", () => {
    const type = elements.chartType.value;
    elements.bubbleField.hidden = type !== "bubble";
    elements.smoothOption.hidden = type !== "line";
    updateSeriesOptions(selectedSeries());
  });
  elements.summaryToggle.addEventListener("change", () => {
    elements.summaryOptions.hidden = !elements.summaryToggle.checked;
  });
  elements.summaryMethod.addEventListener("change", updateSummaryHint);
  elements.generate.addEventListener("click", renderChart);
  elements.loadExample.addEventListener("click", () => {
    elements.input.value = sampleData;
    inferData();
    renderChart();
  });
  elements.fileInput.addEventListener("change", async (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      notify(
        "That file is larger than 10 MB. Please choose a smaller file.",
        true,
      );
      event.target.value = "";
      return;
    }
    try {
      elements.input.value = await file.text();
      inferData();
      notify(`${file.name} loaded. Check your data, then generate your chart.`);
    } catch {
      notify(
        "Could not read that file. Try saving it as CSV or JSON and upload it again.",
        true,
      );
    }
    event.target.value = "";
  });
  elements.downloadImage.addEventListener("click", () => {
    if (!chart) return;
    const link = document.createElement("a");
    link.href = chart.toBase64Image("image/png", 1);
    link.download = "chartcraft-chart.png";
    link.click();
  });
  elements.copyImage.addEventListener("click", async () => {
    if (!chart) return;
    if (!navigator.clipboard || typeof ClipboardItem === "undefined") {
      notify(
        "Image copying is not supported in this browser. Use Export PNG instead.",
        true,
      );
      return;
    }
    try {
      const blob = await new Promise((resolve) =>
        elements.chartCanvas.toBlob(resolve, "image/png"),
      );
      if (!blob) throw new Error("The chart image could not be created.");
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);
      notify("Chart image copied to your clipboard!");
    } catch {
      notify("Could not copy the image. Try Export PNG instead.", true);
    }
  });

  elements.input.value = sampleData;
  inferData();
  elements.chartType.value = "bar";
  updateSeriesOptions();
  updateSummaryHint();
})();
