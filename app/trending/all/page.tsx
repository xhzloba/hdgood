import { ViewAllGridPage } from "@/components/view-all-grid";

const TRENDING_URL =
  "https://api.vokino.pro/v2/list?sort=popular&page=1&token=mac_23602515ddd41e2f1a3eba4d4c8a949a_1225352";

export default function TrendingAllPage() {
  return <ViewAllGridPage title="В тренде" apiUrl={TRENDING_URL} />;
}

