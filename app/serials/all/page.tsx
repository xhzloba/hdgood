import { ViewAllGridPage } from "@/components/view-all-grid";

const SERIALS_URL =
  "https://api.vokino.pro/v2/list?sort=popular&type=serial&page=1&token=mac_23602515ddd41e2f1a3eba4d4c8a949a_1225352";

export default function SerialsAllPage() {
  return <ViewAllGridPage title="Сериалы" apiUrl={SERIALS_URL} />;
}

