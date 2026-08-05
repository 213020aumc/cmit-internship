import { createServer } from "http";
import url, { fileURLToPath } from "url";
import { dirname } from "path";
import { readFile, readFileSync } from "fs";
const PORT = 8000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const data = readFileSync(`${__dirname}/dev-data/data.json`, "utf-8");
const dataObject = JSON.parse(data);

const server = createServer((req, res) => {
  const pathName = req.url;

  if (pathName === "/") {
    res.end("This is the HOME.");
  } else if (pathName === "/overview") {
    res.end("This is the OVERVIEW.");
  } else if (pathName === "/product") {
    res.end("This is the PRODUCT.");
  } else if (pathName === "/api") {
    //readFile(`${__dirname}/dev-data/data.json`, "utf-8", (err, data) => {
    //const jsData = JSON.parse(data);

    res.writeHead(200, { "content-type": "application/json" });
    res.end(data);

    //console.log(jsData);
    //});
    //res.end("API");
  } else {
    res.writeHead(404, { "content-type": "text/plain" });
    res.end("Page not found!");
  }
});

server.listen(PORT, () => {
  console.log("Server listening at http://localhost:8000");
});
