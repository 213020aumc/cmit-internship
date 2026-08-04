import { createServer } from "http";

const PORT = 3000;

const server = createServer((req, res) => {
  res.end("Hello World");
});

server.listen(PORT, () => {
  console.log("Server listening at http://localhost:3000");
});
