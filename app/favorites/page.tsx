import type { Metadata } from "next";
import FavoritesClient from "@/components/favorites-client";

export const metadata: Metadata = {
  title: "Избранное",
  description: "Ваши сохранённые фильмы и сериалы на HDGood",
};

export default function FavoritesPage() {
  return <FavoritesClient />;
}

