import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { ArrowLeft, Download, Paperclip, Lock } from "lucide-react";
import { ticketLabel } from "@velora/shared";
import { api } from "../api";
import { config } from "../config";
import { PortalGate, ErrorNotice } from "../portal";
export default function Transcripts() {
  return (
    <PortalGate staff permission="transcripts.view">
      {() => <TranscriptLibrary />}
    </PortalGate>
  );
}
export function TranscriptLibrary() {
  const [params, setParams] = useSearchParams(),
    id = params.get("ticket"),
    [query, setQuery] = useState("");
  const list = useQuery({
    queryKey: ["transcripts"],
    queryFn: api.transcripts,
    refetchInterval: 30000,
  });
  const detail = useQuery({
    queryKey: ["transcript", id],
    queryFn: () => api.transcript(id!),
    enabled: !!id,
  });
  const ticket = detail.data;
  const shown = list.data?.filter((t) =>
    `${ticketLabel(t.number)} ${t.subject} ${t.owner.username} ${t.category.name}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  return (
    <>
      <div className="portal-heading">
        <div>
          <span className="eyebrow">MANAGEMENT ARCHIVE</span>
          <h1>Ticket transcripts.</h1>
          <p>
            Closed and deleted conversations, with evidence preserved. Your
            category access still applies.
          </p>
        </div>
      </div>
      <ErrorNotice error={list.error ?? detail.error} />
      {id ? (
        <section className="portal-panel">
          <button className="text-button" onClick={() => setParams({})}>
            <ArrowLeft size={16} /> All transcripts
          </button>
          {detail.isPending && <p role="status">Loading transcript…</p>}
          {ticket && (
            <>
              <div className="discord-section-heading">
                <div>
                  <span className="eyebrow">
                    {ticketLabel(ticket.number)} · {ticket.category.name}
                  </span>
                  <h2>{ticket.subject}</h2>
                  <p>
                    {ticket.owner.username} ·{" "}
                    {ticket.deletedAt
                      ? "Deleted from active tickets"
                      : ticket.status.replaceAll("_", " ")}
                  </p>
                </div>
                <a
                  className="button"
                  href={`${config.apiUrl}/v1/staff/transcripts/${ticket.id}/download`}
                >
                  <Download size={16} /> Full transcript
                </a>
              </div>
              {ticket.hasOlder && (
                <p className="muted">
                  Showing the latest 100 messages. Download the full transcript
                  for all messages.
                </p>
              )}
              <div className="conversation-messages">
                {ticket.messages?.map((message) => (
                  <article
                    className={`message ${message.internal ? "private-note" : ""}`}
                    key={message.id}
                  >
                    <div className="message-meta">
                      <strong>{message.author.username}</strong>
                      {message.internal && (
                        <span>
                          <Lock size={12} /> Internal note
                        </span>
                      )}
                      <span>{message.source}</span>
                      <time>
                        {new Date(message.createdAt).toLocaleString()}
                      </time>
                    </div>
                    <p>{message.body}</p>
                    {message.attachments.map((file) => (
                      <a
                        key={file.id}
                        className="evidence-link"
                        href={`${config.apiUrl}/v1/attachments/${file.id}`}
                      >
                        <Paperclip size={14} />
                        {file.originalName}
                      </a>
                    ))}
                  </article>
                ))}
              </div>
            </>
          )}
        </section>
      ) : (
        <section className="portal-panel">
          <label className="transcript-search">
            Search transcripts
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ticket number, subject, player or category"
            />
          </label>
          {list.isPending && <p role="status">Loading transcripts…</p>}
          {shown?.length === 0 && (
            <p>
              No matching transcripts. Closed or deleted tickets will appear
              here.
            </p>
          )}
          <div className="discord-category-list">
            {shown?.map((ticket) => (
              <button
                className="transcript-row"
                key={ticket.id}
                onClick={() => setParams({ ticket: ticket.id })}
              >
                <div>
                  <span className="eyebrow">
                    {ticketLabel(ticket.number)} · {ticket.category.name}
                  </span>
                  <strong>{ticket.subject}</strong>
                  <small>
                    {ticket.owner.username} ·{" "}
                    {new Date(ticket.updatedAt).toLocaleString()}
                  </small>
                </div>
                <span className="tag">
                  {ticket.deletedAt
                    ? "Deleted"
                    : ticket.status.replaceAll("_", " ")}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
