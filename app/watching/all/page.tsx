import { ViewAllGridPage } from "@/components/view-all-grid";

const WATCHING_URL =
  "https://api.vokino.pro/v2/list?sort=watching&page=1&token=mac_23602515ddd41e2f1a3eba4d4c8a949a_1225352";

export default function WatchingAllPage() {
  return <ViewAllGridPage title="Сейчас смотрят" apiUrl={WATCHING_URL} />;
}

