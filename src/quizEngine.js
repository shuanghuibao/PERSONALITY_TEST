/**
 * @typedef {{ high: string, low: string, highLetter: string, lowLetter: string }} AxisDef
 * @typedef {{ axes: AxisDef[] }} AxisSchema
 * @typedef {{ text: string, choices: { label: string, scores?: Record<string, number> }[] }} Question
 * @typedef {{ id: string, title: string, shareCode: string, tagline?: string, body: string, bullets?: string[], cite?: string }} ResultProfile
 * @typedef {{ id: string, title: string, disclaimer?: string, axisSchema: AxisSchema, questions: Question[], resultsByAxisKey: Record<string, ResultProfile>, fallbackAxisKey?: string }} QuizDefinition
 */

/** @param {Record<string, number>} scores @param {AxisSchema} schema */
export function resolveAxisKey(scores, schema) {
  return schema.axes
    .map(({ high, low, highLetter, lowLetter }) => {
      const hi = scores[high] ?? 0;
      const lo = scores[low] ?? 0;
      return hi >= lo ? highLetter : lowLetter;
    })
    .join("-");
}

/** @param {QuizDefinition} quiz @param {Record<string, number>} scores */
export function pickResult(quiz, scores) {
  const key = resolveAxisKey(scores, quiz.axisSchema);
  const direct = quiz.resultsByAxisKey[key];
  if (direct) return { axisKey: key, result: direct };
  const fb = quiz.fallbackAxisKey ?? Object.keys(quiz.resultsByAxisKey)[0];
  return { axisKey: key, result: quiz.resultsByAxisKey[fb] };
}

/** @param {QuizDefinition} quiz */
export function initScores(quiz) {
  const keys = new Set();
  for (const ax of quiz.axisSchema.axes) {
    keys.add(ax.high);
    keys.add(ax.low);
  }
  /** @type {Record<string, number>} */
  const scores = {};
  keys.forEach((k) => {
    scores[k] = 0;
  });
  return scores;
}

/** @param {Record<string, number>} scores @param {Record<string, number>} delta */
export function applyScores(scores, delta) {
  Object.entries(delta).forEach(([k, v]) => {
    scores[k] = (scores[k] ?? 0) + v;
  });
}
