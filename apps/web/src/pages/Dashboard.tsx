import { isTablet } from "../tablet";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  Clock,
  Wallet,
  Landmark,
  UserRound,
  RefreshCw,
  MessageSquare,
} from "lucide-react";
import { api } from "../api";
import { PortalGate, ErrorNotice } from "../portal";
import type { AuthSession } from "@velora/shared";
const money = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});
export default function Dashboard() {
  return <PortalGate>{(session) => <Overview session={session} />}</PortalGate>;
}
function Overview({ session }: { session: AuthSession }) {
  const queryClient = useQueryClient();
  const clear = useMutation({
    mutationFn: (id?: string) => api.clearNotifications(session.csrfToken, id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });
  const notifications = useQuery({
    queryKey: ["notifications"],
    queryFn: api.notifications,
    refetchInterval: 30000,
  });
  const characters = useQuery({
      queryKey: ["characters"],
      queryFn: api.characters,
      refetchInterval: 300000,
      staleTime: 300000,
    }),
    tickets = useQuery({
      queryKey: ["tickets", false],
      queryFn: () => api.tickets(),
      refetchInterval: 15000,
    }),
    [selected, setSelected] = useState("");
  const character =
      characters.data?.characters.find((c) => c.id === selected) ??
      characters.data?.characters[0],
    fresh = character && Date.now() - Date.parse(character.observedAt) < 660000;
  return (
    <>
      <div className="portal-heading">
        <div>
          <span className="eyebrow">GOOD TO SEE YOU AGAIN</span>
          <h1>Welcome home, {session.user.username}.</h1>
          <p>Your life in the city. Your connection to the community.</p>
        </div>
        <Link className="button" to="/tickets">
          Contact the team <ArrowUpRight size={16} />
        </Link>
      </div>
      <div className="portal-action-links">
        {!isTablet && (
          <Link className="button" to="/my-applications">
            My Applications
          </Link>
        )}
        <Link className="button" to="/tickets">
          My Tickets
        </Link>
        {(session.isOwner || session.permissions.length > 0) && (
          <Link className="button" to="/staff">
            Staff
          </Link>
        )}
        {!isTablet && session.isOwner && (
          <Link className="button primary" to="/owner">
            Owner
          </Link>
        )}
      </div>
      <section className="portal-panel">
        <div className="panel-heading">
          <h2>Notifications</h2>
          <button
            className="button"
            disabled={clear.isPending || !notifications.data?.length}
            onClick={() => clear.mutate(undefined)}
          >
            Clear all
          </button>
        </div>
        <ErrorNotice error={clear.error} />
        <ErrorNotice error={notifications.error} />
        {notifications.data?.slice(0, 5).map((n) => (
          <div className="panel-heading" key={n.id}>
            <a className="transcript-row" href={n.href ?? "/#/tickets"}>
              <div>
                <strong>{n.title}</strong>
                <p>{n.body}</p>
                <small>{new Date(n.createdAt).toLocaleString()}</small>
              </div>
            </a>
            <button
              className="button"
              aria-label={`Dismiss ${n.title}`}
              disabled={clear.isPending}
              onClick={() => clear.mutate(n.id)}
            >
              Dismiss
            </button>
          </div>
        ))}
        {notifications.data?.length === 0 && <p>No new notifications.</p>}
      </section>
      <section className="character-overview">
        <div className="character-overview-heading">
          <div>
            <span className="eyebrow">YOUR CHARACTER</span>
            <h2>{character?.name ?? "Your next chapter awaits."}</h2>
          </div>
          {(characters.data?.characters.length ?? 0) > 1 && (
            <select
              aria-label="Select character"
              value={character?.id ?? ""}
              onChange={(e) => setSelected(e.target.value)}
            >
              {characters.data?.characters.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} · {c.citizenId}
                </option>
              ))}
            </select>
          )}
        </div>
        <ErrorNotice error={characters.error} />
        {characters.isPending ? (
          <p role="status">Loading your character data…</p>
        ) : character ? (
          <>
            <div className="character-identity">
              <span>
                <UserRound size={15} />
                {character.citizenId}
              </span>
              <span>{character.job || "No job recorded"}</span>
              <span
                className={`status-badge ${character.online && fresh ? "status-in_progress" : ""}`}
              >
                {character.online && fresh
                  ? "In the city"
                  : "Offline / last known data"}
              </span>
            </div>
            <div className="character-stats">
              <article>
                <Wallet size={22} />
                <span>Cash</span>
                <strong>{money.format(character.cash)}</strong>
                <small>In-game balance</small>
              </article>
              <article>
                <Landmark size={22} />
                <span>Bank</span>
                <strong>{money.format(character.bank)}</strong>
                <small>In-game balance</small>
              </article>
              <article>
                <Clock size={22} />
                <span>Time in the city</span>
                <strong>
                  {Math.floor(character.playtimeSeconds / 3600)}
                  <em>h</em>{" "}
                  {Math.floor((character.playtimeSeconds % 3600) / 60)}
                  <em>m</em>
                </strong>
                <small>
                  Tracked since{" "}
                  {new Date(character.trackedSince).toLocaleDateString()}
                </small>
              </article>
            </div>
            <div className="sync-caption">
              <RefreshCw size={13} />
              <span>
                Last observed {new Date(character.observedAt).toLocaleString()}
                {!fresh ? " · Data may be out of date." : ""}
              </span>
            </div>
          </>
        ) : (
          <div className="character-unlinked">
            <UserRound size={35} />
            <p>
              {characters.data?.configured && characters.data.lastSyncAt
                ? "No character has been linked to your Discord account yet. Connect to the city with Discord running, then return after the next sync."
                : "Character sync is being prepared for the game-server move. Your character, balances and tracked playtime will appear here once the secure connector is installed."}
            </p>
          </div>
        )}
      </section>
      <div className="dashboard-lower">
        <section className="portal-panel">
          <div className="panel-heading">
            <h2>Your conversations</h2>
            <Link className="inline-link" to="/tickets">
              View all <ArrowUpRight size={16} />
            </Link>
          </div>
          <ErrorNotice error={tickets.error} />
          {tickets.data?.length ? (
            <div className="compact-tickets">
              {tickets.data.slice(0, 4).map((ticket) => (
                <Link to={`/tickets?ticket=${ticket.id}`} key={ticket.id}>
                  <MessageSquare size={18} />
                  <div>
                    <strong>{ticket.subject}</strong>
                    <small>{ticket.category.name}</small>
                  </div>
                  <span className="status-badge">
                    {ticket.status.replaceAll("_", " ")}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <p>
              No conversations yet. Our team is here whenever you need a hand.
            </p>
          )}
        </section>
        <section className="portal-panel account-panel">
          <span className="eyebrow">YOUR COMMUNITY ACCOUNT</span>
          <h2>
            {session.isOwner
              ? "Founder"
              : session.roles.map((r) => r.name).join(" · ") || "Velora member"}
          </h2>
          <dl>
            <dt>Discord</dt>
            <dd>{session.user.username}</dd>
            <dt>Joined</dt>
            <dd>{new Date(session.user.createdAt).toLocaleDateString()}</dd>
          </dl>
          <Link className="inline-link" to="/rules">
            Community rules <ArrowUpRight size={16} />
          </Link>
        </section>
      </div>
    </>
  );
}
