import { ViewAllTabsPage } from "@/components/view-all-tabs-page";
import { UHD_CHANNELS } from "@/lib/categories";
import { Suspense } from "react";
import { Loader } from "@/components/loader";

const TOKEN = "mac_23602515ddd41e2f1a3eba4d4c8a949a_1225352";

function processUrlWithToken(url: string) {
  if (url.includes("token=")) return url;
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}token=${TOKEN}`;
}

const TABS = UHD_CHANNELS.map((ch, idx) => ({
  title: ch.title,
  url: processUrlWithToken(ch.playlist_url),
  key: `uhd-tab-${idx}`,
}));

export default function UHDPage() {
  return (
    <Suspense 
      fallback={
        <div className="flex items-center justify-center min-h-screen bg-zinc-950">
          <Loader />
        </div>
      }
    >
      <ViewAllTabsPage title="4K UHD" tabs={TABS} hideBackLink />
    </Suspense>
  );
}
