import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { CommunityActions, ServerStatus } from "../components";
export default function Home() {
  return (
    <section className="cinematic-hero">
      <img
        className="cinematic-backdrop"
        src={`${import.meta.env.BASE_URL}assets/velora-city-night.webp`}
        alt=""
        aria-hidden="true"
        fetchPriority="high"
      />
      <div className="cinematic-vignette" aria-hidden="true" />
      <div className="cinematic-content">
        <div className="cinematic-emblem">
          <img
            src={`${import.meta.env.BASE_URL}assets/velora-logo.png`}
            alt="Velora V emblem"
          />
        </div>
        <span className="eyebrow">WELCOME TO YOUR NEXT CHAPTER</span>
        <h1>VELORA</h1>
        <p className="hero-tagline">YOUR CITY. YOUR STORY.</p>
        <p className="hero-description">
          Every street has a story. This one is yours to write.
        </p>
        <CommunityActions cinematic />
      </div>
      <div className="cinematic-bottom">
        <ServerStatus />
        <Link to="/dashboard" className="scroll-link">
          PLAYER PORTAL <ArrowUpRight size={16} />
        </Link>
        <span>FIVEM ROLEPLAY COMMUNITY</span>
      </div>
    </section>
  );
}
