import express from "express";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { readFileSync } from "fs";

const app = express();
const PORT = 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const topics = JSON.parse(readFileSync(`${__dirname}/dev-data/data.json`));
console.log(topics);

app.get("/api/v1/topics", (req, res) => {
  res.json({
    status: "success",
    data: { topics },
  });
});

app.listen(PORT, () => {
  console.log(`Server listening at http://127.0.0.1:${PORT}`);
});
