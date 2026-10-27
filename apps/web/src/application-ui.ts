import {
  questionVisible,
  validateApplicationAnswers,
  type ApplicationQuestion,
} from "@velora/shared";
export function answerErrors(
  questions: ApplicationQuestion[],
  answers: Record<string, unknown>,
) {
  return Object.fromEntries(
    questions
      .filter((q) => q.type !== "info" && questionVisible(q, answers))
      .flatMap((q) => {
        const error = validateApplicationAnswers(
          [{ ...q, visibleIf: null }],
          { [q.id]: answers[q.id] },
          true,
        );
        return error ? [[q.id, error]] : [];
      }),
  );
}
export function answerProgress(
  questions: ApplicationQuestion[],
  answers: Record<string, unknown>,
) {
  const visible = questions.filter(
    (q) => q.type !== "info" && questionVisible(q, answers),
  );
  const completed = visible.filter((q) => {
    const v = answers[q.id];
    return (
      v !== undefined &&
      v !== null &&
      v !== "" &&
      (!Array.isArray(v) || v.length > 0) &&
      !validateApplicationAnswers(
        [{ ...q, visibleIf: null }],
        { [q.id]: v },
        true,
      )
    );
  }).length;
  return { completed, total: visible.length };
}
