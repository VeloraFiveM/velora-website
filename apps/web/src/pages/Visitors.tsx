import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { AuthSession } from "@velora/shared";
import { api, request } from "../api";
import { ErrorNotice } from "../portal";
import "./visitors.css";

type Visit = {
  id: string;
  ipAddress: string | null;
  countryCode: string | null;
  country: string | null;
  city: string | null;
  region: string | null;
  network: string | null;
  browser: string | null;
  hosting: boolean;
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
  countries: { code: string; name: string; count: number }[];
};
const dateFormat = new Intl.DateTimeFormat("en-AU", {
  dateStyle: "medium",
  timeStyle: "medium",
  timeZone: "Australia/Sydney",
});

function relativeTime(timestamp: string) {
  const minutes = Math.max(
    0,
    Math.floor((Date.now() - Date.parse(timestamp)) / 60000),
  );
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
  return `${Math.floor(minutes / 1440)}d ago`;
}

export default function Visitors({ session }: { session: AuthSession }) {
  const [search, setSearch] = useState("");
  const [traffic, setTraffic] = useState("people");
  const [region, setRegion] = useState("all");
  const queryClient = useQueryClient();
  const log = useQuery({
    queryKey: ["owner-visitors"],
    queryFn: () => request<VisitorLog>("/v1/owner/visitors"),
  });
  const signOut = useMutation({
    mutationFn: () => api.logout(session.csrfToken),
    onSuccess: () => {
      queryClient.clear();
      window.location.hash = "/";
    },
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
  const query = search.trim().toLowerCase();
  const englishSpeaking = ["AU", "NZ", "GB", "IE", "US", "CA"];
  const rows = (log.data?.visits ?? []).filter((row) => {
    if (traffic === "people" && (row.automated || row.hosting)) return false;
    if (region === "AU" && row.countryCode !== "AU") return false;
    if (
      region === "english" &&
      !englishSpeaking.includes(row.countryCode ?? "")
    )
      return false;
    return (
      !query ||
      [
        row.ipAddress,
        row.country,
        row.city,
        row.region,
        row.network,
        row.referrer,
        row.device,
        row.browser,
      ].some((value) => value?.toLowerCase().includes(query))
    );
  });
  const stats = log.data?.stats;
  const rate = stats?.total
    ? Math.round((stats.joined * 100) / stats.total)
    : 0;
  const cards = [
    ["Total visits", stats?.total, "Last 30 days"],
    ["Unique IPs", stats?.unique, "Distinct addresses"],
    ["Likely people", stats?.browser, "Excludes detected bots and hosting"],
    ["Today", stats?.today, "Since midnight Sydney time"],
    ["Joined", stats?.joined, `${rate}% clicked the FiveM link`],
  ] as const;
  function exportCsv() {
    const csvCell = (value: string) =>
      `"${(/^[=+\-@\t\r]/.test(value) ? "'" + value : value).replaceAll('"', '""')}"`;
    const lines = [
      [
        "Time (UTC)",
        "IP address",
        "Country",
        "City",
        "Region",
        "Network",
        "Device",
        "Traffic",
        "Join click",
        "Referrer",
      ],
      ...rows.map((row) => [
        row.createdAt,
        row.ipAddress ?? "",
        row.country ?? "",
        row.city ?? "",
        row.region ?? "",
        row.network ?? "",
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
        <div>
          <h1>Visitor log</h1>
          <p>playvelora.xyz</p>
        </div>
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
          <button
            className="button"
            disabled={signOut.isPending}
            onClick={() => signOut.mutate()}
          >
            Sign out
          </button>
        </div>
      </div>
      <ErrorNotice error={log.error ?? remove.error ?? signOut.error} />
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
            placeholder="Search IP, country, city, ISP…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div className="visitor-filters">
          <div className="visitor-filter-group">
            <span>Traffic</span>
            <button
              type="button"
              aria-pressed={traffic === "people"}
              onClick={() => setTraffic("people")}
            >
              Likely people
            </button>
            <button
              type="button"
              aria-pressed={traffic === "all"}
              onClick={() => setTraffic("all")}
            >
              Everything
            </button>
          </div>
          <div className="visitor-filter-group">
            <span>Region</span>
            {[
              ["all", "Everywhere"],
              ["english", "English-speaking"],
              ["AU", "AU Australia"],
            ].map(([value, label]) => (
              <button
                type="button"
                key={value}
                aria-pressed={region === value}
                onClick={() => setRegion(value)}
              >
                {label}
              </button>
            ))}
          </div>
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
                <th>IP address</th>
                <th>Location</th>
                <th>Network</th>
                <th>Device</th>
                <th>Joined</th>
                <th>Referrer</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    {dateFormat.format(new Date(row.createdAt))}
                    <small>{relativeTime(row.createdAt)}</small>
                  </td>
                  <td>
                    <code>{row.ipAddress ?? "—"}</code>
                  </td>
                  <td>
                    <strong>
                      {[row.countryCode, row.country]
                        .filter(Boolean)
                        .join(" ") || "—"}
                    </strong>
                    <small>
                      {[row.city, row.region].filter(Boolean).join(", ")}
                    </small>
                  </td>
                  <td>
                    <span
                      className="visitor-network"
                      title={row.network ?? undefined}
                    >
                      {row.network ?? "—"}
                    </span>
                  </td>
                  <td>
                    {row.device}
                    <small>{row.browser}</small>
                  </td>
                  <td>
                    <span
                      className="visitor-joined"
                      data-joined={Boolean(row.joinedAt)}
                    >
                      {row.joinedAt ? "Yes" : "No"}
                    </span>
                  </td>
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
      <section className="visitor-panel">
        <div className="visitor-toolbar">
          <h2>Top countries</h2>
        </div>
        {log.data?.countries?.length ? (
          <ul className="visitor-pages">
            {log.data.countries.map((country) => (
              <li key={country.code}>
                <span>
                  {country.code} · {country.name}
                </span>
                <div className="visitor-bar" aria-hidden="true">
                  <span
                    style={{
                      width: `${(100 * country.count) / log.data!.countries[0].count}%`,
                    }}
                  />
                </div>
                <strong>{country.count}</strong>
              </li>
            ))}
          </ul>
        ) : (
          <p className="visitor-empty">
            Country totals appear as visits come in.
          </p>
        )}
      </section>
      <small className="visitor-source">
        <a href="https://db-ip.com" target="_blank" rel="noreferrer">
          IP Geolocation by DB-IP
        </a>
      </small>
    </div>
  );
}
