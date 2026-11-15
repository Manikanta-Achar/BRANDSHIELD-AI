import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useAuth, DEMO_MODE } from "./AuthContext.jsx";
import { seedData } from "../features/demo/data.js";
import { transact } from "../features/demo/store.js";
import {
  apiCommand,
  workspaceService,
  knowledgeService,
  submissionService,
  auditService,
  profileService,
  analysisService,
} from "../api/endpoints.js";

const DataContext = createContext(null);
const KEY = "brandshield.demo.data.v2";
const empty = () => ({
  schema: 2,
  workspaces: [],
  knowledge: [],
  submissions: [],
  audit: [],
});
function readData() {
  if (!DEMO_MODE) return empty();
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    if (
      saved?.schema === 2 &&
      ["workspaces", "knowledge", "submissions", "audit"].every((k) =>
        Array.isArray(saved[k]),
      )
    )
      return saved;
  } catch {
    /* A fresh seed is safe when there is no readable demo snapshot. */
  }
  return seedData();
}
export function DataProvider({ children }) {
  const { user, demo } = useAuth();
  const userId = user?.id;
  const [data, setData] = useState(readData);
  const current = useRef(data);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(!demo);
  const activeRequests = useRef(new Set());
  const install = useCallback((next) => {
    current.current = next;
    setData(next);
  }, []);
  const persist = useCallback(
    (next) => {
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        throw new Error(
          "Demo data could not be saved. Browser storage may be full or disabled.",
        );
      }
      install(next);
    },
    [install],
  );
  const refresh = useCallback(async () => {
    if (demo || !userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const [workspaces, preferences] = await Promise.all([
        workspaceService.list(),
        profileService.getPreferences(),
      ]);
      if (!Array.isArray(workspaces))
        throw new Error("Invalid workspace response. Expected an array.");
      const records = await Promise.all(
        workspaces.map(async (w) => {
          const [knowledge, submissions, audit] = await Promise.all([
            knowledgeService.list(w.id),
            submissionService.list(w.id),
            auditService.list(w.id),
          ]);
          if (![knowledge, submissions, audit].every(Array.isArray))
            throw new Error(
              "Invalid API response. Knowledge, submissions and audit must be arrays.",
            );
          return { knowledge, submissions, audit };
        }),
      );
      install({
        schema: 2,
        workspaces,
        knowledge: records.flatMap((r) => r.knowledge),
        submissions: records.flatMap((r) => r.submissions),
        audit: records.flatMap((r) => r.audit),
        preferences: { [userId]: preferences },
      });
    } catch (e) {
      setError(e.message);
      throw e;
    } finally {
      setLoading(false);
    }
  }, [demo, userId, install]);
  useEffect(() => {
    if (demo) {
      try {
        persist(current.current);
      } catch (e) {
        setError(e.message);
      }
    } else {
      install(empty());
      refresh().catch(() => {});
    }
  }, [demo, user?.id, persist, install, refresh]);
  const execute = useCallback(
    async (command, payload = {}) => {
      if (demo) {
        const result = transact(current.current, user, command, payload);
        persist(result.data);
        return result;
      }
      const result = await apiCommand(command, payload);
      await refresh();
      return result;
    },
    [demo, user, persist, refresh],
  );
  const runAnalysis = useCallback(
    async (id) => {
      if (activeRequests.current.has(id)) return;
      activeRequests.current.add(id);
      try {
        await execute("analysis.start", { id });
        if (demo) {
          await new Promise((resolve) => setTimeout(resolve, 450));
          await execute("analysis.complete", { id });
        } else {
          for (let attempt = 0; attempt < 20; attempt++) {
            const report = await analysisService.get(id);
            if (report.status !== "Analysing") {
              await refresh();
              return;
            }
            await new Promise((resolve) => setTimeout(resolve, 750));
          }
          throw new Error(
            "Backend analysis is still running. Reopen the report later to check its status.",
          );
        }
      } finally {
        activeRequests.current.delete(id);
      }
    },
    [demo, execute, refresh],
  );
  // A refresh during the brief demo analysis must not strand a submission in Analysing.
  useEffect(() => {
    if (!demo || !user) return;
    for (const s of current.current.submissions.filter(
      (s) => s.status === "Analysing" && s.ownerId === user.id,
    )) {
      if (!activeRequests.current.has(s.id))
        execute("analysis.complete", { id: s.id }).catch((e) =>
          setError(e.message),
        );
    }
  }, [demo, user, execute]);
  return (
    <DataContext.Provider
      value={{ data, execute, runAnalysis, loading, error, refresh }}
    >
      {children}
    </DataContext.Provider>
  );
}
export const useData = () => useContext(DataContext);
