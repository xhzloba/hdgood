import HomeClient from "@/components/home-client"
import { Suspense } from "react"

export default function SerialsPage() {
  return (
    <Suspense fallback={null}>
      <HomeClient initialSelectedTitle="Сериалы" />
    </Suspense>
  )
}