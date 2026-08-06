import express from "express";
const app = express();

const PORT = 3000;

app.get("/hello", (req, res) => {
  //   res.status(200).send("Hello from the server side!");
  res
    .status(200)
    .json({ message: "Hello from the server side!", app: "Node JS" });
});

app.post("/", (req, res) => {
  res.send("We can post to this endpoint...");
});

app.listen(PORT, () => {
  console.log(` http://localhost:${PORT}`);
});
