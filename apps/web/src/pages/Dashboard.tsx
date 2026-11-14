import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Bell, ClipboardList } from "lucide-react";
import { Link } from "react-router-dom";
import { api, request } from "../api";
import { PortalGate, ErrorNotice } from "../portal";
import {
  ApplicationStatus,
  WorkspaceHeading,
  WorkspaceLoading,
} from "../workspace";
import type { AuthSession } from "@velora/shared";
import type { FormData, Submission } from "../application-types";

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
  const forms = useQuery({
    queryKey: ["public-application-forms"],
    queryFn: () => request<FormData[]>("/v1/public/application-forms"),
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
  const openForms = forms.data?.filter((form) => form.accepting);
  return (
    <>
      <WorkspaceHeading
        title={`Welcome, ${session.user.username}`}
        description="Browse community applications, pick up a draft or check your latest updates."
        action={
          <Link className="button primary" to="/applications">
            Browse applications <ArrowRight size={16} aria-hidden />
          </Link>
        }
      />
      <div className="workspace-overview">
        <section className="portal-panel workspace-recent">
          <div className="panel-heading">
            <h2>
              <ClipboardList size={19} aria-hidden /> My applications
            </h2>
            <Link className="inline-link" to="/my-applications">
              View all
            </Link>
          </div>
          <ErrorNotice error={applications.error} />
          {applications.isPending && (
            <WorkspaceLoading label="Loading your applications" />
          )}
          {applications.data?.length === 0 && (
            <p>No applications yet. Choose an open form to get started.</p>
          )}
          {applications.data?.slice(0, 6).map((a) => (
            <Link
              className="workspace-list-row"
              key={a.id}
              to={`/my-applications?application=${a.id}`}
            >
              <strong>{a.version?.title ?? a.form.title}</strong>
              <ApplicationStatus status={a.status} />
              <ArrowRight size={16} aria-hidden />
            </Link>
          ))}
        </section>
        <section className="portal-panel workspace-opportunities">
          <div className="panel-heading">
            <h2>Open applications</h2>
          </div>
          <ErrorNotice error={forms.error} />
          {forms.isPending && (
            <WorkspaceLoading label="Loading open applications" />
          )}
          {openForms?.length === 0 && <p>Applications are currently closed.</p>}
          {openForms?.slice(0, 5).map((form) => (
            <Link
              className="workspace-list-row"
              key={form.id}
              to={`/my-applications?form=${form.id}`}
            >
              <span>
                <strong>{form.title}</strong>
                <small>{form.category}</small>
              </span>
              <ArrowRight size={16} aria-hidden />
            </Link>
          ))}
        </section>
        <section className="portal-panel workspace-updates">
          <div className="panel-heading">
            <h2>
              <Bell size={18} aria-hidden /> Application updates
            </h2>
            {!!notices.data?.length && (
              <button
                className="button"
                disabled={clear.isPending}
                onClick={() => clear.mutate(undefined)}
              >
                Clear all
              </button>
            )}
          </div>
          <ErrorNotice error={notices.error ?? clear.error} />
          {notices.isPending && (
            <WorkspaceLoading label="Loading application updates" />
          )}
          {notices.data?.map((n) => (
            <div className="workspace-list-row" key={n.id}>
              <a href={n.href ?? "/#/my-applications"}>
                <strong>{n.title}</strong>
                <small>{n.body}</small>
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
      </div>
    </>
  );
}
