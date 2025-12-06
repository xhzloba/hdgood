import type { Metadata } from "next";
import FavoritesClient from "@/components/favorites-client";
import { cookies } from "next/headers";

export const metadata: Metadata = {
  title: "Избранное",
  description: "Ваши сохранённые фильмы и сериалы на HDGood",
};

export default async function FavoritesPage() {
  const cookieStore = await cookies();
  const cardDisplayMode = cookieStore.get("desktop_home_card_display_mode")
    ?.value as "backdrop" | "poster" | undefined;

  return (
    <FavoritesClient initialDisplayMode={cardDisplayMode || "backdrop"} />
  );
}

