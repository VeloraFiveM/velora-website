import Rules from "./Rules";
import { Link, useParams } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { CommunityActions, News } from "../components";
import { config } from "../config";
function Heading({
  label,
  title,
  text,
}: {
  label: string;
  title: string;
  text: string;
}) {
  return (
    <div className="page-heading">
      <span className="eyebrow">{label}</span>
      <h1>{title}</h1>
      <p>{text}</p>
    </div>
  );
}
function About() {
  return (
    <>
      <Heading
        label="WELCOME TO VELORA"
        title="More than a city."
        text="A shared world shaped by the people who call it home."
      />
      <div className="about-layout">
        <img
          src={`${import.meta.env.BASE_URL}assets/velora-city-night.webp`}
          alt="A palm-lined boulevard overlooking the city at night"
          loading="lazy"
        />
        <div>
          <h2>
            Your character.
            <br />
            <span>Our shared story.</span>
          </h2>
          <p>
            Velora is a FiveM roleplay community for people who enjoy creating
            stories together. Build a character with somewhere to go, form
            connections, and let the unexpected shape what happens next.
          </p>
          <p>
            We value considered roleplay, respect for each other, and a
            welcoming community. Whether you are finding your first job or your
            next adventure, there is room to write your own chapter.
          </p>
          <CommunityActions />
        </div>
      </div>
      <div className="feature-grid">
        {[
          [
            "People first",
            "A memorable city starts with the people in it. Treat your fellow players as collaborators.",
          ],
          [
            "Room to grow",
            "Let your character develop through choices, consequences, and connections.",
          ],
          [
            "Stories together",
            "Create opportunities for others. The best scenes give everyone something to build on.",
          ],
        ].map(([title, text]) => (
          <article className="card" key={title}>
            <h3>{title}</h3>
            <p>{text}</p>
          </article>
        ))}
      </div>
    </>
  );
}
function Support() {
  return (
    <>
      <Heading
        label="APPLICATIONS"
        title="Your application portal."
        text="Submit applications and follow updates from our reviewers."
      />
      <Link className="button primary" to="/dashboard">
        Open your portal
      </Link>
    </>
  );
}
function Join() {
  return (
    <>
      <Heading
        label="A NEW CHAPTER"
        title="See you in the city."
        text="Everything you need to begin your Velora story."
      />
      <div className="join-steps">
        {[
          [
            "01",
            "Read the community rules",
            "Get familiar with our shared approach to roleplay.",
            "/rules",
          ],
          [
            "02",
            "Meet the community",
            "Join our Discord once the official invite is configured.",
            null,
          ],
          [
            "03",
            "Enter Velora",
            "Install FiveM and connect using the official server link.",
            null,
          ],
        ].map(([number, title, text, link]) => (
          <article className="card" key={number}>
            <span className="eyebrow">STEP {number}</span>
            <h2>{title}</h2>
            <p>{text}</p>
            {link ? (
              <Link className="inline-link" to={link}>
                Read guidelines <ArrowUpRight size={16} />
              </Link>
            ) : number === "02" && config.discord ? (
              <a
                className="button"
                href={config.discord}
                target="_blank"
                rel="noreferrer"
              >
                Join Discord
              </a>
            ) : number === "03" && config.connect ? (
              <a className="button primary" href={config.connect}>
                Connect to Velora
              </a>
            ) : (
              <span className="tag">Awaiting official configuration</span>
            )}
          </article>
        ))}
      </div>
    </>
  );
}
export default function Content() {
  const { page } = useParams();
  return (
    <div className={page === "rules" ? "page rules-page" : "page"}>
      {page === "about" ? (
        <About />
      ) : page === "rules" ? (
        <Rules />
      ) : page === "announcements" ? (
        <>
          <Heading
            label="THE COMMUNITY NOTICEBOARD"
            title="News from Velora."
            text="Official updates, community news, and the next chapter."
          />
          <News full />
        </>
      ) : page === "support" ? (
        <Support />
      ) : page === "join" ? (
        <Join />
      ) : page === "staff" || page === "admin" ? (
        <>
          <Heading
            label="RESTRICTED AREA"
            title="Staff access."
            text="Secure staff and owner authentication will be available after backend configuration."
          />
          <Link className="button" to="/">
            Back to Velora
          </Link>
        </>
      ) : (
        <>
          <Heading
            label="404 · LOST IN THE CITY"
            title="Let’s get you back."
            text="This page doesn’t exist, but your next chapter still does."
          />
          <Link className="button primary" to="/">
            Return home <ArrowUpRight size={16} />
          </Link>
        </>
      )}
    </div>
  );
}
