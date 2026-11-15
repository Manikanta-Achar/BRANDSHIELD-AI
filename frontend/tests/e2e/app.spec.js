import { test, expect } from "@playwright/test";
const enter = async (page, role = "Admin") => {
  await page.goto("/login");
  await page.getByRole("radio", { name: role, exact: false }).check();
  await page
    .getByRole("button", { name: `Enter demo as ${role}`, exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Your brand, at a glance." }),
  ).toBeVisible();
};
const sidebarLink = (page, name) =>
  page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name, exact: false });

test("the complete judge workflow uses edited knowledge, saves corrections, and records a human approval", async ({
  page,
}) => {
  test.setTimeout(90000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Great ideas/ }),
  ).toBeVisible();
  await page.screenshot({ path: ".qa/landing-desktop.png", fullPage: true });
  await page.getByRole("link", { name: "Try the interactive demo" }).click();
  await page
    .getByRole("button", { name: "Enter demo as Admin", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Your brand, at a glance." }),
  ).toBeVisible();
  await page.screenshot({ path: ".qa/dashboard-desktop.png", fullPage: true });
  await sidebarLink(page, "Knowledge base").click();
  await page.getByRole("tab", { name: /Approved Facts/ }).click();
  await page
    .getByRole("button", {
      name: "Edit TechNova Smartphone battery life",
      exact: true,
    })
    .click();
  await page
    .getByRole("textbox", { name: "Content / approved value", exact: true })
    .fill("Up to 12 hours");
  await page.getByLabel("Knowledge version", { exact: true }).fill("2.2");
  await page.getByRole("button", { name: "Save entry", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByText("Up to 12 hours", { exact: true })).toBeVisible();
  await page
    .getByLabel("Demo role", { exact: true })
    .selectOption("Content Creator");
  await sidebarLink(page, "Submit content").click();
  await page
    .getByRole("button", { name: "Use sample advertisement", exact: true })
    .click();
  await page
    .getByLabel("Content title", { exact: false })
    .fill("Judge workflow campaign");
  await page
    .getByRole("button", { name: "Run rule-based analysis", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Judge workflow campaign", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".finding-card")).toHaveCount(5);
  await expect(
    page.getByText("up to 12 hours of battery life", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Knowledge v2.2 · Product team", { exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: ".qa/report-desktop.png", fullPage: true });
  const battery = page
    .locator(".finding-card")
    .filter({ hasText: "Battery claim conflicts" });
  await battery
    .getByRole("button", { name: /TechNova Smartphone Specifications/ })
    .click();
  await expect(page.getByRole("dialog")).toContainText("Up to 12 hours");
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  for (let i = 0; i < 5; i++)
    await page
      .getByRole("button", { name: "Accept suggestion", exact: true })
      .first()
      .click();
  await expect(
    page.getByRole("button", { name: "Accept suggestion", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("tab", { name: "Compare changes", exact: true }).click();
  await expect(page.locator(".diff-output ins")).not.toHaveCount(0);
  await page
    .getByRole("button", { name: "Save & recheck", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "No violations found by R1–R5" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Submit for review", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Confirm review request", exact: true })
    .click();
  await expect(page.locator(".page-actions .badge")).toHaveText("In Review");
  const id = new URL(page.url()).pathname.split("/").at(-1);
  await page.reload();
  await expect(page.locator(".page-actions .badge")).toHaveText("In Review");
  await page.getByLabel("Demo role", { exact: true }).selectOption("Reviewer");
  await sidebarLink(page, "Review queue").click();
  await expect(
    page.getByRole("heading", { name: "Review queue", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("table")
    .getByRole("link", { name: /Judge workflow campaign/ })
    .first()
    .click();
  await expect(page).toHaveURL(new RegExp(`/app/reviews/${id}$`));
  await page.getByRole("tab", { name: "Compare changes", exact: true }).click();
  await expect(page.locator(".diff-output")).toContainText("12");
  await page
    .getByLabel("Add a review comment", { exact: true })
    .fill("The new battery limit matches the updated approved source.");
  await page.getByRole("button", { name: "Add comment", exact: true }).click();
  await expect(page.locator(".comment")).toContainText([
    "The new battery limit matches the updated approved source.",
  ]);
  await page
    .getByRole("button", { name: "Approve content", exact: true })
    .click();
  await page
    .getByLabel("Decision comment", { exact: true })
    .fill("I checked the saved source and the creator corrections. Approved.");
  await page
    .getByRole("button", { name: "Confirm approval", exact: true })
    .click();
  await expect(page.locator(".page-actions .badge")).toHaveText("Approved");
  await page
    .getByRole("link", { name: "Version history", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Every version tells a story." }),
  ).toBeVisible();
  await expect(page.locator(".version-item")).toHaveCount(2);
  await expect(page.locator(".diff-output")).toContainText("12");
  await sidebarLink(page, "Audit logs").click();
  await page
    .getByRole("textbox", { name: "Search event, actor or submission…" })
    .fill(id);
  await expect(
    page.getByRole("heading", { name: "Content approved", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Content revised", exact: true }),
  ).toBeVisible();
  await sidebarLink(page, "Overview").click();
  await expect(
    page
      .locator(".metric-card")
      .filter({ hasText: "Total submissions" })
      .locator(".metric-value"),
  ).toHaveText("13");
  await expect(
    page
      .locator(".metric-card")
      .filter({ hasText: "Approved" })
      .locator(".metric-value"),
  ).toHaveText("5");
  expect(errors).toEqual([]);
});

test("knowledge add, edit, search and archive work with a keyboard-accessible modal", async ({
  page,
}) => {
  await enter(page);
  await sidebarLink(page, "Knowledge base").click();
  await page.getByRole("tab", { name: /Prohibited Words/ }).click();
  await page.getByRole("button", { name: "Add entry", exact: true }).click();
  await page
    .getByLabel("Prohibited phrase", { exact: true })
    .fill("miracle cure");
  await page
    .getByLabel("Content / approved value", { exact: true })
    .fill("Avoid unsubstantiated medical promises.");
  await page
    .getByLabel("Suggested replacement", { exact: true })
    .fill("helpful features");
  await page
    .getByLabel("Source name / section", { exact: true })
    .fill("Campaign policy · section 4");
  await page.getByLabel("Source owner", { exact: true }).fill("Legal team");
  await page.getByRole("button", { name: "Save entry", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("textbox", { name: "Search entries…" }).fill("miracle");
  await expect(page.locator(".knowledge-row")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Edit miracle cure", exact: true })
    .click();
  await page
    .getByLabel("Prohibited phrase", { exact: true })
    .fill("instant cure");
  await page.getByRole("button", { name: "Save entry", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("textbox", { name: "Search entries…" }).fill("instant");
  await page
    .getByRole("button", { name: "Archive instant cure", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Archive entry", exact: true })
    .click();
  await page
    .getByLabel("Knowledge status", { exact: true })
    .selectOption("Archived");
  await expect(page.locator(".knowledge-row")).toHaveCount(1);
  await page.getByRole("button", { name: "Add entry", exact: true }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Add entry", exact: true }).first(),
  ).toBeFocused();
});

test("document UI is honest about extraction and text drafts persist", async ({
  page,
}) => {
  await enter(page, "Content Creator");
  await sidebarLink(page, "Submit content").click();
  await page
    .getByLabel("Content title", { exact: false })
    .fill("Document draft");
  await page
    .getByLabel("Select PDF or DOCX document", { exact: true })
    .setInputFiles({
      name: "notes.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("Example"),
    });
  await expect(page.getByRole("alert")).toContainText(
    "Supported file types are PDF and DOCX",
  );
  await page
    .getByLabel("Select PDF or DOCX document", { exact: true })
    .setInputFiles({
      name: "copy.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4 demo only"),
    });
  await expect(
    page.getByText(/Selected locally · not extracted/),
  ).toBeVisible();
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(
    "cannot extract this file",
  );
  await page
    .getByRole("button", { name: "Remove selected file", exact: true })
    .click();
  await page
    .getByLabel("Marketing text", { exact: false })
    .fill("A straightforward message from TechNova.");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.locator(".page-actions .badge")).toHaveText("Draft");
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Document draft", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("A straightforward message from TechNova.", { exact: true }),
  ).toBeVisible();
});

test("high-severity human decisions require acknowledgement and changes can be requested", async ({
  page,
}) => {
  await enter(page, "Reviewer");
  await page.goto("/app/reviews/BS-1045");
  await page
    .getByRole("button", { name: "Reject content", exact: true })
    .click();
  await page
    .getByLabel("Decision comment", { exact: true })
    .fill("Unsupported product promises require substantial revision.");
  await page
    .getByRole("button", { name: "Confirm rejection", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "Confirm rejection", exact: true })
    .click();
  await expect(page.locator(".page-actions .badge")).toHaveText("Rejected");
  await page.goto("/app/reviews/BS-1047");
  await page
    .getByRole("button", { name: "Request changes", exact: true })
    .click();
  await page
    .getByLabel("Decision comment", { exact: true })
    .fill("Please include the campaign context before publication.");
  await page
    .getByRole("button", { name: "Confirm change request", exact: true })
    .click();
  await expect(page.locator(".page-actions .badge")).toHaveText(
    "Needs Revision",
  );
});

test("role restrictions, workspace isolation, settings and global search are functional", async ({
  page,
}) => {
  await enter(page);
  await page
    .getByRole("button", { name: "Collapse sidebar", exact: true })
    .click();
  await expect(page.locator(".sidebar")).toHaveClass(/is-collapsed/);
  await page
    .getByRole("button", { name: "Expand sidebar", exact: true })
    .click();
  await expect(page.locator(".sidebar")).not.toHaveClass(/is-collapsed/);
  await sidebarLink(page, "Workspaces").click();
  await page
    .getByRole("button", { name: "View members of TechNova", exact: true })
    .click();
  await expect(page.locator(".members-list > div")).toHaveCount(4);
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await page
    .getByRole("button", { name: "Settings for TechNova", exact: true })
    .click();
  await page
    .getByRole("checkbox", { name: /Permit external AI processing/ })
    .uncheck();
  await page
    .getByRole("button", { name: "Save workspace settings", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.reload();
  await expect(
    page.locator(".workspace-card.selected .workspace-ai-status strong"),
  ).toHaveText("AI processing disabled");
  await page
    .getByLabel("Current workspace", { exact: true })
    .selectOption("studio");
  await expect(
    page
      .locator(".metric-card")
      .filter({ hasText: "Total submissions" })
      .locator(".metric-value"),
  ).toHaveText("0");
  await sidebarLink(page, "Knowledge base").click();
  await expect(
    page.getByText("Studio campaign tone", { exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Current workspace", { exact: true })
    .selectOption("technova");
  await sidebarLink(page, "Settings").click();
  await page
    .getByLabel("Show the workspace activity indicator", { exact: false })
    .uncheck();
  await page
    .getByRole("button", { name: "Save notification preferences", exact: true })
    .click();
  await expect(page.getByTestId("activity-indicator")).toHaveCount(0);
  await page.reload();
  await expect(page.getByTestId("activity-indicator")).toHaveCount(0);
  await page
    .getByLabel("Demo role", { exact: true })
    .selectOption("Agency Partner");
  await expect(
    page
      .getByLabel("Current workspace", { exact: true })
      .locator("option:not([disabled])"),
  ).toHaveCount(1);
  await page.goto("/app/reviews");
  await expect(
    page.getByRole("heading", { name: "This page needs another role" }),
  ).toBeVisible();
  await page.goto("/app/knowledge");
  await expect(
    page.getByRole("button", { name: "Add entry", exact: true }),
  ).toHaveCount(0);
  await page.getByLabel("Demo role", { exact: true }).selectOption("Admin");
  await page
    .getByLabel("Search submissions globally", { exact: true })
    .fill("newsletter");
  await page
    .getByLabel("Search submissions globally", { exact: true })
    .press("Enter");
  await expect(page.locator(".data-table tbody tr")).toHaveCount(1);
  await page
    .getByLabel("Search submissions globally", { exact: true })
    .fill("retail");
  await page
    .getByLabel("Search submissions globally", { exact: true })
    .press("Enter");
  await expect(page.locator(".data-table tbody tr")).toHaveCount(1);
  await expect(page.locator(".data-table tbody")).toContainText(
    "TechNova retail copy",
  );
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
});

test("mobile landing, sidebar, dashboard and analysis fit the viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: ".qa/landing-mobile.png", fullPage: true });
  await enter(page, "Content Creator");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: ".qa/dashboard-mobile.png", fullPage: true });
  await page
    .getByRole("button", { name: "Open navigation", exact: true })
    .click();
  await sidebarLink(page, "Submit content").click();
  await expect(page.locator(".sidebar")).not.toHaveClass(/mobile-open/);
  await page
    .getByRole("button", { name: "Use sample advertisement", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Run rule-based analysis", exact: true })
    .click();
  await expect(page.locator(".finding-card")).toHaveCount(5);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: ".qa/report-mobile.png", fullPage: true });
});

test("API mode surfaces unavailable services and never falls back to demo authentication", async ({
  page,
}) => {
  await page.route("http://127.0.0.1:8000/**", (route) =>
    route.abort("connectionrefused"),
  );
  await page.goto("http://127.0.0.1:4174/login");
  await expect(page.getByRole("button", { name: /Enter demo/ })).toHaveCount(0);
  await page
    .getByLabel("Email address", { exact: true })
    .fill("admin@example.com");
  await page.getByLabel("Password", { exact: true }).fill("example-password");
  const loginRequest = page.waitForRequest(
    "http://127.0.0.1:8000/api/v1/auth/login",
  );
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  expect((await loginRequest).method()).toBe("POST");
  await expect(page.getByRole("alert")).toContainText("Cannot reach the API");
  await expect(page).toHaveURL(/\/login$/);
  expect(
    await page.evaluate(() =>
      localStorage.getItem("brandshield.demo.identity.v2"),
    ),
  ).toBeNull();
});

test("creators can edit suggestions, dismiss with a reason, challenge findings and revise manually", async ({
  page,
}) => {
  await enter(page, "Content Creator");
  await sidebarLink(page, "Submit content").click();
  await page
    .getByRole("button", { name: "Use sample advertisement", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Run rule-based analysis", exact: true })
    .click();
  await expect(page.locator(".finding-card")).toHaveCount(5);
  await page
    .getByRole("button", { name: "Edit suggestion for R1", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Your correction", exact: true })
    .fill("reliable");
  await page
    .getByRole("button", { name: "Apply correction", exact: true })
    .click();
  await expect(
    page
      .locator(".finding-card")
      .filter({ hasText: "Prohibited wording" })
      .locator(".finding-top"),
  ).toContainText("Edited");
  const disclaimer = page
    .locator(".finding-card")
    .filter({ hasText: "Required disclaimer is missing" });
  await disclaimer
    .getByRole("button", { name: "Dismiss", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Reason", exact: true })
    .fill("Please assess the disclosure placement for this teaser.");
  await page
    .getByRole("button", { name: "Dismiss finding", exact: true })
    .click();
  const terminology = page
    .locator(".finding-card")
    .filter({ hasText: "Use approved terminology" });
  await terminology
    .getByRole("button", { name: "Challenge", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Reason", exact: true })
    .fill("Please confirm the brand spacing for this placement.");
  await page
    .getByRole("button", { name: "Save challenge", exact: true })
    .click();
  await expect(terminology.locator(".finding-top")).toContainText("Challenged");
  await page
    .getByRole("button", { name: "Accept suggestion", exact: true })
    .first()
    .click();
  await page
    .getByRole("button", { name: "Accept suggestion", exact: true })
    .first()
    .click();
  await page
    .getByRole("button", { name: "Save & recheck", exact: true })
    .click();
  await expect(page.locator(".finding-card")).toHaveCount(2);
  await page.getByRole("tab", { name: "Revision editor", exact: true }).click();
  await page
    .getByRole("textbox", { name: "WORKING REVISION", exact: true })
    .fill(
      "TechNova Smartphone. Up to 10 hours of battery life. Battery life varies by usage.",
    );
  await page
    .getByRole("button", { name: "Save & recheck", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "No violations found by R1–R5" }),
  ).toBeVisible();
  await page
    .getByRole("tab", { name: "Submitted content", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "View R3: Use approved terminology",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Finding from this saved version" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await page
    .getByRole("link", { name: "Version history", exact: true })
    .click();
  await expect(page.locator(".version-item")).toHaveCount(3);
});
