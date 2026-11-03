import { config } from "./config";

export function recordVisit() {
  if (window.location.hostname !== "playvelora.xyz" || !config.apiUrl) return;
  const id = crypto.randomUUID();
  const path =
    window.location.hash.slice(1).split("?")[0] || window.location.pathname;
  const publicPaths = ["/", "/applications", "/rules", "/join", "/dashboard"];
  let referrer = null;
  try {
    const host = new URL(document.referrer).hostname;
    if (host !== window.location.hostname && /^[a-z0-9.-]{1,253}$/i.test(host))
      referrer = host;
  } catch {
    /* Direct visit */
  }
  const post = (suffix: string, body: object) =>
    fetch(`${config.apiUrl}/v1/public/visits${suffix}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      keepalive: true,
    })
      .then((response) => response.ok)
      .catch(() => false);
  const recorded = post("", {
    id,
    path: publicPaths.includes(path) ? path : "/other",
    referrer,
  });
  document.addEventListener(
    "click",
    (event) => {
      const anchor =
        event.target instanceof Element ? event.target.closest("a") : null;
      if (
        anchor?.hostname === "cfx.re" &&
        anchor.pathname.startsWith("/join/")
      ) {
        void recorded.then((ok) => {
          if (ok) return post("/join", { id });
        });
      }
    },
    true,
  );
}
