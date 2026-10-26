import { useEffect, useId, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronDown, LogOut, LayoutDashboard } from "lucide-react";
import type { AuthSession } from "@velora/shared";
import { api } from "./api";
export default function AccountMenu({ session }: { session: AuthSession }) {
  const [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const root = useRef<HTMLDivElement>(null),
    trigger = useRef<HTMLButtonElement>(null),
    id = useId(),
    client = useQueryClient(),
    navigate = useNavigate();
  const name = session.user.discordUsername ?? session.user.username;
  useEffect(() => {
    if (!open) return;
    function outside(e: PointerEvent) {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    }
    function escape(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
      }
    }
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);
  return (
    <div
      className="header-account"
      ref={root}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false);
      }}
    >
      <button
        ref={trigger}
        className="button nav-login account-link"
        aria-label={`Account options for ${name}`}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(!open)}
      >
        <img
          src={
            session.user.avatar
              ? `https://cdn.discordapp.com/avatars/${session.user.discordId}/${session.user.avatar}.webp?size=80`
              : `https://cdn.discordapp.com/embed/avatars/${Number((BigInt(session.user.discordId) >> 22n) % 6n)}.png`
          }
          alt=""
        />
        <span>{name}</span>
        <ChevronDown size={15} />
      </button>
      {open && (
        <div id={id} className="account-dropdown">
          <div className="account-dropdown-person">
            <strong>{name}</strong>
            <span>ID · {session.user.discordId}</span>
          </div>
          <Link to="/dashboard" onClick={() => setOpen(false)}>
            <LayoutDashboard size={16} />
            Player Portal
          </Link>
          <button
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setError("");
              try {
                await api.logout(session.csrfToken);
                client.clear();
                setOpen(false);
                navigate("/");
              } catch {
                setOpen(true);
                setError("Sign-out failed. Please try again.");
                setBusy(false);
              }
            }}
          >
            <LogOut size={16} />
            {busy ? "Signing out…" : "Sign out"}
          </button>
          {error && <p role="alert">{error}</p>}
        </div>
      )}
    </div>
  );
}
