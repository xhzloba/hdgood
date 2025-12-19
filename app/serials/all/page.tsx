import { ViewAllTabsPage } from "@/components/view-all-tabs-page";
import { SERIAL_CHANNELS } from "@/lib/categories";

const TOKEN = "mac_23602515ddd41e2f1a3eba4d4c8a949a_1225352";

function processUrlWithToken(url: string) {
  if (url.includes("token=")) return url;
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}token=${TOKEN}`;
}

const TABS = SERIAL_CHANNELS.map((ch, idx) => ({
  title: ch.title,
  url: processUrlWithToken(ch.playlist_url),
  key: `serial-tab-${idx}`,
}));

export default function SerialsAllPage() {
  return <ViewAllTabsPage title="Сериалы" tabs={TABS} />;
}
