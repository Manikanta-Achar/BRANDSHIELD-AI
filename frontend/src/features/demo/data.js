import { analyseText } from "../analysis/engine.js";
export { analyseText } from "../analysis/engine.js";

export const ROLES = ["Admin", "Content Creator", "Reviewer", "Agency Partner"];
export const STATES = [
  "Draft",
  "Submitted",
  "Analysing",
  "Needs Revision",
  "In Review",
  "Approved",
  "Rejected",
];
export const CHANNELS = [
  "Social Media",
  "Advertisement",
  "Email",
  "Website",
  "Document",
];
export const TABS = [
  "Brand Guidelines",
  "Approved Facts",
  "Terminology",
  "Prohibited Words",
  "Required Disclaimers",
  "Approved Claims",
  "Approved Terminology",
  "Approved Assets",
];
export const USERS = {
  Admin: {
    id: "arjun",
    name: "Arjun Mehta",
    email: "arjun@technova.demo",
    role: "Admin",
    initials: "AM",
  },
  "Content Creator": {
    id: "maya",
    name: "Maya Sharma",
    email: "maya@technova.demo",
    role: "Content Creator",
    initials: "MS",
  },
  Reviewer: {
    id: "priya",
    name: "Priya Nair",
    email: "priya@technova.demo",
    role: "Reviewer",
    initials: "PN",
  },
  "Agency Partner": {
    id: "alex",
    name: "Alex Morgan",
    email: "alex@studio.demo",
    role: "Agency Partner",
    initials: "AL",
  },
};
export const SAMPLE =
  "Introducing the new Tech Nova smartphone! Enjoy 15 hours of battery life with 100% guaranteed performance. It is the best phone in the world.";
export const CLEAN_SAMPLE =
  "Introducing the TechNova Smartphone. Enjoy up to 10 hours of battery life with dependable performance. Designed for your everyday. Battery life varies by usage.";
export const now = () => new Date().toISOString();
export const uid = (prefix) =>
  `${prefix}-${globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2)}`;
export const today = () => new Date().toLocaleDateString("en-CA");
const ago = (days, hours = 0) =>
  new Date(Date.now() - days * 86400000 - hours * 3600000).toISOString();

