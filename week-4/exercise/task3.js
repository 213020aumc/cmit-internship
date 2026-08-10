async function getUserDetails(userId) {
  try {
    const userResponse = await fetch(
      `https://jsonplaceholder.typicode.com/users/${userId}`,
    );

    if (!userResponse.ok) {
      throw new Error("User not found!");
    }

    const user = await userResponse.json();

    const postsResponse = await fetch(
      `https://jsonplaceholder.typicode.com/posts?userId=${userId}`,
    );

    if (!postsResponse.ok) {
      throw new Error("Failed to fetch posts");
    }

    const posts = await postsResponse.json();

    return {
      user,
      posts,
    };
  } catch (error) {
    return {
      error: true,
      message: error.message,
    };
  }
}

function getMultipleUserDeatails(ids) {
  const promises = ids.map((id) => getUserDetails(id));
  const result = Promise.all(promises);
  return result;
}

// getUserDetails(1).then((result) =>
//   console.log("Single User Details: ", result),
// );

getMultipleUserDeatails([1, 2, 3]).then(
  (result) => console.log("Multiple Users Details: ", result),
  // console.dir(result, { depth: null }),
  // console.log(JSON.stringify(result, null, 2));
);

getUserDetails(1000).then((result) => console.log("Invalid User: ", result));
