import { readFile } from "node:fs";

console.log("1. Starting");
// Node hands this to the background and immediately moves on
readFile("huge-file.txt", "utf8", (err, data) => {
  console.log("3. File read complete"); // Runs later, from the Callback Queue
});
console.log("2. Doing other things");
