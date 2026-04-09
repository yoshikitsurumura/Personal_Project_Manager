import type { Project, Task } from "@/types";

export type SummarizeProjectRequest = {
  project: Pick<Project, "id" | "name" | "description">;
  tasks: Array<Pick<Task, "id" | "title" | "description" | "status" | "priority" | "dueDate">>;
};

export type SummarizeProjectResponse = {
  summary: string;
};

export type SuggestNextActionsRequest = SummarizeProjectRequest;

export type SuggestNextActionsResponse = {
  actions: string[];
};

export type DraftTaskRequest = {
  project: Pick<Project, "id" | "name" | "description">;
  taskTitle: string;
  tasks: Array<Pick<Task, "id" | "title" | "description" | "status" | "priority" | "dueDate">>;
};

export type DraftTaskResponse = {
  description: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function parseSummarizeProjectRequest(payload: unknown): SummarizeProjectRequest {
  if (!isRecord(payload)) {
    throw new Error("Invalid request payload.");
  }

  const project = payload.project;
  const tasks = payload.tasks;

  if (!isRecord(project) || typeof project.id !== "string" || typeof project.name !== "string") {
    throw new Error("Invalid project payload.");
  }
  if (!Array.isArray(tasks)) {
    throw new Error("Invalid tasks payload.");
  }

  return {
    project: {
      id: project.id,
      name: project.name,
      description: typeof project.description === "string" ? project.description : "",
    },
    tasks: tasks
      .filter((task): task is Record<string, unknown> => isRecord(task))
      .map((task) => ({
        id: typeof task.id === "string" ? task.id : "",
        title: typeof task.title === "string" ? task.title : "",
        description: typeof task.description === "string" ? task.description : "",
        status: task.status === "todo" || task.status === "in_progress" || task.status === "done" ? task.status : "todo",
        priority: task.priority === "low" || task.priority === "medium" || task.priority === "high" ? task.priority : "medium",
        dueDate: typeof task.dueDate === "string" ? task.dueDate : null,
      })),
  };
}

export function parseSummaryFromModelOutput(output: string): SummarizeProjectResponse {
  const trimmed = output.trim();
  try {
    const parsed = JSON.parse(trimmed) as { summary?: unknown };
    if (typeof parsed.summary === "string" && parsed.summary.trim()) {
      return { summary: parsed.summary.trim() };
    }
  } catch {
    // JSONでない場合はフォールバックとして全文を summary 扱いにする
  }

  return { summary: trimmed };
}

export function parseSuggestNextActionsRequest(payload: unknown): SuggestNextActionsRequest {
  return parseSummarizeProjectRequest(payload);
}

export function parseActionsFromModelOutput(output: string): SuggestNextActionsResponse {
  const trimmed = output.trim();
  try {
    const parsed = JSON.parse(trimmed) as { actions?: unknown };
    if (Array.isArray(parsed.actions)) {
      const actions = parsed.actions
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 3);
      if (actions.length > 0) {
        return { actions };
      }
    }
  } catch {
    // JSONでない場合はフォールバックとして行単位で扱う
  }

  const fallbackActions = trimmed
    .split("\n")
    .map((line) => line.replace(/^\s*[-*\d.、]+\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 3);

  return { actions: fallbackActions };
}

export function parseDraftTaskRequest(payload: unknown): DraftTaskRequest {
  if (!isRecord(payload)) {
    throw new Error("Invalid request payload.");
  }

  const parsed = parseSummarizeProjectRequest(payload);
  const taskTitle = typeof payload.taskTitle === "string" ? payload.taskTitle.trim() : "";
  if (!taskTitle) {
    throw new Error("Invalid task title.");
  }

  return {
    project: parsed.project,
    tasks: parsed.tasks,
    taskTitle,
  };
}

export function parseDraftDescriptionFromModelOutput(output: string): DraftTaskResponse {
  const trimmed = output.trim();
  try {
    const parsed = JSON.parse(trimmed) as { description?: unknown };
    if (typeof parsed.description === "string" && parsed.description.trim()) {
      return { description: parsed.description.trim() };
    }
  } catch {
    // JSONでない場合はフォールバックとして全文を description 扱いにする
  }

  return { description: trimmed };
}
