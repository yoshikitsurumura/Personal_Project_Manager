// @author Claude
// =============================================================================
// 日付ユーティリティ
// 日時のフォーマットとソート比較をまとめたヘルパー関数群。
// =============================================================================

/**
 * Date オブジェクトを日本語の「中程度の日付 + 短い時刻」形式に変換して返す。
 *
 * @param value - 変換したい Date、または null
 * @returns  例: "2024年6月5日 14:30" のような文字列。
 *           value が null なら "未記録" を返す。
 *
 * 学習ポイント:
 *   Intl.DateTimeFormat は JS 標準の国際化 API。
 *   ロケールを "ja-JP" にするだけで日本語形式になる。
 *   dateStyle / timeStyle で細かいフォーマット指定が不要になる。
 */
export function formatDateTime(value: Date | null) {
  if (!value) {
    return "未記録";
  }

  return new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "medium", // 例: "2024年6月5日"
    timeStyle: "short",  // 例: "14:30"
  }).format(value);
}

/**
 * 2 つの期限日文字列を比較してソート順を返す。
 * Array.prototype.sort のコールバックとして使うことを想定している。
 *
 * @param left      比較元の期限日（"YYYY-MM-DD" 形式 or null）
 * @param right     比較対象の期限日（"YYYY-MM-DD" 形式 or null）
 * @param direction "asc" = 近い順（昇順）、"desc" = 遠い順（降順）
 * @returns  正の数 → left を後ろへ、負の数 → left を前へ、0 → 同じ
 *
 * 学習ポイント:
 *   null（期限未設定）の扱い方がポイント。
 *   - asc（近い順）では未設定を最後尾に送るため MAX_SAFE_INTEGER を使う。
 *   - desc（遠い順）では未設定を先頭に送るため MIN_SAFE_INTEGER を使う。
 *   こうすることで「期限なし」タスクを常に端に集められる。
 */
export function compareByDueDate(left: string | null, right: string | null, direction: "asc" | "desc") {
  // null を数値に変換するときのフォールバック値
  const emptyRank = direction === "asc" ? Number.MAX_SAFE_INTEGER : Number.MIN_SAFE_INTEGER;

  // 文字列 "YYYY-MM-DD" を new Date() で Date オブジェクトに変換し、
  // getTime() でミリ秒単位の数値にする（数値比較の方が文字列比較より安全）
  const leftTime = left ? new Date(left).getTime() : emptyRank;
  const rightTime = right ? new Date(right).getTime() : emptyRank;

  // sort コールバックの仕様:
  //   左 - 右 が負 → left を前に（昇順）
  //   右 - 左 が負 → left を後ろに（降順）
  return direction === "asc" ? leftTime - rightTime : rightTime - leftTime;
}
