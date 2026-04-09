type SummaryProjectInput = {
  name: string;
  description: string;
};

type SummaryTaskInput = {
  title: string;
  status: "todo" | "in_progress" | "done";
  priority: "low" | "medium" | "high";
  dueDate: string | null;
};

function formatTaskLine(task: SummaryTaskInput, index: number) {
  const dueDate = task.dueDate ?? "未設定";
  return `${index + 1}. [${task.status}] [${task.priority}] ${task.title} (期限: ${dueDate})`;
}

function formatTasks(tasks: SummaryTaskInput[]) {
  if (tasks.length === 0) {
    return "タスクは登録されていません。";
  }
  return tasks.map((task, index) => formatTaskLine(task, index)).join("\n");
}

export function buildProjectSummaryPrompt(project: SummaryProjectInput, tasks: SummaryTaskInput[]) {
  const tasksText = formatTasks(tasks);

  return [
    "あなたはプロジェクトマネージャー補助AIです。",
    "以下の情報をもとに、短く実務的な日本語で要約してください。",
    "出力は次のJSON形式のみを返してください。",
    '{"summary":"..."}',
    "",
    `プロジェクト名: ${project.name}`,
    `プロジェクト説明: ${project.description || "（説明なし）"}`,
    "タスク一覧:",
    tasksText,
    "",
    "要約ルール:",
    "- 3〜6文程度",
    "- 現状、詰まり、直近アクションを含める",
    "- 推測は避け、入力情報ベースで書く",
  ].join("\n");
}

export function buildNextActionsPrompt(project: SummaryProjectInput, tasks: SummaryTaskInput[]) {
  return [
    "あなたはプロジェクトマネージャー補助AIです。",
    "以下の情報をもとに、優先順の次アクションを提案してください。",
    "出力は次のJSON形式のみを返してください。",
    '{"actions":["...","...","..."]}',
    "",
    `プロジェクト名: ${project.name}`,
    `プロジェクト説明: ${project.description || "（説明なし）"}`,
    "タスク一覧:",
    formatTasks(tasks),
    "",
    "提案ルール:",
    "- actions は 3 件まで",
    "- 1 件は短く具体的な実行文にする",
    "- 優先度・進捗・期限を踏まえる",
    "- 推測は避け、入力情報ベースで書く",
  ].join("\n");
}

export function buildTaskDraftPrompt(project: SummaryProjectInput, taskTitle: string, tasks: SummaryTaskInput[]) {
  return [
    "あなたはタスク整理を支援するAIです。",
    "以下の情報をもとに、タスク説明文の下書きを作成してください。",
    "出力は次のJSON形式のみを返してください。",
    '{"description":"..."}',
    "",
    `プロジェクト名: ${project.name}`,
    `プロジェクト説明: ${project.description || "（説明なし）"}`,
    `対象タスク名: ${taskTitle}`,
    "既存タスク一覧:",
    formatTasks(tasks),
    "",
    "作成ルール:",
    "- 2〜5文程度",
    "- 目的、実施内容、完了条件を含める",
    "- 曖昧語を避け、すぐ作業できる内容にする",
    "- 推測は避け、入力情報ベースで書く",
  ].join("\n");
}
