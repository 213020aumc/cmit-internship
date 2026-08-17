import { readFile, writeFile } from "node:fs";

// Mock database object
const db = {
  findOrders: (userId, callback) => {
    const orders = `Orders for User ${userId}:\n- Order #1001: Wireless Headphones ($129.99)\n- Order #1002: Mechanical Keyboard ($89.50)`;
    callback(null, orders);
  },
};

readFile("user.json", "utf8", (err, user) => {
  if (err) return console.error(err);
  const parsedUser = JSON.parse(user);
  db.findOrders(parsedUser.id, (err, orders) => {
    if (err) return console.error(err);
    writeFile("report.txt", orders, (err) => {
      if (err) return console.error(err);
      console.log("Done!");
    });
  });
});

