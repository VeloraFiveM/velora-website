import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Search,
  ArrowUpRight,
  ShieldCheck,
  LifeBuoy,
  MessageSquare,
  BookOpen,
  ChevronDown,
} from "lucide-react";
import { CommunityActions, News, ServerStatus } from "../components";
import { config } from "../config";
const draftRules = [
  {
    category: "Community conduct",
    items: [
      [
        "Respect the people behind the characters",
        "Treat every player with respect. Harassment, discrimination, threats, and sharing personal information have no place in Velora.",
      ],
      [
        "Keep the community fair",
        "Do not exploit bugs, cheat, or use third-party tools to gain an unfair advantage. Report problems privately to staff.",
      ],
    ],
  },
  {
    category: "Roleplay fundamentals",
    items: [
      [
        "Let the story breathe",
        "Give other players a fair opportunity to participate. Keep in-character conflict separate from out-of-character relationships.",
      ],
      [
        "Play with what your character knows",
        "Do not use information from streams, Discord, or other out-of-character sources to influence your character’s decisions.",
      ],
      [
        "Value your character’s life",
        "Respond to danger with believable care for your character and those around them.",
      ],
    ],
  },
  {
    category: "Support and reports",
    items: [
      [
        "Resolve issues through support",
        "Keep disputes out of public channels. Provide clear context and available evidence when asking staff for help.",
      ],
    ],
  },
];
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
function Rules() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All categories");
  const filtered = draftRules
    .filter(
      (group) => category === "All categories" || group.category === category,
    )
    .map((group) => ({
      ...group,
      items: group.items.filter((item) =>
        item.join(" ").toLowerCase().includes(search.toLowerCase()),
      ),
    }))
    .filter((group) => group.items.length);
  return (
    <>
      <Heading
        label="THE SAME PAGE. A BETTER CITY."
        title="Community rules."
        text="A shared foundation for the stories we create together."
      />
      <div className="notice">
        <BookOpen size={19} />
        <p>
          Proposed community guidelines · These starter guidelines need owner
          review before becoming official server rules.
        </p>
      </div>
      <div className="rule-tools">
        <label className="search">
          <Search size={18} />
          <input
            type="search"
            aria-label="Search rules"
            placeholder="Search the guidelines…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <label className="sr-only" htmlFor="category">
          Rule category
        </label>
        <select
          id="category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          {["All categories", ...draftRules.map((group) => group.category)].map(
            (value) => (
              <option key={value}>{value}</option>
            ),
          )}
        </select>
      </div>
      {filtered.length ? (
        filtered.map((group) => (
          <section className="rule-group" key={group.category}>
            <h2>{group.category}</h2>
            {group.items.map(([title, text]) => (
              <details className="rule" key={title} open={!!search}>
                <summary>
                  {title}
                  <ChevronDown size={17} />
                </summary>
                <p>{text}</p>
              </details>
            ))}
          </section>
        ))
      ) : (
        <p className="empty">No guidelines match your search.</p>
      )}
    </>
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
        label="WE’RE HERE TO HELP"
        title="A little help goes a long way."
        text="Find the right place for your question, concern, or report."
      />
      <div className="feature-grid">
        {[
          {
            icon: LifeBuoy,
            title: "General support",
            text: "Questions about joining the community or finding your way around.",
          },
          {
            icon: ShieldCheck,
            title: "Reports & appeals",
            text: "Player reports, appeals, and sensitive concerns handled by authorised staff.",
          },
          {
            icon: MessageSquare,
            title: "Bugs & feedback",
            text: "Help improve the city with clear details about an issue or idea.",
          },
        ].map(({ icon: Icon, title, text }) => (
          <article className="card" key={title}>
            <Icon className="accent" />
            <h3>{title}</h3>
            <p>{text}</p>
          </article>
        ))}
      </div>
      <div className="notice">
        <LifeBuoy size={22} />
        <div>
          <h3>Private support. A clear conversation.</h3>
          <p>
            Sign in to open a ticket, send private evidence, and follow the
            conversation with our team. Your ticket is only visible to you and
            the staff authorised for its category.
          </p>
          <Link className="button primary" to="/tickets">
            Open your support portal <ArrowUpRight size={16} />
          </Link>
          {config.discord ? (
            <a
              className="inline-link"
              href={config.discord}
              target="_blank"
              rel="noreferrer"
            >
              Visit community Discord <ArrowUpRight size={15} />
            </a>
          ) : (
            <p>The community Discord invite has not been configured.</p>
          )}
        </div>
      </div>
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
      <ServerStatus />
    </>
  );
}
export default function Content() {
  const { page } = useParams();
  return (
    <div className="page">
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
