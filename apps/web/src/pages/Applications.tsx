import { FileText, ArrowUpRight, Inbox } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { AuthSession } from "@velora/shared";
import { validateApplicationAnswers } from "@velora/shared";
import { request } from "../api";
import { PortalGate, ErrorNotice } from "../portal";
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
  return (
    <div className="page applications-ui applications-catalog">
      <div className="page-heading">
        <span className="eyebrow">YOUR NEXT CHAPTER</span>
        <h1>Applications.</h1>
        <p>
          Explore open opportunities and track your submissions in the Player
          Portal.
        </p>
        <Link className="button" to="/my-applications">
          My Applications
        </Link>
      </div>
      <ErrorNotice error={forms.error} />
      {forms.isPending && <p>Loading applications…</p>}
      <div className="application-catalog-grid">
        {forms.data?.map((form) => (
          <article className="application-opportunity" key={form.id}>
            <div className="application-card-top">
              <div className="application-card-icon">
                <FileText size={20} />
              </div>
              <span
                className={`application-status ${form.accepting ? "is-open" : "is-closed"}`}
              >
                {form.accepting ? "Open" : "Closed"}
              </span>
            </div>
            <span className="eyebrow">{form.category}</span>
            <h2>{form.title}</h2>
            <p>{form.description}</p>
            {form.accepting && (
              <Link
                className="button primary"
                to={`/my-applications?form=${form.id}`}
              >
                Apply now <ArrowUpRight size={16} />
              </Link>
            )}
          </article>
        ))}
      </div>
      {forms.data?.length === 0 && (
        <section className="portal-panel">
          <Inbox size={30} />
          <h2>No applications published yet.</h2>
          <p>
            Available forms will appear here when community leadership publishes
            them.
          </p>
        </section>
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
    <div className="applications-ui">
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
      <ErrorNotice error={error ?? list.error} />
      {id ? (
        <ApplicationDetail
          key={id}
          id={id}
          session={session}
          review={review}
          onBack={() => setParams({})}
        />
      ) : formId ? (
        <section className="portal-panel application-list-panel">
          <h2>{chosen?.title ?? "Start application"}</h2>
          <p>{chosen?.description}</p>
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
            {starting ? "Opening draft…" : "Start or continue draft"}
          </button>
          <button className="text-button" onClick={() => setParams({})}>
            Cancel
          </button>
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
          {list.isPending && <p>Loading applications…</p>}
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
                <small>{new Date(a.updatedAt).toLocaleString()}</small>
              </div>
              <span className="application-status" data-status={a.status}>
                {a.status.replaceAll("_", " ")}
              </span>
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
    [message, setMessage] = useState(""),
    [internal, setInternal] = useState(false),
    [reason, setReason] = useState(""),
    [success, setSuccess] = useState(""),
    [uploads, setUploads] = useState<Submission["files"]>([]),
    [withdraw, setWithdraw] = useState(false);
  const saving = useRef<Promise<unknown> | null>(null),
    ready = useRef(false),
    data = detail.data;
  const editable =
    !!data &&
    data.userId === session.user.id &&
    ["DRAFT", "MORE_INFO"].includes(data.status);
  useEffect(() => {
    if (data && (!ready.current || !editable)) {
      setAnswers(data.answers ?? {});
      setUploads(data.files ?? []);
      ready.current = true;
    }
  }, [data, editable]);
  useEffect(() => {
    if (!editable || !ready.current || busy) return;
    const timer = setTimeout(() => {
      const task = async () => {
        await saving.current?.catch(() => {});
        await request(
          `/v1/applications/${id}`,
          "PATCH",
          { answers, submit: false },
          session.csrfToken,
        );
        setSaved(new Date().toLocaleTimeString());
      };
      const promise = task();
      saving.current = promise;
      void promise.catch(setError).finally(() => {
        if (saving.current === promise) saving.current = null;
      });
    }, 1200);
    return () => clearTimeout(timer);
  }, [answers, editable, busy, id, session.csrfToken]);
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
      setError(new Error(error));
      return;
    }
    try {
      const result = await action(`/v1/applications/${id}`, "PATCH", {
        answers,
        submit,
      });
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
        <p>Loading application…</p>
        <button className="button" onClick={onBack}>
          Back
        </button>
      </>
    );
  const isReviewer = review && data.canReview && data.status !== "DRAFT";
  return (
    <section className="portal-panel application-detail">
      <button className="text-button" onClick={onBack}>
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
      <form
        className="portal-form"
        onSubmit={(event) => void save(event, true)}
      >
        <QuestionFields
          questions={data.version.questions}
          answers={answers}
          disabled={!editable || busy}
          onChange={(key, value) => {
            setAnswers((old) => ({ ...old, [key]: value }));
            setError(undefined);
            setSuccess("");
          }}
          onUpload={(key, files) => void upload(key, files)}
          files={uploads}
        />
        {editable && (
          <div className="form-actions">
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
                : data.status === "MORE_INFO"
                  ? "Resubmit application"
                  : "Submit application"}
            </button>
            <small>
              {saved
                ? `Draft saved at ${saved}`
                : "Changes save automatically while editing."}
            </small>
          </div>
        )}
      </form>
      {isReviewer && (
        <div className="application-review-controls">
          <h3>Review actions</h3>
          <p>
            {data.reviewerId === session.user.id
              ? "Claimed by you"
              : data.reviewerId
                ? "Assigned to a reviewer"
                : "Unclaimed"}
          </p>
          <button
            className="button"
            disabled={busy}
            onClick={() =>
              void action(`/v1/staff/applications/${id}`, "PATCH", {
                claim: true,
                status: "UNDER_REVIEW",
              }).catch(() => {})
            }
          >
            Claim for review
          </button>
          <label>
            Decision reason / request for information
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={6000}
            />
          </label>
          <div className="form-actions">
            {[
              "UNDER_REVIEW",
              "MORE_INFO",
              ...(session.isOwner ||
              session.permissions.includes("applications.accept")
                ? ["ACCEPTED"]
                : []),
              ...(session.isOwner ||
              session.permissions.includes("applications.reject")
                ? ["REJECTED"]
                : []),
            ].map((status) => (
              <button
                className="button"
                key={status}
                disabled={busy}
                onClick={() =>
                  void action(`/v1/staff/applications/${id}`, "PATCH", {
                    status,
                    reason,
                  })
                    .then(() => setReason(""))
                    .catch(() => {})
                }
              >
                {status.replaceAll("_", " ")}
              </button>
            ))}
          </div>
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
      {(isReviewer || data.status === "MORE_INFO") && (
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
