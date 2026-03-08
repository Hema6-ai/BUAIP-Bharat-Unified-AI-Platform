import GovernmentDashboard from "@/app/components/GovernmentDashboard";
import { getGovernanceInsights } from "@/app/lib/policyEngine";

export default function AdminDashboard() {
  const insights = getGovernanceInsights();
  return <GovernmentDashboard insights={insights} />;
}
