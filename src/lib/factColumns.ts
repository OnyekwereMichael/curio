/**
 * The fact columns the app is allowed to read. quiz_questions (which holds the correct answers) is deliberately
 * not in this list: questions are built and graded on the server, so the answers must never reach the browser.
 */
export const FACT_COLUMNS =
  'id, image_url, hook_line, context_line, bullet_1, bullet_2, bullet_3, bullet_4, category, publish_date, created_at';
