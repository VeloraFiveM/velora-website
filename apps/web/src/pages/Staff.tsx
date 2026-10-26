import { Link, useSearchParams } from "react-router-dom";
import { PortalGate } from "../portal";
import { permissions } from "@velora/shared";
import Tickets from "./Tickets";
export default function Staff() {
  const [params] = useSearchParams();
  if (params.has("ticket")) return <Tickets staff />;
  return (
    <PortalGate staff anyPermissions={[...permissions]}>
      {(session) => (
        <>
          <div className="portal-heading">
            <div>
              <span className="eyebrow">STAFF</span>
              <h1>Your staff workspace.</h1>
              <p>Tools available through your role permissions.</p>
            </div>
          </div>
          <div className="owner-grid">
            {(session.isOwner ||
              session.permissions.includes("tickets.view")) && (
              <>
                <Link className="portal-panel" to="/staff-tickets">
                  <h2>Ticket desk</h2>
                  <p>View and manage permitted ticket categories.</p>
                </Link>
                <Link className="portal-panel" to="/staff-tickets?claimed=me">
                  <h2>Claimed By Me</h2>
                  <p>Tickets currently assigned to you.</p>
                </Link>
              </>
            )}
            {(session.isOwner ||
              session.permissions.includes("applications.review")) && (
              <Link className="portal-panel" to="/staff-applications">
                <h2>Review applications</h2>
                <p>Review submissions assigned to your roles.</p>
              </Link>
            )}
            {(session.isOwner ||
              session.permissions.some((p) =>
                ["applications.manage", "applications.openclose"].includes(p),
              )) && (
              <Link className="portal-panel" to="/application-forms">
                <h2>Application forms</h2>
                <p>
                  Create forms or open and close intake, as your permissions
                  allow.
                </p>
              </Link>
            )}
            {(session.isOwner ||
              session.permissions.includes("transcripts.view")) && (
              <Link className="portal-panel" to="/transcripts">
                <h2>Transcripts</h2>
                <p>Read permitted closed and deleted ticket conversations.</p>
              </Link>
            )}
            {(session.isOwner ||
              session.permissions.includes("tickets.manage")) && (
              <Link className="portal-panel" to="/admin">
                <h2>Ticket categories</h2>
                <p>Manage category settings and access.</p>
              </Link>
            )}
          </div>
        </>
      )}
    </PortalGate>
  );
}
