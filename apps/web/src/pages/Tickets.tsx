import { isTablet } from "../tablet";
import TicketMessages from "../TicketMessages";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Plus,
  ArrowLeft,
  Send,
  Paperclip,
  Download,
  Lock,
  MessageSquare,
  Search,
} from "lucide-react";
import {
  ticketLabel,
  ticketStatuses,
  ticketPriorities,
  type AuthSession,
} from "@velora/shared";
import { api, request } from "../api";
import { config } from "../config";
import { PortalGate, ErrorNotice } from "../portal";
const formSchema = z.object({
  categoryId: z.string().min(1, "Choose a category."),
  subject: z.string().trim().min(5, "Use at least five characters.").max(160),
  body: z
    .string()
    .trim()
    .min(10, "Add at least ten characters of detail.")
    .max(12000),
});
type NewTicket = z.infer<typeof formSchema>;
export default function Tickets({ staff = false }: { staff?: boolean }) {
  return (
    <PortalGate staff={staff}>
      {(session) => <TicketWorkspace session={session} staff={staff} />}
    </PortalGate>
  );
}
function TicketWorkspace({
  session,
  staff,
}: {
  session: AuthSession;
  staff: boolean;
}) {
  const [params, setParams] = useSearchParams(),
    id = params.get("ticket"),
    claimed = params.get("claimed") === "me",
    [creating, setCreating] = useState(false),
    [search, setSearch] = useState(""),
    [filter, setFilter] = useState("ALL");
  const list = useQuery({
    queryKey: ["tickets", staff, claimed],
    queryFn: () => api.tickets(staff, claimed),
    refetchInterval: 10000,
  });
  const tickets = (list.data ?? []).filter(
    (t) =>
      (filter === "ALL" || t.status === filter) &&
      `${ticketLabel(t.number)} ${t.subject} ${t.owner.username} ${t.category.name}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const select = (ticketId: string) => {
    setCreating(false);
    setParams({ ticket: ticketId, ...(claimed ? { claimed: "me" } : {}) });
  };
  return (
    <>
      <div className="portal-heading">
        <div>
          <span className="eyebrow">
            {staff ? "STAFF WORKSPACE" : "COMMUNITY SUPPORT"}
          </span>
          <h1>{staff ? "The staff desk." : "Let’s talk."}</h1>
          <p>
            {staff
              ? "Only tickets your mapped roles can access appear here."
              : "Your conversations with the Velora team, kept in one place."}
          </p>
        </div>
        {!staff && (
          <button
            className="button primary"
            onClick={() => {
              setCreating(true);
              setParams({});
            }}
          >
            <Plus size={18} /> New ticket
          </button>
        )}
      </div>
      {staff && (
        <div className="management-tabs">
          <button
            className="button"
            aria-pressed={!claimed}
            onClick={() => setParams({})}
          >
            All tickets
          </button>
          <button
            className="button"
            aria-pressed={claimed}
            onClick={() => setParams({ claimed: "me" })}
          >
            Claimed By Me
          </button>
        </div>
      )}
      {creating ? (
        <NewTicketForm
          session={session}
          onCreated={select}
          onCancel={() => setCreating(false)}
        />
      ) : id ? (
        <Conversation id={id} session={session} onBack={() => setParams({})} />
      ) : (
        <>
          <div className="ticket-toolbar">
            <label className="search">
              <Search size={18} />
              <input
                aria-label="Search tickets"
                placeholder="Search tickets…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            <select
              aria-label="Filter ticket status"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="ALL">All statuses</option>
              {ticketStatuses.map((value) => (
                <option key={value} value={value}>
                  {value.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </div>
          <ErrorNotice error={list.error} />
          {list.isPending ? (
            <p role="status">Loading conversations…</p>
          ) : tickets.length ? (
            <div className="ticket-table">
              <div className="ticket-table-head">
                <span>Conversation</span>
                <span>Category</span>
                <span>Status</span>
                <span>Updated</span>
              </div>
              {tickets.map((ticket) => (
                <button
                  className="ticket-row"
                  key={ticket.id}
                  onClick={() => select(ticket.id)}
                >
                  <span>
                    <small>
                      {ticketLabel(ticket.number)}
                      {staff ? ` · ${ticket.owner.username}` : ""}
                    </small>
                    <strong>{ticket.subject}</strong>
                  </span>
                  <span>{ticket.category.name}</span>
                  <span>
                    <span
                      className={`status-badge status-${ticket.status.toLowerCase()}`}
                    >
                      {ticket.status.replaceAll("_", " ")}
                    </span>
                    {staff && (
                      <small>
                        {ticket.priority} ·{" "}
                        {ticket.assignedTo?.username ?? "Unclaimed"}
                      </small>
                    )}
                  </span>
                  <time dateTime={ticket.updatedAt}>
                    {new Date(ticket.updatedAt).toLocaleDateString()}
                  </time>
                </button>
              ))}
            </div>
          ) : (
            <div className="portal-empty">
              <MessageSquare size={32} />
              <h2>
                {search || filter !== "ALL"
                  ? "No matching conversations."
                  : staff
                    ? "Your queue is clear."
                    : "We’re here when you need us."}
              </h2>
              <p>
                {staff
                  ? "New tickets in your authorised categories appear automatically."
                  : "Open a ticket and our team will get back to you here."}
              </p>
            </div>
          )}
        </>
      )}
    </>
  );
}
function NewTicketForm({
  session,
  onCreated,
  onCancel,
}: {
  session: AuthSession;
  onCreated: (id: string) => void;
  onCancel: () => void;
}) {
  const categories = useQuery({
      queryKey: ["ticket-categories"],
      queryFn: api.categories,
    }),
    client = useQueryClient(),
    [error, setError] = useState<unknown>(),
    key = useRef(crypto.randomUUID());
  const form = useForm<NewTicket>({
    resolver: zodResolver(formSchema),
    defaultValues: { categoryId: "", subject: "", body: "" },
  });
  const submit = form.handleSubmit(async (value) => {
    setError(undefined);
    try {
      const ticket = await request<{ id: string }>(
        "/v1/tickets",
        "POST",
        { ...value, clientKey: key.current },
        session.csrfToken,
      );
      await client.invalidateQueries({ queryKey: ["tickets"] });
      onCreated(ticket.id);
    } catch (error) {
      setError(error);
    }
  });
  return (
    <section className="portal-panel">
      <button className="text-button" onClick={onCancel}>
        <ArrowLeft size={16} /> Back to conversations
      </button>
      <h2>Open a conversation.</h2>
      <p>
        Choose the category that best fits. Add evidence in the conversation
        after creating your ticket.
      </p>
      <form className="portal-form" onSubmit={submit}>
        <label>
          Category
          <select {...form.register("categoryId")}>
            <option value="">Select a category</option>
            {categories.data?.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <small>{form.formState.errors.categoryId?.message}</small>
        </label>
        <label>
          Subject
          <input
            {...form.register("subject")}
            maxLength={160}
            placeholder="A short summary of what you need help with"
          />
          <small>{form.formState.errors.subject?.message}</small>
        </label>
        <label>
          What happened?
          <textarea
            {...form.register("body")}
            rows={7}
            maxLength={12000}
            placeholder="Include the details our team will need to help you."
          />
          <small>{form.formState.errors.body?.message}</small>
        </label>
        <ErrorNotice error={error ?? categories.error} />
        <button
          className="button primary"
          disabled={form.formState.isSubmitting || !categories.data?.length}
        >
          {form.formState.isSubmitting ? "Opening ticket…" : "Create ticket"}
          <Send size={17} />
        </button>
      </form>
    </section>
  );
}
function Conversation({
  id,
  session,
  onBack,
}: {
  id: string;
  session: AuthSession;
  onBack: () => void;
}) {
  const client = useQueryClient(),
    detail = useQuery({
      queryKey: ["ticket", id],
      queryFn: () => api.ticket(id),
      refetchInterval: 15000,
    }),
    [confirmDelete, setConfirmDelete] = useState(false),
    [body, setBody] = useState(""),
    [internal, setInternal] = useState(false),
    [busy, setBusy] = useState(false),
    [uploading, setUploading] = useState(false),
    [files, setFiles] = useState<
      { id: string; originalName: string; size: number }[]
    >([]),
    [error, setError] = useState<unknown>(),
    key = useRef(crypto.randomUUID());
  useEffect(() => {
    if (!config.apiUrl || isTablet) return;
    const events = new EventSource(
      `${config.apiUrl}/v1/tickets/${encodeURIComponent(id)}/events`,
      { withCredentials: true },
    );
    events.addEventListener("update", () => {
      void client.invalidateQueries({ queryKey: ["ticket", id] });
      void client.invalidateQueries({ queryKey: ["tickets"] });
    });
    events.addEventListener("revoked", () => {
      void client.invalidateQueries({ queryKey: ["ticket", id] });
      events.close();
    });
    return () => events.close();
  }, [id, client]);
  useEffect(() => {
    setBody("");
    setFiles([]);
    setInternal(false);
    setError(undefined);
    key.current = crypto.randomUUID();
  }, [id]);
  async function remove() {
    setBusy(true);
    setError(undefined);
    try {
      await request(
        `/v1/tickets/${encodeURIComponent(id)}`,
        "DELETE",
        undefined,
        session.csrfToken,
      );
      await client.invalidateQueries({ queryKey: ["tickets"] });
      await client.invalidateQueries({ queryKey: ["transcripts"] });
      onBack();
    } catch (error) {
      setError(error);
    } finally {
      setBusy(false);
    }
  }
  async function update(value: unknown) {
    setBusy(true);
    setError(undefined);
    try {
      await request(
        `/v1/tickets/${encodeURIComponent(id)}`,
        "PATCH",
        value,
        session.csrfToken,
      );
      await client.invalidateQueries({ queryKey: ["ticket", id] });
      await client.invalidateQueries({ queryKey: ["tickets"] });
    } catch (error) {
      setError(error);
    } finally {
      setBusy(false);
    }
  }
  async function send(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      await request(
        `/v1/tickets/${encodeURIComponent(id)}/messages`,
        "POST",
        {
          body: body.trim() || (files.length ? "Evidence attached." : ""),
          internal,
          clientKey: key.current,
          attachments: files.map((f) => f.id),
        },
        session.csrfToken,
      );
      setBody("");
      setFiles([]);
      key.current = crypto.randomUUID();
      await client.invalidateQueries({ queryKey: ["ticket", id] });
      await client.invalidateQueries({ queryKey: ["tickets"] });
    } catch (error) {
      setError(error);
    } finally {
      setBusy(false);
    }
  }
  async function upload(selected: FileList | null) {
    if (!selected) return;
    if (selected.length + files.length > 5) {
      setError(new Error("Attach up to five files per reply."));
      return;
    }
    setUploading(true);
    setError(undefined);
    try {
      for (const file of Array.from(selected)) {
        if (file.size > 5 * 1024 * 1024)
          throw new Error(`${file.name} exceeds 5 MiB.`);
        const data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result).split(",")[1]);
          reader.onerror = () => reject(new Error("Could not read this file."));
          reader.readAsDataURL(file);
        });
        const saved = await request<{
          id: string;
          originalName: string;
          size: number;
        }>(
          `/v1/tickets/${encodeURIComponent(id)}/attachments`,
          "POST",
          { name: file.name, data },
          session.csrfToken,
        );
        setFiles((current) => [...current, saved]);
      }
    } catch (error) {
      setError(error);
    } finally {
      setUploading(false);
    }
  }
  const ticket = detail.data;
  return (
    <section className="ticket-conversation">
      <div className="conversation-top">
        <button className="text-button" onClick={onBack}>
          <ArrowLeft size={16} /> All conversations
        </button>
        {ticket && !isTablet && (
          <a
            className="text-button"
            href={`${config.apiUrl}/v1/tickets/${id}/transcript`}
          >
            <Download size={15} /> Transcript
          </a>
        )}
      </div>
      <ErrorNotice error={detail.error} />
      {!ticket ? (
        detail.isPending ? (
          <p role="status">Loading ticket…</p>
        ) : null
      ) : (
        <>
          <div className="conversation-heading">
            <span className="eyebrow">
              {ticketLabel(ticket.number)} · {ticket.category.name}
            </span>
            <h2>{ticket.subject}</h2>
            <div className="conversation-meta">
              <span
                className={`status-badge status-${ticket.status.toLowerCase()}`}
              >
                {ticket.status.replaceAll("_", " ")}
              </span>
              <span>
                {ticket.assignedTo
                  ? `Assigned to ${ticket.assignedTo.username}`
                  : "Waiting to be claimed"}
              </span>
            </div>
          </div>
          {ticket.canStaff && (
            <div className="staff-controls">
              <button
                className="button"
                disabled={busy}
                onClick={() => void update({ claim: true })}
              >
                Claim ticket
              </button>
              <label>
                Status
                <select
                  disabled={busy}
                  aria-label="Change ticket status"
                  value={ticket.status}
                  onChange={(e) => void update({ status: e.target.value })}
                >
                  {ticketStatuses.map((status) => (
                    <option key={status} value={status}>
                      {status.replaceAll("_", " ")}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Priority
                <select
                  disabled={busy}
                  aria-label="Change ticket priority"
                  value={ticket.priority}
                  onChange={(e) => void update({ priority: e.target.value })}
                >
                  {ticketPriorities.map((priority) => (
                    <option key={priority}>{priority}</option>
                  ))}
                </select>
              </label>
            </div>
          )}
          {ticket.canStaff && (
            <div className="ticket-delete-controls">
              {confirmDelete ? (
                <div role="alert">
                  <p>
                    Delete this ticket from active queues? Its transcript and
                    evidence will remain available to authorised management.
                    Discord keeps notifications only; the conversation remains
                    in the website archive.
                  </p>
                  <button
                    className="button"
                    disabled={busy}
                    onClick={() => void remove()}
                  >
                    {busy ? "Deleting…" : "Confirm ticket deletion"}
                  </button>
                  <button
                    className="text-button"
                    onClick={() => setConfirmDelete(false)}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  className="text-button"
                  onClick={() => setConfirmDelete(true)}
                >
                  Delete ticket and retain transcript
                </button>
              )}
            </div>
          )}
          <TicketMessages
            messages={ticket.messages ?? []}
            currentDiscordId={session.user.discordId}
            hasOlder={ticket.hasOlder}
          />
          <ErrorNotice error={error} />
          {["CLOSED", "RESOLVED"].includes(ticket.status) ? (
            <div className="notice">
              <Lock size={20} />
              <p>
                This conversation is {ticket.status.toLowerCase()}. Authorised
                staff can reopen it if further help is needed.
              </p>
            </div>
          ) : (
            <form
              onSubmit={send}
              className={`reply-form ${internal ? "private-note" : ""}`}
            >
              <div className="reply-composer-heading">
                {internal ? <Lock size={16} /> : <MessageSquare size={16} />}{" "}
                {internal ? "Private staff note" : "Reply to this conversation"}
              </div>
              <label className="sr-only" htmlFor="ticket-reply">
                {internal ? "Internal note" : "Your reply"}
              </label>
              <textarea
                id="ticket-reply"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                maxLength={12000}
                rows={4}
                placeholder={
                  internal
                    ? "Private note — never visible to the player."
                    : "Write your reply…"
                }
              />
              {files.length > 0 && (
                <div className="pending-files">
                  {files.map((file) => (
                    <span key={file.id}>
                      <Paperclip size={13} />
                      {file.originalName}
                      <button
                        type="button"
                        aria-label={`Remove ${file.originalName}`}
                        onClick={() =>
                          setFiles((current) =>
                            current.filter((f) => f.id !== file.id),
                          )
                        }
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div className="reply-actions">
                {!isTablet && (
                  <label className="upload-control">
                    <Paperclip size={17} />
                    {uploading ? "Uploading…" : "Add evidence"}
                    <input
                      type="file"
                      multiple
                      accept="image/png,image/jpeg,image/webp,application/pdf"
                      disabled={uploading || busy}
                      onChange={(e) => {
                        void upload(e.target.files);
                        e.target.value = "";
                      }}
                    />
                  </label>
                )}
                {ticket.canStaff &&
                  (session.isOwner ||
                    session.permissions.includes("notes.view")) && (
                    <label className="check-label">
                      <input
                        type="checkbox"
                        checked={internal}
                        onChange={(e) => setInternal(e.target.checked)}
                      />
                      Internal note
                    </label>
                  )}
                <button
                  className="button primary"
                  disabled={
                    busy || uploading || (!body.trim() && !files.length)
                  }
                >
                  {busy
                    ? "Sending…"
                    : internal
                      ? "Save private note"
                      : "Send reply"}
                  <Send size={15} />
                </button>
              </div>
              <small>
                PNG, JPEG, WebP or PDF · 5 MiB each · up to 5 files ·{" "}
                {body.length.toLocaleString()} / 12,000 characters
              </small>
            </form>
          )}
        </>
      )}
    </section>
  );
}
