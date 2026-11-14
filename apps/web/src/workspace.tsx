import type { ReactNode } from "react";

export function WorkspaceHeading({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="workspace-heading">
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}

export function ApplicationStatus({ status }: { status: string }) {
  return (
    <span className="application-status workspace-status" data-status={status}>
      {status.toLowerCase().replaceAll("_", " ")}
    </span>
  );
}

export function WorkspaceLoading({ label }: { label: string }) {
  return (
    <div className="workspace-loading" role="status">
      <span className="sr-only">{label}</span>
      <span />
      <span />
      <span />
    </div>
  );
}
