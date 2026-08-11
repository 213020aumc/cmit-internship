# Node.js Module Systems & Custom Logging Utility

This repository demonstrates JavaScript module patterns in Node.js, highlighting the transition from **CommonJS (`require`/`module.exports`)** to **ES Modules (`import`/`export`)**, module exports, custom logging helper functions, and system diagnostic inspection using built-in modules like `os`.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Topics Covered](#topics-covered)
- [Project Structure](#project-structure)
- [Code Breakdown](#code-breakdown)
  - [1. ES Module Logger Utility (`logger.js`)](#1-es-module-logger-utility-loggerjs)
  - [2. Application Entry & System Inspection (`app.js`)](#2-application-entry--system-inspection-appjs)
  - [3. CommonJS vs. ES Modules Comparison](#3-commonjs-vs-es-modules-comparison)
- [Prerequisites](#prerequisites)
- [Getting Started & Usage](#getting-started--usage)
  - [Installing Dependencies](#installing-dependencies)
  - [Running the Application](#running-the-application)
- [Summary of Key Concepts](#summary-of-key-concepts)

---

## 🔍 Overview

Modular architecture allows splitting code into manageable, reusable files. This module demonstrates creating a custom logging utility function, exporting named functions in ES Modules mode (`"type": "module"`), and accessing Node.js system metrics.

---

## 🎯 Topics Covered

- **ES Modules Syntax**: Using `export function` and `import { ... } from "./logger.js"`.
- **CommonJS Reference**: Contrasting with classic `module.exports` and `require()` patterns.
- **Custom Logging Helper**: Encapsulating timestamped or formatted console logging output (`[LOG]: ...`).
- **OS Diagnostics**: Interacting with built-in Node.js modules (`os.cpus()`).

---

## 📁 Project Structure

```text
.
├── app.js             # Main application entry point
├── logger.js          # Custom logging module utility
├── package.json       # Project dependencies and script config
├── package-lock.json  # Locked dependency tree
└── README.md          # Project documentation
```

---

## 💻 Code Breakdown

### 1. ES Module Logger Utility (`logger.js`)

Exports a named function `logMessage` that prefixes input text with `[LOG]:`:

```javascript
export function logMessage(msg) {
  console.log(`[LOG]:${msg}`);
}
```

---

### 2. Application Entry & System Inspection (`app.js`)

Imports the custom logger function and executes log commands:

```javascript
import { logMessage } from "./logger.js";

logMessage("Server started!");
```

*(Includes commented examples for inspecting system CPU cores via `import { cpus } from "os";`)*.

---

### 3. CommonJS vs. ES Modules Comparison

| Feature | CommonJS | ES Modules (ESM) |
|---|---|---|
| **Package Setting** | Default (`"type": "commonjs"`) | `"type": "module"` in `package.json` |
| **Export Syntax** | `module.exports = logMessage;` | `export function logMessage() {}` |
| **Import Syntax** | `const logMessage = require("./logger");` | `import { logMessage } from "./logger.js";` |
| **File Extension Requirement** | Optional (`./logger`) | Mandatory relative extension (`./logger.js`) |

---

## 🛠 Prerequisites

- [Node.js](https://nodejs.org/) (v24+ recommended)
- npm (Node Package Manager)

---

## 🚀 Getting Started & Usage

### Installing Dependencies

Navigate to the project directory and install dev dependencies:

```bash
npm install
```

### Running the Application

Standard execution:

```bash
npm start
```

Development watch mode:

```bash
npm run dev
```

**Expected Terminal Output:**
```text
[LOG]:Server started!
```

---

## 💡 Summary of Key Concepts

| Concept | Description |
|---|---|
| Named Exports | Allows exporting multiple functions/constants per module file |
| `"type": "module"` | Tells Node.js runtime to treat `.js` files as ES Modules natively |
| Modularity | Improves code maintainability, separation of concerns, and reusability |
