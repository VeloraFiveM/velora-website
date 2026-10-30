import RulesEditor from "./RulesEditor";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { AuthSession } from "@velora/shared";
import { request } from "../api";
import { PortalGate, ErrorNotice } from "../portal";
type Role = {
  id: string;
  name: string;
  discordRoleId: string | null;
  permissions: { permissionKey: string }[];
};
type StaffUser = {
  id: string;
  discordId: string;
  username: string;
  discordUsername: string | null;
  nickname: string | null;
  roles: { role: { id: string; name: string } }[];
};
export default function Owner() {
  const { section } = useParams();
  return (
    <PortalGate owner>
      {(session) => (
        <>
          <div className="portal-heading">
            <div>
              <span className="eyebrow">OWNER CONTROLS</span>
              <h1>
                {section === "staff"
                  ? "Manage Staff."
                  : section === "roles"
                    ? "Role permissions."
                    : section === "rules"
                      ? "Edit Rules."
                      : "Your owner workspace."}
              </h1>
              <p>Owner access remains protected to your Discord account.</p>
            </div>
            {section && (
              <Link className="button" to="/owner">
                Owner home
              </Link>
            )}
          </div>
          {section === "rules" ? (
            <RulesEditor session={session} />
          ) : section === "staff" ? (
            <StaffNames session={session} />
          ) : section === "roles" ? (
            <RolePermissions session={session} />
          ) : (
            <div className="owner-grid">
              {[
                [
                  "/owner/rules",
                  "Edit Rules",
                  "Edit, organise and publish community rules.",
                ],
                [
                  "/owner/staff",
                  "Manage Staff",
                  "Set website display names for registered staff.",
                ],
                [
                  "/owner/roles",
                  "Role permissions",
                  "Choose exactly what every role can do.",
                ],
                [
                  "/manage-discord",
                  "Manage Discord",
                  "Map Discord roles for application access.",
                ],
                [
                  "/application-forms",
                  "Application forms",
                  "Build, publish, open or close applications.",
                ],
              ].map(([to, title, text]) => (
                <Link key={to} className="portal-panel" to={to}>
                  <h2>{title}</h2>
                  <p>{text}</p>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </PortalGate>
  );
}
function StaffNames({ session }: { session: AuthSession }) {
  const [q, setQ] = useState("");
  const users = useQuery({
    queryKey: ["owner-staff", q],
    queryFn: () =>
      request<StaffUser[]>(`/v1/owner/staff?q=${encodeURIComponent(q)}`),
  });
  return (
    <section className="portal-panel">
      <label className="transcript-search">
        Find staff
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Website name, Discord username or ID"
        />
      </label>
      <p>
        Nicknames apply across the website and survive Discord sign-in. They do
        not change Discord usernames.
      </p>
      <ErrorNotice error={users.error} />
      {users.isPending && <p>Loading staff…</p>}
      {users.data?.map((user) => (
        <NicknameRow
          key={`${user.id}-${user.nickname}`}
          user={user}
          session={session}
        />
      ))}
      {users.data?.length === 0 && (
        <p>
          No matching staff accounts. Staff must sign in before their account
          appears here.
        </p>
      )}
    </section>
  );
}
function NicknameRow({
  user,
  session,
}: {
  user: StaffUser;
  session: AuthSession;
}) {
  const [value, setValue] = useState(user.nickname ?? ""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(),
    client = useQueryClient();
  return (
    <form
      className="staff-name-row"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(undefined);
        try {
          await request(
            `/v1/owner/staff/${user.id}`,
            "PATCH",
            { nickname: value.trim() || null },
            session.csrfToken,
          );
          await client.invalidateQueries({ queryKey: ["owner-staff"] });
          await client.invalidateQueries({ queryKey: ["session"] });
        } catch (error) {
          setError(error);
        } finally {
          setBusy(false);
        }
      }}
    >
      <div>
        <strong>{user.username}</strong>
        <small>Discord: {user.discordUsername ?? user.username}</small>
        <small>
          {user.id === session.user.id
            ? "Founder"
            : user.roles.map((r) => r.role.name).join(" · ")}
        </small>
      </div>
      <label>
        <span className="sr-only">Website nickname for {user.username}</span>
        <input
          maxLength={40}
          value={value}
          placeholder="Use Discord username"
          onChange={(e) => setValue(e.target.value)}
        />
      </label>
      <button className="button" disabled={busy}>
        {busy ? "Saving…" : "Save nickname"}
      </button>
      <ErrorNotice error={error} />
    </form>
  );
}
function RolePermissions({ session }: { session: AuthSession }) {
  const data = useQuery({
    queryKey: ["owner-role-permissions"],
    queryFn: () =>
      request<{ permissions: string[]; roles: Role[] }>("/v1/owner/roles"),
  });
  return (
    <>
      <p className="notice">
        Permissions control actions. Application reviewer roles control which
        submissions a reviewer can see. Your protected owner account always
        retains access.
      </p>
      <ErrorNotice error={data.error} />
      {data.data?.roles.map((role) => (
        <RoleEditor
          key={`${role.id}-${role.permissions
            .map((p) => p.permissionKey)
            .sort()
            .join()}`}
          role={role}
          available={data.data!.permissions.filter(
            (p) => !/^(tickets\.|notes\.|transcripts\.)/.test(p),
          )}
          session={session}
        />
      ))}
    </>
  );
}
function RoleEditor({
  role,
  available,
  session,
}: {
  role: Role;
  available: string[];
  session: AuthSession;
}) {
  const [selected, setSelected] = useState(
      role.permissions.map((p) => p.permissionKey),
    ),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(),
    client = useQueryClient();
  return (
    <form
      className="portal-panel role-permission-card"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(undefined);
        try {
          await request(
            `/v1/owner/roles/${role.id}/permissions`,
            "PATCH",
            { permissionKeys: selected },
            session.csrfToken,
          );
          await client.invalidateQueries({
            queryKey: ["owner-role-permissions"],
          });
          await client.invalidateQueries({ queryKey: ["admin-roles"] });
        } catch (error) {
          setError(error);
        } finally {
          setBusy(false);
        }
      }}
    >
      <h2>{role.name}</h2>
      <p>
        {role.discordRoleId
          ? `Mapped Discord role: ${role.discordRoleId}`
          : role.name === "Founder"
            ? "Protected owner identity"
            : "No Discord role mapped yet"}
      </p>
      <div className="permission-grid">
        {available.map((permission) => (
          <label className="check-label" key={permission}>
            <input
              type="checkbox"
              checked={selected.includes(permission)}
              onChange={(e) =>
                setSelected((old) =>
                  e.target.checked
                    ? [...old, permission]
                    : old.filter((p) => p !== permission),
                )
              }
            />
            <span>
              {permission
                .replaceAll(".", " · ")
                .replaceAll("openclose", "open / close")}
            </span>
          </label>
        ))}
      </div>
      <ErrorNotice error={error} />
      <button className="button primary" disabled={busy}>
        {busy ? "Saving…" : "Save role permissions"}
      </button>
    </form>
  );
}
