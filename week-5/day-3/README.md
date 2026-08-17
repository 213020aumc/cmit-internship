# Node.js Event Loop & Asynchronous Control Flow Patterns

This repository demonstrates the core architecture of **Asynchronous Programming in Node.js**, comparing **Synchronous vs. Asynchronous Operations**, detailing the **Node.js Event Loop** (Microtasks vs. Macrotasks), and illustrating the evolution of asynchronous patterns from **Callbacks** to **Promises**, **`async/await`**, and modern **`Promise.withResolvers()`**.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Topics Covered](#topics-covered)
- [Project Structure](#project-structure)
- [Code Breakdown](#code-breakdown)
  - [1. Node.js Event Loop Execution (`app.js`)](#1-nodejs-event-loop-execution-appjs)
  - [2. Synchronous vs. Asynchronous I/O](#2-synchronous-vs-asynchronous-io)
  - [3. Callback Pattern](#3-callback-pattern)
  - [4. Promise Chain Pattern](#4-promise-chain-pattern)
  - [5. Modern `async/await` Pattern](#5-modern-asyncawait-pattern)
  - [6. Modern Promise Creation (`Promise.withResolvers()`)](#6-modern-promise-creation-promisewithresolvers)
- [Prerequisites](#prerequisites)
- [Getting Started & Usage](#getting-started--usage)
  - [Running the Event Loop Demo](#running-the-event-loop-demo)
  - [Running Asynchronous Pattern Demos](#running-asynchronous-pattern-demos)
- [Summary of Key Concepts](#summary-of-key-concepts)

---

## 🔍 Overview

Node.js operates on a single-threaded, non-blocking I/O event loop model. Understanding how synchronous operations block execution, how microtasks (`Promise`) prioritize over macrotasks (`setTimeout`), and how to write maintainable asynchronous code using `async/await` and modern Promise utilities like `Promise.withResolvers()` is fundamental to Node.js backend development.

---

## 🎯 Topics Covered

- **Node.js Event Loop Prioritization**: Execution hierarchy between Synchronous tasks, Microtask Queue (`Promises`), and Macrotask Queue (`setTimeout`).
- **Blocking vs. Non-Blocking I/O**: Comparing `readFileSync` (freezes main thread) against `readFile` (offloaded to thread pool/event loop).
- **Callback Patterns**: Handling asynchronous operations using traditional callback functions and understanding nested callback structures ("Callback Hell").
- **Promise API (`node:fs/promises`)**: Standardizing asynchronous control flow with `.then()` and `.catch()`.
- **`async/await` & `try/catch`**: Writing clean, sequential-looking asynchronous code with modern error handling.
- **`Promise.withResolvers()`**: Modern ES2024 / Node.js 22+ static method for extracting `promise`, `resolve`, and `reject` directly into current scope.

---

## 📁 Project Structure

```text
.
├── app.js                                       # Event loop execution order demo (Sync vs Microtasks vs Macrotasks)
├── package.json                                 # Project metadata and configuration
├── README.md                                    # Project documentation
└── Synchronous vs. Asynchronous Operations/     # Pattern comparison code directory
    ├── synchronous.js                           # Blocking file read demo
    ├── asynchronous.js                          # Non-blocking callback file read demo
    ├── callback.js                              # Callback-based flow & nested callbacks demo
    ├── promises.js                              # Promise-chaining flow demo
    ├── asyncAwait.js                            # Modern async/await flow demo
    ├── user.json                                # Input JSON data source
    ├── huge-file.txt                            # Text data file for read benchmarking
    └── report.txt                               # Generated output report file
```

---

## 💻 Code Breakdown

### 1. Node.js Event Loop Execution (`app.js`)

Demonstrates task queue execution order in Node.js:

```javascript
console.log("1. Sync execution");

setTimeout(() => {
  console.log("2. setTimeout (Macrotask)");
}, 0);

Promise.resolve().then(() => {
  console.log("3. Promise (Microtask)");
});

console.log("4. Sync execution end");
```

**Console Execution Order:**
```text
1. Sync execution
4. Sync execution end
3. Promise (Microtask)
2. setTimeout (Macrotask)
```

---

### 2. Synchronous vs. Asynchronous I/O

#### Synchronous (Blocking) (`synchronous.js`)
```javascript
import { readFileSync } from "node:fs";

console.log("1. Starting");
const data = readFileSync("huge-file.txt", "utf8"); // Blocks event loop until finished
console.log("2. File read complete");
```

#### Asynchronous (Non-Blocking) (`asynchronous.js`)
```javascript
import { readFile } from "node:fs";

console.log("1. Starting");
readFile("huge-file.txt", "utf8", (err, data) => {
  console.log("3. File read complete"); // Executes later from Callback Queue
});
console.log("2. Doing other things");
```

---

### 3. Callback Pattern (`callback.js`)

Uses nested callbacks to read user data, query database orders, and write report output:

```javascript
import { readFile, writeFile } from "node:fs";

readFile("user.json", "utf8", (err, user) => {
  if (err) return console.error(err);
  const parsedUser = JSON.parse(user);
  db.findOrders(parsedUser.id, (err, orders) => {
    writeFile("report.txt", orders, (err) => {
      console.log("Done!");
    });
  });
});
```

---

### 4. Promise Chain Pattern (`promises.js`)

Refactors nested callbacks into linear Promise chains using `node:fs/promises`:

```javascript
import { readFile, writeFile } from "node:fs/promises";

readFile("user.json", "utf8")
  .then((user) => JSON.parse(user))
  .then((user) => db.findOrders(user.id))
  .then((orders) => writeFile("report.txt", orders))
  .then(() => console.log("Done!"))
  .catch((err) => console.error(err));
```

---

### 5. Modern `async/await` Pattern (`asyncAwait.js`)

Implements asynchronous flow using clean `async/await` syntax wrapped in `try/catch`:

```javascript
import { readFile, writeFile } from "node:fs/promises";

async function generateReport() {
  try {
    const rawUser = await readFile("user.json", "utf8");
    const user = JSON.parse(rawUser);
    const orders = await db.findOrders(user.id);
    await writeFile("report.txt", orders);
    console.log("Done!");
  } catch (err) {
    console.error("Failed:", err);
  }
}

generateReport();
```

---

### 6. Modern Promise Creation (`Promise.withResolvers()`)

Introduced natively in Node.js 22+ (ES2024), `Promise.withResolvers()` returns an object containing a new `promise` alongside its `resolve` and `reject` functions directly exposed in the current scope:

```javascript
// Destructure promise, resolve, and reject directly
const { promise, resolve, reject } = Promise.withResolvers();

// Example: Resolving from an external callback or event handler
setTimeout(() => {
  resolve("Operation completed successfully!");
}, 1000);

// Consuming the promise with await
const result = await promise;
console.log(result); // "Operation completed successfully!"
```

#### Traditional Constructor vs. `Promise.withResolvers()`

**Traditional Approach:**
```javascript
let resolvePromise, rejectPromise;
const promise = new Promise((resolve, reject) => {
  resolvePromise = resolve;
  rejectPromise = reject;
});
```

**Modern Approach (`Promise.withResolvers()`):**
```javascript
const { promise, resolve, reject } = Promise.withResolvers();
```

This pattern prevents deep nesting inside executor callbacks and makes integrating legacy event listeners or stream handles significantly cleaner.

---

## 🛠 Prerequisites

- [Node.js](https://nodejs.org/) (v24+ recommended)
- npm (Node Package Manager)

---

## 🚀 Getting Started & Usage

### Running the Event Loop Demo

Run `app.js` to observe microtask vs. macrotask execution order:

```bash
node app.js
```

### Running Asynchronous Pattern Demos

Navigate into the `Synchronous vs. Asynchronous Operations` directory:

```bash
cd "Synchronous vs. Asynchronous Operations"
```

1. **Synchronous Execution**:
   ```bash
   node synchronous.js
   ```

2. **Asynchronous Callback Execution**:
   ```bash
   node asynchronous.js
   ```

3. **Callback Flow**:
   ```bash
   node callback.js
   ```

4. **Promise Chain Flow**:
   ```bash
   node promises.js
   ```

5. **Async / Await Flow**:
   ```bash
   node asyncAwait.js
   ```

---

## 💡 Summary of Key Concepts

| Concept | Description |
|---|---|
| Synchronous (Sync) | Code executes sequentially; blocks the main thread during heavy operations |
| Asynchronous (Async) | Offloads heavy I/O operations and resumes execution via callbacks or promises |
| Microtask Queue | Higher priority queue executed immediately after synchronous code (e.g., `Promise.then()`) |
| Macrotask Queue | Lower priority queue executed after microtasks drain (e.g., `setTimeout()`, `setInterval()`) |
| `async/await` | Syntactic sugar built on top of Promises that makes asynchronous code look synchronous |
| `Promise.withResolvers()` | Modern ES2024/Node 22+ static method extracting `{ promise, resolve, reject }` without callback nesting |
