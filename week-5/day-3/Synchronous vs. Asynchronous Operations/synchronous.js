import { readFileSync } from "node:fs";

console.log("1. Starting");
// The whole server freezes here until the file is fully read
const data = readFileSync("huge-file.txt", "utf8");
console.log("Data in the File: ", data);
console.log("2. File read complete");
