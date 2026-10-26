import { useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { NavLink, Link } from "react-router-dom";
import {
  LayoutDashboard,
  MessageSquare,
  Shield,
  Settings,
  LogOut,
  ArrowUpRight,
} from "lucide-react";
import type { AuthSession } from "@velora/shared";
import { api, ApiError } from "./api";
import { config } from "./config";
export function PortalGate({
  children,
  staff = false,
  admin = false,
  owner = false,
  permission,
  anyPermissions,
}: {
  children: (session: AuthSession) => ReactNode;
  staff?: boolean;
  admin?: boolean;
  owner?: boolean;
  permission?: string;
  anyPermissions?: string[];
}) {
  const session = useQuery({
    queryKey: ["session"],
    queryFn: api.session,
    enabled: !!config.apiUrl,
    retry: false,
    staleTime: 30000,
    refetchOnWindowFocus: true,
    refetchInterval: 60000,
  });
  const capabilities = useQuery({
    queryKey: ["capabilities"],
    queryFn: api.capabilities,
    enabled: !!config.apiUrl,
  });
  if (session.isFetching && !session.data)
    return (
      <div className="portal-loading" role="status">
        Opening your portal…
      </div>
    );
  if (!session.data) {
    const unavailable =
      session.error &&
      (!(session.error instanceof ApiError) || session.error.status !== 401);
    return (
      <div className="portal-signin">
        <span className="eyebrow">YOUR PLACE IN VELORA</span>
        <h1>
          {unavailable ? "We’ll be right back." : "Your story continues here."}
        </h1>
        <p>
          {unavailable
            ? "The account service is temporarily unavailable. Please try again shortly."
            : "Sign in with Discord to see your characters, talk to our team, and stay connected to the city."}
        </p>
        {unavailable ? (
          <button className="button" onClick={() => void session.refetch()}>
            Try again
          </button>
        ) : capabilities.data?.discordLogin && config.apiUrl ? (
          <a
            className="button primary"
            href={`${config.apiUrl}/v1/auth/discord`}
          >
            Login with Discord <ArrowUpRight size={18} />
          </a>
        ) : (
          <p>Discord sign-in is not configured yet.</p>
        )}
      </div>
    );
  }
  const permitted =
    session.data.isOwner ||
    (anyPermissions
      ? anyPermissions.some((p) => session.data!.permissions.includes(p))
      : session.data.permissions.includes(
          permission ?? (admin ? "tickets.manage" : "tickets.view"),
        )) ||
    (admin && session.data.permissions.includes("roles.manage"));
  if ((owner && !session.data.isOwner) || ((staff || admin) && !permitted))
    return (
      <div className="portal-signin">
        <h1>Staff access required.</h1>
        <p>
          Your Discord roles don’t grant access to this area. If your role has
          just changed, refresh your session shortly.
        </p>
        <Link className="button" to="/dashboard">
          Return to your portal
        </Link>
      </div>
    );
  return (
    <PortalFrame session={session.data}>{children(session.data)}</PortalFrame>
  );
}
export function PortalFrame({
  session,
  children,
}: {
  session: AuthSession;
  children: ReactNode;
}) {
  const client = useQueryClient(),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function logout() {
    setBusy(true);
    try {
      await api.logout(session.csrfToken);
      client.clear();
      window.location.hash = "/";
    } catch {
      setError("Sign-out failed. Please try again.");
      setBusy(false);
    }
  }
  const isStaff = session.isOwner || session.permissions.length > 0;
  return (
    <div className="portal-shell">
      <aside className="portal-sidebar">
        <Link className="portal-wordmark" to="/">
          VELORA<span>COMMUNITY PORTAL</span>
        </Link>
        <div className="portal-person">
          {session.user.avatar ? (
            <img
              src={`https://cdn.discordapp.com/avatars/${session.user.discordId}/${session.user.avatar}.webp?size=80`}
              alt=""
            />
          ) : (
            <div className="avatar-fallback">
              {session.user.username.slice(0, 1).toUpperCase()}
            </div>
          )}
          <div>
            <strong>{session.user.username}</strong>
            <small>
              {session.isOwner
                ? "Founder"
                : session.roles.map((r) => r.name).join(" · ") ||
                  "Community member"}
            </small>
          </div>
        </div>
        <nav aria-label="Portal navigation">
          <NavLink to="/dashboard">
            <LayoutDashboard size={18} /> Overview
          </NavLink>
          <NavLink to="/tickets">
            <MessageSquare size={18} /> My tickets
          </NavLink>
          <NavLink to="/my-applications">
            <MessageSquare size={18} /> My Applications
          </NavLink>
          {isStaff && (
            <NavLink to="/staff">
              <Shield size={18} /> Staff
            </NavLink>
          )}
          {(session.isOwner ||
            session.permissions.includes("transcripts.view")) && (
            <NavLink to="/transcripts">
              <MessageSquare size={18} /> Transcripts
            </NavLink>
          )}
          {session.isOwner && (
            <NavLink to="/owner">
              <Settings size={18} /> Owner
            </NavLink>
          )}
        </nav>
        <div className="portal-sidebar-bottom">
          <Link to="/rules">Community rules ↗</Link>
          <button onClick={() => void logout()} disabled={busy}>
            <LogOut size={16} />
            {busy ? "Signing out…" : "Sign out"}
          </button>
          {error && <p role="alert">{error}</p>}
        </div>
      </aside>
      <div className="portal-content">{children}</div>
    </div>
  );
}
export function ErrorNotice({ error }: { error: unknown }) {
  return error ? (
    <div className="form-error" role="alert">
      {error instanceof Error
        ? error.message
        : "Something went wrong. Please try again."}
    </div>
  ) : null;
}
