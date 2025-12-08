import { ViewAllGridPage } from "@/components/view-all-grid";

const DOLBYV_URL =
  "https://api.vokino.pro/v2/list?sort=new&tag=4K%20DolbyV&page=1&token=mac_23602515ddd41e2f1a3eba4d4c8a949a_1225352";

export default function DolbyVAllPage() {
  return <ViewAllGridPage title="4K DolbyV" apiUrl={DOLBYV_URL} />;
}

