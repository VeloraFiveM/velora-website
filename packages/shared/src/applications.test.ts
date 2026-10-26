import { describe, it, expect } from "vitest";
import {
  applicationQuestionSchema,
  applicationFormSchema,
  validateApplicationAnswers,
  questionVisible,
} from "./index";
const question = (input: unknown) => applicationQuestionSchema.parse(input);
describe("application form validation", () => {
  it("accepts a required false yes/no answer and rejects an omitted one", () => {
    const q = question({
      id: "confirm",
      label: "Confirm",
      type: "yesno",
      required: true,
    });
    expect(
      validateApplicationAnswers([q], { confirm: false }, true),
    ).toBeNull();
    expect(validateApplicationAnswers([q], {}, true)).toContain("required");
    expect(validateApplicationAnswers([q], {}, false)).toBeNull();
  });
  it("honours conditional visibility and validates choice/number limits", () => {
    const q = question({
      id: "detail",
      label: "Detail",
      type: "long",
      required: true,
      visibleIf: { questionId: "yes", value: "true" },
    });
    expect(questionVisible(q, { yes: false })).toBe(false);
    expect(validateApplicationAnswers([q], { yes: false }, true)).toContain(
      "Unknown",
    );
    expect(
      validateApplicationAnswers(
        [question({ id: "yes", label: "Yes?", type: "yesno" }), q],
        { yes: false },
        true,
      ),
    ).toBeNull();
    expect(
      validateApplicationAnswers(
        [
          question({
            id: "n",
            label: "Age",
            type: "number",
            min: 18,
            max: 100,
          }),
        ],
        { n: 17 },
        true,
      ),
    ).toContain("limits");
    expect(
      validateApplicationAnswers(
        [
          question({
            id: "choice",
            label: "Pick",
            type: "select",
            options: ["A", "B"],
          }),
        ],
        { choice: "C" },
        true,
      ),
    ).toContain("invalid");
  });
  it("rejects unknown answer keys and oversized text", () => {
    const q = question({
      id: "text",
      label: "Text",
      type: "short",
      maxLength: 4,
    });
    expect(validateApplicationAnswers([q], { other: "x" }, true)).toContain(
      "Unknown",
    );
    expect(validateApplicationAnswers([q], { text: "12345" }, true)).toContain(
      "limit",
    );
  });
  it("rejects duplicate IDs and conditions referring to later questions", () => {
    const base = {
      title: "Example",
      description: "A real description",
      category: "Staff",
      published: false,
      open: false,
      reviewRoleIds: [],
      requiredRoleIds: [],
      minAccountDays: 0,
      cooldownHours: 0,
      maxActive: 1,
      opensAt: null,
      closesAt: null,
      confirmation: "Received",
      questions: [question({ id: "q", label: "Question", type: "short" })],
    };
    expect(
      applicationFormSchema.safeParse({
        ...base,
        questions: [...base.questions, ...base.questions],
      }).success,
    ).toBe(false);
    expect(
      applicationFormSchema.safeParse({
        ...base,
        questions: [
          question({
            id: "q",
            label: "Question",
            type: "short",
            visibleIf: { questionId: "later", value: "yes" },
          }),
        ],
      }).success,
    ).toBe(false);
  });
});
