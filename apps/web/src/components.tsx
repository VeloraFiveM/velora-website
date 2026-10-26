import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowUpRight, Radio, RefreshCw } from "lucide-react";
import { api } from "./api";
import { config } from "./config";
export function CommunityActions() {
  return (
    <div className="actions">
      {config.connect ? (
        <a className="button primary" href={config.connect}>
          Enter the city <ArrowUpRight size={18} />
        </a>
      ) : (
        <Link className="button primary" to="/join">
          Enter the city <ArrowUpRight size={18} />
        </Link>
      )}
      {config.discord ? (
        <a
          className="button"
          href={config.discord}
          target="_blank"
          rel="noreferrer"
        >
          Join our Discord <ArrowUpRight size={18} />
        </a>
      ) : (
        <Link className="button" to="/join">
          Join our Discord <ArrowUpRight size={18} />
        </Link>
      )}
    </div>
  );
}
export function ServerStatus() {
  const status = useQuery({
    queryKey: ["server"],
    queryFn: api.status,
    refetchInterval: 60000,
    enabled: !!config.apiUrl,
  });
  const data = status.data;
  return (
    <div className="server-status">
      <Radio size={16} />
      <span
        className={`status-dot ${data?.state === "online" ? "online" : ""}`}
      />
      <strong>
        {status.isFetching && !data
          ? "Checking server"
          : data?.state === "online"
            ? "City online"
            : data?.state === "offline"
              ? "City offline"
              : "Server status unavailable"}
      </strong>
      {data?.state === "online" && (
        <span>
          {data.players ?? "—"} / {data.capacity ?? "—"} players
        </span>
      )}
      {data?.updatedAt && (
        <time
          dateTime={data.updatedAt}
          title={new Date(data.updatedAt).toLocaleString()}
        >
          Updated{" "}
          {new Date(data.updatedAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </time>
      )}
    </div>
  );
}
export function News({ full = false }: { full?: boolean }) {
  const query = useQuery({
    queryKey: ["announcements"],
    queryFn: api.announcements,
    enabled: !!config.apiUrl,
  });
  const entries = [...(query.data ?? [])].sort(
    (a, b) =>
      Number(b.pinned) - Number(a.pinned) ||
      Date.parse(b.publishedAt) - Date.parse(a.publishedAt),
  );
  return (
    <>
      {query.isPending && query.isFetching ? (
        <div className="empty" role="status">
          Loading community news…
        </div>
      ) : query.isError ? (
        <div className="empty" role="status">
          <h3>News is temporarily unavailable</h3>
          <p>We couldn’t reach the community service.</p>
          <button className="text-button" onClick={() => void query.refetch()}>
            <RefreshCw size={15} /> Try again
          </button>
        </div>
      ) : entries.length ? (
        <div className="news-grid">
          {(full ? entries : entries.slice(0, 3)).map((item) => (
            <article className="card" key={item.id}>
              <span className="eyebrow">
                {item.pinned ? "PINNED · " : ""}
                {item.category}
              </span>
              <h3>{item.title}</h3>
              <time dateTime={item.publishedAt}>
                {new Date(item.publishedAt).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </time>
              <p className="preserve">{item.body}</p>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty">
          <span className="eyebrow">THE COMMUNITY NOTICEBOARD</span>
          <h3>A new chapter is taking shape.</h3>
          <p>
            {config.apiUrl
              ? "No announcements have been published yet."
              : "Official announcements will appear here when the community service is connected."}
          </p>
        </div>
      )}
    </>
  );
}
