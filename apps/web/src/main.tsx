import React, { lazy, Suspense, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  HashRouter,
  NavLink,
  Link,
  Route,
  Routes,
  useLocation,
  Navigate,
} from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { config } from "./config";
import "./styles.css";
import "./redesign.css";
const Home = lazy(() => import("./pages/Home"));
const Content = lazy(() => import("./pages/Content"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Tickets = lazy(() => import("./pages/Tickets"));
const Owner = lazy(() => import("./pages/Owner"));
const ApplicationPages = lazy(() => import("./pages/Applications"));
const ApplicationForms = lazy(() => import("./pages/ApplicationForms"));
const Staff = lazy(() => import("./pages/Staff"));
const Transcripts = lazy(() => import("./pages/Transcripts"));
const DiscordManagement = lazy(() => import("./pages/DiscordManagement"));
const Management = lazy(() => import("./pages/Management"));
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30000, refetchOnWindowFocus: false },
  },
});
const logo = `${import.meta.env.BASE_URL}assets/velora-logo.png`;
const navigation = [
  ["/", "Home"],
  ["/rules", "Rules"],
  ["/applications", "Applications"],
  ["/support", "Support"],
];
function Splash() {
  const reduced = useReducedMotion();
  const [visible, setVisible] = useState(() => {
    try {
      return !sessionStorage.getItem("velora-intro");
    } catch {
      return false;
    }
  });
  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(
      () => {
        setVisible(false);
        try {
          sessionStorage.setItem("velora-intro", "1");
        } catch {
          /* Browsing remains available without storage. */
        }
      },
      reduced ? 0 : 850,
    );
    return () => clearTimeout(timer);
  }, [visible, reduced]);
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduced ? 0 : 0.25 }}
          aria-label="Welcome to Velora"
        >
          <div className="splash-emblem">
            <img src={logo} alt="Velora" />
            <i aria-hidden="true" />
          </div>
          <strong>VELORA</strong>
          <span>YOUR CITY. YOUR STORY.</span>
          <div className="intro-line" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
function Layout() {
  const [menu, setMenu] = useState(false);
  const location = useLocation();
  const reduced = useReducedMotion();
  const [scrolled, setScrolled] = useState(false);
  const portalRoute =
    /^\/(dashboard|tickets|staff|admin|manage-discord|transcripts|owner|my-applications|staff-tickets|staff-applications|application-forms)(\/|$)/.test(
      location.pathname,
    );
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => {
    setMenu(false);
    window.scrollTo({ top: 0, behavior: "instant" });
    document.title = `${navigation.find(([path]) => path === location.pathname)?.[1] ?? { "/dashboard": "Player portal", "/tickets": "My tickets", "/staff": "Staff", "/staff-tickets": "Staff tickets", "/my-applications": "My Applications", "/staff-applications": "Application review", "/application-forms": "Application forms", "/owner": "Owner", "/admin": "Management", "/manage-discord": "Manage Discord", "/transcripts": "Transcripts" }[location.pathname] ?? "Community"} · Velora`;
    document.getElementById("main")?.focus({ preventScroll: true });
  }, [location.pathname]);
  return (
    <>
      <a
        className="skip"
        href="#main"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById("main")?.focus({ preventScroll: true });
          document.getElementById("main")?.scrollIntoView();
        }}
      >
        Skip to content
      </a>
      <Splash />
      <header
        className={`${scrolled ? "is-scrolled" : ""} ${portalRoute ? "portal-header" : ""}`}
      >
        <Link to="/" className="brand" aria-label="Velora home">
          <img src={logo} alt="" />
          <span>
            VELORA<span className="brand-sub">ROLEPLAY COMMUNITY</span>
          </span>
        </Link>
        <button
          className="mobile-toggle"
          onClick={() => setMenu(!menu)}
          aria-expanded={menu}
          aria-label={menu ? "Close navigation" : "Open navigation"}
        >
          {menu ? <X /> : <Menu />}
        </button>
        <nav aria-label="Main navigation" className={menu ? "open" : ""}>
          {navigation.map(([path, label]) => (
            <NavLink key={path} to={path} end={path === "/"}>
              {label}
            </NavLink>
          ))}
        </nav>
        <Link className="button nav-login" to="/dashboard">
          Player portal <ArrowUpRight size={15} />
        </Link>
      </header>
      <main
        id="main"
        tabIndex={-1}
        className={portalRoute ? "portal-route" : ""}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: reduced ? 0 : 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.18 }}
          >
            <Suspense
              fallback={
                <div className="page skeleton" role="status">
                  Loading Velora…
                </div>
              }
            >
              <Routes location={location}>
                <Route path="/" element={<Home />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/tickets" element={<Tickets />} />
                <Route path="/staff" element={<Staff />} />
                <Route path="/staff-tickets" element={<Tickets staff />} />
                <Route path="/owner/:section?" element={<Owner />} />
                <Route
                  path="/applications"
                  element={<ApplicationPages mode="catalog" />}
                />
                <Route
                  path="/my-applications"
                  element={<ApplicationPages mode="mine" />}
                />
                <Route
                  path="/staff-applications"
                  element={<ApplicationPages mode="review" />}
                />
                <Route
                  path="/application-forms"
                  element={<ApplicationForms />}
                />
                <Route path="/about" element={<Navigate to="/" replace />} />
                <Route
                  path="/announcements"
                  element={<Navigate to="/" replace />}
                />
                <Route path="/admin" element={<Management />} />
                <Route path="/transcripts" element={<Transcripts />} />
                <Route path="/manage-discord" element={<DiscordManagement />} />
                <Route path="/:page" element={<Content />} />
                <Route path="*" element={<Content />} />
              </Routes>
            </Suspense>
          </motion.div>
        </AnimatePresence>
      </main>
      {!portalRoute && (
        <footer>
          <Link className="footer-brand" to="/">
            VELORA<span> A city. A community. Your story.</span>
          </Link>
          <div>
            <Link to="/rules">Community rules</Link>
            <Link to="/support">Get support</Link>
            {config.discord && (
              <a href={config.discord} target="_blank" rel="noreferrer">
                Discord ↗
              </a>
            )}
          </div>
          <small>
            © {new Date().getFullYear()} Velora. Independent FiveM community.
            <br />
            Not affiliated with Rockstar Games or Take-Two Interactive.
          </small>
        </footer>
      )}
    </>
  );
}
class ErrorBoundary extends React.Component<
  React.PropsWithChildren,
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div className="page">
        <h1>Something interrupted your visit.</h1>
        <p>Reload the page to try again.</p>
        <button className="button" onClick={() => window.location.reload()}>
          Reload
        </button>
      </div>
    ) : (
      this.props.children
    );
  }
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <HashRouter>
          <Layout />
        </HashRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
