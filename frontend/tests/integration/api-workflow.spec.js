import { test, expect } from "@playwright/test";

const sample = "Introducing the new Tech Nova smartphone! Enjoy 15 hours of battery life with 100% guaranteed performance. It is the best phone in the world.";
const apiUrl = process.env.E2E_API_URL || "http://127.0.0.1:8000/api/v1";
const credentials = Object.fromEntries(["ADMIN", "CREATOR", "REVIEWER"].map((role) => [role, {
  email: process.env[`DEMO_${role}_EMAIL`], password: process.env[`DEMO_${role}_PASSWORD`],
}]));
const sidebar = (page, name) => page.locator(".sidebar").getByRole("link", { name: new RegExp(`^${name}\\b`) });

async function login(page, role) {
  await page.goto("/login");
  await page.getByLabel("Email address", { exact: true }).fill(credentials[role].email);
  await page.getByLabel("Password", { exact: true }).fill(credentials[role].password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/app$/);
  await expect(page.getByRole("heading", { name: "Your brand, at a glance." })).toBeVisible();
}

test("real MongoDB creator-to-reviewer workflow persists through refresh", async ({ page, request }) => {
  test.skip(Object.values(credentials).some((c) => !c.email || !c.password), "Explicit private demo credentials are required.");
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await login(page, "ADMIN");
  await sidebar(page, "Knowledge base").click();
  // Exercise real, versioned knowledge management before creator analysis.
  for (const [category, title, value] of [
    ["Approved Facts", "TechNova Smartphone battery life", "Up to 10 hours"],
    ["Prohibited Words", "100% guaranteed", "Do not promise guaranteed performance."],
    ["Terminology", "Tech Nova", "Use the approved company name TechNova."],
  ]) {
    await page.getByRole("tab", { name: new RegExp(`^${category}\\b`) }).click();
    await page.getByRole("button", { name: `Edit ${title}`, exact: true }).click();
    await page.getByRole("textbox", { name: "Content / approved value", exact: true }).fill(value);
    await page.getByRole("button", { name: "Save entry", exact: true }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  }
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await login(page, "CREATOR");
  await sidebar(page, "Submit content").click();
  const title = `Real judge workflow ${Date.now()}`;
  await page.getByLabel("Content title", { exact: false }).fill(title);
  await page.getByLabel("Marketing text", { exact: false }).fill(sample);
  await page.getByRole("button", { name: "Run rule-based analysis", exact: true }).click();
  await expect(page.locator(".finding-card")).toHaveCount(5);
  const sid = new URL(page.url()).pathname.split("/").at(-1);
  for (const rule of ["R1", "R2", "R3", "R4", "R5"])
    await expect(page.locator(".finding-card .rule-tag").filter({ hasText: new RegExp(`^${rule}$`) })).toHaveCount(1);
  await expect(page.locator(".finding-card .evidence-link")).toHaveCount(5);
  await page.getByRole("button", { name: "Accept suggestion", exact: true }).first().click();
  await expect(page.locator(".finding-resolved")).toHaveCount(1);
  for (let count = 2; count <= 5; count++) {
    await page.getByRole("button", { name: "Accept suggestion", exact: true }).first().click();
    await expect(page.locator(".finding-resolved")).toHaveCount(count);
  }
  await page.getByRole("tab", { name: "Compare changes", exact: true }).click();
  await expect(page.locator(".diff-output ins")).not.toHaveCount(0);
  await page.getByRole("button", { name: "Save & recheck", exact: true }).click();
  await expect(page.getByRole("heading", { name: "No violations found by R1–R5" })).toBeVisible();
  await page.getByRole("button", { name: "Submit for review", exact: true }).click();
  await page.getByRole("button", { name: "Confirm review request", exact: true }).click();
  await expect(page.locator(".page-actions .badge")).toHaveText("In Review");
  await page.reload();
  await expect(page.locator(".page-actions .badge")).toHaveText("In Review");
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await login(page, "REVIEWER");
  await sidebar(page, "Review queue").click();
  await page.getByRole("table").getByRole("link", { name: new RegExp(`^${title}\\b`) }).click();
  await page.getByLabel("Add a review comment", { exact: true }).fill("Checked the approved battery evidence and saved source versions.");
  await page.getByRole("button", { name: "Add comment", exact: true }).click();
  await expect(page.locator(".comment")).toContainText(["Checked the approved battery evidence and saved source versions."]);
  await page.getByRole("button", { name: "Approve content", exact: true }).click();
  await page.getByLabel("Decision comment", { exact: true }).fill("I verified the evidence and corrected copy. Human approval recorded.");
  await page.getByRole("button", { name: "Confirm approval", exact: true }).click();
  await expect(page.locator(".page-actions .badge")).toHaveText("Approved");
  await page.reload();
  await expect(page.locator(".page-actions .badge")).toHaveText("Approved");
  await page.getByRole("link", { name: "Version history", exact: true }).click();
  await expect(page.locator(".version-item")).toHaveCount(2);
  await sidebar(page, "Audit logs").click();
  await page.getByRole("textbox", { name: "Search event, actor or submission…" }).fill(sid);
  await expect(page.getByRole("heading", { name: "Content approved", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Content revised", exact: true })).toBeVisible();
  await sidebar(page, "Overview").click();
  const auth = await request.post(`${apiUrl}/auth/login`, { data: credentials.REVIEWER });
  expect(auth.ok()).toBeTruthy();
  const headers = { Authorization: `Bearer ${(await auth.json()).access_token}` };
  const workspaces = (await (await request.get(`${apiUrl}/workspaces`, { headers })).json());
  const workspace = workspaces.find((w) => w.name === "TechNova");
  const stats = await (await request.get(`${apiUrl}/dashboard?workspace_id=${workspace.id}&days=30`, { headers })).json();
  await expect(page.locator(".metric-card").filter({ hasText: "Total submissions" }).locator(".metric-value")).toHaveText(String(stats.totalSubmissions));
  await expect(page.locator(".metric-card").filter({ hasText: "Approved" }).locator(".metric-value")).toHaveText(String(stats.approvedSubmissions));
  expect(errors).toEqual([]);
});
