import express from "express";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { readFileSync, readFile } from "fs";
// import config from './config.json' with { type: 'json' };
// const { default: config } = await import('./config.json', { with: { type: 'json' } });

const app = express();
const PORT = 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const topics = JSON.parse(readFileSync(`${__dirname}/dev-data/data.json`));

// const filePath = path.join(import.meta.dirname, 'dev-data', 'data.json');
// const content = await fs.readFile(filePath, 'utf-8');

// const fileURL = new URL('./dev-data/data.json', import.meta.url);
// const content = await readFile(fileURL, 'utf-8');

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
