import { LoaderCircle } from "lucide-react";
export default function LoadingSpinner({ label = "Loading your workspace…" }) {
  return (
    <div className="loading-state" role="status">
      <LoaderCircle className="spin" size={26} />
      <p>{label}</p>
    </div>
  );
}
