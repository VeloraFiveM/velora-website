import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import {
  BookOpen,
  Search,
  Copy,
  Link2,
  ArrowLeft,
  ArrowRight,
  MessageSquare,
} from "lucide-react";
import { defaultRulesPage, type RulesPage } from "@velora/shared";
import { request } from "../api";
import { config } from "../config";
const slug = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
export default function Rules() {
  const rules = useQuery({
    queryKey: ["public-rules"],
    queryFn: () => request<RulesPage>("/v1/public/rules"),
    enabled: !!config.apiUrl,
    refetchOnWindowFocus: true,
  });
  const [params, setParams] = useSearchParams(),
    [search, setSearch] = useState(""),
    [copied, setCopied] = useState(""),
    [manualCopy, setManualCopy] = useState("");
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (
        e.key === "/" &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey &&
        !(
          e.target instanceof HTMLElement &&
          e.target.closest("input,textarea,select,[contenteditable=true]")
        )
      ) {
        e.preventDefault();
        input.current?.focus();
      }
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, []);
  const page = rules.data ?? defaultRulesPage;
  let number = 0;
  const duplicates = new Map<string, number>();
  const groups = page.groups.map((group) => ({
    ...group,
    rules: group.items.map(([title, body]) => {
      const base = `${slug(group.category)}--${slug(title)}`,
        duplicate = duplicates.get(base) ?? 0;
      duplicates.set(base, duplicate + 1);
      return {
        id: base + (duplicate ? `-${duplicate + 1}` : ""),
        code: `R${++number}`,
        title,
        body,
        category: group.category,
        index: number - 1,
      };
    }),
  }));
  const all = groups.flatMap((g) => g.rules),
    requested = params.get("rule"),
    current =
      all.find(
        (r) =>
          r.id === requested ||
          r.code.toLowerCase() === requested?.toLowerCase(),
      ) ?? (!requested ? all[0] : undefined);
  const filtered = groups
    .map((g) => ({
      ...g,
      rules: g.rules.filter((r) =>
        /^r\d+$/i.test(search.trim())
          ? r.code.toLowerCase() === search.trim().toLowerCase()
          : `${r.code} ${r.title} ${r.body} ${r.category}`
              .toLowerCase()
              .includes(search.trim().toLowerCase()),
      ),
    }))
    .filter((g) => g.rules.length);
  useEffect(() => {
    setCopied("");
    setManualCopy("");
  }, [requested]);
  function choose(id: string) {
    setParams({ rule: id }, { replace: false });
    setCopied("");
    setManualCopy("");
  }
  async function copy(ticket = false) {
    if (!current) return;
    const url = new URL(window.location.href);
    url.hash = `/rules?rule=${encodeURIComponent(current.id)}`;
    const text = ticket
      ? `${current.code} — ${current.title}\nCategory: ${current.category}\n\n${current.body}\n\nRule: ${url.href}`
      : url.href;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(
        ticket ? "Rule and link copied for your ticket." : "Rule link copied.",
      );
      setManualCopy("");
    } catch {
      setCopied("Clipboard unavailable. Copy the text below.");
      setManualCopy(text);
    }
  }
  if (config.apiUrl && rules.isPending)
    return <p role="status">Loading community rules…</p>;
  if (config.apiUrl && rules.isError && !rules.data)
    return (
      <section className="portal-panel">
        <h1>Rules are temporarily unavailable.</h1>
        <p>Please try again before relying on an older copy.</p>
        <button className="button" onClick={() => void rules.refetch()}>
          Try again
        </button>
      </section>
    );
  return (
    <>
      <div className="rule-browser-heading">
        <div>
          <span className="eyebrow">VELORA COMMUNITY</span>
          <h1>{page.title}</h1>
          <p className="rule-browser-meta">
            {groups.length} categories <span>·</span> {all.length} rules
          </p>
        </div>
        <label className="rule-browser-search">
          <Search size={19} />
          <input
            ref={input}
            type="search"
            aria-label="Search rules"
            placeholder="Search the rules, or type a number like R1"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <kbd>/</kbd>
        </label>
      </div>
      <div className="rule-category-tabs" aria-label="Rule categories">
        {groups.map((g) => (
          <button
            key={g.category}
            className={current?.category === g.category ? "active" : ""}
            onClick={() => {
              setSearch("");
              choose(g.rules[0].id);
            }}
            aria-pressed={current?.category === g.category}
          >
            <BookOpen size={15} />
            {g.category}
            <span>{g.rules.length}</span>
          </button>
        ))}
      </div>
      <div className="rule-browser-shell">
        <aside className="rule-browser-index" aria-label="All rules">
          {filtered.length ? (
            filtered.map((g) => (
              <section key={g.category}>
                <h2>
                  <BookOpen size={16} />
                  <span>{g.category}</span>
                  <small>{g.rules.length}</small>
                </h2>
                {g.rules.map((r) => (
                  <button
                    key={r.id}
                    aria-current={r.id === current?.id ? "true" : undefined}
                    className={r.id === current?.id ? "selected" : ""}
                    onClick={() => choose(r.id)}
                  >
                    <span>{r.code}</span>
                    <strong>{r.title}</strong>
                  </button>
                ))}
              </section>
            ))
          ) : (
            <p className="rule-index-empty">No rules match your search.</p>
          )}
        </aside>
        {current ? (
          <article className="rule-browser-detail" aria-label="Selected rule">
            <div className="rule-detail-heading">
              <span className="rule-watermark" aria-hidden="true">
                {current.code}
              </span>
              <div className="rule-detail-meta">
                <span>
                  <BookOpen size={15} />
                  {current.category}
                </span>
                <small>
                  Rule {current.index + 1} of {all.length} ·{" "}
                  {
                    groups.find((g) => g.category === current.category)!.rules
                      .length
                  }{" "}
                  in this category
                </small>
              </div>
              <h2>
                <span className="rule-code">{current.code}</span>
                {current.title}
              </h2>
            </div>
            <div className="rule-detail-body">
              {current.body.split(/\n\s*\n/).map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
              <div className="rule-related">
                <h3>More in {current.category}</h3>
                {groups
                  .find((g) => g.category === current.category)!
                  .rules.filter((r) => r.id !== current.id)
                  .map((r) => (
                    <button key={r.id} onClick={() => choose(r.id)}>
                      <span>{r.code}</span>
                      {r.title}
                      <ArrowRight size={14} />
                    </button>
                  ))}
              </div>
            </div>
            <div className="rule-detail-actions">
              <div className="rule-copy-actions">
                <button className="button" onClick={() => void copy()}>
                  <Link2 size={16} />
                  Copy rule link
                </button>
                <button className="button" onClick={() => void copy(true)}>
                  <Copy size={16} />
                  Copy for a ticket
                </button>
              </div>
              <p className="rule-copy-status" role="status">
                {copied}
              </p>
              {manualCopy && (
                <textarea
                  readOnly
                  rows={6}
                  aria-label="Rule text to copy"
                  value={manualCopy}
                  onFocus={(e) => e.target.select()}
                />
              )}
              <div className="rule-pagination">
                <button
                  disabled={current.index === 0}
                  onClick={() => choose(all[current.index - 1].id)}
                >
                  <ArrowLeft size={17} />
                  <span>
                    <small>Previous rule</small>
                    {all[current.index - 1]
                      ? `${all[current.index - 1].code} ${all[current.index - 1].title}`
                      : "Start of the rules"}
                  </span>
                </button>
                <button
                  disabled={current.index === all.length - 1}
                  onClick={() => choose(all[current.index + 1].id)}
                >
                  <span>
                    <small>Next rule</small>
                    {all[current.index + 1]
                      ? `${all[current.index + 1].code} ${all[current.index + 1].title}`
                      : "End of the rules"}
                  </span>
                  <ArrowRight size={17} />
                </button>
              </div>
            </div>
          </article>
        ) : (
          <section className="rule-not-found">
            <h2>This rule link is no longer available.</h2>
            <p>Choose a rule from the list to read the current version.</p>
          </section>
        )}
      </div>
      <div className="rule-browser-note">
        <div>
          <p>{page.description}</p>
          {page.notice && <p>{page.notice}</p>}
        </div>
        <Link className="button" to="/tickets">
          <MessageSquare size={16} />
          Open a ticket
        </Link>
      </div>
    </>
  );
}
