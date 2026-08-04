import { readFileSync, writeFileSync, readFile, writeFile } from "fs";

// Blocking, synchronous way
// const textIn = readFileSync("./txt/sample.txt", "utf-8");
// console.log(textIn);

// const textOut = `This is what we know about Node.js: ${textIn}\n Created on ${Date.now()}`;
// writeFileSync("./txt/output.txt", textOut);
// console.log("File written!");

// Non-blocking, asynchronous way

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
