import { useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Shield, Save, ArrowLeft } from "lucide-react";
import type {
  AuthSession,
  TicketCategoryData,
  PlatformRole,
} from "@velora/shared";
import { api, request } from "../api";
import { PortalGate, ErrorNotice } from "../portal";
export default function Management() {
  return (
    <PortalGate admin>{(session) => <Manage session={session} />}</PortalGate>
  );
}
function Manage({ session }: { session: AuthSession }) {
  const [tab, setTab] = useState("categories"),
    [editing, setEditing] = useState<TicketCategoryData | null | undefined>(),
    [error, setError] = useState<unknown>(),
    [busy, setBusy] = useState(""),
    client = useQueryClient();
  const categories = useQuery({
      queryKey: ["admin-categories"],
      queryFn: api.adminCategories,
    }),
    roles = useQuery({ queryKey: ["admin-roles"], queryFn: api.roles }),
    sync = useQuery({
      queryKey: ["ticket-sync"],
      queryFn: api.sync,
      refetchInterval: 15000,
    });
  const canRoles =
    session.isOwner || session.permissions.includes("roles.manage");
  async function mapRole(id: string, discordRoleId: string) {
    setBusy(id);
    setError(undefined);
    try {
      await request(
        `/v1/admin/roles/${id}`,
        "PATCH",
        { discordRoleId: discordRoleId.trim() || null },
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
          <span className="eyebrow">COMMUNITY MANAGEMENT</span>
          <h1>The right people. The right access.</h1>
          <p>
            Manage ticket categories and connect staff access to Discord roles.
          </p>
        </div>
        {tab === "categories" && editing === undefined && (
          <button className="button primary" onClick={() => setEditing(null)}>
            <Plus size={17} /> New category
          </button>
        )}
      </div>
      <div
        className="management-tabs"
        role="tablist"
        aria-label="Management sections"
      >
        {[
          ["categories", "Ticket categories"],
          ...(canRoles ? [["roles", "Discord role mappings"]] : []),
          ["sync", "Integration health"],
        ].map(([id, label]) => (
          <button
            role="tab"
            aria-selected={tab === id}
            key={id}
            onClick={() => {
              setTab(id);
              setEditing(undefined);
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <ErrorNotice error={error ?? categories.error ?? roles.error} />
      {tab === "categories" ? (
        editing !== undefined ? (
          <CategoryEditor
            category={editing}
            roles={roles.data ?? []}
            session={session}
            onBack={() => setEditing(undefined)}
          />
        ) : (
          <div className="category-management">
            {categories.data?.map((category) => (
              <button
                className="category-management-row"
                key={category.id}
                onClick={() => setEditing(category)}
              >
                <Shield size={22} />
                <div>
                  <strong>{category.name}</strong>
                  <p>{category.description}</p>
                  <small>
                    {category.roles
                      .map(
                        (item) =>
                          roles.data?.find((r) => r.id === item.roleId)?.name,
                      )
                      .filter(Boolean)
                      .join(" · ") || "Founder only"}
                  </small>
                </div>
                <span className="tag">
                  {category.enabled ? "Open" : "Disabled"}
                </span>
                <span>Edit access ↗</span>
              </button>
            ))}
          </div>
        )
      ) : tab === "roles" ? (
        <>
          <div className="notice">
            <Shield size={20} />
            <p>
              Map each platform role to its Discord role ID. Staff membership is
              verified when they sign in and refreshed during use. Removing a
              Discord role removes its derived access on the next check,
              normally within one minute. Founder is protected by your
              configured Discord identity.
            </p>
          </div>
          <div className="role-mappings">
            {roles.data?.map((role) => (
              <RoleMapping
                key={`${role.id}-${role.discordRoleId}`}
                role={role}
                busy={busy === role.id}
                onSave={(value) => void mapRole(role.id, value)}
              />
            ))}
          </div>
        </>
      ) : (
        <section className="portal-panel">
          <h2>Discord ticket delivery</h2>
          <ErrorNotice error={sync.error} />
          <p>
            {sync.data?.configured
              ? "Bot credentials are configured."
              : "Discord bot credentials and guild routing have not been configured. Website tickets work independently; delivery jobs remain safely queued."}
          </p>
          <dl>
            <dt>Pending deliveries</dt>
            <dd>{sync.data?.pending ?? "—"}</dd>
            <dt>Repeated failures</dt>
            <dd>{sync.data?.failed.length ?? "—"}</dd>
          </dl>
          {sync.data?.failed.map((job) => (
            <div className="sync-failure" key={job.id}>
              <strong>{job.kind}</strong>
              <span>
                {job.lastError} · {job.attempts} attempts
              </span>
              <button
                className="text-button"
                onClick={async () => {
                  try {
                    await request(
                      `/v1/admin/ticket-sync/${job.id}/retry`,
                      "POST",
                      {},
                      session.csrfToken,
                    );
                    await sync.refetch();
                  } catch (error) {
                    setError(error);
                  }
                }}
              >
                Retry delivery
              </button>
            </div>
          ))}
        </section>
      )}
    </>
  );
}
function RoleMapping({
  role,
  busy,
  onSave,
}: {
  role: PlatformRole;
  busy: boolean;
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
      <div>
        <strong>{role.name}</strong>
        <small>
          {role.name === "Founder"
            ? "Protected owner identity"
            : "Automatically synced from Discord"}
        </small>
      </div>
      <label>
        <span className="sr-only">Discord role ID for {role.name}</span>
        <input
          disabled={role.name === "Founder" || busy}
          inputMode="numeric"
          pattern="[0-9]{17,20}"
          placeholder={
            role.name === "Founder"
              ? "Owner identity is enforced on the server"
              : "Discord role ID"
          }
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
      </label>
      {role.name !== "Founder" && (
        <button className="button" disabled={busy}>
          <Save size={15} />
          {busy ? "Saving…" : "Save"}
        </button>
      )}
    </form>
  );
}
function CategoryEditor({
  category,
  roles,
  session,
  onBack,
}: {
  category: TicketCategoryData | null;
  roles: PlatformRole[];
  session: AuthSession;
  onBack: () => void;
}) {
  const [name, setName] = useState(category?.name ?? ""),
    [description, setDescription] = useState(category?.description ?? ""),
    [enabled, setEnabled] = useState(category?.enabled ?? true),
    [sensitive, setSensitive] = useState(category?.sensitive ?? false),
    [parent, setParent] = useState(category?.discordParentId ?? ""),
    [selected, setSelected] = useState(
      category?.roles.map((r) => r.roleId) ?? [],
    ),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(),
    client = useQueryClient();
  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      await request(
        `/v1/admin/ticket-categories${category ? `/${category.id}` : ""}`,
        category ? "PATCH" : "POST",
        {
          name,
          description,
          enabled,
          sensitive,
          discordParentId: parent.trim() || null,
          roleIds: selected,
        },
        session.csrfToken,
      );
      await client.invalidateQueries({ queryKey: ["admin-categories"] });
      await client.invalidateQueries({ queryKey: ["ticket-categories"] });
      onBack();
    } catch (error) {
      setError(error);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="portal-panel">
      <button className="text-button" onClick={onBack}>
        <ArrowLeft size={16} /> All categories
      </button>
      <h2>
        {category ? "Edit category access." : "Create a ticket category."}
      </h2>
      <form className="portal-form" onSubmit={save}>
        <div className="form-columns">
          <label>
            Category name
            <input
              required
              minLength={2}
              maxLength={80}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label>
            Discord parent category ID
            <input
              inputMode="numeric"
              pattern="[0-9]{17,20}"
              value={parent}
              onChange={(e) => setParent(e.target.value)}
              placeholder="Optional until Discord sync is configured"
            />
          </label>
        </div>
        <label>
          Description
          <textarea
            required
            minLength={5}
            maxLength={500}
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <fieldset className="role-checklist">
          <legend>Which staff roles can see these tickets?</legend>
          <p>
            Players see their own ticket only. Selected mapped roles receive
            access on both the website and its private Discord ticket channel.
            Founder always retains access.
          </p>
          {roles.map((role) => (
            <label className="check-label" key={role.id}>
              <input
                type="checkbox"
                checked={role.name === "Founder" || selected.includes(role.id)}
                disabled={role.name === "Founder"}
                onChange={(e) =>
                  setSelected((current) =>
                    e.target.checked
                      ? [...current, role.id]
                      : current.filter((id) => id !== role.id),
                  )
                }
              />
              <span>
                <strong>{role.name}</strong>
                <small>
                  {role.name === "Founder"
                    ? "Always has access"
                    : role.discordRoleId
                      ? `Discord role ${role.discordRoleId}`
                      : "Discord mapping not configured"}
                </small>
              </span>
            </label>
          ))}
        </fieldset>
        <label className="check-label">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
          />
          Accept new tickets in this category
        </label>
        <label className="check-label">
          <input
            type="checkbox"
            checked={sensitive}
            onChange={(e) => setSensitive(e.target.checked)}
          />
          Sensitive category
        </label>
        <p className="muted">
          Changing access updates existing Discord ticket permissions before
          saving. Discord administrators retain their built-in access.
        </p>
        <ErrorNotice error={error} />
        <button className="button primary" disabled={busy}>
          <Save size={16} />
          {busy ? "Applying access…" : "Save category"}
        </button>
      </form>
    </section>
  );
}
