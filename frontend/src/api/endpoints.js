import { api } from "./axios.js";
export const paths = {
  login: "/auth/login",
  register: "/auth/register",
  me: "/auth/me",
  profile: "/users/me",
  workspaces: "/workspaces",
  knowledge: "/knowledge",
  submissions: "/submissions",
  uploads: "/uploads",
  reviews: "/reviews",
  audit: "/audit",
  dashboard: "/dashboard",
  workspace: (id) => `/workspaces/${encodeURIComponent(id)}`,
  knowledgeItem: (id) => `/knowledge/${encodeURIComponent(id)}`,
  submission: (id) => `/submissions/${encodeURIComponent(id)}`,
  review: (id) => `/reviews/${encodeURIComponent(id)}`,
};
const body = (promise) => promise.then((response) => response.data);
export const authService = {
  login: (credentials) => body(api.post(paths.login, credentials)),
  register: (details) => body(api.post(paths.register, details)),
  me: () => body(api.get(paths.me)),
  logout: () => body(api.post("/auth/logout")),
};
export const workspaceService = {
  list: () => body(api.get(paths.workspaces)),
  create: (values) => body(api.post(paths.workspaces, values)),
  member: (id, values) => body(api.put(`${paths.workspace(id)}/members`, values)),
  removeMember: (id, userId) => body(api.delete(`${paths.workspace(id)}/members/${encodeURIComponent(userId)}`)),
  get: (id) => body(api.get(paths.workspace(id))),
  update: (id, values) => body(api.patch(paths.workspace(id), values)),
};
export const knowledgeService = {
  list: (workspaceId) =>
    body(api.get(paths.knowledge, { params: { workspace_id: workspaceId } })),
  create: (item) => body(api.post(paths.knowledge, item)),
  update: (id, item) => body(api.patch(paths.knowledgeItem(id), item)),
  archive: (id) => body(api.post(`${paths.knowledgeItem(id)}/archive`)),
};
export const submissionService = {
  list: (workspaceId) =>
    body(api.get(paths.submissions, { params: { workspace_id: workspaceId } })),
  get: (id) => body(api.get(paths.submission(id))),
  create: (item) => body(api.post(paths.submissions, item)),
  revise: (id, values) =>
    body(api.post(`${paths.submission(id)}/versions`, values)),
  upload: (file, workspaceId, onUploadProgress) => {
    const form = new FormData();
    form.append("file", file);
    form.append("workspace_id", workspaceId);
    return body(
      api.post(paths.uploads, form, {
        headers: { "Content-Type": undefined },
        onUploadProgress,
      }),
    );
  },
};
export const analysisService = {
  start: (id) => body(api.post(`${paths.submission(id)}/analysis`, null, { timeout: 90000 })),
  get: (id) => body(api.get(`${paths.submission(id)}/analysis`)),
};
export const findingService = {
  resolve: (id, findingId, values) =>
    body(
      api.patch(
        `${paths.submission(id)}/findings/${encodeURIComponent(findingId)}`,
        values,
      ),
    ),
};
export const reviewService = {
  queue: (workspaceId) =>
    body(api.get(paths.reviews, { params: { workspace_id: workspaceId } })),
  request: (id, values) => body(api.post(`${paths.submission(id)}/review`, values)),
  comment: (id, comment) =>
    body(api.post(`${paths.review(id)}/comments`, { comment })),
  decide: (id, decision) =>
    body(api.post(`${paths.review(id)}/decision`, decision)),
};
export const versionService = {
  list: (id) => body(api.get(`${paths.submission(id)}/versions`)),
};
export const auditService = {
  list: (workspaceId) =>
    body(api.get(paths.audit, { params: { workspace_id: workspaceId } })),
};
export const dashboardService = {
  stats: (workspaceId, days) =>
    body(api.get(paths.dashboard, { params: { workspace_id: workspaceId, days } })),
};
export const profileService = {
  update: (values) => body(api.patch(paths.profile, values)),
  getPreferences: () => body(api.get(`${paths.profile}/preferences`)),
  preferences: (values) =>
    body(api.patch(`${paths.profile}/preferences`, values)),
};
export function apiCommand(command, p) {
  switch (command) {
    case "submission.create":
      return submissionService.create({ workspaceId: p.workspaceId, title: p.title, channel: p.channel,
        contentType: p.contentType, content: p.content, ...(p.uploadId ? { uploadId: p.uploadId } : {}) });
    case "analysis.start":
      return analysisService.start(p.id);
    case "finding.resolve":
      return findingService.resolve(p.id, p.findingId, { resolution: p.resolution, correction: p.correction || "",
        reason: p.reason || "", expectedVersionId: p.expectedVersionId });
    case "revision.save":
      return submissionService.revise(p.id, { content: p.content, expectedVersionId: p.expectedVersionId });
    case "review.request":
      return reviewService.request(p.id, { expectedVersionId: p.expectedVersionId });
    case "review.comment":
      return reviewService.comment(p.id, p.comment);
    case "review.decide":
      return reviewService.decide(p.id, { decision: p.decision, comment: p.comment, acknowledged: p.acknowledged,
        expectedVersionId: p.expectedVersionId, reviewRequestId: p.reviewRequestId });
    case "knowledge.save":
      {
        const fields = ["type", "title", "content", "source", "owner", "version", "effective", "status", "rule",
          "replacement", "trigger", "subject", "aliases", "unit", "approvedValue", "channels"];
        const values = Object.fromEntries(fields.filter((key) => p.item[key] !== undefined).map((key) => [key, p.item[key]]));
        values.workspaceId = p.workspaceId;
        return p.item.id
          ? knowledgeService.update(p.item.id, { ...values, expectedRevision: p.item.revision })
          : knowledgeService.create(values);
      }
    case "knowledge.archive":
      return knowledgeService.archive(p.itemId);
    case "workspace.update":
      return workspaceService.update(p.workspaceId, {
        name: p.name,
        description: p.description,
        consent: p.consent,
      });
    case "workspace.create":
      return workspaceService.create({ name: p.name, description: p.description || "" });
    case "workspace.member":
      return workspaceService.member(p.workspaceId, { email: p.email, role: p.role });
    case "preferences.update":
      return profileService.preferences({
        showActivity: p.showActivity,
        reviewsOnly: p.reviewsOnly,
      });
    default:
      return Promise.reject(new Error("Unsupported API operation."));
  }
}
