import http from "node:http";

const PORT = 3000;

const server = http.createServer((req, res) => {
  const { method, url } = req;

  // Helper to send JSON responses
  const sendJson = (status, data) => {
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(data));
  };

  // Route 1: GET /
  if (method === "GET" && url === "/") {
    sendJson(200, { message: "Welcome to the API Root" });
  }

  // Route 2: GET /about
  else if (method === "GET" && url === "/about") {
    sendJson(200, { message: "Native Node.js Server v1.0" });
  }

  // Route 3: GET /api/users
  else if (method === "GET" && url === "/api/users") {
    sendJson(200, {
      users: [
        { id: 1, name: "Alice" },
        { id: 2, name: "Bob" },
      ],
    });
  }

  // Route 4: POST /api/users
  else if (method === "POST" && url === "/api/users") {
    let body = "";
    req.on("data", (chunk) => (body += chunk.toString()));
    req.on("end", () => {
      try {
        const parsed = JSON.parse(body);
        sendJson(201, { message: "User created", data: parsed });
      } catch (err) {
        sendJson(400, { error: "Invalid JSON format" });
      }
    });
  }

  // Route 5: 404 Catch-All
  else {
    sendJson(404, { error: "Route not found" });
  }
});

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
