# Node.js CLI Notes Manager

A lightweight, asynchronous Command Line Interface (CLI) application for managing text notes using **Node.js Promises API (`node:fs/promises`)**, **System Diagnostics (`node:os`)**, **Environment Configuration (`dotenv`)**, and **Path Management (`node:path`)**.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Topics Covered](#topics-covered)
- [Project Structure](#project-structure)
- [Code Breakdown](#code-breakdown)
  - [1. Environment Variable & Path Configuration](#1-environment-variable--path-configuration)
  - [2. CLI Command Line Argument Parsing](#2-cli-command-line-argument-parsing)
  - [3. Asynchronous File Operations (`node:fs/promises`)](#3-asynchronous-file-operations-nodefspromises)
  - [4. OS Metadata Embeddings](#4-os-metadata-embeddings)
- [Prerequisites](#prerequisites)
- [Getting Started & Usage](#getting-started--usage)
  - [Environment Setup](#environment-setup)
  - [CLI Commands & Usage Examples](#cli-commands--usage-examples)
- [Summary of Key Concepts](#summary-of-key-concepts)

---

## 🔍 Overview

This application provides a terminal-based notes manager supporting CRUD operations (**Create, Read, Update, Delete**) on local text files. It highlights modern Node.js features including top-level `async/await` with `node:fs/promises`, environment variable loading using `dotenv`, system metadata extraction, and safe path joining.

---

## 🎯 Topics Covered

- **Asynchronous File I/O (`node:fs/promises`)**: Performing non-blocking `writeFile`, `readFile`, `appendFile`, and `unlink` operations with `async/await` error handling (`try/catch`).
- **CLI Argument Parsing (`process.argv`)**: Capturing command line arguments dynamically.
- **Environment Configuration (`dotenv`)**: Loading custom storage directories dynamically from `.env` files (`NOTES_DIRECTORY`).
- **OS Diagnostics (`node:os`)**: Gathering platform name (`platform()`) and CPU model details (`cpus()`) to automatically stamp notes with creation metadata.
- **Cross-Platform Path Resolution (`node:path`)**: Constructing file paths safely across operating systems using `join()` and `cwd()`.

---

## 📁 Project Structure

```text
.
├── notes.js           # CLI application entry point and command handlers
├── .env               # Environment variable configuration (e.g., storage folder)
├── package.json       # Dependencies and script definitions
├── package-lock.json  # Locked dependency tree
├── README.md          # Project documentation
└── my_notes/          # Target directory where note files are created and managed
```

---

## 💻 Code Breakdown

### 1. Environment Variable & Path Configuration

Loads variables from `.env` using `dotenv/config` and resolves the destination notes directory dynamically:

```javascript
import { cwd } from "node:process";
import { join } from "node:path";
import "dotenv/config";

const notesDir = process.env.NOTES_DIRECTORY || "notes";
const fullDirectoryPath = join(cwd(), notesDir);
```

---

### 2. CLI Command Line Argument Parsing

Extracts the action command, filename, and file content from process arguments (`process.argv`):

```javascript
const command = process.argv[2];
const fileName = process.argv[3];
const fileContent = process.argv[4];
```

---

### 3. Asynchronous File Operations (`node:fs/promises`)

#### Adding a Note (`writeFile`)
Creates a new note file stamped with system metadata:

```javascript
async function addNote(name, content) {
  const filePath = join(fullDirectoryPath, `${name}.txt`);
  const systemInfo = `\n\n--- Created on a ${platform()} machine using ${cpus()[0].model} ---`;

  try {
    await writeFile(filePath, content + systemInfo);
    console.log(`✅ Note '${name}' saved successfully!`);
  } catch (err) {
    console.error("❌ Error saving note:", err.message);
  }
}
```

#### Reading a Note (`readFile`)
Reads and prints the requested note contents to the console:

```javascript
async function readNote(name) {
  const filePath = join(fullDirectoryPath, `${name}.txt`);
  try {
    const data = await readFile(filePath, "utf8");
    console.log(`\n--- ${name}.txt ---\n${data}\n-------------------`);
  } catch (err) {
    console.error(`❌ Note '${name}' not found.`);
  }
}
```

#### Updating a Note (`appendFile`)
Appends updated text to an existing note file:

```javascript
async function updateNote(name, addedContent) {
  const filePath = join(fullDirectoryPath, `${name}.txt`);
  try {
    await appendFile(filePath, `\n[UPDATE]: ${addedContent}`);
    console.log(`✅ Note '${name}' updated successfully!`);
  } catch (err) {
    console.error(`❌ Could not update '${name}'. Make sure the file exists first!`);
  }
}
```

#### Deleting a Note (`unlink`)
Deletes the specified note file from disk:

```javascript
async function deleteNote(name) {
  const filePath = join(fullDirectoryPath, `${name}.txt`);
  try {
    await unlink(filePath);
    console.log(`🗑️  Note '${name}' deleted.`);
  } catch (err) {
    console.error(`❌ Could not delete '${name}'. Does it exist?`);
  }
}
```

---

## 🛠 Prerequisites

- [Node.js](https://nodejs.org/) (v24+ recommended)
- npm (Node Package Manager)

---

## 🚀 Getting Started & Usage

### Environment Setup

1. Install project dependencies:
   ```bash
   npm install
   ```

2. Create or verify your `.env` configuration file:
   ```env
   NOTES_DIRECTORY=my_notes
   ```

---

### CLI Commands & Usage Examples

#### 1. Add a New Note
```bash
node notes.js add meeting "We need to update the database schema."
```
**Output:**
```text
✅ Note 'meeting' saved successfully!
```

#### 2. Read an Existing Note
```bash
node notes.js read meeting
```
**Output:**
```text
--- meeting.txt ---
We need to update the database schema.

--- Created on a win32 machine using Intel(R) Core(TM) i5-8250U CPU @ 1.60GHz ---
-------------------
```

#### 3. Update an Existing Note
```bash
node notes.js update meeting "Also, check the API endpoints."
```
**Output:**
```text
✅ Note 'meeting' updated successfully!
```

#### 4. Delete a Note
```bash
node notes.js delete meeting
```
**Output:**
```text
🗑️  Note 'meeting' deleted.
```

---

## 💡 Summary of Key Concepts

| Concept | API / Module | Description |
|---|---|---|
| Promise-based I/O | `node:fs/promises` | Non-blocking file operations returned as Promises suitable for `async/await` |
| CLI Argument Access | `process.argv` | Array containing command-line arguments passed when launching Node processes |
| Environment Variables | `dotenv` | Loads configuration settings from `.env` files into `process.env` |
| System Inspection | `node:os` | Obtains OS platform, CPU specifications, and memory metrics |
| File Deletion | `fs.unlink()` | Deletes a file asynchronously from the filesystem |
