import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Save } from "lucide-react";
import type { AuthSession, PlatformRole } from "@velora/shared";
import { api, request } from "../api";
import { PortalGate, ErrorNotice } from "../portal";
export default function DiscordManagement() {
  return (
    <PortalGate owner>
      {(session) => <DiscordSettings session={session} />}
    </PortalGate>
  );
}
export function DiscordSettings({ session }: { session: AuthSession }) {
  const client = useQueryClient(),
    [busy, setBusy] = useState(""),
    [error, setError] = useState<unknown>();
  const discord = useQuery({
      queryKey: ["discord-roles"],
      queryFn: api.discordRoles,
    }),
    roles = useQuery({ queryKey: ["admin-roles"], queryFn: api.roles });
  async function map(role: PlatformRole, value: string) {
    setBusy(role.id);
    setError(undefined);
    try {
      await request(
        `/v1/admin/roles/${role.id}`,
        "PATCH",
        { discordRoleId: value || null },
        session.csrfToken,
      );
      await client.invalidateQueries({ queryKey: ["admin-roles"] });
    } catch (e) {
      setError(e);
    } finally {
      setBusy("");
    }
  }
  return (
    <>
      <div className="portal-heading">
        <div>
          <span className="eyebrow">OWNER CONTROLS</span>
          <h1>Discord role mappings.</h1>
          <p>
            Map Discord roles to website roles for application review and
            management.
          </p>
        </div>
      </div>
      <ErrorNotice error={error ?? discord.error ?? roles.error} />
      <section className="portal-panel">
        <h2>Role access</h2>
        <p>
          Each application's reviewer roles determine who can view and decide
          its submissions.
        </p>
        <div className="role-mappings">
          {roles.data?.map((role) => (
            <DiscordRoleRow
              key={`${role.id}-${role.discordRoleId}`}
              role={role}
              options={discord.data?.roles ?? []}
              disabled={!discord.data?.configured || busy === role.id}
              onSave={(value) => void map(role, value)}
            />
          ))}
        </div>
      </section>
    </>
  );
}
function DiscordRoleRow({
  role,
  options,
  disabled,
  onSave,
}: {
  role: PlatformRole;
  options: { id: string; name: string }[];
  disabled: boolean;
  onSave: (value: string) => void;
}) {
  const [value, setValue] = useState(role.discordRoleId ?? "");
  return (
    <form
      className="role-mapping-row"
      onSubmit={(e) => {
        e.preventDefault();
        onSave(value);
      }}
    >
      <strong>{role.name}</strong>
      {role.name === "Founder" ? (
        <p>Protected owner account</p>
      ) : (
        <>
          <label>
            <span className="sr-only">Discord role for {role.name}</span>
            <select
              value={value}
              disabled={disabled}
              onChange={(e) => setValue(e.target.value)}
            >
              <option value="">No Discord role mapped</option>
              {value && !options.some((r) => r.id === value) && (
                <option value={value}>Unavailable role ({value})</option>
              )}
              {options.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>
          <button className="button" disabled={disabled}>
            <Save size={15} /> Save
          </button>
        </>
      )}
    </form>
  );
}
