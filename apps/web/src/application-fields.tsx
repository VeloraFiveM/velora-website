import { questionVisible, type ApplicationQuestion } from "@velora/shared";
import { config } from "./config";
export function QuestionFields({
  questions,
  answers,
  onChange,
  disabled = false,
  locked = false,
  files = [],
  onUpload,
  errors = {},
}: {
  questions: ApplicationQuestion[];
  answers: Record<string, unknown>;
  onChange: (id: string, value: unknown) => void;
  disabled?: boolean;
  locked?: boolean;
  files?: { id: string; originalName: string }[];
  onUpload?: (id: string, files: FileList | null) => void;
  errors?: Record<string, string>;
}) {
  return (
    <>
      {questions
        .filter((q) => questionVisible(q, answers))
        .map((q, index) => {
          const value = answers[q.id],
            labelId = `question-${q.id}`,
            helpId = `help-${q.id}`,
            errorId = `error-${q.id}`;
          const props = {
            disabled: locked,
            "aria-labelledby": labelId,
            "aria-describedby": `${helpId}${errors[q.id] ? ` ${errorId}` : ""}`,
            "aria-invalid": !!errors[q.id],
            "aria-required": q.required,
          };
          if (q.type === "info")
            return (
              <aside className="notice" key={q.id}>
                <strong>{q.label}</strong>
                <p>{q.help}</p>
              </aside>
            );
          return (
            <section
              className={`application-question ${errors[q.id] ? "has-error" : ""}`}
              key={q.id}
              id={`answer-${q.id}`}
              tabIndex={-1}
            >
              <div className="application-question-heading">
                <span className="question-number">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 id={labelId}>{q.label}</h3>
                  <span className="question-requirement">
                    {q.required ? "Required" : "Optional"}
                  </span>
                </div>
              </div>
              <p className="question-help" id={helpId}>
                {q.help ||
                  (q.type === "file"
                    ? "PNG, JPEG, WebP or PDF. Maximum 5 MiB per file."
                    : "")}
              </p>
              {disabled && q.type !== "file" ? (
                <p className="answer-value">
                  {Array.isArray(value)
                    ? value.join(", ")
                    : typeof value === "boolean"
                      ? value
                        ? "Yes"
                        : "No"
                      : String(value ?? "—")}
                </p>
              ) : q.type === "file" ? (
                <div className="application-file-field">
                  {(Array.isArray(value) ? value : []).map((id) => (
                    <div className="application-file-row" key={String(id)}>
                      <a
                        className="evidence-link"
                        href={`${config.apiUrl}/v1/application-files/${id}`}
                      >
                        {files.find((f) => f.id === id)?.originalName ??
                          "Attachment"}
                      </a>
                      {!disabled && (
                        <button
                          type="button"
                          className="text-button"
                          disabled={locked}
                          aria-label={`Remove ${files.find((f) => f.id === id)?.originalName ?? "attachment"}`}
                          onClick={() =>
                            onChange(
                              q.id,
                              (value as string[]).filter((v) => v !== id),
                            )
                          }
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                  {!disabled &&
                    (onUpload ? (
                      <input
                        {...props}
                        type="file"
                        multiple
                        accept=".png,.jpg,.jpeg,.webp,.pdf"
                        onChange={(e) => {
                          onUpload(q.id, e.target.files);
                          e.target.value = "";
                        }}
                      />
                    ) : (
                      <p className="question-help">
                        File uploads are available when a player fills out this
                        form.
                      </p>
                    ))}
                </div>
              ) : ["yesno", "choice", "checkboxes"].includes(q.type) ? (
                <div
                  className="answer-options"
                  role={q.type === "checkboxes" ? "group" : "radiogroup"}
                  aria-labelledby={labelId}
                  aria-describedby={errors[q.id] ? errorId : helpId}
                >
                  {(q.type === "yesno" ? ["Yes", "No"] : q.options).map(
                    (option, i) => {
                      const optionValue = q.type === "yesno" ? i === 0 : option;
                      return (
                        <label
                          className="check-label answer-option"
                          key={`${option}-${i}`}
                        >
                          <input
                            {...props}
                            aria-labelledby={undefined}
                            aria-label={option}
                            type={
                              q.type === "checkboxes" ? "checkbox" : "radio"
                            }
                            name={`answer-${q.id}`}
                            checked={
                              q.type === "checkboxes"
                                ? Array.isArray(value) && value.includes(option)
                                : value === optionValue
                            }
                            onChange={(e) =>
                              onChange(
                                q.id,
                                q.type === "checkboxes"
                                  ? e.target.checked
                                    ? [
                                        ...(Array.isArray(value) ? value : []),
                                        option,
                                      ]
                                    : (Array.isArray(value)
                                        ? value
                                        : []
                                      ).filter((v) => v !== option)
                                  : optionValue,
                              )
                            }
                          />
                          <span>{option}</span>
                        </label>
                      );
                    },
                  )}
                </div>
              ) : q.type === "select" ? (
                <select
                  {...props}
                  value={String(value ?? "")}
                  onChange={(e) => onChange(q.id, e.target.value)}
                >
                  <option value="">Select an option</option>
                  {q.options.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              ) : q.type === "long" ? (
                <>
                  <textarea
                    {...props}
                    rows={5}
                    maxLength={q.maxLength}
                    placeholder={q.placeholder || "Write your answer here…"}
                    value={String(value ?? "")}
                    onChange={(e) => onChange(q.id, e.target.value)}
                  />
                  <small className="answer-counter">
                    {String(value ?? "").length.toLocaleString()} /{" "}
                    {q.maxLength.toLocaleString()}
                  </small>
                </>
              ) : (
                <input
                  {...props}
                  type={
                    q.type === "number"
                      ? "number"
                      : q.type === "date"
                        ? "date"
                        : "text"
                  }
                  step={q.type === "number" ? "any" : undefined}
                  min={q.min ?? undefined}
                  max={q.max ?? undefined}
                  maxLength={q.maxLength}
                  placeholder={
                    q.placeholder || (q.type === "short" ? "Your answer" : "")
                  }
                  value={String(value ?? "")}
                  onChange={(e) =>
                    onChange(
                      q.id,
                      q.type === "number" && e.target.value !== ""
                        ? Number(e.target.value)
                        : e.target.value,
                    )
                  }
                />
              )}
              {errors[q.id] && (
                <p className="question-error" id={errorId}>
                  {errors[q.id]}
                </p>
              )}
            </section>
          );
        })}
    </>
  );
}
