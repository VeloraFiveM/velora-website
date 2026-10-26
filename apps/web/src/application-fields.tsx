import { questionVisible, type ApplicationQuestion } from "@velora/shared";
import { config } from "./config";
export function QuestionFields({
  questions,
  answers,
  onChange,
  disabled = false,
  files = [],
  onUpload,
}: {
  questions: ApplicationQuestion[];
  answers: Record<string, unknown>;
  onChange: (id: string, value: unknown) => void;
  disabled?: boolean;
  files?: { id: string; originalName: string }[];
  onUpload?: (id: string, files: FileList | null) => void;
}) {
  return (
    <>
      {questions
        .filter((q) => questionVisible(q, answers))
        .map((q) => {
          const value = answers[q.id];
          if (q.type === "info")
            return (
              <div className="notice" key={q.id}>
                <strong>{q.label}</strong>
                <p>{q.help}</p>
              </div>
            );
          const Wrapper = q.type === "checkboxes" ? "div" : "label";
          return (
            <div className="application-question" key={q.id}>
              <Wrapper>
                <span>
                  {q.label}
                  {q.required ? " *" : ""}
                </span>
                {q.help && <small>{q.help}</small>}
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
                  <>
                    <div>
                      {(Array.isArray(value) ? value : []).map((id) => (
                        <a
                          className="evidence-link"
                          key={String(id)}
                          href={`${config.apiUrl}/v1/application-files/${id}`}
                        >
                          {files.find((f) => f.id === id)?.originalName ??
                            "Attachment"}
                        </a>
                      ))}
                    </div>
                    {!disabled && (
                      <input
                        type="file"
                        multiple
                        accept=".png,.jpg,.jpeg,.webp,.pdf"
                        onChange={(e) => onUpload?.(q.id, e.target.files)}
                      />
                    )}
                    <small>PNG, JPEG, WebP or PDF; 5 MiB per file.</small>
                  </>
                ) : q.type === "yesno" ? (
                  <select
                    disabled={disabled}
                    value={typeof value === "boolean" ? String(value) : ""}
                    onChange={(e) =>
                      onChange(
                        q.id,
                        e.target.value === "" ? "" : e.target.value === "true",
                      )
                    }
                  >
                    <option value="">Choose…</option>
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                ) : q.type === "checkboxes" ? (
                  <div className="answer-options">
                    {q.options.map((option) => (
                      <label className="check-label" key={option}>
                        <input
                          type="checkbox"
                          disabled={disabled}
                          checked={
                            Array.isArray(value) && value.includes(option)
                          }
                          onChange={(e) =>
                            onChange(
                              q.id,
                              e.target.checked
                                ? [
                                    ...(Array.isArray(value) ? value : []),
                                    option,
                                  ]
                                : (Array.isArray(value) ? value : []).filter(
                                    (v) => v !== option,
                                  ),
                            )
                          }
                        />
                        {option}
                      </label>
                    ))}
                  </div>
                ) : ["choice", "select"].includes(q.type) ? (
                  <select
                    disabled={disabled}
                    value={String(value ?? "")}
                    onChange={(e) => onChange(q.id, e.target.value)}
                  >
                    <option value="">Choose…</option>
                    {q.options.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                ) : q.type === "long" ? (
                  <textarea
                    disabled={disabled}
                    rows={5}
                    maxLength={q.maxLength}
                    placeholder={q.placeholder}
                    value={String(value ?? "")}
                    onChange={(e) => onChange(q.id, e.target.value)}
                  />
                ) : (
                  <input
                    disabled={disabled}
                    type={
                      q.type === "number"
                        ? "number"
                        : q.type === "date"
                          ? "date"
                          : "text"
                    }
                    min={q.min ?? undefined}
                    max={q.max ?? undefined}
                    maxLength={q.maxLength}
                    placeholder={q.placeholder}
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
              </Wrapper>
            </div>
          );
        })}
    </>
  );
}
