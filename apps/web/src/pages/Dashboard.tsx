import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api, request } from "../api";
import { PortalGate, ErrorNotice } from "../portal";
import type { AuthSession } from "@velora/shared";
import type { Submission } from "../application-types";
export default function Dashboard() {
  return <PortalGate>{(session) => <Overview session={session} />}</PortalGate>;
}
function Overview({ session }: { session: AuthSession }) {
  const client = useQueryClient();
  const applications = useQuery({
    queryKey: ["applications", false],
    queryFn: () => request<Submission[]>("/v1/applications"),
    refetchInterval: 30000,
  });
  const notices = useQuery({
    queryKey: ["notifications"],
    queryFn: api.notifications,
    refetchInterval: 30000,
  });
  const clear = useMutation({
    mutationFn: (id?: string) => api.clearNotifications(session.csrfToken, id),
    onSuccess: () => client.invalidateQueries({ queryKey: ["notifications"] }),
  });
  const staff =
    session.isOwner ||
    session.permissions.some((p) => p.startsWith("applications."));
  return (
    <>
      <div className="portal-heading">
        <div>
          <span className="eyebrow">APPLICATION PORTAL</span>
          <h1>Welcome, {session.user.username}.</h1>
          <p>
            Submit applications, follow their progress and read updates from the
            team.
          </p>
        </div>
        <Link className="button primary" to="/applications">
          Browse applications
        </Link>
      </div>
      <div className="portal-action-links">
        <Link className="button" to="/my-applications">
          My Applications
        </Link>
        {staff && (
          <Link className="button" to="/staff">
            Staff
          </Link>
        )}
        {session.isOwner && (
          <Link className="button" to="/owner">
            Owner
          </Link>
        )}
      </div>
      <section className="portal-panel">
        <div className="panel-heading">
          <h2>My Applications</h2>
          <Link className="inline-link" to="/my-applications">
            View all
          </Link>
        </div>
        <ErrorNotice error={applications.error} />
        {applications.data?.length ? (
          applications.data.slice(0, 6).map((a) => (
            <Link
              className="transcript-row"
              key={a.id}
              to={`/my-applications?application=${a.id}`}
            >
              <strong>{a.version?.title ?? a.form.title}</strong>
              <span className="status-badge">
                {a.status.replaceAll("_", " ")}
              </span>
            </Link>
          ))
        ) : (
          <p>No applications yet. Browse available forms to get started.</p>
        )}
      </section>
      <section className="portal-panel">
        <div className="panel-heading">
          <h2>Application updates</h2>
          <button
            className="button"
            disabled={clear.isPending || !notices.data?.length}
            onClick={() => clear.mutate(undefined)}
          >
            Clear all
          </button>
        </div>
        <ErrorNotice error={notices.error ?? clear.error} />
        {notices.data?.map((n) => (
          <div className="panel-heading" key={n.id}>
            <a className="transcript-row" href={n.href ?? "/#/my-applications"}>
              <div>
                <strong>{n.title}</strong>
                <p>{n.body}</p>
              </div>
            </a>
            <button
              className="button"
              disabled={clear.isPending}
              onClick={() => clear.mutate(n.id)}
            >
              Dismiss
            </button>
          </div>
        ))}
        {notices.data?.length === 0 && <p>No new application updates.</p>}
      </section>
    </>
  );
}
