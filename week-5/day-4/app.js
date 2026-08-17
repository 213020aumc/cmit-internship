import http from "http";
import { getRequestBody } from "./utils/bodyParser.js";
import { getUsers, createUser } from "./controllers/userController.js";

const PORT = 3000;

const server = http.createServer(async (req, res) => {
  // Extracting the HTTP method and the URL path
  const method = req.method;
  const url = req.url;

  // 1. Route: GET /users
  if (method === "GET" && url === "/users") {
    getUsers(req, res);
  }

  // 2. Route: POST /users
  else if (method === "POST" && url === "/users") {
    try {
      // We must wait for the stream to finish before moving to the controller
      const parsedBody = await getRequestBody(req);
      createUser(req, res, parsedBody);
    } catch (error) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Invalid JSON payload" }));
    }
  }

  // 3. Handling unknown routes (404 Not Found)
  else {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Route not found" }));
  }
});

server.listen(PORT, () => {
  console.log(`Raw HTTP server running on http://localhost:${PORT}`);
});
