# Node.js Fundamentals: File System & HTTP Server

This repository contains practical examples of core Node.js concepts. The topics cover built-in modules, synchronous vs. asynchronous File I/O operations using the `fs` module, and setting up a basic web server using the `http` module.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Topics Covered](#topics-covered)
- [Project Structure](#project-structure)
- [Code Breakdown](#code-breakdown)
  - [1. File System Operations (`index.js`)](#1-file-system-operations-indexjs)
  - [2. Basic HTTP Server (`server.js`)](#2-basic-http-server-serverjs)
- [Prerequisites](#prerequisites)
- [Getting Started & Usage](#getting-started--usage)
  - [Running the File System Demo](#running-the-file-system-demo)
  - [Running the HTTP Server](#running-the-http-server)
- [Summary of Key Concepts](#summary-of-key-concepts)

---

## 🔍 Overview

Node.js provides essential core modules out-of-the-box without requiring third-party libraries. In this project, we explore two core capabilities of Node.js:
1. **`fs` Module**: Reading and writing files synchronously (blocking) and asynchronously (non-blocking).
2. **`http` Module**: Creating an HTTP web server that listens for client requests and sends responses.

---

## 🎯 Topics Covered

- **Synchronous (Blocking) Code**: Execution blocks until file operations complete (`readFileSync`, `writeFileSync`).
- **Asynchronous (Non-Blocking) Code**: Operations execute in the background using callbacks (`readFile`, `writeFile`).
- **Callback Chaining**: Sequentially executing dependent asynchronous tasks.
- **HTTP Server Basics**: Initializing an HTTP server using `createServer()` and listening on a designated port (e.g., `3000`).

---

## 📁 Project Structure

```text
.
├── index.js          # Demonstrates synchronous and asynchronous file system operations
├── server.js         # Basic Node.js HTTP web server listening on port 3000
├── README.md         # Documentation for Node.js modules
└── txt/              # Data directory containing text files for file I/O operations
    ├── append.txt
    ├── final.txt
    ├── output.txt
    ├── read-this.txt
    ├── sample.txt
    └── start.txt
```

---

## 💻 Code Breakdown

### 1. File System Operations (`index.js`)

`index.js` imports key functions from Node's built-in `fs` module:

```javascript
import { readFileSync, writeFileSync, readFile, writeFile } from "fs";
```

#### Synchronous (Blocking) Approach (Commented Reference)
Synchronous methods pause execution until the file read/write completes:

```javascript
const textIn = readFileSync("./txt/sample.txt", "utf-8");
const textOut = `This is what we know about Node.js: ${textIn}\n Created on ${Date.now()}`;
writeFileSync("./txt/output.txt", textOut);
```

#### Asynchronous (Non-Blocking) Callback Chaining
Asynchronous methods allow code execution to continue while I/O operations are offloaded:

```javascript
readFile("./txt/start.txt", "utf-8", (err, data1) => {
  if (err) return console.log("ERROR! 💥");
  readFile(`./txt/${data1}.txt`, "utf-8", (err, data2) => {
    readFile("./txt/append.txt", "utf-8", (err, data3) => {
      writeFile("./txt/final.txt", `${data2}\n${data3}`, "utf-8", (err) => {
        console.log("Your file has been written 😁");
      });
    });
  });
});

console.log("Will read file!");
```

**Output sequence:**
1. Log `Will read file!` immediately (non-blocking).
2. Read `./txt/start.txt` to retrieve the filename (`read-this`).
3. Read `./txt/read-this.txt` and `./txt/append.txt`.
4. Combine content and write to `./txt/final.txt`.
5. Log `Your file has been written 😁`.

---

### 2. Basic HTTP Server (`server.js`)

`server.js` sets up a lightweight web server:

```javascript
import { createServer } from "http";

const PORT = 3000;

const server = createServer((req, res) => {
  res.end("Hello World");
});

server.listen(PORT, () => {
  console.log("Server listening at http://localhost:3000");
});
```

---

## 🛠 Prerequisites

- [Node.js](https://nodejs.org/) (v24+ recommended)
- ES Modules enabled in your environment (or `"type": "module"` in `package.json`).

---

## 🚀 Getting Started & Usage

Navigate to the project directory in your terminal:

### Running the File System Demo

To run the asynchronous file reading and writing script:

```bash
node index.js
```

**Expected Terminal Output:**
```text
Will read file!
Your file has been written 😁
```

### Running the HTTP Server

To start the HTTP server:

```bash
node server.js
```

**Expected Terminal Output:**
```text
Server listening at http://localhost:3000
```

Open your web browser or test with `curl`:
```bash
curl http://localhost:3000
```
Response: `Hello World`

---

## 💡 Summary of Key Concepts

| Concept | Synchronous (`Sync`) | Asynchronous (Callback) |
|---|---|---|
| **Execution** | Blocks event loop | Non-blocking (Event Loop handles completion) |
| **Performance** | Slower for concurrent operations | Highly performant & scalable |
| **Use Case** | Application startup/scripting | Web servers & high-concurrency operations |
