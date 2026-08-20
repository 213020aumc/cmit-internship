// Mock database
let tasks = [
  { id: 1, title: "Learn Express 5 Architecture", completed: false },
  { id: 2, title: "Master Async/Await", completed: true },
];

// Simulate database delay
const simulateDbCall = () => new Promise((resolve) => setTimeout(resolve, 100));

export const fetchAllTasks = async (completedFilter) => {
  await simulateDbCall();

  if (completedFilter !== undefined) {
    const isCompleted = completedFilter === "true";
    return tasks.filter((task) => task.completed === isCompleted);
  }
  return tasks;
};

export const fetchTaskById = async (id) => {
  await simulateDbCall();
  return tasks.find((t) => t.id === id);
};

export const createNewTask = async (title) => {
  await simulateDbCall();
  const newTask = {
    id: tasks.length ? Math.max(...tasks.map((t) => t.id)) + 1 : 1,
    title,
    completed: false,
  };
  tasks.push(newTask);
  return newTask;
};

export const updateExistingTask = async (id, updates) => {
  await simulateDbCall();
  const taskIndex = tasks.findIndex((t) => t.id === id);

  if (taskIndex === -1) return null; // Task not found

  tasks[taskIndex] = { ...tasks[taskIndex], ...updates };
  return tasks[taskIndex];
};

export const removeTask = async (id) => {
  await simulateDbCall();
  const taskIndex = tasks.findIndex((t) => t.id === id);

  if (taskIndex === -1) return false;

  tasks.splice(taskIndex, 1);
  return true;
};
