import { useMemo, useState } from "react";
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
  const [side, setSide] = useState<"front" | "back">("front");
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
      <div className="flex rounded-xl bg-black/20 p-1" role="group" aria-label="Lado do corpo">
        {(["front", "back"] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setSide(value)}
            className={`min-h-9 rounded-lg px-4 font-montserrat text-xs font-bold transition ${side === value ? "bg-[#FFD700] text-black" : "text-[#A3A3A3]"}`}
          >
            {value === "front" ? "Frente" : "Costas"}
          </button>
        ))}
      </div>
      <div className="flex min-h-[235px] w-full items-center justify-center overflow-hidden rounded-2xl bg-[radial-gradient(circle_at_50%_35%,rgba(255,215,0,0.11),transparent_64%)]">
        <Body
          data={data}
          side={side}
          gender="male"
          scale={scale}
          colors={["#6B5200", "#A98200", "#D4AD00", "#FFD700"]}
          defaultFill="#242424"
          border="none"
          defaultStroke="none"
        />
      </div>
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 font-inter text-xs text-[#B5B5B5]">
        <span className="inline-flex items-center gap-2"><i className="size-2 rounded-full bg-[#FFD700]" />Principal</span>
        <span className="inline-flex items-center gap-2"><i className="size-2 rounded-full bg-[#A98200]" />Secundário</span>
      </div>
    </div>
  );
}
