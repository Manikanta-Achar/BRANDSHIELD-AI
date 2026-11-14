const uid = () =>
  `finding-${globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2)}`;
export const escapeRegex = (value) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
export const literalPattern = (phrase) =>
  new RegExp(
    `(?<![\\p{L}\\p{N}_])${escapeRegex(phrase)}(?![\\p{L}\\p{N}_])`,
    "giu",
  );
export const approvedKnowledge = (
  knowledge,
  workspaceId,
  asOf = new Date().toLocaleDateString("en-CA"),
) =>
  knowledge.filter(
    (k) =>
      k.workspaceId === workspaceId &&
      k.status === "Active" &&
      k.effective <= asOf,
  );
export const knowledgeSnapshot = (items) =>
  items.map((k) => `${k.title} v${k.version}`).join(" · ") ||
  "No effective approved knowledge";

// Conservative, deterministic text checks. No model calls or document extraction.
export function analyseText(text, knowledge, workspaceId, asOf) {
  const active = approvedKnowledge(knowledge, workspaceId, asOf);
  const results = [];
  const add = (
    check,
    title,
    severity,
    match,
    explanation,
    item,
    correction,
    category,
  ) => {
    results.push({
      id: uid(),
      check,
      title,
      severity,
      text: match,
      explanation,
      correction,
      category,
      confidence: "Deterministic rule match",
      resolution: "Open",
      reason: "",
      evidence: {
        id: item.id,
        title: item.title,
        content: item.content,
        source: item.source,
        owner: item.owner,
        version: item.version,
        effective: item.effective,
      },
    });
  };
  for (const item of active.filter((k) => k.type === "Prohibited Words")) {
    const match = text.match(literalPattern(item.title))?.[0];
    if (match)
      add(
        "R1",
        "Prohibited wording",
        "High",
        match,
        item.content,
        item,
        item.replacement || "dependable",
        "Prohibited wording",
      );
  }
  for (const item of active.filter((k) => k.type === "Required Disclaimers")) {
    if (
      (!item.trigger ||
        text.toLowerCase().includes(item.trigger.toLowerCase())) &&
      !text.toLowerCase().includes(item.content.toLowerCase())
    ) {
      add(
        "R2",
        "Required disclaimer is missing",
        "Medium",
        "",
        `This content requires the approved disclosure${item.trigger ? ` because it mentions “${item.trigger}”` : ""}.`,
        item,
        item.content,
        "Missing disclaimer",
      );
    }
  }
  for (const item of active.filter(
    (k) => k.type === "Terminology" && k.replacement,
  )) {
    const match = text.match(literalPattern(item.title))?.[0];
    if (match)
      add(
        "R3",
        "Use approved terminology",
        "Low",
        match,
        item.content,
        item,
        item.replacement,
        "Terminology",
      );
  }
  const facts = active.filter(
    (k) => k.type === "Approved Facts" && k.rule === "battery",
  );
  const productMatches = (fact, value) =>
    [fact.subject, ...(fact.aliases || "").split(",")]
      .filter(Boolean)
      .some((term) => literalPattern(term.trim()).test(value));
  const documentFacts = facts.filter((f) => productMatches(f, text));
  const patterns = [
    /(?:up to\s+)?(\d+(?:\.\d+)?)\s*(hours?|hrs?|minutes?|mins?)\s+(?:of\s+)?battery(?:\s+life)?/gi,
    /battery(?:\s+life)?\s+(?:of\s+|is\s+|lasts\s+)?(?:up to\s+)?(\d+(?:\.\d+)?)\s*(hours?|hrs?|minutes?|mins?)/gi,
  ];
  const handled = new Set();
  for (const pattern of patterns)
    for (const match of text.matchAll(pattern)) {
      const sentenceStart =
        Math.max(
          text.lastIndexOf(".", match.index - 1),
          text.lastIndexOf("!", match.index - 1),
          text.lastIndexOf("\n", match.index - 1),
        ) + 1;
      const sentenceEnd = text.slice(match.index).search(/[.!\n]/);
      const sentence = text.slice(
        sentenceStart,
        sentenceEnd < 0 ? text.length : match.index + sentenceEnd,
      );
      const localFacts = facts.filter((f) => productMatches(f, sentence));
      const genericContinuation =
        /^(?:enjoy|get|with|offers?|featur(?:es|ing)|experience|battery|up to|\d)/i.test(
          sentence.trim(),
        );
      const candidates = localFacts.length
        ? localFacts
        : documentFacts.length === 1 && genericContinuation
          ? documentFacts
          : [];
      if (candidates.length !== 1 || handled.has(match.index)) continue;
      const fact = candidates[0];
      const approved = fact.content.match(
        /(\d+(?:\.\d+)?)\s*(hours?|hrs?|minutes?|mins?)/i,
      );
      if (!approved) continue;
      const minutes = (value, unit) =>
        Number(value) * (/^(hour|hr)/i.test(unit) ? 60 : 1);
      const actual = minutes(match[1], match[2]);
      const expected = minutes(approved[1], approved[2]);
      const upperBound = /up to/i.test(fact.content);
      const conflict = upperBound
        ? actual > expected || !/up to/i.test(match[0])
        : actual !== expected;
      if (conflict) {
        const correction = `${upperBound ? "up to " : ""}${approved[1]} ${approved[2].toLowerCase()} of battery life`;
        add(
          "R4",
          "Battery claim conflicts with approved fact",
          "High",
          match[0],
          `For ${fact.subject || fact.title}, the approved specification is “${fact.content}”. Preserve its numeric limit, unit and qualifier.`,
          fact,
          correction,
          "Numeric conflict",
        );
        handled.add(match.index);
      }
    }
  const guideline = active.find(
    (k) => k.type === "Brand Guidelines" && k.rule === "absolute",
  );
  if (guideline) {
    const pattern =
      /(?:the\s+)?best\s+(?:[\w-]+\s+){0,3}in\s+the\s+world|world['’]s\s+best|\balways\b|\bnever fails\b|\bnumber one\b/gi;
    for (const match of text.matchAll(pattern))
      add(
        "R5",
        "Absolute or superlative claim",
        "Medium",
        match[0],
        "This wording is restricted by the approved brand guideline. The rule identifies wording; it does not prove whether the claim is true or false.",
        guideline,
        guideline.replacement || "designed for your everyday",
        "Absolute claim",
      );
  }
  return results.sort(
    (a, b) =>
      ({ High: 0, Medium: 1, Low: 2 })[a.severity] -
      { High: 0, Medium: 1, Low: 2 }[b.severity],
  );
}
