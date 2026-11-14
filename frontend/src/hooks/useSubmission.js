import { useParams } from "react-router-dom";
import { useWorkspace } from "../context/WorkspaceContext.jsx";
export default function useSubmission() {
  const { id } = useParams();
  const { submissions } = useWorkspace();
  return submissions.find((s) => s.id === id) || null;
}
