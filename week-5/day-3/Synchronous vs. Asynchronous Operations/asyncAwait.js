import { readFile, writeFile } from "node:fs/promises";

// Mock database object
const db = {
  findOrders: async (userId) => {
    return `Orders for User ${userId}:\n- Order #1001: Wireless Headphones ($129.99)\n- Order #1002: Mechanical Keyboard ($89.50)`;
  },
};

async function generateReport() {
  try {
    const rawUser = await readFile("user.json", "utf8");
    console.log("Raw User: ", rawUser);
    const user = JSON.parse(rawUser);
    console.log("User Object: ", user);
    const orders = await db.findOrders(user.id);
    await writeFile("report.txt", orders);
    console.log("Done!");
  } catch (err) {
    console.error("Failed:", err);
  }
}

generateReport();
