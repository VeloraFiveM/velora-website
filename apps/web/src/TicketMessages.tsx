import { Lock, Paperclip, Download } from "lucide-react";
import type { TicketMessageData } from "@velora/shared";
import { config } from "./config";
export default function TicketMessages({
  messages,
  currentDiscordId,
  hasOlder = false,
}: {
  messages: TicketMessageData[];
  currentDiscordId: string;
  hasOlder?: boolean;
}) {
  return (
    <div
      className="conversation-messages ticket-chat"
      aria-label="Ticket messages"
    >
      {hasOlder && (
        <p className="chat-history-note">
          Showing the latest 100 messages. The transcript contains the full
          conversation.
        </p>
      )}
      {messages.map((message, index) => {
        const own = message.author.discordId === currentDiscordId,
          date = new Date(message.createdAt),
          previous = index ? new Date(messages[index - 1].createdAt) : null;
        const initials = message.author.username
          .split(/[\s_.-]+/)
          .filter(Boolean)
          .slice(0, 2)
          .map((part) => part[0])
          .join("")
          .toUpperCase();
        return (
          <div key={message.id} className="chat-entry">
            {(!previous || previous.toDateString() !== date.toDateString()) && (
              <div className="chat-date">
                <span>
                  {date.toLocaleDateString(undefined, {
                    weekday: "short",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              </div>
            )}
            <article
              className={`chat-message ${own ? "chat-own" : "chat-other"} ${message.internal ? "chat-private" : ""}`}
            >
              <div className="chat-avatar" aria-hidden="true">
                {message.internal ? <Lock size={16} /> : initials || "?"}
              </div>
              <div className="chat-bubble">
                <div className="chat-message-meta">
                  <strong>{message.author.username}</strong>
                  {own && <span className="chat-you">You</span>}
                  <time
                    dateTime={message.createdAt}
                    title={date.toLocaleString()}
                  >
                    {date.toLocaleTimeString(undefined, {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </time>
                </div>
                {message.internal && (
                  <div className="chat-private-label">
                    <Lock size={12} />
                    Private staff note · not visible to the player
                  </div>
                )}
                <p className="chat-message-body">{message.body}</p>
                {!!message.attachments.length && (
                  <div className="chat-attachments">
                    {message.attachments.map((file) => (
                      <a
                        key={file.id}
                        href={`${config.apiUrl}/v1/attachments/${file.id}`}
                        className="chat-attachment"
                      >
                        <span className="chat-file-icon">
                          <Paperclip size={17} />
                        </span>
                        <span>
                          <strong>{file.originalName}</strong>
                          <small>
                            {(file.size / 1024).toFixed(0)} KB · Download
                            attachment
                          </small>
                        </span>
                        <Download size={15} />
                      </a>
                    ))}
                  </div>
                )}
                {message.source === "discord" && (
                  <small className="chat-legacy-source">
                    Imported from Discord
                  </small>
                )}
              </div>
            </article>
          </div>
        );
      })}
    </div>
  );
}
