import { ViewAllGridPage } from "@/components/view-all-grid";

const NETFLIX_URL = "https://api.vokino.pro/v2/compilations/content/65a6b9dabce57d552a34b40d?token=mac_23602515ddd41e2f1a3eba4d4c8a949a_1225352";

export default function NetflixSerialsAllPage() {
  return <ViewAllGridPage title="Сериалы Netflix" apiUrl={NETFLIX_URL} />;
}
