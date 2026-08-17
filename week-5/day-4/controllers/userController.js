// In a real app, this would be our database
const users = [
  { id: 1, name: "Alice" },
  { id: 2, name: "Bob" },
];

export const getUsers = (req, res) => {
  // Reading an incoming header (e.g., checking for an API key)
  const userAgent = req.headers["user-agent"];
  console.log(`Request made by: ${userAgent}`);

  // Sending a 200 OK response with the JSON array
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify(users));
};

export const createUser = (req, res, parsedBody) => {
  // Extracting data from the body we parsed earlier
  const { name } = parsedBody;

  if (!name) {
    // Sending a 400 Bad Request error if data is missing
    res.writeHead(400, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ error: "Name is required" }));
  }

  // Creating the user and sending a 201 Created response
  const newUser = { id: users.length + 1, name };
  users.push(newUser);

  res.writeHead(201, { "Content-Type": "application/json" });
  res.end(
    JSON.stringify({ message: "User created successfully", user: newUser }),
  );
};
