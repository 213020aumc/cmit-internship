let tasks = [{ id: 1, title: "Learn Express", completed: false }];

const delay = () => new Promise((resolve) => setTimeout(resolve, 50));

export const fetchAll = async () => {
  await delay();
  return tasks;
};

export const fetchById = async (id) => {
  await delay();
  return tasks.find((t) => t.id === id);
};

export const create = async (data) => {
  await delay();
  const newTask = {
    id: Date.now(),
    ...data,
    completed: data.completed || false,
  };
  tasks.push(newTask);
  return newTask;
};

export const update = async (id, data) => {
  await delay();
  const index = tasks.findIndex((t) => t.id === id);
  if (index === -1) return null;
  tasks[index] = { ...tasks[index], ...data };
  return tasks[index];
};

export const remove = async (id) => {
  await delay();
  const index = tasks.findIndex((t) => t.id === id);
  if (index === -1) return false;
  tasks.splice(index, 1);
  return true;
};
