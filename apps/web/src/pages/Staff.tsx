import { ArrowRight, ClipboardCheck, FileCog } from "lucide-react";
import { Link } from "react-router-dom";
import { PortalGate } from "../portal";
import { WorkspaceHeading } from "../workspace";

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
          <WorkspaceHeading
            title="Staff workspace"
            description={`Signed in as ${session.user.username}. Manage application intake and review submissions.`}
          />
          <section
            className="portal-panel workspace-tools"
            aria-labelledby="staff-tools"
          >
            <h2 id="staff-tools">Application management</h2>
            {(session.isOwner ||
              session.permissions.includes("applications.review")) && (
              <Link className="workspace-tool" to="/staff-applications">
                <ClipboardCheck size={22} aria-hidden />
                <span>
                  <strong>Review queue</strong>
                  <small>Read submissions and record review outcomes.</small>
                </span>
                <ArrowRight size={18} aria-hidden />
              </Link>
            )}
            {(session.isOwner ||
              session.permissions.some((p) =>
                ["applications.manage", "applications.openclose"].includes(p),
              )) && (
              <Link className="workspace-tool" to="/application-forms">
                <FileCog size={22} aria-hidden />
                <span>
                  <strong>Application forms</strong>
                  <small>Manage forms and application intake.</small>
                </span>
                <ArrowRight size={18} aria-hidden />
              </Link>
            )}
          </section>
        </>
      )}
    </PortalGate>
  );
}
