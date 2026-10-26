import { Link } from "react-router-dom";
import {
  ArrowDown,
  ArrowUpRight,
  Building2,
  Car,
  HeartHandshake,
  Shield,
  Waypoints,
  BriefcaseBusiness,
} from "lucide-react";
import { CommunityActions, News, ServerStatus } from "../components";
const features = [
  {
    icon: Building2,
    no: "01",
    title: "Make a life. Not just a character.",
    text: "Find your place in the city. Meet your neighbours, build a reputation, and turn everyday moments into a story worth telling.",
  },
  {
    icon: Car,
    no: "02",
    title: "Find your own lane.",
    text: "From the first car in your driveway to the business with your name on the door. Decide what success looks like to you.",
  },
  {
    icon: HeartHandshake,
    no: "03",
    title: "Good stories start with people.",
    text: "A community built around considered roleplay, mutual respect, and the people who make you want to come back.",
  },
];
export default function Home() {
  return (
    <>
      <section className="hero">
        <div className="hero-atmosphere" aria-hidden="true">
          <div className="orb orb-one" />
          <div className="orb orb-two" />
          <div className="horizon" />
          <div className="city-silhouette" />
          <div className="grid-floor" />
        </div>
        <div className="hero-content">
          <div className="hero-kicker">
            <span /> YOUR NEXT CHAPTER IS WAITING
          </div>
          <h1>
            A city of possibilities.
            <br />
            <span>A story that’s yours.</span>
          </h1>
          <p>
            Welcome to Velora. More than a place to play.
            <br />A place to belong, build, and become.
          </p>
          <CommunityActions />
          <div className="hero-note">
            FIVEM ROLEPLAY <span>✦</span> BUILT AROUND COMMUNITY
          </div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="art-ring" />
          <img
            src={`${import.meta.env.BASE_URL}assets/velora-logo.png`}
            alt=""
          />
          <span className="art-caption">EST. FOR THE STORIES STILL UNTOLD</span>
        </div>
        <div className="hero-bottom">
          <ServerStatus />
          <a
            href="#discover"
            className="scroll-link"
            onClick={(event) => {
              event.preventDefault();
              document.getElementById("discover")?.scrollIntoView();
            }}
          >
            Discover Velora <ArrowDown size={15} />
          </a>
        </div>
      </section>
      <section id="discover" className="section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">THIS IS YOUR CITY</span>
            <h2>
              Come for the roleplay.
              <br />
              <span>Stay for the people.</span>
            </h2>
          </div>
          <p>
            A fresh start. Familiar faces. Unexpected turns.
            <br />
            Find the life you want to live in Velora.
          </p>
        </div>
        <div className="feature-grid">
          {features.map(({ icon: Icon, no, title, text }) => (
            <article className="feature" key={no}>
              <div className="feature-top">
                <Icon size={25} />
                <span>{no}</span>
              </div>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
        <Link to="/about" className="inline-link">
          Get to know Velora <ArrowUpRight size={17} />
        </Link>
      </section>
      <section className="path-section section">
        <div>
          <span className="eyebrow">THERE’S MORE THAN ONE WAY IN</span>
          <h2>
            What will your
            <br />
            <span>story look like?</span>
          </h2>
          <p>
            Build something honest. Answer the call.
            <br />
            Or see where the city takes you.
          </p>
        </div>
        <div className="paths">
          <Link to="/about">
            <BriefcaseBusiness />
            <div>
              <h3>Build your future</h3>
              <p>Business, ambition, and a life of your own.</p>
            </div>
            <ArrowUpRight />
          </Link>
          <Link to="/applications">
            <Shield />
            <div>
              <h3>Make a difference</h3>
              <p>Explore community application opportunities.</p>
            </div>
            <ArrowUpRight />
          </Link>
          <Link to="/rules">
            <Waypoints />
            <div>
              <h3>Know the city</h3>
              <p>Great roleplay starts on the same page.</p>
            </div>
            <ArrowUpRight />
          </Link>
        </div>
      </section>
      <section className="section news-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">FROM THE COMMUNITY</span>
            <h2>
              The latest in <span>Velora.</span>
            </h2>
          </div>
          <Link className="inline-link" to="/announcements">
            All announcements <ArrowUpRight size={17} />
          </Link>
        </div>
        <News />
      </section>
      <section className="join-banner">
        <span className="eyebrow">EVERY STORY STARTS SOMEWHERE</span>
        <h2>
          Yours starts <span>here.</span>
        </h2>
        <p>The next chapter is waiting. Make it yours.</p>
        <CommunityActions />
      </section>
    </>
  );
}
