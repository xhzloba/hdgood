import { Loader } from "@/components/loader";

export default function Loading() {
  return (
    <div className="min-h-[100dvh] min-h-screen relative bg-zinc-950">
      <div className="fixed inset-0 bg-zinc-950/95 backdrop-blur-3xl -z-10" />
      <div className="max-w-6xl mx-auto px-4 pt-0 pb-6 md:py-8 relative z-0">
        <div className="flex items-center justify-center min-h-[100dvh] min-h-screen">
          <Loader size="md" />
        </div>
      </div>
    </div>
  );
}
