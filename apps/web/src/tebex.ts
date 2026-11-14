export const tebexStore = "https://veloraau.tebex.store";
const api = "https://headless.tebex.io/api";
// Public token published by the Velora Tebex storefront.
const account = `/accounts/13z60-6c93463240a9eb34e98fe3e40f4073d101211676`;

export type StorePackage = {
  id: number;
  ident: string;
  name: string;
  description: string;
  image: string | null;
  total_price: number;
  currency: string;
  expiry_period?: { count: number; unit: string };
};
type Category = { id: number; name: string; packages: StorePackage[] };
type Basket = {
  ident: string;
  username: string | null;
  username_id: number | string | null;
  complete: boolean;
  links: { checkout?: string };
};

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(api + path, options);
  if (!response.ok) throw new Error("Tebex request failed");
  return response.json() as Promise<T>;
}

function json(body: object): RequestInit {
  return {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

export async function loadCatalogue(signal: AbortSignal) {
  const { data } = await request<{ data: Category[] }>(
    `${account}/categories?includePackages=1`,
    { signal },
  );
  return data.filter(({ packages }) => packages.length > 0);
}

export async function startPurchase(packageId: string) {
  const returnUrl = new URL(window.location.href);
  returnUrl.hash = "/store";
  const { data: basket } = await request<{ data: Basket }>(
    `${account}/baskets`,
    json({ complete_url: returnUrl.href, cancel_url: returnUrl.href }),
  );
  const auth = await request<{ name: string; url: string }[]>(
    `${account}/baskets/${encodeURIComponent(basket.ident)}/auth?${new URLSearchParams({ returnUrl: returnUrl.href })}`,
  );
  const fiveM = auth.find(({ name }) => name === "FiveM");
  if (!fiveM || new URL(fiveM.url).origin !== "https://ident.tebex.io") {
    throw new Error("FiveM sign-in is unavailable");
  }
  sessionStorage.setItem(
    "velora-tebex-purchase",
    JSON.stringify({ basketId: basket.ident, packageId }),
  );
  window.location.assign(fiveM.url);
}

export async function resumePurchase() {
  const pending = sessionStorage.getItem("velora-tebex-purchase");
  if (!pending) return null;
  // Claim the pending purchase before making requests so a reload cannot add it twice.
  sessionStorage.removeItem("velora-tebex-purchase");
  const { basketId, packageId } = JSON.parse(pending) as {
    basketId: string;
    packageId: string;
  };
  const id = encodeURIComponent(basketId);
  const { data: basket } = await request<{ data: Basket }>(
    `${account}/baskets/${id}`,
  );
  if (basket.complete || (!basket.username && !basket.username_id)) {
    throw new Error("FiveM sign-in was not completed");
  }
  const result = await request<Basket | { data: Basket }>(
    `/baskets/${id}/packages`,
    json({ package_id: packageId, quantity: 1 }),
  );
  const updated = "data" in result ? result.data : result;
  const url = new URL(updated.links.checkout ?? "");
  if (url.origin !== "https://checkout.tebex.io")
    throw new Error("Invalid checkout URL");
  return { ident: updated.ident, url: url.href };
}

declare global {
  interface Window {
    Tebex?: {
      checkout: {
        init(options: { ident: string; theme: "dark" }): void;
        launch(): void;
      };
    };
  }
}

export function preloadCheckout() {
  if (document.querySelector("#tebex-checkout-sdk")) return;
  const script = document.createElement("script");
  script.id = "tebex-checkout-sdk";
  script.src = "https://js.tebex.io/v/1.js";
  script.async = true;
  document.head.append(script);
}
