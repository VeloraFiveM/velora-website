import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ShieldCheck, LogOut, ArrowUpRight } from "lucide-react";
import { api } from "../api";
import { config } from "../config";
export default function Dashboard() {
  const client = useQueryClient();
  const [error, setError] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);
  const capabilities = useQuery({
    queryKey: ["capabilities"],
    queryFn: api.capabilities,
    enabled: !!config.apiUrl,
  });
  const session = useQuery({
    queryKey: ["session"],
    queryFn: api.session,
    enabled: !!config.apiUrl,
    retry: false,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });
  async function logout() {
    if (!session.data) return;
    setLoggingOut(true);
    try {
      await api.logout(session.data.csrfToken);
      client.removeQueries({ queryKey: ["session"] });
      client.clear();
      window.location.hash = "/";
    } catch {
      setError("We couldn’t sign you out. Please try again.");
    } finally {
      setLoggingOut(false);
    }
  }
  return (
    <>
      <div className="page-heading">
        <span className="eyebrow">YOUR VELORA</span>
        <h1>
          {session.data
            ? `Welcome, ${session.data.user.username}.`
            : "Player portal."}
        </h1>
        <p>Your place in the community.</p>
      </div>
      {session.isFetching && !session.data ? (
        <div className="empty" role="status">
          Checking your session…
        </div>
      ) : session.data ? (
        <>
          <div className="portal-layout">
            <aside>
              <strong>YOUR ACCOUNT</strong>
              <span>Overview</span>
              <span>Discord {session.data.user.discordId}</span>
              <button
                className="text-button"
                onClick={() => void logout()}
                disabled={loggingOut}
              >
                <LogOut size={16} />
                {loggingOut ? "Signing out…" : "Sign out"}
              </button>
            </aside>
            <div className="card">
              <span className="eyebrow">
                {session.data.isOwner ? "COMMUNITY OWNER" : "COMMUNITY MEMBER"}
              </span>
              <h2>{session.data.user.username}</h2>
              <p>
                Joined{" "}
                {new Date(session.data.user.createdAt).toLocaleDateString()}
              </p>
              <p>
                Session expires{" "}
                {new Date(session.data.expiresAt).toLocaleString()}
              </p>
              <p className="muted">
                Applications, tickets, notifications and profile management are
                scheduled for the following milestones.
              </p>
              <Link className="inline-link" to="/announcements">
                Community announcements <ArrowUpRight size={16} />
              </Link>
            </div>
          </div>
          {error && (
            <p className="notice" role="alert">
              {error}
            </p>
          )}
        </>
      ) : (
        <div className="empty">
          <ShieldCheck size={34} />
          <h2>Your story, all in one place.</h2>
          <p>
            {capabilities.data?.discordLogin
              ? "Sign in securely with Discord to access your account."
              : "Secure sign-in will be available after the backend and Discord application are configured and verified."}
          </p>
          {capabilities.data?.discordLogin && config.apiUrl ? (
            <a
              className="button primary"
              href={`${config.apiUrl}/v1/auth/discord`}
            >
              Login with Discord <ArrowUpRight size={16} />
            </a>
          ) : (
            <Link className="button" to="/">
              Explore the community <ArrowUpRight size={16} />
            </Link>
          )}
          {capabilities.isError && (
            <p role="status">The account service is temporarily unavailable.</p>
          )}
        </div>
      )}
    </>
  );
}
