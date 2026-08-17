import { readFile, writeFile } from "node:fs/promises"; // Using the promise-based version

// Mock database object
const db = {
  findOrders: (userId) => {
    return Promise.resolve(
      `Orders for User ${userId}:\n- Order #1001: Wireless Headphones ($129.99)\n- Order #1002: Mechanical Keyboard ($89.50)`
    );
  },
};

readFile("user.json", "utf8")
  .then((user) => JSON.parse(user))
  .then((user) => db.findOrders(user.id))
  .then((orders) => writeFile("report.txt", orders))
  .then(() => console.log("Done!"))
  .catch((err) => console.error(err));

