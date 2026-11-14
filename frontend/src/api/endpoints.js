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
};
export const workspaceService = {
  list: () => body(api.get(paths.workspaces)),
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
  upload: (file, onUploadProgress) => {
    const form = new FormData();
    form.append("file", file);
    return body(
      api.post(paths.uploads, form, {
        headers: { "Content-Type": undefined },
        onUploadProgress,
      }),
    );
  },
};
export const analysisService = {
  start: (id) => body(api.post(`${paths.submission(id)}/analysis`)),
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
  request: (id) => body(api.post(`${paths.submission(id)}/review`)),
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
  stats: (workspaceId) =>
    body(api.get(paths.dashboard, { params: { workspace_id: workspaceId } })),
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
      return submissionService.create(p);
    case "analysis.start":
      return analysisService.start(p.id);
    case "finding.resolve":
      return findingService.resolve(p.id, p.findingId, p);
    case "revision.save":
      return submissionService.revise(p.id, p);
    case "review.request":
      return reviewService.request(p.id);
    case "review.comment":
      return reviewService.comment(p.id, p.comment);
    case "review.decide":
      return reviewService.decide(p.id, p);
    case "knowledge.save":
      return p.item.id
        ? knowledgeService.update(p.item.id, p.item)
        : knowledgeService.create({ ...p.item, workspaceId: p.workspaceId });
    case "knowledge.archive":
      return knowledgeService.archive(p.itemId);
    case "workspace.update":
      return workspaceService.update(p.workspaceId, {
        name: p.name,
        description: p.description,
        consent: p.consent,
      });
    case "preferences.update":
      return profileService.preferences({
        showActivity: p.showActivity,
        reviewsOnly: p.reviewsOnly,
      });
    default:
      return Promise.reject(new Error("Unsupported API operation."));
  }
}
