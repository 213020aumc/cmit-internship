# MongoDB Fundamentals, CRUD Operations & Data Modeling

A complete guide to transitioning from in-memory arrays to a real database. MongoDB is a **NoSQL, document-oriented** database that pairs perfectly with Node.js because it stores data in a format almost identical to JavaScript objects — making it the natural next step after mastering Express 5 REST APIs.

---

## Table of Contents

- [Core Concepts](#-core-concepts-databases-collections-and-documents)
  - [SQL vs MongoDB Terminology](#sql-vs-mongodb-terminology)
  - [JSON vs BSON](#json-vs-bson)
- [How MongoDB Stores Data (JSON vs BSON)](#-how-mongodb-stores-data-json-vs-bson)
- [Basic CRUD Operations](#-basic-crud-operations)
  - [Create (Insert)](#create-insert)
  - [Read (Find)](#read-find)
  - [Update](#update)
  - [Delete](#delete)
- [Advanced Querying](#-advanced-querying-filters-projections-and-sorting)
  - [Filters](#1-filters-the-where-clause)
  - [Projections](#2-projections-selecting-specific-fields)
  - [Sorting](#3-sorting)
- [Data Modeling](#-data-modeling-embedded-vs-referenced)
  - [Embedded Documents (Denormalization)](#embedded-documents-denormalization)
  - [References (Normalization)](#references-normalization)
  - [When to Embed vs Reference](#when-to-embed-vs-reference)
- [Key Concepts Summary](#-key-concepts-summary)

---

## 🧩 Core Concepts: Databases, Collections, and Documents

### SQL vs MongoDB Terminology

Coming from a traditional SQL background (like MySQL or PostgreSQL), MongoDB uses different terminology and structures:

| SQL Concept | MongoDB Equivalent | Description |
|---|---|---|
| **Database** | **Database** | The top-level container holding your data |
| **Table** | **Collection** | A grouping of MongoDB documents (e.g., `users`, `tasks`) |
| **Row** | **Document** | A single record inside a collection |
| **Column** | **Field** | A key-value pair inside a document |

### JSON vs BSON

You interact with MongoDB using **JSON** (JavaScript Object Notation). However, under the hood, MongoDB stores data as **BSON** (Binary JSON). BSON extends JSON to support additional data types like `Date`, raw binary, `Decimal128`, and specialized `ObjectId` identifiers.

| Feature | JSON | BSON |
|---|---|---|
| **Format** | Text | Binary |
| **Human Readable** | ✅ Yes | ❌ No |
| **Data Types** | Limited (string, number, object, array, etc.) | Many more (Date, ObjectId, Binary, Decimal128, etc.) |
| **Efficiency** | Less efficient (text) | More efficient (binary) |

Every document in MongoDB is automatically assigned a unique, **12-byte BSON `_id` field** upon creation. This serves as the document's primary key.

---

## 🖼️ How MongoDB Stores Data (JSON vs BSON)

The following infographic illustrates the complete lifecycle of how MongoDB stores and retrieves data — from the JavaScript object you write, through the MongoDB Driver's serialization to BSON, to the binary bytes stored on disk via the WiredTiger storage engine, and back to a readable JSON/JS object when queried.

![How MongoDB Stores Data — JSON vs BSON Infographic](MongoDB%20Storage%20JSON%20to%20BSON%20Infographic.png)

### The 6-Step Storage Lifecycle

| Step | Stage | What Happens |
|---|---|---|
| **1** | You write JSON / JS Object | This is what you see in your code or in MongoDB Compass |
| **2** | MongoDB Driver converts to BSON | Driver serializes (encodes) the document to BSON |
| **3** | BSON internal representation | Binary format that stores data along with type information |
| **4** | Stored in MongoDB (as BSON) | MongoDB stores the BSON bytes on disk via WiredTiger |
| **5** | When data is read | Driver reads BSON from disk and deserializes (decodes) back |
| **6** | You receive JSON / JS Object | You get the data in the same readable form |

> **Key Takeaway:** You work with JSON-like documents (human readable). The MongoDB driver converts them to BSON (binary with types). MongoDB stores BSON on disk for efficiency and rich data types. When read, BSON is converted back to JSON-like documents for you.

---

## 📝 Basic CRUD Operations

You can manage your data using **MongoDB Compass** (a desktop GUI), **Atlas** (the cloud-hosted web interface), or the **MongoDB Shell** (`mongosh`). Regardless of the tool, the underlying query language is the same.

### Create (Insert)

```javascript
// Insert a single document
db.users.insertOne({ name: "Alice", age: 28, status: "active" });

// Insert multiple documents at once
db.users.insertMany([
  { name: "Bob", age: 34, status: "inactive" },
  { name: "Charlie", age: 22, status: "active" },
]);
```

| Method | Purpose |
|---|---|
| `insertOne({})` | Inserts a single document into the collection |
| `insertMany([])` | Inserts an array of multiple documents in one operation |

---

### Read (Find)

```javascript
// Find ALL documents in the collection
db.users.find();

// Find users who are exactly 28 years old
db.users.find({ age: 28 });

// Find ONE document matching the filter
db.users.findOne({ name: "Alice" });
```

| Method | Purpose |
|---|---|
| `find({})` | Returns a cursor to all matching documents |
| `find({ field: value })` | Returns documents matching the filter criteria |
| `findOne({})` | Returns the first document matching the filter |

---

### Update

```javascript
// Update the FIRST document that matches the filter
db.users.updateOne(
  { name: "Alice" },              // 1. The Filter — which document to find
  { $set: { status: "offline" } } // 2. The Update — using the $set operator
);

// Update ALL documents matching the filter
db.users.updateMany(
  { status: "inactive" },
  { $set: { status: "archived" } }
);
```

| Method | Purpose |
|---|---|
| `updateOne(filter, update)` | Updates the first document matching the filter |
| `updateMany(filter, update)` | Updates all documents matching the filter |
| `$set` operator | Sets the value of a field without overwriting the entire document |

---

### Delete

```javascript
// Delete the FIRST document matching the filter
db.users.deleteOne({ name: "Bob" });

// Delete ALL users who are inactive
db.users.deleteMany({ status: "inactive" });
```

| Method | Purpose |
|---|---|
| `deleteOne(filter)` | Deletes the first document matching the filter |
| `deleteMany(filter)` | Deletes all documents matching the filter |

---

## 🔎 Advanced Querying: Filters, Projections, and Sorting

When retrieving data, you rarely want _everything_. MongoDB uses a specific structure to refine results:

```
db.collection.find(filter, projection).sort(modifier)
```

### 1. Filters (The "Where" Clause)

You can use MongoDB **comparison operators** (starting with `$`) for complex filtering:

| Operator | Meaning | Example |
|---|---|---|
| `$gt` | Greater than | `{ age: { $gt: 25 } }` |
| `$gte` | Greater than or equal to | `{ age: { $gte: 18 } }` |
| `$lt` | Less than | `{ age: { $lt: 65 } }` |
| `$lte` | Less than or equal to | `{ age: { $lte: 30 } }` |
| `$in` | Matches any value in an array | `{ status: { $in: ["active", "pending"] } }` |
| `$ne` | Not equal to | `{ status: { $ne: "deleted" } }` |

```javascript
// Find users older than 25 who are either 'active' or 'pending'
db.users.find({
  age: { $gt: 25 },
  status: { $in: ["active", "pending"] },
});
```

---

### 2. Projections (Selecting Specific Fields)

If a user document has 50 fields, but you only need their name and email, use a **projection** to save bandwidth. `1` means include, `0` means exclude.

```javascript
// Return ONLY the name and email fields
// (_id is included by default unless explicitly set to 0)
db.users.find(
  { status: "active" },           // Filter
  { name: 1, email: 1, _id: 0 }  // Projection
);
```

| Projection Value | Effect |
|---|---|
| `{ name: 1 }` | Include only `name` (and `_id` by default) |
| `{ _id: 0 }` | Exclude the `_id` field from results |
| `{ password: 0, __v: 0 }` | Exclude specific fields, return everything else |

> **Rule:** You cannot mix inclusion and exclusion in the same projection, except for `_id: 0`.

---

### 3. Sorting

Sort the returned documents. `1` is **ascending** (A→Z, 0→9), and `-1` is **descending** (Z→A, 9→0).

```javascript
// Sort by age, oldest to youngest (descending)
db.users.find().sort({ age: -1 });

// Sort by name alphabetically (ascending), then by age descending
db.users.find().sort({ name: 1, age: -1 });
```

### Combining Filters, Projections, and Sorting

```javascript
// Find active users over 25, return only name and age, sorted youngest to oldest
db.users
  .find(
    { status: "active", age: { $gt: 25 } },  // Filter
    { name: 1, age: 1, _id: 0 }              // Projection
  )
  .sort({ age: 1 });                          // Sort ascending
```

---

## 🏗 Data Modeling: Embedded vs Referenced

Because MongoDB has no strict tables or schemas, deciding **how to relate data** is your most important architectural decision.

### Embedded Documents (Denormalization)

You store related data _inside_ the parent document as a nested object or array.

- **Best for:** "One-to-Few" relationships (e.g., a user's shipping addresses)
- **Best when:** Data is always retrieved together
- **Pros:** Requires only **one database query** to get all related information

```javascript
// A single document with embedded addresses
{
  _id: ObjectId("5f9b..."),
  name: "Alice",
  addresses: [
    { street: "123 Main St", city: "New York" },
    { street: "456 Oak Ave", city: "Boston" }
  ]
}
```

> One query like `db.users.findOne({ name: "Alice" })` returns the user **and** all their addresses together.

---

### References (Normalization)

You store related data in a **completely separate collection** and link them using the `_id`.

- **Best for:** "One-to-Many" or "Many-to-Many" relationships (e.g., a user and their thousands of posts)
- **Best when:** Related data grows unboundedly or is accessed independently
- **Pros:** Prevents documents from hitting MongoDB's **16MB size limit** and avoids duplicating data

```javascript
// In the 'users' collection
{
  _id: ObjectId("user_1"),
  name: "Alice"
}

// In the 'posts' collection
{
  _id: ObjectId("post_1"),
  author_id: ObjectId("user_1"),  // ← The Reference (links back to users)
  title: "My first post"
}
```

> Requires **two queries** (or a `$lookup` aggregation) to retrieve a user with their posts, but keeps each collection lean and independently scalable.

---

### When to Embed vs Reference

| Factor | Embed | Reference |
|---|---|---|
| **Relationship** | One-to-Few | One-to-Many / Many-to-Many |
| **Data Size** | Small, bounded arrays | Large, unbounded collections |
| **Access Pattern** | Always read together | Often accessed independently |
| **Data Duplication** | Acceptable (data lives in one place) | Must be avoided (shared across documents) |
| **Document Size** | Well under 16MB limit | Risk of exceeding 16MB |
| **Update Frequency** | Child data rarely changes | Child data changes independently |

---

## 🔑 Key Concepts Summary

| Concept | Description |
|---|---|
| **Database** | Top-level container grouping collections |
| **Collection** | A set of MongoDB documents (analogous to a SQL table) |
| **Document** | A single JSON/BSON record (analogous to a SQL row) |
| **Field** | A key-value pair inside a document (analogous to a SQL column) |
| **`_id`** | Auto-generated 12-byte unique identifier (primary key) |
| **JSON** | Human-readable text format you write and receive |
| **BSON** | Binary JSON format MongoDB stores internally for efficiency and richer types |
| **`insertOne` / `insertMany`** | Create one or multiple documents |
| **`find` / `findOne`** | Read documents with optional filters |
| **`updateOne` / `updateMany`** | Modify documents using operators like `$set` |
| **`deleteOne` / `deleteMany`** | Remove documents matching a filter |
| **Comparison Operators** | `$gt`, `$gte`, `$lt`, `$lte`, `$in`, `$ne` for query filtering |
| **Projection** | Select specific fields to include or exclude from results |
| **Sorting** | Order results ascending (`1`) or descending (`-1`) |
| **Embedded (Denormalized)** | Nest related data inside the parent document for one-query access |
| **Referenced (Normalized)** | Store related data in separate collections linked by `_id` |
