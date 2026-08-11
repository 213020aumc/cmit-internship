import { readFile, writeFile, appendFile, unlink } from "node:fs/promises";
import { freemem, homedir, cpus, platform } from "node:os";
import { env, cwd, argv } from "node:process";
import "dotenv/config";
import { join } from "node:path";

// import config from './config.json' with { type: 'json' };
// const { default: config } = await import('./config.json', { with: { type: 'json' } });

// console.log(freemem())
// console.log(homedir())
// console.table(cpus());
// console.log(cpus().length);
// console.log(platform());

// console.log(env)
// console.log(cwd())
// console.log(argv)

// console.log(process.env.NOTES_DIRECTORY);

// console.log(import.meta.url)

const notesDir = process.env.NOTES_DIRECTORY || "notes";
const fullDirectoryPath = join(cwd(), notesDir);

// console.log(fullDirectoryPath)

const command = process.argv[2];
const fileName = process.argv[3];
const fileContent = process.argv[4];

async function addNote(name, content) {
  const filePath = join(fullDirectoryPath, `${name}.txt`);

  const systemInfo = `\n\n--- Created on a ${platform()} machine using ${cpus()[0].model} ---`;

  try {
    await writeFile(filePath, content + systemInfo);
    console.log(`✅ Note '${name}' saved successfully!`);
  } catch (err) {
    console.error("❌ Error saving note:", err.message);
  }
}

async function readNote(name) {
  const filePath = join(fullDirectoryPath, `${name}.txt`);
  try {
    const data = await readFile(filePath, "utf8");
    console.log(`\n--- ${name}.txt ---\n${data}\n-------------------`);
  } catch (err) {
    console.error(`❌ Note '${name}' not found.`);
  }
}

async function updateNote(name, addedContent) {
  const filePath = join(fullDirectoryPath, `${name}.txt`);
  try {
    await appendFile(filePath, `\n[UPDATE]: ${addedContent}`);
    console.log(`✅ Note '${name}' updated successfully!`);
  } catch (err) {
    console.error(
      `❌ Could not update '${name}'. Make sure the file exists first!`,
    );
  }
}

async function deleteNote(name) {
  const filePath = join(fullDirectoryPath, `${name}.txt`);
  try {
    await unlink(filePath);
    console.log(`🗑️  Note '${name}' deleted.`);
  } catch (err) {
    console.error(`❌ Could not delete '${name}'. Does it exist?`);
  }
}

if (command === "add") {
  if (!fileName || !fileContent) {
    console.log('Usage: node notes.js add <filename> "<content>"');
  } else {
    addNote(fileName, fileContent);
  }
} else if (command === "read") {
  if (!fileName) console.log("Usage: node notes.js read <filename>");
  else readNote(fileName);
} else if (command === "update") {
  if (!fileName || !fileContent) {
    console.log(
      'Usage: node notes.js update <filename> "<additional content>"',
    );
  } else {
    updateNote(fileName, fileContent);
  }
} else if (command === "delete") {
  if (!fileName) console.log("Usage: node notes.js delete <filename>");
  else deleteNote(fileName);
} else {
  console.log("Unknown command. Use: add, read, or delete.");
}
