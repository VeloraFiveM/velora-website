import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight } from "lucide-react";
import {
  loadCatalogue,
  preloadCheckout,
  resumePurchase,
  startPurchase,
  tebexStore,
  type StorePackage,
} from "../tebex";
import "./store.css";

function PackageDescription({ description }: { description: string }) {
  const doc = new DOMParser().parseFromString(description, "text/html");
  const lines = Array.from(doc.body.querySelectorAll("li"), (item) =>
    item.textContent.trim(),
  ).filter(Boolean);
  if (lines.length) {
    return (
      <ul>
        {lines.map((line, index) => (
          <li key={index}>{line}</li>
        ))}
      </ul>
    );
  }
  doc.body.querySelectorAll("br").forEach((br) => br.replaceWith("\n"));
  return <p>{doc.body.textContent.trim()}</p>;
}

function packagePrice(item: StorePackage) {
  const price = new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: item.currency,
    currencyDisplay: "code",
  }).format(item.total_price);
  if (!item.expiry_period) return price;
  const { count, unit } = item.expiry_period;
  return count === 1 ? `${price} / ${unit}` : `${price} / ${count} ${unit}s`;
}

export default function Store() {
  const catalogue = useQuery({
    queryKey: ["tebex-catalogue"],
    queryFn: ({ signal }) => loadCatalogue(signal),
  });
  const resume = useRef<ReturnType<typeof resumePurchase> | null>(null);
  const [checkout, setCheckout] =
    useState<Awaited<ReturnType<typeof resumePurchase>>>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    resume.current ??= resumePurchase();
    void resume.current.then(
      (result) => {
        if (!active) return;
        if (result) preloadCheckout();
        setCheckout(result);
        setBusy(false);
      },
      () => {
        if (!active) return;
        setError("Checkout could not resume. Choose a package to try again.");
        setBusy(false);
      },
    );
    return () => {
      active = false;
    };
  }, []);

  async function buy(item: StorePackage) {
    setBusy(true);
    setError("");
    try {
      await startPurchase(item.ident);
    } catch {
      setError(
        "FiveM sign-in could not start. Try again or open the Tebex store.",
      );
      setBusy(false);
    }
  }

  function openCheckout() {
    if (!checkout) return;
    try {
      if (window.Tebex) {
        window.Tebex.checkout.init({ ident: checkout.ident, theme: "dark" });
        window.Tebex.checkout.launch();
        return;
      }
    } catch {
      // The same basket can be opened on Tebex if its SDK is unavailable.
    }
    window.location.assign(checkout.url);
  }

  return (
    <div className="page velora-store">
      <div className="store-hero">
        <img
          src={`${import.meta.env.BASE_URL}assets/velora-logo.png`}
          alt="Velora"
        />
        <div>
          <h1>Velora Store</h1>
          <p>Browse Velora Coins and monthly supporter packages.</p>
          <a href={tebexStore}>
            Open Tebex store <ArrowUpRight size={16} aria-hidden />
          </a>
        </div>
      </div>
      {error && (
        <p className="store-status" role="alert">
          {error}
        </p>
      )}
      {checkout && (
        <div className="store-status store-checkout">
          <p>Your package is ready for checkout.</p>
          <button type="button" className="button" onClick={openCheckout}>
            Open checkout
          </button>
          <a href={checkout.url}>Open on Tebex</a>
        </div>
      )}
      {catalogue.isPending && (
        <p className="store-status" role="status">
          Loading packages…
        </p>
      )}
      {catalogue.isError && (
        <p className="store-status" role="status">
          Packages are temporarily unavailable. You can still shop on Tebex.
        </p>
      )}
      {catalogue.data?.length === 0 && (
        <p className="store-status">
          There are no packages available right now.
        </p>
      )}
      {catalogue.data?.map((category) => (
        <section
          className="store-category"
          key={category.id}
          aria-labelledby={`store-category-${category.id}`}
        >
          <h2 id={`store-category-${category.id}`}>{category.name}</h2>
          <div className="store-grid">
            {category.packages.map((item) => (
              <article className="store-package" key={item.ident}>
                {item.image && <img src={item.image} alt="" loading="lazy" />}
                <div className="store-package-body">
                  <h3>{item.name}</h3>
                  <PackageDescription description={item.description} />
                  <div className="store-package-action">
                    <strong>{packagePrice(item)}</strong>
                    <button
                      type="button"
                      className="button"
                      disabled={busy}
                      onClick={() => void buy(item)}
                      aria-label={`Continue with ${item.name}`}
                    >
                      Continue with FiveM
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
