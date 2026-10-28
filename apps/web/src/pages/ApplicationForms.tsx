import { useUnsavedApplicationChanges } from "../useUnsavedApplicationChanges";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  applicationFormSchema,
  type ApplicationQuestion,
  type AuthSession,
  type PlatformRole,
} from "@velora/shared";
import type { z } from "zod";
import { api, request } from "../api";
import { PortalGate, ErrorNotice } from "../portal";
import { QuestionFields } from "../application-fields";
import type { FormData } from "../application-types";
type Input = z.infer<typeof applicationFormSchema>;
const newQuestion = (): ApplicationQuestion => ({
  id: crypto.randomUUID(),
  label: "",
  type: "long",
  required: true,
  placeholder: "",
  help: "",
  options: [],
  maxLength: 3000,
  min: null,
  max: null,
  visibleIf: null,
});
const initial = (): Input => ({
  title: "",
  description: "",
  category: "General",
  published: false,
  open: false,
  reviewRoleIds: [],
  requiredRoleIds: [],
  minAccountDays: 0,
  cooldownHours: 0,
  maxActive: 1,
  opensAt: null,
  closesAt: null,
  confirmation: "Your application has been submitted.",
  acceptedMessage: "Your application has been accepted. Welcome to the team!",
  deniedMessage:
    "Thank you for applying. Your application has not been accepted this time.",
  notifyStaff: true,
  notificationChannelId: null,
  questions: [newQuestion()],
});
export default function ApplicationForms() {
  return (
    <PortalGate
      staff
      anyPermissions={["applications.manage", "applications.openclose"]}
    >
      {(session) => <Forms session={session} />}
    </PortalGate>
  );
}
function Forms({ session }: { session: AuthSession }) {
  const client = useQueryClient(),
    list = useQuery({
      queryKey: ["application-forms"],
      queryFn: () => request<FormData[]>("/v1/admin/application-forms"),
    }),
    roles = useQuery({ queryKey: ["admin-roles"], queryFn: api.roles }),
    [editing, setEditing] = useState<FormData | null | undefined>(),
    [busy, setBusy] = useState(""),
    [error, setError] = useState<unknown>(),
    [deleting, setDeleting] = useState("");
  const manage =
    session.isOwner || session.permissions.includes("applications.manage");
  async function act(
    form: FormData,
    path: string,
    method: string,
    body: unknown,
  ) {
    setBusy(form.id);
    setError(undefined);
    try {
      await request(
        `/v1/admin/application-forms/${form.id}${path}`,
        method,
        body,
        session.csrfToken,
      );
      await client.invalidateQueries({ queryKey: ["application-forms"] });
      await client.invalidateQueries({
        queryKey: ["public-application-forms"],
      });
      setDeleting("");
    } catch (error) {
      setError(error);
    } finally {
      setBusy("");
    }
  }
  return (
    <div className="applications-ui">
      <div className="portal-heading">
        <div>
          <span className="eyebrow">APPLICATION MANAGEMENT</span>
          <h1>Application forms.</h1>
          <p>
            Build questions, set reviewer roles, and control when submissions
            are accepted.
          </p>
        </div>
        {manage && editing === undefined && (
          <button className="button primary" onClick={() => setEditing(null)}>
            New form
          </button>
        )}
      </div>
      <ErrorNotice error={error ?? list.error ?? roles.error} />
      {editing !== undefined ? (
        <FormEditor
          key={editing?.id ?? "new"}
          form={editing}
          roles={roles.data ?? []}
          session={session}
          onBack={() => setEditing(undefined)}
        />
      ) : (
        <section className="portal-panel">
          {list.isPending && <p>Loading forms…</p>}
          {list.data?.length === 0 && (
            <p>
              No forms yet. Create your first form, add questions, then publish
              it and open intake.
            </p>
          )}
          {list.data?.map((form) => (
            <article className="application-form-card" key={form.id}>
              <div>
                <span className="eyebrow">
                  {form.category} · Version {form.currentVersion}
                </span>
                <h2>{form.title}</h2>
                <p>{form.description}</p>
                <span className="tag">
                  {form.archivedAt
                    ? "Archived"
                    : !form.published
                      ? "Unpublished"
                      : form.open
                        ? "Open"
                        : "Closed"}
                </span>
              </div>
              <div className="form-actions">
                {!form.archivedAt && (
                  <button
                    className="button"
                    disabled={!!busy}
                    onClick={() =>
                      void act(form, "/intake", "PATCH", { open: !form.open })
                    }
                  >
                    {form.open ? "Close intake" : "Open intake"}
                  </button>
                )}
                {manage && (
                  <>
                    <button
                      className="button"
                      disabled={!!busy}
                      onClick={() => setEditing(form)}
                    >
                      Edit / preview
                    </button>
                    <button
                      className="text-button"
                      disabled={!!busy}
                      onClick={() => void act(form, "/duplicate", "POST", {})}
                    >
                      Duplicate
                    </button>
                    {!form.archivedAt && (
                      <button
                        className="text-button"
                        disabled={!!busy}
                        onClick={() => void act(form, "/archive", "POST", {})}
                      >
                        Archive
                      </button>
                    )}
                    <button
                      className="text-button"
                      disabled={!!busy}
                      onClick={() => setDeleting(form.id)}
                    >
                      Delete empty form
                    </button>
                    {deleting === form.id && (
                      <div role="alert">
                        <p>
                          Delete this form? Forms with submissions cannot be
                          deleted.
                        </p>
                        <button
                          className="button"
                          disabled={!!busy}
                          onClick={() =>
                            void act(form, "", "DELETE", undefined)
                          }
                        >
                          Confirm deletion
                        </button>
                        <button
                          className="text-button"
                          onClick={() => setDeleting("")}
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </article>
          ))}
        </section>
      )}
      <Link className="text-button" to="/staff">
        Staff workspace
      </Link>
    </div>
  );
}
function FormEditor({
  form,
  roles,
  session,
  onBack,
}: {
  form: FormData | null;
  roles: PlatformRole[];
  session: AuthSession;
  onBack: () => void;
}) {
  const [value, setValue] = useState<Input>(() =>
      form
        ? {
            title: form.title,
            description: form.description,
            category: form.category,
            published: form.published,
            open: form.open,
            reviewRoleIds: form.reviewRoleIds,
            requiredRoleIds: form.requiredRoleIds,
            minAccountDays: form.minAccountDays,
            cooldownHours: form.cooldownHours,
            maxActive: form.maxActive,
            opensAt: form.opensAt,
            closesAt: form.closesAt,
            confirmation: form.confirmation,
            acceptedMessage:
              form.acceptedMessage ??
              "Your application has been accepted. Welcome to the team!",
            deniedMessage:
              form.deniedMessage ??
              "Thank you for applying. Your application has not been accepted this time.",
            notifyStaff: form.notifyStaff ?? true,
            notificationChannelId: null,
            questions: form.versions[0]?.questions ?? [newQuestion()],
          }
        : initial(),
    ),
    [preview, setPreview] = useState(false),
    [previewAnswers, setPreviewAnswers] = useState<Record<string, unknown>>({}),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(),
    [tab, setTab] = useState("details"),
    [expanded, setExpanded] = useState(0),
    [baseline] = useState(() => JSON.stringify(value)),
    client = useQueryClient();
  const editorRef = useRef<HTMLElement>(null);
  useEffect(() => {
    editorRef.current?.scrollIntoView({ block: "start" });
  }, [tab, preview]);
  const dirty = JSON.stringify(value) !== baseline;
  useUnsavedApplicationChanges(dirty);
  function leave() {
    if (
      !busy &&
      (!dirty || window.confirm("Discard your unsaved form changes?"))
    )
      onBack();
  }
  function patch<K extends keyof Input>(key: K, next: Input[K]) {
    setError(undefined);
    setValue((old) => ({ ...old, [key]: next }));
  }
  function question(index: number, next: Partial<ApplicationQuestion>) {
    setError(undefined);
    setValue((old) => ({
      ...old,
      questions: old.questions.map((q, i) =>
        i === index ? { ...q, ...next } : q,
      ),
    }));
  }
  function move(from: number, to: number) {
    const questions = [...value.questions];
    const [item] = questions.splice(from, 1);
    questions.splice(to, 0, item);
    if (
      questions.some(
        (q, i) =>
          q.visibleIf &&
          !questions.slice(0, i).some((p) => p.id === q.visibleIf!.questionId),
      )
    ) {
      setError(
        new Error(
          "Keep conditional questions after the question they depend on.",
        ),
      );
      return;
    }
    patch("questions", questions);
    setExpanded(to);
    setError(undefined);
  }
  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      const normalized = {
        ...value,
        questions: value.questions.map((q) => ({
          ...q,
          options: q.options.map((o) => o.trim()).filter(Boolean),
        })),
      };
      const parsed = applicationFormSchema.safeParse(normalized);
      if (!parsed.success) {
        const first = parsed.error.issues[0];
        const field = String(first.path[0] ?? "opensAt");
        setTab(
          field === "questions"
            ? "questions"
            : ["title", "description", "category"].includes(field)
              ? "details"
              : [
                    "reviewRoleIds",
                    "requiredRoleIds",
                    "minAccountDays",
                    "cooldownHours",
                    "maxActive",
                  ].includes(field)
                ? "access"
                : "publish",
        );
        if (field === "questions") setExpanded(Number(first.path[1] ?? 0));
        throw new Error(
          parsed.error.issues
            .map(
              (i) =>
                `${i.path[0] === "questions" ? `Question ${Number(i.path[1]) + 1}` : String(i.path[0] ?? "Schedule")}: ${i.message}`,
            )
            .join(" · "),
        );
      }
      await request(
        `/v1/admin/application-forms${form ? `/${form.id}` : ""}`,
        form ? "PATCH" : "POST",
        parsed.data,
        session.csrfToken,
      );
      await client.invalidateQueries({ queryKey: ["application-forms"] });
      await client.invalidateQueries({
        queryKey: ["public-application-forms"],
      });
      onBack();
    } catch (error) {
      setError(error);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section ref={editorRef} className="portal-panel application-editor">
      <div className="discord-section-heading">
        <button className="text-button" disabled={busy} onClick={leave}>
          ← All forms
        </button>
        <button
          className="button"
          disabled={busy}
          onClick={() => setPreview(!preview)}
        >
          {preview ? "Back to editor" : "Live preview"}
        </button>
      </div>
      <ErrorNotice error={error} />
      {!preview && (
        <div
          className="application-builder-tabs"
          aria-label="Form editor sections"
        >
          {[
            ["details", "1. Details"],
            ["questions", `2. Questions (${value.questions.length})`],
            ["access", "3. Access"],
            ["publish", "4. Publish"],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              aria-pressed={tab === key}
              onClick={() => setTab(key)}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      {preview ? (
        <div className="portal-form">
          <span className="eyebrow">Preview only — not a submission</span>
          <h2>{value.title || "Application title"}</h2>
          <p>{value.description}</p>
          <QuestionFields
            questions={value.questions}
            answers={previewAnswers}
            onChange={(id, answer) =>
              setPreviewAnswers((old) => ({ ...old, [id]: answer }))
            }
          />
        </div>
      ) : (
        <form
          id="application-builder"
          className="portal-form"
          noValidate
          onSubmit={save}
        >
          <fieldset
            disabled={busy}
            className="builder-section"
            hidden={tab !== "details"}
          >
            <h2>
              {form ? "Edit application form." : "Create application form."}
            </h2>
            <p>
              Each save creates a new question version. Existing submissions
              keep their original form version.
            </p>
            <label>
              Title
              <input
                required
                minLength={2}
                maxLength={100}
                value={value.title}
                onChange={(e) => patch("title", e.target.value)}
              />
            </label>
            <label>
              Description
              <textarea
                required
                minLength={5}
                maxLength={2000}
                value={value.description}
                onChange={(e) => patch("description", e.target.value)}
              />
            </label>
            <label>
              Category
              <input
                required
                value={value.category}
                maxLength={80}
                onChange={(e) => patch("category", e.target.value)}
              />
            </label>
          </fieldset>
          <fieldset
            disabled={busy}
            className="builder-section"
            hidden={tab !== "publish"}
          >
            <h2>Publish & intake</h2>
            <p>
              Publish makes the form visible. Accept submissions lets players
              apply. Both must be enabled to receive applications.
            </p>
            <div className="form-columns">
              <label className="check-label">
                <input
                  type="checkbox"
                  checked={value.published}
                  onChange={(e) => patch("published", e.target.checked)}
                />{" "}
                Publish in Applications
              </label>
              <label className="check-label">
                <input
                  type="checkbox"
                  checked={value.open}
                  onChange={(e) => patch("open", e.target.checked)}
                />{" "}
                Accept submissions
              </label>
            </div>
            <div className="form-columns">
              <label>
                Opens at (optional)
                <input
                  type="datetime-local"
                  value={
                    value.opensAt
                      ? new Date(
                          new Date(value.opensAt).getTime() -
                            new Date(value.opensAt).getTimezoneOffset() * 60000,
                        )
                          .toISOString()
                          .slice(0, 16)
                      : ""
                  }
                  onChange={(e) =>
                    patch(
                      "opensAt",
                      e.target.value
                        ? new Date(e.target.value).toISOString()
                        : null,
                    )
                  }
                />
              </label>
              <label>
                Closes at (optional)
                <input
                  type="datetime-local"
                  value={
                    value.closesAt
                      ? new Date(
                          new Date(value.closesAt).getTime() -
                            new Date(value.closesAt).getTimezoneOffset() *
                              60000,
                        )
                          .toISOString()
                          .slice(0, 16)
                      : ""
                  }
                  onChange={(e) =>
                    patch(
                      "closesAt",
                      e.target.value
                        ? new Date(e.target.value).toISOString()
                        : null,
                    )
                  }
                />
              </label>
            </div>
          </fieldset>
          <fieldset
            disabled={busy}
            className="builder-section"
            hidden={tab !== "access"}
          >
            <h2>Access & eligibility</h2>
            <p>Choose who reviews applications and who can apply.</p>
            <fieldset className="role-checklist">
              <legend>Reviewer roles</legend>
              <p>
                Reviewers also need applications.review permission. Leave empty
                for protected owner access only.
              </p>
              {roles.map((role) => (
                <label className="check-label" key={role.id}>
                  <input
                    type="checkbox"
                    checked={value.reviewRoleIds.includes(role.id)}
                    onChange={(e) =>
                      patch(
                        "reviewRoleIds",
                        e.target.checked
                          ? [...value.reviewRoleIds, role.id]
                          : value.reviewRoleIds.filter((id) => id !== role.id),
                      )
                    }
                  />
                  {role.name}
                </label>
              ))}
            </fieldset>
            <fieldset className="role-checklist">
              <legend>Applicant eligibility roles (optional)</legend>
              <p>Leave empty to allow all signed-in community members.</p>
              {roles.map((role) => (
                <label className="check-label" key={role.id}>
                  <input
                    type="checkbox"
                    checked={value.requiredRoleIds.includes(role.id)}
                    onChange={(e) =>
                      patch(
                        "requiredRoleIds",
                        e.target.checked
                          ? [...value.requiredRoleIds, role.id]
                          : value.requiredRoleIds.filter(
                              (id) => id !== role.id,
                            ),
                      )
                    }
                  />
                  {role.name}
                </label>
              ))}
            </fieldset>
            <div className="form-columns">
              {(["minAccountDays", "cooldownHours", "maxActive"] as const).map(
                (key) => (
                  <label key={key}>
                    {
                      {
                        minAccountDays: "Minimum Discord account age (days)",
                        cooldownHours: "Submission cooldown (hours)",
                        maxActive: "Maximum active applications",
                      }[key]
                    }
                    <input
                      type="number"
                      min={key === "maxActive" ? 1 : 0}
                      max={
                        key === "maxActive"
                          ? 10
                          : key === "cooldownHours"
                            ? 8760
                            : 3650
                      }
                      value={value[key]}
                      onChange={(e) => patch(key, Number(e.target.value))}
                    />
                  </label>
                ),
              )}
            </div>
          </fieldset>
          <fieldset
            disabled={busy}
            className="builder-section"
            hidden={tab !== "publish"}
          >
            <h2>Discord notifications</h2>
            <label className="check-label">
              <input
                type="checkbox"
                checked={value.notifyStaff}
                onChange={(e) => patch("notifyStaff", e.target.checked)}
              />
              Notify staff when an application is submitted
            </label>
            <label>
              Staff alert webhook URL
              <input
                type="password"
                autoComplete="new-password"
                placeholder={
                  form?.notificationWebhookConfigured
                    ? "Webhook saved — leave blank to keep it"
                    : "https://discord.com/api/webhooks/…"
                }
                value={value.notificationWebhookUrl ?? ""}
                onChange={(e) =>
                  patch(
                    "notificationWebhookUrl",
                    e.target.value.trim() || undefined,
                  )
                }
              />
              <small>
                Create a webhook in the destination Discord channel and paste
                its URL here. Each form can use a different server. Saved URLs
                stay private.
              </small>
              {form?.notificationWebhookConfigured && (
                <button
                  type="button"
                  className="button"
                  onClick={() => patch("notificationWebhookUrl", null)}
                >
                  Remove saved webhook
                  {value.notificationWebhookUrl === null
                    ? " (will remove on save)"
                    : ""}
                </button>
              )}
            </label>
            <h2>Outcome messages</h2>
            <p>
              The bot DMs this message with the application link after staff
              accept or deny it. Staff can add a personal reason when deciding.
            </p>
            <label>
              Accepted message
              <textarea
                value={value.acceptedMessage}
                maxLength={3000}
                onChange={(e) => patch("acceptedMessage", e.target.value)}
              />
            </label>
            <label>
              Denied message
              <textarea
                value={value.deniedMessage}
                maxLength={3000}
                onChange={(e) => patch("deniedMessage", e.target.value)}
              />
            </label>
            <label>
              Submission confirmation
              <textarea
                required
                value={value.confirmation}
                maxLength={1000}
                onChange={(e) => patch("confirmation", e.target.value)}
              />
            </label>
          </fieldset>
          <fieldset
            disabled={busy}
            className="builder-section"
            hidden={tab !== "questions"}
          >
            <div className="discord-section-heading">
              <h3>Questions</h3>
              <button
                className="button"
                type="button"
                disabled={value.questions.length >= 50}
                onClick={() => {
                  setExpanded(value.questions.length);
                  patch("questions", [...value.questions, newQuestion()]);
                }}
              >
                New question
              </button>
            </div>
            <p>
              Use Up / Down to reorder questions. Conditional questions must
              remain after the question they depend on.
            </p>
            {value.questions.map((q, index) => (
              <section className="question-builder-card" key={q.id}>
                <button
                  type="button"
                  className="question-builder-toggle"
                  aria-expanded={expanded === index}
                  onClick={() => setExpanded(expanded === index ? -1 : index)}
                >
                  <span>
                    <small>
                      QUESTION {index + 1} ·{" "}
                      {q.required ? "Required" : "Optional"}
                    </small>
                    <strong>{q.label || "New question"}</strong>
                  </span>
                  <span>{expanded === index ? "−" : "+"}</span>
                </button>
                <div
                  className="question-builder-fields"
                  hidden={expanded !== index}
                >
                  <div className="form-actions">
                    <strong>Question {index + 1}</strong>
                    <button
                      type="button"
                      className="text-button"
                      disabled={index === 0}
                      onClick={() => move(index, index - 1)}
                    >
                      Up
                    </button>
                    <button
                      type="button"
                      className="text-button"
                      disabled={index === value.questions.length - 1}
                      onClick={() => move(index, index + 1)}
                    >
                      Down
                    </button>
                    <button
                      type="button"
                      className="text-button"
                      disabled={value.questions.length === 1}
                      onClick={() =>
                        patch(
                          "questions",
                          value.questions
                            .filter((item) => item.id !== q.id)
                            .map((item) =>
                              item.visibleIf?.questionId === q.id
                                ? { ...item, visibleIf: null }
                                : item,
                            ),
                        )
                      }
                    >
                      Remove
                    </button>
                  </div>
                  <label>
                    Question text
                    <input
                      placeholder="Type your question"
                      required
                      maxLength={300}
                      value={q.label}
                      onChange={(e) =>
                        question(index, { label: e.target.value })
                      }
                    />
                  </label>
                  <div className="form-columns">
                    <label>
                      Answer format
                      <select
                        value={q.type}
                        onChange={(e) =>
                          question(index, {
                            type: e.target.value as ApplicationQuestion["type"],
                          })
                        }
                      >
                        <option value="long">Written answer</option>
                        <option value="choice">
                          Multiple choice — pick one
                        </option>
                        <option value="checkboxes">
                          Multiple choice — pick several
                        </option>
                        <optgroup label="Other answer formats">
                          {[
                            ["short", "Short answer"],
                            ["number", "Number"],
                            ["select", "Dropdown"],
                            ["date", "Date"],
                            ["file", "File upload"],
                            ["yesno", "Yes / No"],
                            ["info", "Information"],
                          ].map(([type, label]) => (
                            <option key={type} value={type}>
                              {label}
                            </option>
                          ))}
                        </optgroup>
                      </select>
                    </label>
                    <label className="check-label">
                      <input
                        type="checkbox"
                        checked={q.required}
                        onChange={(e) =>
                          question(index, { required: e.target.checked })
                        }
                      />{" "}
                      Required
                    </label>
                  </div>
                  {["choice", "checkboxes", "select"].includes(q.type) && (
                    <label>
                      Choices (one per line)
                      <textarea
                        value={q.options.join("\n")}
                        onChange={(e) =>
                          question(index, {
                            options: e.target.value.split("\n"),
                          })
                        }
                      />
                    </label>
                  )}
                  <details className="question-advanced">
                    <summary>Help text & advanced settings</summary>
                    <label>
                      Help text
                      <textarea
                        maxLength={1000}
                        value={q.help}
                        onChange={(e) =>
                          question(index, { help: e.target.value })
                        }
                      />
                    </label>
                    <label>
                      Placeholder
                      <input
                        maxLength={200}
                        value={q.placeholder}
                        onChange={(e) =>
                          question(index, { placeholder: e.target.value })
                        }
                      />
                    </label>
                    {["short", "long"].includes(q.type) && (
                      <label>
                        Maximum characters
                        <input
                          type="number"
                          min={1}
                          max={12000}
                          value={q.maxLength}
                          onChange={(e) =>
                            question(index, {
                              maxLength: Number(e.target.value),
                            })
                          }
                        />
                      </label>
                    )}
                    {q.type === "number" && (
                      <div className="form-columns">
                        <label>
                          Minimum
                          <input
                            type="number"
                            value={q.min ?? ""}
                            onChange={(e) =>
                              question(index, {
                                min:
                                  e.target.value === ""
                                    ? null
                                    : Number(e.target.value),
                              })
                            }
                          />
                        </label>
                        <label>
                          Maximum
                          <input
                            type="number"
                            value={q.max ?? ""}
                            onChange={(e) =>
                              question(index, {
                                max:
                                  e.target.value === ""
                                    ? null
                                    : Number(e.target.value),
                              })
                            }
                          />
                        </label>
                      </div>
                    )}
                    <label>
                      Show only when an earlier answer matches
                      <select
                        value={q.visibleIf?.questionId ?? ""}
                        onChange={(e) =>
                          question(index, {
                            visibleIf: e.target.value
                              ? { questionId: e.target.value, value: "" }
                              : null,
                          })
                        }
                      >
                        <option value="">Always visible</option>
                        {value.questions
                          .slice(0, index)
                          .filter((item) =>
                            [
                              "short",
                              "choice",
                              "select",
                              "yesno",
                              "number",
                            ].includes(item.type),
                          )
                          .map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.label}
                            </option>
                          ))}
                      </select>
                    </label>
                    {q.visibleIf && (
                      <label>
                        Required answer (use true / false for yes-no)
                        <input
                          value={q.visibleIf.value}
                          onChange={(e) =>
                            question(index, {
                              visibleIf: {
                                ...q.visibleIf!,
                                value: e.target.value,
                              },
                            })
                          }
                        />
                      </label>
                    )}
                  </details>
                  <button
                    type="button"
                    className="button"
                    onClick={() => {
                      if (!q.label.trim()) {
                        setError(
                          new Error(
                            "Enter the question text before continuing.",
                          ),
                        );
                        return;
                      }
                      const options = q.options
                        .map((o) => o.trim())
                        .filter(Boolean);
                      if (
                        ["choice", "checkboxes", "select"].includes(q.type) &&
                        (options.length < 2 ||
                          new Set(options).size !== options.length)
                      ) {
                        setError(
                          new Error("Add at least two different choices."),
                        );
                        return;
                      }
                      setError(undefined);
                      setExpanded(-1);
                    }}
                  >
                    Done with question
                  </button>
                </div>
              </section>
            ))}
          </fieldset>
        </form>
      )}
      <div className="application-save-bar">
        <span>
          {dirty ? "Unsaved changes" : "No unsaved changes"}
          <small>
            {value.published ? "Published" : "Unpublished"} ·{" "}
            {value.open ? "Intake open" : "Intake closed"}
          </small>
        </span>
        {preview ? (
          <button className="button" onClick={() => setPreview(false)}>
            Return to editor
          </button>
        ) : (
          <button
            className="button primary"
            form="application-builder"
            type="submit"
            disabled={busy}
          >
            {busy ? "Saving…" : "Save form"}
          </button>
        )}
      </div>
    </section>
  );
}
