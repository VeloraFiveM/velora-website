import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { AuthSession } from "@velora/shared";
import { request } from "../api";
import { ErrorNotice } from "../portal";
import "./visitors.css";

type Visit = {
  id: string;
  visitor: string;
  path: string;
  referrer: string | null;
  device: string;
  automated: boolean;
  createdAt: string;
  joinedAt: string | null;
};
type VisitorLog = {
  enabled: boolean;
  stats: {
    total: number;
    unique: number;
    browser: number;
    today: number;
    joined: number;
  };
  visits: Visit[];
};
const dateFormat = new Intl.DateTimeFormat("en-AU", {
  dateStyle: "medium",
  timeStyle: "medium",
  timeZone: "Australia/Sydney",
});

export default function Visitors({ session }: { session: AuthSession }) {
  const [search, setSearch] = useState("");
  const [traffic, setTraffic] = useState("all");
  const [joined, setJoined] = useState(false);
  const queryClient = useQueryClient();
  const log = useQuery({
    queryKey: ["owner-visitors"],
    queryFn: () => request<VisitorLog>("/v1/owner/visitors"),
  });
  const remove = useMutation({
    mutationFn: (id?: string) =>
      request(
        `/v1/owner/visitors${id ? `/${id}` : ""}`,
        "DELETE",
        undefined,
        session.csrfToken,
      ),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["owner-visitors"] }),
  });
  const rows = (log.data?.visits ?? []).filter(
    (row) =>
      (traffic === "all" || row.automated === (traffic === "automated")) &&
      (!joined || row.joinedAt) &&
      [row.visitor, row.path, row.referrer, row.device].some((value) =>
        value?.toLowerCase().includes(search.trim().toLowerCase()),
      ),
  );
  const pageCounts = new Map<string, number>();
  for (const visit of log.data?.visits ?? []) {
    pageCounts.set(visit.path, (pageCounts.get(visit.path) ?? 0) + 1);
  }
  const topPages = [...pageCounts].sort((a, b) => b[1] - a[1]);
  const stats = log.data?.stats;
  const cards = [
    ["Total visits", stats?.total, "Last 30 days"],
    ["Unique connections", stats?.unique, "Distinct visitor IDs"],
    ["Browser visits", stats?.browser, "Excludes detected automation"],
    ["Today", stats?.today, "Sydney time"],
    ["Join clicks", stats?.joined, "FiveM link clicks"],
  ] as const;
  function exportCsv() {
    const csvCell = (value: string) =>
      `"${(/^[=+\-@\t\r]/.test(value) ? "'" + value : value).replaceAll('"', '""')}"`;
    const lines = [
      [
        "Time (UTC)",
        "Visitor ID",
        "Page",
        "Device",
        "Traffic",
        "Join click",
        "Referrer",
      ],
      ...rows.map((row) => [
        row.createdAt,
        row.visitor,
        row.path,
        row.device,
        row.automated ? "Automated" : "Browser",
        row.joinedAt ?? "",
        row.referrer ?? "Direct",
      ]),
    ];
    const url = URL.createObjectURL(
      new Blob(
        [lines.map((line) => line.map(csvCell).join(",")).join("\r\n")],
        { type: "text/csv;charset=utf-8" },
      ),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "velora-visits.csv";
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <div className="visitors">
      <div className="visitor-toolbar">
        <p>playvelora.xyz · Rolling 30-day log</p>
        <div className="actions">
          <button
            className="button"
            disabled={log.isFetching}
            onClick={() => void log.refetch()}
          >
            Refresh
          </button>
          <button
            className="button"
            disabled={!rows.length}
            onClick={exportCsv}
          >
            Export CSV
          </button>
          <button
            className="button visitor-danger"
            disabled={remove.isPending || !stats?.total}
            onClick={() => {
              if (window.confirm("Clear all recorded visits?"))
                remove.mutate(undefined);
            }}
          >
            Clear log
          </button>
        </div>
      </div>
      <ErrorNotice error={log.error ?? remove.error} />
      {log.data && !log.data.enabled && (
        <p>Visit collection is awaiting server configuration.</p>
      )}
      <div className="visitor-stats">
        {cards.map(([label, value, detail]) => (
          <div className="visitor-card" key={label}>
            <span>{label}</span>
            <strong>{value?.toLocaleString() ?? "—"}</strong>
            <small>{detail}</small>
          </div>
        ))}
      </div>
      <section className="visitor-panel">
        <div className="visitor-toolbar">
          <h2>Recent visits</h2>
          <input
            aria-label="Search visits"
            placeholder="Search visitor, page, device, referrer…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div className="visitor-filters">
          <select
            aria-label="Traffic filter"
            value={traffic}
            onChange={(event) => setTraffic(event.target.value)}
          >
            <option value="all">All traffic</option>
            <option value="browser">Browser visits</option>
            <option value="automated">Detected automation</option>
          </select>
          <label>
            <input
              type="checkbox"
              checked={joined}
              onChange={(event) => setJoined(event.target.checked)}
            />{" "}
            Join clicks only
          </label>
          <small>
            {rows.length} of {log.data?.visits.length ?? 0} recent visits · up
            to 500
          </small>
        </div>
        <div className="visitor-table">
          <table>
            <thead>
              <tr>
                <th>Time (Sydney)</th>
                <th>Visitor ID</th>
                <th>Page</th>
                <th>Device</th>
                <th>Join click</th>
                <th>Referrer</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{dateFormat.format(new Date(row.createdAt))}</td>
                  <td>
                    <code>{row.visitor}</code>
                  </td>
                  <td>{row.path === "/other" ? "Other page" : row.path}</td>
                  <td>{row.device}</td>
                  <td>{row.joinedAt ? "Yes" : "—"}</td>
                  <td>{row.referrer ?? "Direct"}</td>
                  <td>
                    <button
                      className="button visitor-danger"
                      aria-label="Delete visit"
                      disabled={remove.isPending}
                      onClick={() => {
                        if (window.confirm("Delete this visit?"))
                          remove.mutate(row.id);
                      }}
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!rows.length && (
          <p className="visitor-empty">
            {log.isPending ? "Loading visits…" : "No matching visits yet."}
          </p>
        )}
      </section>
      {topPages.length > 0 && (
        <section className="visitor-panel">
          <div className="visitor-toolbar">
            <h2>Top landing pages</h2>
            <small>Recent visits</small>
          </div>
          <ul className="visitor-pages">
            {topPages.map(([page, count]) => (
              <li key={page}>
                <span>
                  {page === "/"
                    ? "Home"
                    : page === "/other"
                      ? "Other pages"
                      : page}
                </span>
                <div className="visitor-bar" aria-hidden="true">
                  <span
                    style={{ width: `${(100 * count) / topPages[0][1]}%` }}
                  />
                </div>
                <strong>{count}</strong>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
