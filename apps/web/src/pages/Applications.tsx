import "./directory.css";
import { ApplicationStatus, WorkspaceLoading } from "../workspace";
import { useUnsavedApplicationChanges } from "../useUnsavedApplicationChanges";
import {
  FileText,
  ArrowUpRight,
  Inbox,
  Shield,
  Users,
  Building2,
} from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { AuthSession } from "@velora/shared";
import { validateApplicationAnswers } from "@velora/shared";
import { request } from "../api";
import { PortalGate, ErrorNotice } from "../portal";
import { answerErrors, answerProgress } from "../application-ui";
import { QuestionFields } from "../application-fields";
import type { FormData, Submission } from "../application-types";
export default function Applications({
  mode,
}: {
  mode: "catalog" | "mine" | "review";
}) {
  if (mode === "catalog") return <Catalog />;
  return (
    <PortalGate staff={mode === "review"} permission="applications.review">
      {(session) => <Workspace session={session} review={mode === "review"} />}
    </PortalGate>
  );
}
function Catalog() {
  const forms = useQuery({
    queryKey: ["public-application-forms"],
    queryFn: () => request<FormData[]>("/v1/public/application-forms"),
  });
  const [category, setCategory] = useState("");
  const entries = forms.data ?? [];
  const categories = [
    ...new Set(entries.map((form) => form.category).filter(Boolean)),
  ];
  const activeCategory = categories.includes(category) ? category : "";
  const visible = entries.filter(
    (form) => !activeCategory || form.category === activeCategory,
  );

  return (
    <div className="velora-directory">
      <div className="directory-hero">
        <div>
          <h1>Community applications</h1>
          <p>
            Apply for a role in Velora or check the progress of an application
            you’ve submitted.
          </p>
          <Link className="directory-track" to="/my-applications">
            My applications <ArrowUpRight size={16} aria-hidden />
          </Link>
        </div>
      </div>
      <ErrorNotice error={forms.error} />
      {forms.isPending && <WorkspaceLoading label="Loading applications" />}
      {entries.length > 0 && (
        <section className="directory-list" aria-labelledby="directory-heading">
          <div className="directory-toolbar">
            <h2 id="directory-heading">Application directory</h2>
            {categories.length > 1 && (
              <div
                className="directory-filters"
                role="group"
                aria-label="Filter by category"
              >
                <button
                  type="button"
                  aria-pressed={!activeCategory}
                  onClick={() => setCategory("")}
                >
                  All
                </button>
                {categories.map((name) => (
                  <button
                    type="button"
                    key={name}
                    aria-pressed={name === activeCategory}
                    onClick={() => setCategory(name)}
                  >
                    {name}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="directory-grid">
            {visible.map((form) => {
              const label = form.category.toLowerCase();
              const Icon = label.includes("police")
                ? Shield
                : label.includes("staff")
                  ? Users
                  : label.includes("gang")
                    ? Building2
                    : FileText;
              return (
                <article className="directory-card" key={form.id}>
                  <div className="directory-card-top">
                    <span className="directory-symbol">
                      <Icon aria-hidden size={23} />
                    </span>
                    <span
                      className="directory-availability"
                      data-open={Boolean(form.accepting)}
                    >
                      {form.accepting ? "Open" : "Closed"}
                    </span>
                  </div>
                  <div className="directory-card-content">
                    {form.category !== form.title && (
                      <p className="directory-category">{form.category}</p>
                    )}
                    <h3>{form.title}</h3>
                    {form.description && (
                      <p className="directory-description">
                        {form.description.trim().replace(/\n\s*\n/g, "\n")}
                      </p>
                    )}
                  </div>
                  {form.accepting ? (
                    <Link
                      className="directory-apply"
                      to={`/my-applications?form=${encodeURIComponent(form.id)}`}
                      aria-label={`Apply for ${form.title}`}
                    >
                      Apply now <ArrowUpRight size={17} aria-hidden />
                    </Link>
                  ) : (
                    <p className="directory-closed">Applications are closed</p>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      )}
      {forms.isSuccess && !entries.length && (
        <div className="directory-empty">
          <Inbox size={28} aria-hidden />
          <h2>No applications published yet</h2>
        </div>
      )}
    </div>
  );
}

function Workspace({
  session,
  review,
}: {
  session: AuthSession;
  review: boolean;
}) {
  const [params, setParams] = useSearchParams(),
    id = params.get("application"),
    formId = params.get("form"),
    [error, setError] = useState<unknown>(),
    [starting, setStarting] = useState(false),
    [search, setSearch] = useState(""),
    [statusFilter, setStatusFilter] = useState("ALL");
  const list = useQuery({
    queryKey: ["applications", review],
    queryFn: () =>
      request<Submission[]>(
        review ? "/v1/staff/applications" : "/v1/applications",
      ),
    refetchInterval: 15000,
  });
  const forms = useQuery({
    queryKey: ["public-application-forms"],
    queryFn: () => request<FormData[]>("/v1/public/application-forms"),
    enabled: !!formId,
  });
  const chosen = forms.data?.find((f) => f.id === formId);
  const visible = (list.data ?? []).filter(
    (a) =>
      (statusFilter === "ALL" || a.status === statusFilter) &&
      `${a.number} ${a.version?.title ?? a.form.title} ${a.status.replaceAll("_", " ")} ${a.applicant?.username ?? ""}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <div className="applications-ui workspace-applications">
      <div className="portal-heading">
        <div>
          <span className="eyebrow">
            {review ? "STAFF REVIEW" : "PLAYER PORTAL"}
          </span>
          <h1>{review ? "Application review." : "My Applications."}</h1>
          <p>
            {review
              ? "Only submissions your permissions and reviewer roles allow are shown."
              : "Your drafts, submitted applications and decisions."}
          </p>
        </div>
        <Link className="button" to={review ? "/staff" : "/applications"}>
          {review ? "Staff home" : "Browse applications"}
        </Link>
      </div>
      <ErrorNotice error={error ?? list.error ?? forms.error} />
      {id ? (
        <ApplicationDetail
          key={id}
          id={id}
          session={session}
          review={review}
          onBack={() => setParams({})}
        />
      ) : formId ? (
        <section className="portal-panel application-start-panel">
          <span className="eyebrow">YOUR APPLICATION</span>
          <h2>{chosen?.title ?? "Start application"}</h2>
          <p>{chosen?.description}</p>
          {forms.isPending && <p role="status">Loading form…</p>}
          {!forms.isPending && !chosen && !forms.error && (
            <p role="alert">
              This form is no longer available. Browse applications to choose
              another.
            </p>
          )}
          {forms.error && (
            <button className="button" onClick={() => void forms.refetch()}>
              Retry loading form
            </button>
          )}
          {chosen && !chosen.accepting && (
            <p role="status">
              Applications are currently closed. You can still find existing
              drafts in My Applications.
            </p>
          )}
          {chosen?.accepting && (
            <p>
              Your progress saves as you go. You can review your answers before
              submitting.
            </p>
          )}
          <div className="form-actions application-start-actions">
            <button
              className="button primary"
              disabled={starting || !chosen?.accepting}
              onClick={async () => {
                setStarting(true);
                setError(undefined);
                try {
                  const draft = await request<{ id: string }>(
                    "/v1/applications/drafts",
                    "POST",
                    { formId },
                    session.csrfToken,
                  );
                  setParams({ application: draft.id });
                } catch (error) {
                  setError(error);
                } finally {
                  setStarting(false);
                }
              }}
            >
              {starting ? "Opening draft…" : "Open application"}
            </button>
            <button
              className="button"
              disabled={starting}
              onClick={() => setParams({})}
            >
              Cancel
            </button>
          </div>
        </section>
      ) : (
        <section className="portal-panel application-list-panel">
          <div className="application-list-heading">
            <div>
              <h2>{review ? "Review queue" : "Your applications"}</h2>
              <p>
                {list.data?.length ?? 0} total ·{" "}
                {list.data?.filter((a) => a.status === "DRAFT").length ?? 0}{" "}
                drafts
              </p>
            </div>
            <FileText size={24} />
          </div>
          <div className="application-list-tools">
            <label className="transcript-search">
              Search applications
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Application name, number or status"
              />
            </label>
            <label className="application-status-filter">
              <span>Status</span>
              <select
                aria-label="Filter application status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                {[
                  "ALL",
                  "DRAFT",
                  "SUBMITTED",
                  "UNDER_REVIEW",
                  "MORE_INFO",
                  "ACCEPTED",
                  "REJECTED",
                  "WITHDRAWN",
                ].map((value) => (
                  <option key={value} value={value}>
                    {value === "ALL"
                      ? "All statuses"
                      : value.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {list.isPending && <WorkspaceLoading label="Loading applications" />}
          {visible.map((a) => (
            <button
              className="application-list-row"
              key={a.id}
              onClick={() => setParams({ application: a.id })}
            >
              <div>
                <span className="eyebrow">
                  APP-{String(a.number).padStart(6, "0")}
                </span>
                <strong>{a.version?.title ?? a.form.title}</strong>
                <small>
                  {review && a.applicant?.username && (
                    <>{a.applicant.username} · </>
                  )}
                  {a.submittedAt ? "Submitted" : "Updated"}{" "}
                  {new Date(a.submittedAt ?? a.updatedAt).toLocaleDateString(
                    "en-AU",
                  )}
                </small>
              </div>
              <ApplicationStatus status={a.status} />
              <ArrowUpRight size={17} aria-hidden />
            </button>
          ))}
          {!list.isPending && visible.length === 0 && (
            <div className="application-empty">
              <Inbox size={30} />
              <h3>
                {search || statusFilter !== "ALL"
                  ? "No matching applications"
                  : "Nothing here yet"}
              </h3>
              <p>
                {search || statusFilter !== "ALL"
                  ? "Try another search or status filter."
                  : review
                    ? "Applications available to your reviewer roles will appear here."
                    : "Browse open forms to start your first application."}
              </p>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
function ApplicationDetail({
  id,
  session,
  review,
  onBack,
}: {
  id: string;
  session: AuthSession;
  review: boolean;
  onBack: () => void;
}) {
  const client = useQueryClient(),
    detail = useQuery({
      queryKey: ["application", id],
      queryFn: () => request<Submission>(`/v1/applications/${id}`),
      refetchInterval: 15000,
    }),
    [answers, setAnswers] = useState<Record<string, unknown>>({}),
    [error, setError] = useState<unknown>(),
    [busy, setBusy] = useState(false),
    [saved, setSaved] = useState(""),
    [persisted, setPersisted] = useState<string | null>(null),
    [saveState, setSaveState] = useState(""),
    [showErrors, setShowErrors] = useState(false),
    [answerReview, setAnswerReview] = useState(false),
    [message, setMessage] = useState(""),
    [internal, setInternal] = useState(false),
    [reason, setReason] = useState(""),
    [success, setSuccess] = useState(""),
    [uploads, setUploads] = useState<Submission["files"]>([]),
    [withdraw, setWithdraw] = useState(false),
    [deleting, setDeleting] = useState(false);
  const detailRef = useRef<HTMLElement>(null);
  const scrolledToDetail = useRef(false);
  const saving = useRef<Promise<unknown> | null>(null),
    ready = useRef(false),
    data = detail.data;
  useEffect(() => {
    if (data && !scrolledToDetail.current) {
      detailRef.current?.scrollIntoView({ block: "start" });
      scrolledToDetail.current = true;
    }
  }, [data]);
  const editable =
    !!data &&
    data.userId === session.user.id &&
    ["DRAFT", "MORE_INFO"].includes(data.status);
  useEffect(() => {
    if (data && (!ready.current || !editable)) {
      setAnswers(data.answers ?? {});
      setPersisted(JSON.stringify(data.answers ?? {}));
      setUploads(data.files ?? []);
      ready.current = true;
    }
  }, [data, editable]);
  useEffect(() => {
    if (
      !editable ||
      !ready.current ||
      busy ||
      persisted === null ||
      JSON.stringify(answers) === persisted
    )
      return;
    setSaveState("Unsaved changes");
    const timer = setTimeout(() => {
      const task = async () => {
        await saving.current?.catch(() => {});
        setSaveState("Saving…");
        await request(
          `/v1/applications/${id}`,
          "PATCH",
          { answers, submit: false },
          session.csrfToken,
        );
        setPersisted(JSON.stringify(answers));
        setSaveState("Saved");
        setSaved(new Date().toLocaleTimeString());
      };
      const promise = task();
      saving.current = promise;
      void promise
        .catch((error) => {
          setError(error);
          setSaveState("Not saved — retry with Save draft");
        })
        .finally(() => {
          if (saving.current === promise) saving.current = null;
        });
    }, 1200);
    return () => clearTimeout(timer);
  }, [answers, editable, busy, id, session.csrfToken, persisted]);
  const dirty =
    editable && persisted !== null && JSON.stringify(answers) !== persisted;
  useUnsavedApplicationChanges(dirty);
  async function leave() {
    if (busy) return;
    if (dirty) {
      try {
        await action(`/v1/applications/${id}`, "PATCH", {
          answers,
          submit: false,
        });
        setPersisted(JSON.stringify(answers));
      } catch {
        return;
      }
    }
    onBack();
  }
  async function action(path: string, method: string, payload: unknown) {
    setBusy(true);
    setError(undefined);
    try {
      await saving.current?.catch(() => {});
      const result = await request<{ confirmation?: string }>(
        path,
        method,
        payload,
        session.csrfToken,
      );
      await detail.refetch();
      await client.invalidateQueries({ queryKey: ["applications"] });
      return result;
    } catch (error) {
      setError(error);
      throw error;
    } finally {
      setBusy(false);
    }
  }
  async function save(event: FormEvent, submit: boolean) {
    event.preventDefault();
    if (!data) return;
    const error = validateApplicationAnswers(
      data.version.questions,
      answers,
      submit,
    );
    if (error) {
      setShowErrors(true);
      setAnswerReview(false);
      setError(new Error("Check the highlighted answers before continuing."));
      const first = Object.keys(
        answerErrors(data.version.questions, answers),
      )[0];
      requestAnimationFrame(() =>
        document.getElementById(`answer-${first}`)?.focus(),
      );
      return;
    }
    if (submit && !answerReview) {
      setShowErrors(false);
      setAnswerReview(true);
      detailRef.current?.scrollIntoView({ block: "start" });
      setError(undefined);
      return;
    }
    try {
      const result = await action(`/v1/applications/${id}`, "PATCH", {
        answers,
        submit,
      });
      setPersisted(JSON.stringify(answers));
      setSaved(new Date().toLocaleTimeString());
      setSaveState("Saved");
      setSuccess(
        submit
          ? (result?.confirmation ?? "Application submitted.")
          : "Draft saved.",
      );
    } catch (error) {
      setError(error);
    }
  }
  async function upload(questionId: string, selected: FileList | null) {
    if (!selected) return;
    setBusy(true);
    setError(undefined);
    try {
      const ids = Array.isArray(answers[questionId])
        ? [...(answers[questionId] as string[])]
        : [];
      for (const file of Array.from(selected)) {
        if (file.size > 5 * 1024 * 1024)
          throw new Error("Files must be no larger than 5 MiB.");
        const encoded = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result).split(",")[1]);
          reader.onerror = () => reject(new Error("Unable to read file."));
          reader.readAsDataURL(file);
        });
        const stored = await request<Submission["files"][number]>(
          `/v1/applications/${id}/files`,
          "POST",
          { questionId, name: file.name, data: encoded },
          session.csrfToken,
        );
        ids.push(stored.id);
        setUploads((old) => [...old, stored]);
        setAnswers((old) => ({ ...old, [questionId]: [...ids] }));
      }
      setAnswers((old) => ({ ...old, [questionId]: ids }));
    } catch (error) {
      setError(error);
    } finally {
      setBusy(false);
    }
  }
  if (!data)
    return (
      <>
        <ErrorNotice error={detail.error} />
        {!detail.error && <p role="status">Loading application…</p>}
        {detail.error && (
          <button className="button" onClick={() => void detail.refetch()}>
            Retry loading application
          </button>
        )}
        <button className="button" onClick={onBack}>
          Back
        </button>
      </>
    );
  const progress = answerProgress(data.version.questions, answers);
  const fieldErrors = showErrors
    ? answerErrors(data.version.questions, answers)
    : {};
  const isReviewer = review && data.canReview && data.status !== "DRAFT";
  const fullReview = isReviewer && (data.fullReview ?? true);
  const canAccept =
    data.canAccept ??
    (session.isOwner || session.permissions.includes("applications.accept"));
  return (
    <section ref={detailRef} className="portal-panel application-detail">
      <button
        className="text-button"
        disabled={busy}
        onClick={() => void leave()}
      >
        ← All applications
      </button>
      <span className="eyebrow">
        APP-{String(data.number).padStart(6, "0")} · Form version{" "}
        {data.version.version}
      </span>
      <h2>{data.version.title}</h2>
      <p>{data.version.description}</p>
      <p>
        {data.applicant?.username} ·{" "}
        <strong className="application-status" data-status={data.status}>
          {data.status.replaceAll("_", " ")}
        </strong>
      </p>
      <ErrorNotice error={error ?? detail.error} />
      {success && (
        <p role="status" className="notice">
          {success}
        </p>
      )}
      {editable && (
        <div className="application-progress">
          <div>
            <strong>
              {answerReview ? "Review your application" : "Your answers"}
            </strong>
            <span>
              {progress.completed} of {progress.total} answered
            </span>
          </div>
          <progress
            aria-label="Answers completed"
            max={Math.max(progress.total, 1)}
            value={progress.completed}
          />
          <p>
            {answerReview
              ? "Check your answers below, then submit when you’re ready."
              : "Take your time. Your draft saves automatically while you work."}
          </p>
        </div>
      )}
      <form
        className="portal-form application-answer-form"
        noValidate
        onSubmit={(event) => void save(event, true)}
      >
        <QuestionFields
          questions={data.version.questions}
          answers={answers}
          disabled={!editable || answerReview}
          locked={busy}
          errors={fieldErrors}
          onChange={(key, value) => {
            setAnswers((old) => ({ ...old, [key]: value }));
            setError(undefined);
            setSuccess("");
          }}
          onUpload={(key, files) => void upload(key, files)}
          files={uploads}
        />
        {editable && (
          <div className="form-actions application-save-bar">
            {answerReview && (
              <button
                className="button"
                type="button"
                disabled={busy}
                onClick={() => setAnswerReview(false)}
              >
                Edit answers
              </button>
            )}
            <button
              className="button"
              disabled={busy}
              type="button"
              onClick={(event) => void save(event, false)}
            >
              Save draft
            </button>
            <button className="button primary" disabled={busy}>
              {busy
                ? "Saving…"
                : !answerReview
                  ? "Review application"
                  : data.status === "MORE_INFO"
                    ? "Resubmit application"
                    : "Submit application"}
            </button>
            <small role="status" aria-live="polite">
              {saveState && saveState !== "Saved"
                ? saveState
                : saved
                  ? `Saved at ${saved}`
                  : "Draft ready"}
            </small>
          </div>
        )}
      </form>
      {isReviewer &&
        ["SUBMITTED", "UNDER_REVIEW", "MORE_INFO"].includes(data.status) && (
          <div className="application-review-controls">
            <h3>Review actions</h3>
            {fullReview && (
              <>
                <p>
                  {data.reviewerId === session.user.id
                    ? "Claimed by you"
                    : data.reviewerId
                      ? "Assigned to a reviewer"
                      : "Unclaimed"}
                </p>
                <button
                  className="button"
                  disabled={busy || data.reviewerId === session.user.id}
                  onClick={() =>
                    void action(`/v1/staff/applications/${id}`, "PATCH", {
                      claim: true,
                      status: "UNDER_REVIEW",
                    }).catch(() => {})
                  }
                >
                  {data.reviewerId === session.user.id
                    ? "Claimed by you"
                    : "Claim for review"}
                </button>
              </>
            )}
            <label>
              {fullReview
                ? "Personal note or request for information"
                : "Acceptance note"}
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={6000}
              />
            </label>
            <details className="application-outcome-preview">
              <summary>
                {fullReview
                  ? "Accepted & denied message presets"
                  : "Acceptance message preset"}
              </summary>
              <p>
                <strong>Accepted:</strong> {data.form.acceptedMessage}
              </p>
              {fullReview && (
                <p>
                  <strong>Denied:</strong> {data.form.deniedMessage}
                </p>
              )}
            </details>
            <p>
              {fullReview ? "Accept or deny" : "Accepting"} sends the form’s
              message preset and your personal note to the applicant by Discord
              DM.
            </p>
            <div className="form-actions">
              {[
                ...(fullReview ? ["UNDER_REVIEW", "MORE_INFO"] : []),
                ...(canAccept ? ["ACCEPTED"] : []),
                ...(fullReview &&
                (session.isOwner ||
                  session.permissions.includes("applications.reject"))
                  ? ["REJECTED"]
                  : []),
              ].map((status) => (
                <button
                  className="button"
                  key={status}
                  disabled={busy}
                  onClick={() => {
                    if (
                      (status === "ACCEPTED" || status === "REJECTED") &&
                      !window.confirm(
                        status === "ACCEPTED"
                          ? "Accept this application and notify the applicant?"
                          : "Deny this application and notify the applicant?",
                      )
                    )
                      return;
                    void action(`/v1/staff/applications/${id}`, "PATCH", {
                      status,
                      reason,
                    })
                      .then(() => setReason(""))
                      .catch(() => {});
                  }}
                >
                  {
                    {
                      UNDER_REVIEW: "Mark under review",
                      MORE_INFO: "Request more information",
                      ACCEPTED: "Accept application",
                      REJECTED: "Deny application",
                    }[status]
                  }
                </button>
              ))}
            </div>
          </div>
        )}
      {review && data.canReview && (data.fullReview ?? true) && (
        <div className="ticket-delete-controls">
          {deleting ? (
            <div role="alert">
              <p>
                Delete this application from the portal and review queues? Its
                history will be retained.
              </p>
              <div className="form-actions">
                <button
                  className="button"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    setError(undefined);
                    try {
                      await request(
                        `/v1/staff/applications/${id}`,
                        "DELETE",
                        undefined,
                        session.csrfToken,
                      );
                      await client.invalidateQueries({
                        queryKey: ["applications"],
                      });
                      onBack();
                    } catch (e) {
                      setError(e);
                      setBusy(false);
                    }
                  }}
                >
                  Confirm application deletion
                </button>
                <button
                  className="button"
                  disabled={busy}
                  onClick={() => setDeleting(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button className="button" onClick={() => setDeleting(true)}>
              Delete application
            </button>
          )}
        </div>
      )}
      <h3 className="application-history-heading">Updates and messages</h3>
      <div className="conversation-messages">
        {data.messages?.map((m) => (
          <article
            className={`message ${m.internal ? "private-note" : ""}`}
            key={m.id}
          >
            <div className="message-meta">
              <strong>{m.authorName}</strong>
              {m.internal && <span>Private staff note</span>}
              <time>{new Date(m.createdAt).toLocaleString()}</time>
            </div>
            <p>{m.body}</p>
          </article>
        ))}
      </div>
      {(fullReview ||
        (data.userId === session.user.id && data.status === "MORE_INFO")) && (
        <form
          className="portal-form"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await action(`/v1/applications/${id}/messages`, "POST", {
                body: message,
                internal: isReviewer && internal,
              });
              setMessage("");
            } catch (error) {
              setError(error);
            }
          }}
        >
          <label>
            {internal ? "Private note" : "Message"}
            <textarea
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={6000}
            />
          </label>
          {isReviewer &&
            (session.isOwner || session.permissions.includes("notes.view")) && (
              <label className="check-label">
                <input
                  type="checkbox"
                  checked={internal}
                  onChange={(e) => setInternal(e.target.checked)}
                />{" "}
                Internal note, hidden from applicant
              </label>
            )}
          <button className="button" disabled={busy || !message.trim()}>
            Send
          </button>
        </form>
      )}
      {data.userId === session.user.id &&
        ["DRAFT", "SUBMITTED", "UNDER_REVIEW", "MORE_INFO"].includes(
          data.status,
        ) && (
          <div className="ticket-delete-controls">
            {withdraw ? (
              <>
                <p>Withdraw this application? Its history will be retained.</p>
                <button
                  className="button"
                  disabled={busy}
                  onClick={() =>
                    void action(`/v1/applications/${id}/withdraw`, "POST", {})
                      .then(() => setWithdraw(false))
                      .catch(() => {})
                  }
                >
                  Confirm withdrawal
                </button>
                <button
                  className="text-button"
                  onClick={() => setWithdraw(false)}
                >
                  Cancel
                </button>
              </>
            ) : (
              <button className="text-button" onClick={() => setWithdraw(true)}>
                Withdraw application
              </button>
            )}
          </div>
        )}
    </section>
  );
}