export function seedData() {
  const knowledge = [
    {
      id: "k1",
      type: TABS[0],
      title: "Professional, factual and trustworthy",
      content:
        "Use a professional, factual and trustworthy tone. Avoid absolute and superlative claims such as “the best phone in the world”, “always” and “never fails”. Use “designed for your everyday” instead.",
      rule: "absolute",
      replacement: "designed for your everyday",
      version: "3.2",
      owner: "Brand team",
      source: "TechNova Brand Guidelines · section 2.1",
      status: "Active",
      effective: "2026-01-01",
      workspaceId: "technova",
    },
    {
      id: "k2",
      type: TABS[1],
      title: "TechNova Smartphone battery life",
      content: "Up to 10 hours",
      subject: "TechNova Smartphone",
      aliases: "TechNova, Tech Nova, smartphone",
      rule: "battery",
      version: "2.1",
      owner: "Product team",
      source: "TechNova Smartphone Specifications · battery",
      status: "Active",
      effective: "2026-01-01",
      workspaceId: "technova",
    },
    {
      id: "k3",
      type: TABS[3],
      title: "100% guaranteed",
      content:
        "Absolute performance guarantees are prohibited in marketing communications.",
      replacement: "dependable",
      version: "3.2",
      owner: "Brand team",
      source: "TechNova Brand Guidelines · section 4.3",
      status: "Active",
      effective: "2026-01-01",
      workspaceId: "technova",
    },
    {
      id: "k4",
      type: TABS[2],
      title: "Tech Nova",
      content:
        "Use the approved brand name TechNova. Do not separate the brand name.",
      replacement: "TechNova",
      version: "3.2",
      owner: "Brand team",
      source: "TechNova Brand Guidelines · section 1.2",
      status: "Active",
      effective: "2026-01-01",
      workspaceId: "technova",
    },
    {
      id: "k5",
      type: TABS[4],
      title: "Battery life disclosure",
      content: "Battery life varies by usage.",
      trigger: "battery",
      version: "2.1",
      owner: "Product team",
      source: "TechNova Smartphone Specifications · legal disclosure",
      status: "Active",
      effective: "2026-01-01",
      workspaceId: "technova",
    },
    {
      id: "k6",
      type: TABS[5],
      title: "Designed for your everyday",
      content: "Designed for your everyday.",
      version: "3.2",
      owner: "Brand team",
      source: "TechNova Approved Messaging · section 3",
      status: "Active",
      effective: "2026-01-01",
      workspaceId: "technova",
    },
    {
      id: "k7",
      type: TABS[0],
      title: "Studio campaign tone",
      content:
        "Use clear, respectful language and cite approved product facts.",
      rule: "reference",
      version: "1.0",
      owner: "Studio team",
      source: "Studio Voice Guide · section 1",
      status: "Active",
      effective: "2026-01-01",
      workspaceId: "studio",
    },
  ];
  const titles = [
    "Smartphone launch campaign",
    "Your day, uninterrupted",
    "November product newsletter",
    "Holiday campaign landing page",
    "Meet your everyday companion",
    "TechNova partner toolkit",
    "The everyday edit",
    "Product spotlight",
    "A smarter way to connect",
    "Launch announcement email",
    "Festive season social posts",
    "TechNova retail copy",
  ];
  const statuses = [
    "Needs Revision",
    "In Review",
    "Approved",
    "In Review",
    "Approved",
    "Needs Revision",
    "Draft",
    "Approved",
    "Rejected",
    "Approved",
    "In Review",
    "Submitted",
  ];
  const submissions = titles.map((title, i) => {
    const ownerId = i % 3 === 2 ? "alex" : "maya";
    const ownerName = ownerId === "maya" ? "Maya Sharma" : "Alex Morgan";
    const createdAt = ago(i * 2, 2 + i);
    const content = [0, 3, 5, 8].includes(i) ? SAMPLE : CLEAN_SAMPLE;
    const analysed = !["Draft", "Submitted"].includes(statuses[i]);
    const findings = analysed
      ? analyseText(content, knowledge, "technova")
      : [];
    const kbVersion = "Brand guidelines v3.2 · product facts v2.1";
    const version = {
      number: 1,
      content,
      author: ownerName,
      date: createdAt,
      status: statuses[i],
      kbVersion,
      findings: structuredClone(findings),
    };
    return {
      id: `BS-${1048 - i}`,
      title,
      ownerId,
      ownerName,
      workspaceId: "technova",
      channel: CHANNELS[i % 5],
      contentType: "Campaign copy",
      format: "Text",
      file: null,
      content,
      revisedContent: content,
      status: statuses[i],
      findings,
      analysedContent: analysed ? content : null,
      createdAt,
      updatedAt: createdAt,
      kbVersion,
      versions: [version],
      comments: ["Approved", "Rejected"].includes(statuses[i])
        ? [
            {
              id: `c${i}`,
              text:
                statuses[i] === "Approved"
                  ? "Reviewed against approved product specifications. Cleared for this campaign."
                  : "The campaign contains unsupported promises. Please revise against the approved sources.",
              author: "Priya Nair",
              role: "Reviewer",
              date: createdAt,
            },
          ]
        : [],
      decisions: ["Approved", "Rejected"].includes(statuses[i])
        ? [
            {
              decision: statuses[i],
              actor: "Priya Nair",
              date: createdAt,
              version: 1,
              comment:
                statuses[i] === "Approved"
                  ? "Reviewed against approved product specifications. Cleared for this campaign."
                  : "The campaign contains unsupported promises. Please revise against the approved sources.",
              acknowledged: true,
            },
          ]
        : [],
    };
  });
  const audit = submissions
    .flatMap((s) => [
      {
        id: uid("evt"),
        action: "Submission created",
        detail: `${s.title} · fictional sample`,
        actor: s.ownerName,
        role: s.ownerId === "alex" ? "Agency Partner" : "Content Creator",
        date: s.createdAt,
        submissionId: s.id,
        workspaceId: s.workspaceId,
        version: 1,
        kbVersion: s.kbVersion,
      },
      ...(s.analysedContent
        ? [
            {
              id: uid("evt"),
              action: "Analysis completed",
              detail: `${s.findings.length} deterministic findings. Seeded demo record.`,
              actor: "Demo rule engine",
              role: "System",
              date: s.createdAt,
              submissionId: s.id,
              workspaceId: s.workspaceId,
              version: 1,
              kbVersion: s.kbVersion,
            },
          ]
        : []),
      ...(["In Review", "Approved", "Rejected"].includes(s.status)
        ? [
            {
              id: uid("evt"),
              action: "Review requested",
              detail: "Fictional sample submitted for human review.",
              actor: s.ownerName,
              role: s.ownerId === "alex" ? "Agency Partner" : "Content Creator",
              date: s.createdAt,
              submissionId: s.id,
              workspaceId: s.workspaceId,
              version: 1,
              kbVersion: s.kbVersion,
            },
          ]
        : []),
      ...(["Approved", "Rejected"].includes(s.status)
        ? [
            {
              id: uid("evt"),
              action:
                s.status === "Approved"
                  ? "Content approved"
                  : "Content rejected",
              detail: "Fictional human review for this sample version.",
              actor: "Priya Nair",
              role: "Reviewer",
              date: s.createdAt,
              submissionId: s.id,
              workspaceId: s.workspaceId,
              version: 1,
              kbVersion: s.kbVersion,
            },
          ]
        : []),
    ])
    .sort((a, b) => b.date.localeCompare(a.date));
  return {
    schema: 2,
    knowledge,
    submissions,
    audit,
    workspaces: [
      {
        id: "technova",
        name: "TechNova",
        description: "One brand. Every touchpoint.",
        initials: "TN",
        color: "#0d9488",
        consent: true,
        kbVersion: "3.2",
        members: Object.values(USERS),
        retention:
          "Demo data stays in this browser until site data is cleared.",
      },
      {
        id: "studio",
        name: "TechNova Studio",
        description: "A separate space for creative exploration.",
        initials: "TS",
        color: "#7860b5",
        consent: false,
        kbVersion: "1.0",
        members: [USERS.Admin, USERS["Content Creator"], USERS.Reviewer],
        retention:
          "Demo data stays in this browser until site data is cleared.",
      },
    ],
  };
}
