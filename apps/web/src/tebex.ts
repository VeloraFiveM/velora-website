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
export async function loadCatalogue(signal: AbortSignal) {
  const response = await fetch(
    `${api}${account}/categories?includePackages=1`,
    { signal },
  );
  if (!response.ok) throw new Error("Tebex catalogue unavailable");
  const { data } = (await response.json()) as { data: Category[] };
  return data.filter(({ packages }) => packages?.length > 0);
}
