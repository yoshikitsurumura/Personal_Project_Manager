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

export function buildProjectSummaryPrompt(project: SummaryProjectInput, tasks: SummaryTaskInput[]) {
  const tasksText = tasks.length > 0
    ? tasks.map((task, index) => formatTaskLine(task, index)).join("\n")
    : "タスクは登録されていません。";

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
