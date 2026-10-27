export const isTablet =
  window.parent !== window &&
  new URLSearchParams(location.search).get("tablet") === "1";
const resource =
  new URLSearchParams(location.search).get("tablet_resource") ?? "spoon_tablet";
const parentOrigin = `https://cfx-nui-${/^[a-zA-Z0-9_-]{1,64}$/.test(resource) ? resource : "spoon_tablet"}`;
export function tabletOperation(
  path: string,
  method: string,
  body: unknown,
): { action: string; payload: unknown } | null {
  const p = new URL(path, "https://portal.invalid");
  const route = p.pathname;
  if (method === "GET") {
    if (route === "/v1/me") return { action: "session", payload: {} };
    if (route === "/v1/me/characters")
      return { action: "characters", payload: {} };
    if (route === "/v1/ticket-categories")
      return { action: "categories", payload: {} };
    if (route === "/v1/tickets") return { action: "tickets", payload: {} };
    if (route === "/v1/staff/tickets")
      return {
        action: "staffTickets",
        payload: { claimed: p.searchParams.get("claimed") === "me" },
      };
    const match = route.match(/^\/v1\/tickets\/([^/]+)$/);
    if (match)
      return {
        action: "ticket",
        payload: { id: decodeURIComponent(match[1]) },
      };
  }
  if (method === "POST" && route === "/v1/tickets")
    return { action: "createTicket", payload: body };
  const message = route.match(/^\/v1\/tickets\/([^/]+)\/messages$/);
  if (method === "POST" && message)
    return {
      action: "replyTicket",
      payload: { id: decodeURIComponent(message[1]), reply: body },
    };
  const ticket = route.match(/^\/v1\/tickets\/([^/]+)$/);
  if (ticket && method === "PATCH")
    return {
      action: "updateTicket",
      payload: { id: decodeURIComponent(ticket[1]), update: body },
    };
  if (ticket && method === "DELETE")
    return {
      action: "deleteTicket",
      payload: { id: decodeURIComponent(ticket[1]) },
    };
  return null;
}
export async function tabletRequest<T>(
  path: string,
  method: string,
  body: unknown,
): Promise<T> {
  if (method === "GET" && path === "/v1/me/notifications") return [] as T;
  const operation = tabletOperation(path, method, body);
  if (!operation)
    throw new Error(
      "This action is available on playvelora.xyz outside the in-city tablet.",
    );
  const op = operation;
  const id = crypto.randomUUID();
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      window.removeEventListener("message", receive);
      reject(
        new Error("The game server did not respond. Try reopening the tablet."),
      );
    }, 25000);
    function receive(event: MessageEvent) {
      if (
        event.source !== window.parent ||
        event.origin !== parentOrigin ||
        event.data?.type !== "velora:response" ||
        event.data?.id !== id
      )
        return;
      clearTimeout(timer);
      window.removeEventListener("message", receive);
      const result = event.data.result;
      if (!result?.ok) {
        reject(new Error(result?.error ?? "The tablet request failed."));
        return;
      }
      let data = result.data;
      if (op.action === "session")
        data = {
          ...data,
          csrfToken: "game-server-verified",
          expiresAt: new Date(Date.now() + 300000).toISOString(),
        };
      if (op.action === "characters")
        data = {
          characters: data,
          configured: true,
          lastSyncAt: data?.[0]?.observedAt ?? null,
        };
      resolve(data as T);
    }
    window.addEventListener("message", receive);
    window.parent.postMessage(
      { type: "velora:request", id, ...op },
      parentOrigin,
    );
  });
}

if (isTablet)
  window.addEventListener(
    "keydown",
    (event) => {
      if (event.key === "Escape" || event.key === "F9") {
        event.preventDefault();
        event.stopPropagation();
        window.parent.postMessage({ type: "velora:close" }, parentOrigin);
      }
    },
    true,
  );
