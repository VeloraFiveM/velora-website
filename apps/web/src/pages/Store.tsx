import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, ShoppingBag } from "lucide-react";
import { loadCatalogue, tebexStore, type StorePackage } from "../tebex";
import "./store.css";

function PackageDetails({ description }: { description: string }) {
  const body = new DOMParser().parseFromString(description, "text/html").body;
  const items = Array.from(body.querySelectorAll("li"), (item) =>
    item.textContent.trim(),
  ).filter(Boolean);
  if (items.length) {
    return (
      <ul>
        {items.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    );
  }
  body.querySelectorAll("br").forEach((br) => br.replaceWith("\n"));
  const text = body.textContent
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  return text.map((line, index) => <p key={index}>{line}</p>);
}

function ProductCard({
  item,
  featured,
}: {
  item: StorePackage;
  featured: boolean;
}) {
  const price = new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: item.currency,
    currencyDisplay: "narrowSymbol",
  }).format(item.total_price);
  const period = item.expiry_period;
  return (
    <article
      className={featured ? "store-package store-featured" : "store-package"}
    >
      {item.image && (
        <div className="store-art">
          <img src={item.image} alt="" loading="lazy" />
        </div>
      )}
      <div className="store-package-body">
        <h3>{item.name}</h3>
        <div className="store-price">
          <strong>{price}</strong> {item.currency}
          {period &&
            (period.count === 1
              ? ` / ${period.unit}`
              : ` / ${period.count} ${period.unit}s`)}
        </div>
        <details className="store-details" open={Boolean(period)}>
          <summary>Package details</summary>
          <PackageDetails description={item.description} />
        </details>
        <a
          className="store-buy"
          href={`${tebexStore}/package/${encodeURIComponent(item.ident || String(item.id))}`}
          aria-label={`Buy ${item.name} on Tebex`}
        >
          {period ? "View subscription" : "Buy on Tebex"}{" "}
          <ArrowUpRight size={17} aria-hidden />
        </a>
      </div>
    </article>
  );
}

export default function Store() {
  const catalogue = useQuery({
    queryKey: ["tebex-catalogue"],
    queryFn: ({ signal }) => loadCatalogue(signal),
  });
  const [selected, setSelected] = useState<number | null>(null);
  const categories = catalogue.data ?? [];
  const featured =
    selected === null
      ? categories
          .flatMap(({ packages }) =>
            packages.filter((item) => item.expiry_period),
          )
          .slice(0, 3)
      : [];
  const visible =
    selected === null
      ? categories
      : categories.filter(({ id }) => id === selected);
  const featuredIds = new Set(featured.map(({ ident }) => ident));

  return (
    <div className="page velora-store">
      <div className="store-hero">
        <img src={`${import.meta.env.BASE_URL}assets/velora-logo.png`} alt="" />
        <div>
          <h1>Velora Store</h1>
          <p>Velora Coins and monthly supporter packages</p>
        </div>
        <a className="store-external" href={tebexStore}>
          Open Tebex store <ArrowUpRight size={16} aria-hidden />
        </a>
      </div>
      {categories.length > 0 && (
        <nav className="store-categories" aria-label="Store categories">
          <button
            type="button"
            aria-pressed={selected === null}
            onClick={() => setSelected(null)}
          >
            All packages
          </button>
          {categories.map(({ id, name }) => (
            <button
              key={id}
              type="button"
              aria-pressed={selected === id}
              onClick={() => setSelected(id)}
            >
              {name}
            </button>
          ))}
        </nav>
      )}
      {catalogue.isPending && (
        <div role="status" className="store-category">
          <span className="sr-only">Loading packages</span>
          <div className="store-grid" aria-hidden="true">
            {[1, 2, 3].map((item) => (
              <div className="store-skeleton" key={item} />
            ))}
          </div>
        </div>
      )}
      {catalogue.isError && !categories.length && (
        <div className="store-status" role="status">
          <ShoppingBag size={24} aria-hidden />
          <p>Packages are temporarily unavailable.</p>
          <button
            type="button"
            className="button"
            onClick={() => void catalogue.refetch()}
          >
            Try again
          </button>
          <a href={tebexStore}>Shop on Tebex</a>
        </div>
      )}
      {catalogue.isSuccess && !categories.length && (
        <p className="store-status">No packages are available right now.</p>
      )}
      {featured.length > 0 && (
        <section className="store-category" aria-labelledby="store-featured">
          <h2 id="store-featured">Featured supporter packages</h2>
          <div className="store-grid">
            {featured.map((item) => (
              <ProductCard item={item} featured key={item.ident} />
            ))}
          </div>
        </section>
      )}
      {visible.map((category) => {
        const packages = category.packages.filter(
          (item) => !featuredIds.has(item.ident),
        );
        if (!packages.length) return null;
        return (
          <section
            className="store-category"
            key={category.id}
            aria-labelledby={`store-category-${category.id}`}
          >
            <h2 id={`store-category-${category.id}`}>{category.name}</h2>
            <div className="store-grid">
              {packages.map((item) => (
                <ProductCard item={item} featured={false} key={item.ident} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
