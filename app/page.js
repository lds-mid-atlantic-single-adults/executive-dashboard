import DashboardClient from "@/components/DashboardClient";
import { getDashboardDataset } from "@/lib/data.server";

export const dynamic = "force-static";

export default async function Page() {
  const dataset = await getDashboardDataset();
  return <DashboardClient dataset={dataset} />;
}
