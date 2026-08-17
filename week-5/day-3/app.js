console.log("1. Sync execution");

setTimeout(() => {
  console.log("2. setTimeout (Macrotask)");
}, 0);

Promise.resolve().then(() => {
  console.log("3. Promise (Microtask)");
});

console.log("4. Sync execution end");
