import { MovieGrid } from "@/components/movie-grid";

type PageProps = {
  params: { id: string };
};

export default function FranchisePage({ params }: PageProps) {
  const ident = params.id;
  const apiUrl = `/api/franchise-by-id?ident=${ident}`;

  return (
    <main className="mx-auto max-w-7xl px-0 md:px-6 pt-6 pb-6">
      <div className="space-y-3 mb-4">
        <h1 className="text-lg md:text-xl font-semibold text-zinc-200">
          Франшиза
        </h1>
        <p className="text-xs text-zinc-400">
          Показаны части серии: сиквелы и приквелы по выбранному идентификатору.
        </p>
      </div>
      <MovieGrid url={apiUrl} />
    </main>
  );
}