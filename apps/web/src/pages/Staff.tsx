import { Link } from "react-router-dom";
import { PortalGate } from "../portal";
const applicationPermissions = [
  "applications.review",
  "applications.manage",
  "applications.openclose",
  "applications.accept",
  "applications.reject",
];
export default function Staff() {
  return (
    <PortalGate staff anyPermissions={applicationPermissions}>
      {(session) => (
        <>
          <div className="portal-heading">
            <div>
              <span className="eyebrow">APPLICATIONS</span>
              <h1>Your reviewer workspace.</h1>
              <p>Application tools available through your role permissions.</p>
            </div>
          </div>
          <div className="owner-grid">
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
                  Create forms or open and close intake as your permissions
                  allow.
                </p>
              </Link>
            )}
          </div>
        </>
      )}
    </PortalGate>
  );
}
