import type { Metadata } from "next";
import WatchedClient from "@/components/watched-client";
import { cookies } from "next/headers";

export const metadata: Metadata = {
  title: "Просмотренное",
  description: "Ваши просмотренные фильмы и сериалы на HDGood",
};

export default async function WatchedPage() {
  const cookieStore = await cookies();
  const cardDisplayMode = cookieStore.get("desktop_home_card_display_mode")
    ?.value as "backdrop" | "poster" | undefined;

  return (
    <WatchedClient initialDisplayMode={cardDisplayMode || "backdrop"} />
  );
}
