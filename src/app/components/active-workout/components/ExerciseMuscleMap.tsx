import { useMemo } from "react";
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

export function ExerciseMuscleMap({
  muscles,
  primaryMuscles,
  secondaryMuscles,
  compact = false,
}: {
  muscles?: string[];
  primaryMuscles?: string[];
  secondaryMuscles?: string[];
  compact?: boolean;
}) {
  const data = useMemo<readonly ExtendedBodyPart[]>(() => {
    const secondary = (secondaryMuscles ?? [])
      .map(toSlug)
      .filter((slug): slug is Slug => slug !== null)
      .map((slug) => ({ slug, intensity: 2 }));
    const primary = (primaryMuscles ?? muscles ?? [])
      .map(toSlug)
      .filter((slug): slug is Slug => slug !== null)
      .map((slug) => ({ slug, intensity: 4 }));
    return [...secondary, ...primary];
  }, [muscles, primaryMuscles, secondaryMuscles]);
  const scale = compact ? 0.26 : 0.56;

  if (data.length === 0) {
    return <span className="font-inter text-xs text-[#8A8A8A]">Mapa muscular indisponível para este exercício.</span>;
  }

  if (compact) {
    return <Body data={data} side="front" gender="male" scale={scale} colors={["#765900", "#FFD700"]} defaultFill="#242424" border="none" defaultStroke="none" />;
  }

  return (
    <div className="grid justify-items-center gap-3" aria-label="Mapa muscular do exercício">
      <div className="grid w-full grid-cols-2 divide-x divide-white/10">
        {(["front", "back"] as const).map((side) => (
          <div key={side} className="grid min-h-[250px] place-items-center overflow-hidden bg-[radial-gradient(circle_at_50%_38%,rgba(255,215,0,0.14),transparent_62%)]">
            <Body
              data={data}
              side={side}
              gender="male"
              scale={0.4}
              colors={["#806000", "#B88A00", "#E0AD00", "#FFE04B"]}
              defaultFill="#525252"
              border="none"
              defaultStroke="none"
            />
            <span className="-mt-6 pb-3 font-montserrat text-[11px] font-bold uppercase tracking-[0.08em] text-[#B5B5B5]">
              {side === "front" ? "Frente" : "Costas"}
            </span>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 font-inter text-xs text-[#B5B5B5]">
        <span className="inline-flex items-center gap-2"><i className="size-2 rounded-full bg-[#FFD700]" />Principal</span>
        <span className="inline-flex items-center gap-2"><i className="size-2 rounded-full bg-[#A98200]" />Secundário</span>
      </div>
    </div>
  );
}
