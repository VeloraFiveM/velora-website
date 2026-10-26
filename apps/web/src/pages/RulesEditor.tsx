import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  rulesPageSchema,
  type RulesPage,
  type AuthSession,
} from "@velora/shared";
import { request } from "../api";
import { ErrorNotice } from "../portal";

export default function RulesEditor({ session }: { session: AuthSession }) {
  const rules = useQuery({
    queryKey: ["owner-rules"],
    queryFn: () => request<RulesPage>("/v1/owner/rules"),
  });
  return (
    <>
      <ErrorNotice error={rules.error} />
      {rules.isPending && <p>Loading rules…</p>}
      {rules.data && <Editor initial={rules.data} session={session} />}
    </>
  );
}
function Editor({
  initial,
  session,
}: {
  initial: RulesPage;
  session: AuthSession;
}) {
  const [page, setPage] = useState(() => structuredClone(initial)),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(),
    [saved, setSaved] = useState(false),
    [preview, setPreview] = useState(false);
  const client = useQueryClient();
  function change(update: (next: RulesPage) => void) {
    setPage((current) => {
      const next = structuredClone(current);
      update(next);
      return next;
    });
    setSaved(false);
  }
  return (
    <form
      className="portal-panel rules-editor"
      onSubmit={async (e) => {
        e.preventDefault();
        setError(undefined);
        const parsed = rulesPageSchema.safeParse(page);
        if (!parsed.success) {
          setError(
            new Error(parsed.error.issues.map((i) => i.message).join(". ")),
          );
          return;
        }
        setBusy(true);
        try {
          await request(
            "/v1/owner/rules",
            "PATCH",
            parsed.data,
            session.csrfToken,
          );
          await client.invalidateQueries({ queryKey: ["public-rules"] });
          await client.invalidateQueries({ queryKey: ["owner-rules"] });
          setSaved(true);
        } catch (error) {
          setError(error);
        } finally {
          setBusy(false);
        }
      }}
    >
      <p>
        Edit the public rules below. Save publishes your changes immediately.
        Text is displayed as written; HTML is not enabled.
      </p>
      <div className="rules-editor-actions">
        <button
          className="button"
          type="button"
          onClick={() => setPreview(!preview)}
        >
          {preview ? "Back to editor" : "Preview rules"}
        </button>
        <Link className="button" to="/rules">
          View public rules
        </Link>
      </div>
      {preview ? (
        <section className="rules-preview">
          <h2>{page.title}</h2>
          <p>{page.description}</p>
          {page.notice && <p className="notice">{page.notice}</p>}
          {page.groups.map((g, i) => (
            <section key={i}>
              <h3>{g.category}</h3>
              {g.items.map(([title, body], j) => (
                <article key={j}>
                  <h4>{title}</h4>
                  <p className="rule-body">{body}</p>
                </article>
              ))}
            </section>
          ))}
        </section>
      ) : (
        <fieldset disabled={busy}>
          <label>
            Page title
            <input
              required
              maxLength={150}
              value={page.title}
              onChange={(e) =>
                change((p) => {
                  p.title = e.target.value;
                })
              }
            />
          </label>
          <label>
            Introduction
            <textarea
              maxLength={1000}
              value={page.description}
              onChange={(e) =>
                change((p) => {
                  p.description = e.target.value;
                })
              }
            />
          </label>
          <label>
            Notice (optional)
            <textarea
              maxLength={1000}
              value={page.notice}
              onChange={(e) =>
                change((p) => {
                  p.notice = e.target.value;
                })
              }
            />
          </label>
          <p>
            Clear the notice when you are ready to replace the starter
            guidelines with official rules.
          </p>
          {page.groups.map((g, i) => (
            <section className="rules-editor-group" key={i}>
              <label>
                Category {i + 1}
                <input
                  required
                  maxLength={100}
                  value={g.category}
                  onChange={(e) =>
                    change((p) => {
                      p.groups[i].category = e.target.value;
                    })
                  }
                />
              </label>
              <div className="rules-editor-actions">
                <button
                  className="button"
                  type="button"
                  disabled={i === 0}
                  onClick={() =>
                    change((p) => {
                      [p.groups[i - 1], p.groups[i]] = [
                        p.groups[i],
                        p.groups[i - 1],
                      ];
                    })
                  }
                >
                  Move category up
                </button>
                <button
                  className="button"
                  type="button"
                  disabled={i === page.groups.length - 1}
                  onClick={() =>
                    change((p) => {
                      [p.groups[i + 1], p.groups[i]] = [
                        p.groups[i],
                        p.groups[i + 1],
                      ];
                    })
                  }
                >
                  Move category down
                </button>
                <button
                  className="button"
                  type="button"
                  disabled={page.groups.length === 1}
                  onClick={() =>
                    change((p) => {
                      p.groups.splice(i, 1);
                    })
                  }
                >
                  Remove category
                </button>
              </div>
              {g.items.map(([title, body], j) => (
                <div className="rules-editor-item" key={j}>
                  <label>
                    Rule {j + 1} title
                    <input
                      required
                      maxLength={200}
                      value={title}
                      onChange={(e) =>
                        change((p) => {
                          p.groups[i].items[j][0] = e.target.value;
                        })
                      }
                    />
                  </label>
                  <label>
                    Rule {j + 1} text
                    <textarea
                      required
                      rows={5}
                      maxLength={10000}
                      value={body}
                      onChange={(e) =>
                        change((p) => {
                          p.groups[i].items[j][1] = e.target.value;
                        })
                      }
                    />
                  </label>
                  <div className="rules-editor-actions">
                    <button
                      className="button"
                      type="button"
                      disabled={j === 0}
                      onClick={() =>
                        change((p) => {
                          const items = p.groups[i].items;
                          [items[j - 1], items[j]] = [items[j], items[j - 1]];
                        })
                      }
                    >
                      Move rule up
                    </button>
                    <button
                      className="button"
                      type="button"
                      disabled={j === g.items.length - 1}
                      onClick={() =>
                        change((p) => {
                          const items = p.groups[i].items;
                          [items[j + 1], items[j]] = [items[j], items[j + 1]];
                        })
                      }
                    >
                      Move rule down
                    </button>
                    <button
                      className="button"
                      type="button"
                      disabled={g.items.length === 1}
                      onClick={() =>
                        change((p) => {
                          p.groups[i].items.splice(j, 1);
                        })
                      }
                    >
                      Remove rule
                    </button>
                  </div>
                </div>
              ))}
              <button
                type="button"
                className="button"
                disabled={g.items.length >= 100}
                onClick={() =>
                  change((p) => {
                    p.groups[i].items.push(["", ""]);
                  })
                }
              >
                Add rule
              </button>
            </section>
          ))}
          <button
            type="button"
            className="button"
            disabled={page.groups.length >= 50}
            onClick={() =>
              change((p) => {
                p.groups.push({ category: "", items: [["", ""]] });
              })
            }
          >
            Add category
          </button>
        </fieldset>
      )}
      <ErrorNotice error={error} />
      {saved && <p role="status">Rules saved and published.</p>}
      <button className="button primary" disabled={busy}>
        {busy ? "Publishing…" : "Save and publish rules"}
      </button>
    </form>
  );
}
