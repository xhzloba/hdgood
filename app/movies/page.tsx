import HomeClient from "@/components/home-client";
import { Suspense } from "react";

export default function MoviesPage() {
  return (
    <Suspense fallback={null}>
      <HomeClient initialSelectedTitle="Фильмы" />
    </Suspense>
  );
}