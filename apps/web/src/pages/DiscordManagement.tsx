import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, RefreshCw, Save, Trash2, Pencil, Shield } from "lucide-react";
import type {
  AuthSession,
  TicketCategoryData,
  PlatformRole,
} from "@velora/shared";
import { api, request } from "../api";
import { PortalGate, ErrorNotice } from "../portal";
import { CategoryEditor } from "./Management";
export default function DiscordManagement() {
  return (
    <PortalGate owner>
      {(session) => <DiscordSettings session={session} />}
    </PortalGate>
  );
}
export function DiscordSettings({ session }: { session: AuthSession }) {
  const client = useQueryClient(),
    [editing, setEditing] = useState<TicketCategoryData | null | undefined>(),
    [deleting, setDeleting] = useState(""),
    [busy, setBusy] = useState(""),
    [error, setError] = useState<unknown>();
  const discord = useQuery({
      queryKey: ["discord-settings"],
      queryFn: api.discord,
      retry: false,
    }),
    categories = useQuery({
      queryKey: ["admin-categories"],
      queryFn: api.adminCategories,
    }),
    roles = useQuery({ queryKey: ["admin-roles"], queryFn: api.roles });
  async function remove(category: TicketCategoryData) {
    setBusy(category.id);
    setError(undefined);
    try {
      await request(
        `/v1/admin/ticket-categories/${category.id}`,
        "DELETE",
        undefined,
        session.csrfToken,
      );
      await client.invalidateQueries({ queryKey: ["admin-categories"] });
      await client.invalidateQueries({ queryKey: ["ticket-categories"] });
      setDeleting("");
    } catch (error) {
      setError(error);
    } finally {
      setBusy("");
    }
  }
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
    } catch (error) {
      setError(error);
    } finally {
      setBusy("");
    }
  }
  return (
    <>
      <div className="portal-heading">
        <div>
          <span className="eyebrow">OWNER CONTROLS</span>
          <h1>Manage Discord.</h1>
          <p>
            Manage website ticket categories, role access and Discord alerts.
          </p>
        </div>
        <button
          className="button"
          onClick={() => void discord.refetch()}
          disabled={discord.isFetching}
        >
          <RefreshCw size={16} /> Refresh Discord
        </button>
      </div>
      <ErrorNotice
        error={error ?? discord.error ?? categories.error ?? roles.error}
      />
      <section className="portal-panel discord-connection">
        <Shield size={24} />
        <div>
          <h2>
            {discord.data?.configured
              ? "Discord connected."
              : discord.isPending
                ? "Checking Discord…"
                : "Discord connection unavailable."}
          </h2>
          <p>
            {discord.data?.configured
              ? `${discord.data.botName} · Server ${discord.data.guildId}`
              : "Category settings are saved on the website. Connect the bot to load Discord roles."}
          </p>
        </div>
      </section>
      <p className="notice">
        Tickets, replies and claims stay on the website. New-ticket alerts and
        claimed-ticket reply pings go to the configured Discord tickets channel,
        with direct links.
      </p>
      {editing !== undefined ? (
        <CategoryEditor
          key={editing?.id ?? "new"}
          category={editing}
          roles={roles.data ?? []}
          session={session}
          onBack={() => setEditing(undefined)}
        />
      ) : (
        <section className="portal-panel">
          <div className="discord-section-heading">
            <div>
              <h2>Ticket categories</h2>
              <p>
                Create website ticket categories and choose which staff roles
                can see them.
              </p>
            </div>
            <button
              className="button primary"
              onClick={() => {
                setError(undefined);
                setEditing(null);
              }}
            >
              <Plus size={16} /> New category
            </button>
          </div>
          <div className="discord-category-list">
            {categories.data?.map((category) => (
              <div className="discord-category-row" key={category.id}>
                <div>
                  <strong>{category.name}</strong>
                  <p>{category.description}</p>
                  <small>
                    {category.enabled ? "Accepting tickets" : "Disabled"} ·{" "}
                    {category._count?.tickets ?? 0} tickets
                  </small>
                  <p>Website conversations · Discord alerts only</p>
                  <small>
                    Access:{" "}
                    {[
                      "Founder",
                      ...(roles.data ?? [])
                        .filter(
                          (r) =>
                            r.name !== "Founder" &&
                            category.roles.some((cr) => cr.roleId === r.id),
                        )
                        .map((r) => r.name),
                    ].join(" · ")}
                  </small>
                </div>
                <div className="discord-row-actions">
                  <button
                    className="button"
                    onClick={() => setEditing(category)}
                  >
                    <Pencil size={15} /> Edit category
                  </button>
                  <button
                    className="text-button"
                    disabled={
                      !!category._count?.tickets || busy === category.id
                    }
                    title={
                      category._count?.tickets
                        ? "Disable this category in Edit to preserve ticket history."
                        : undefined
                    }
                    onClick={() => setDeleting(category.id)}
                  >
                    <Trash2 size={15} /> Delete
                  </button>
                </div>
                {deleting === category.id && (
                  <div className="discord-delete-confirm" role="alert">
                    <p>
                      Delete “{category.name}”? This removes the empty website
                      category. Existing Discord categories are kept.
                    </p>
                    <button
                      className="button"
                      disabled={busy === category.id}
                      onClick={() => void remove(category)}
                    >
                      {busy === category.id ? "Deleting…" : "Confirm deletion"}
                    </button>
                    <button
                      className="text-button"
                      onClick={() => setDeleting("")}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
          <p className="muted">
            Categories with ticket history can be disabled in Edit. Deleting a
            website category never deletes a Discord category or channel.
          </p>
        </section>
      )}
      <section className="portal-panel">
        <h2>Discord role access</h2>
        <p>
          Map each website role to the matching Discord role. Staff access
          updates automatically during use. Choose category access with Edit
          category above.
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
        <p className="muted">
          Founder access is tied to your owner account. Discord administrators
          retain their built-in ability to see channels.
        </p>
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
