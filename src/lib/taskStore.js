// Simple local storage based task history

const STORAGE_KEY = "pdf_toolbox_tasks";

export function getTasks() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function addTask(task) {
  try {
    // task: { file: string, action: string, size?: string, status: string, progress: number }
    const tasks = getTasks();
    
    // Add date if missing
    if (!task.date) {
      const now = new Date();
      task.date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    }
    
    // Generate an ID
    task.id = Date.now().toString() + Math.random().toString(36).substr(2, 5);
    
    tasks.unshift(task); // Add to beginning
    
    // Keep only the latest 50
    const trimmed = tasks.slice(0, 50);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    
    // Dispatch an event so other tabs/components can update if needed
    window.dispatchEvent(new Event("tasks_updated"));
  } catch (err) {
    console.error("Failed to save task to history", err);
  }
}

export function clearTasks() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event("tasks_updated"));
  } catch (err) {
    console.error("Failed to clear tasks", err);
  }
}
