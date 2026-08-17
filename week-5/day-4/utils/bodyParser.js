export const getRequestBody = (req) => {
  return new Promise((resolve, reject) => {
    let body = "";

    // Listening for incoming chunks of data
    req.on("data", (chunk) => {
      body += chunk.toString();
    });

    // When all data has arrived, attempting to parse it as JSON
    req.on("end", () => {
      try {
        if (body === "") {
          resolve({});
        } else {
          resolve(JSON.parse(body));
        }
      } catch (error) {
        reject(new Error("Invalid JSON format"));
      }
    });

    // Handling any stream errors
    req.on("error", (err) => {
      reject(err);
    });
  });
};

/*
// Modern Alternative: Using async/await with for await...of loop (Streams as Async Iterables)
export const getRequestBodyAsync = async (req) => {
  let body = "";

  for await (const chunk of req) {
    body += chunk;
  }

  if (!body) return {};

  try {
    return JSON.parse(body);
  } catch (error) {
    throw new Error("Invalid JSON format");
  }
};
*/
