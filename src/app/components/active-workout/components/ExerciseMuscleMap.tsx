import Body, { type ExtendedBodyPart, type Slug } from "react-muscle-highlighter";

const SLUG_BY_API_VALUE: Record<string, Slug> = {
  ABS: "abs",
  ADDUCTORS: "adductors",
  BICEPS: "biceps",
  CALVES: "calves",
  CHEST: "chest",
  DELTOIDS: "deltoids",
  FOREARM: "forearm",
  GLUTEAL: "gluteal",
  HAMSTRING: "hamstring",
  LOWER_BACK: "lower-back",
  NECK: "neck",
  QUADRICEPS: "quadriceps",
  TRAPEZIUS: "trapezius",
  TRICEPS: "triceps",
  UPPER_BACK: "upper-back",
};

function toSlug(value: string): Slug | null {
  const normalized = value.trim().toUpperCase().replace(/-/g, "_");
  const slug = SLUG_BY_API_VALUE[normalized];
  if (slug) return slug;
  return Object.values(SLUG_BY_API_VALUE).find((candidate) => candidate === value) ?? null;
}

export function ExerciseMuscleMap({ muscles, compact = false }: { muscles?: string[]; compact?: boolean }) {
  const data: readonly ExtendedBodyPart[] = (muscles ?? [])
    .map(toSlug)
    .filter((slug): slug is Slug => slug !== null)
    .map((slug) => ({ slug, intensity: 4 }));
  const scale = compact ? 0.26 : 0.46;

  if (data.length === 0) {
    return <span className="font-inter text-xs text-[#8A8A8A]">Mapa muscular indisponível para este exercício.</span>;
  }

  return (
    <div className="grid grid-cols-2 justify-items-center gap-2" aria-label="Mapa muscular do exercício" role="img">
      <Body data={data} side="front" gender="male" scale={scale} colors={["#6B5200", "#A98200", "#D4AD00", "#FFD700"]} defaultFill="#292929" />
      <Body data={data} side="back" gender="male" scale={scale} colors={["#6B5200", "#A98200", "#D4AD00", "#FFD700"]} defaultFill="#292929" />
    </div>
  );
}
