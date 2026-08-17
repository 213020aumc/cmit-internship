import { readFile, writeFile } from "node:fs";
import { join } from "node:path";
import { cwd, argv } from "node:process";

const filePath = join(cwd(), "tasks.json");

// 1. Manually promisifying readFile
const readFileAsync = (path) => {
  return new Promise((resolve, reject) => {
    readFile(path, "utf8", (err, data) => {
      if (err) {
        // If the file doesn't exist, resolving with an empty array string
        if (err.code === "ENOENT") resolve("[]");
        else reject(err);
      } else {
        resolve(data);
      }
    });
  });
};

// 2. Manually promisifying writeFile
const writeFileAsync = (path, data) => {
  return new Promise((resolve, reject) => {
    writeFile(path, data, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
};

// 3. Using async/await to execute the logic
const addTask = async (taskName) => {
  try {
    const fileData = await readFileAsync(filePath);
    const tasks = JSON.parse(fileData);

    tasks.push({ id: Date.now(), name: taskName, completed: false });

    await writeFileAsync(filePath, JSON.stringify(tasks, null, 2));
    console.log(`✅ Added task: "${taskName}"`);
  } catch (error) {
    console.error("❌ Failed to update tasks:", error.message);
  }
};

// Get the task name from terminal arguments (e.g., node task-cli.js "Buy milk")
const taskInput = argv[2];
if (taskInput) addTask(taskInput);
else console.log("Please provide a task name.");
