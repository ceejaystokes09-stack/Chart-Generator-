# ChartCraft: CSV & JSON Chart Generator

A feature-rich, fully client-side web application that lets users paste or upload CSV and JSON datasets to instantly generate, customize, and export interactive charts.

## Features

* **Flexible Data Input:** Paste raw data or upload files (CSV, JSON, TSV, newline-delimited JSON) up to 10 MB.
* **Automatic Data Parsing:** Intelligently handles delimiters, headers, and complex data structures.
* **Multiple Chart Types:** Switch seamlessly between bar charts, line graphs, pie charts, doughnut charts, polar area charts, scatter plots, and bubble charts.
* **Data Summarization & Grouping:** Group records dynamically and apply aggregation methods (Sum, Average, Count, Min, Max).
* **Export & Share:** Download your final charts as high-resolution PNG images or copy them directly to your system clipboard.
* **Zero Dependencies / Backend:** Runs entirely in the browser using [Chart.js](https://www.chart.js5/) and [Papa Parse](https://www.papaparse.com/), keeping your data completely private.

## Files Included

* `index.html` – The core structure, styling interface, and preview containers.
* `index.js` – The application logic handling data parsing, UI bindings, error management, and Chart.js rendering.

## Getting Started

To run this project locally, follow these steps:

1. Clone or download this repository.
2. Ensure you have an internet connection so the external CDN scripts (`Chart.js` and `Papa Parse`) can load.
3. Open `index.html` in any modern web browser or run it via a local development server (like VS Code's Live Server extension).

## Usage

1. Load the built-in sample data by clicking the example button, paste your own data into the text area, or upload a `.csv`/`.json` file.
2. Choose your preferred chart type and customize your axis labels, grouping, and series options.
3. Click **Generate Chart** to render your visualization.
4. Export or copy your finished chart image for use in presentations, reports, or documents.
