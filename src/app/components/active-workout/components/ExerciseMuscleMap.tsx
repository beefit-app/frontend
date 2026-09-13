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
  if (data.length === 0) {
    return <span className="font-inter text-xs text-[#8A8A8A]">Mapa muscular indisponível para este exercício.</span>;
  }

  if (compact) {
    return (
      <div className="flex items-center justify-center gap-1" aria-label="Mapa muscular: frente e costas">
        <Body data={data} side="front" gender="male" scale={0.18} colors={["#765900", "#FFD700"]} defaultFill="#3D3D3D" border="none" defaultStroke="none" />
        <Body data={data} side="back" gender="male" scale={0.18} colors={["#765900", "#FFD700"]} defaultFill="#3D3D3D" border="none" defaultStroke="none" />
      </div>
    );
  }

  return (
    <div className="grid justify-items-center" aria-label="Mapa muscular do exercício">
      <div className="grid w-full rounded-2xl bg-[#0e0e0e] border border-[#222222] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_8px_20px_rgba(0,0,0,0.35)]">
        <div className="grid grid-cols-2 gap-2">
          {(["front", "back"] as const).map((side) => (
            <div key={side} className="grid min-h-[148px] place-items-center overflow-hidden rounded-xl bg-[#141414] border border-[#242424] pt-1.5">
              <Body
                data={data}
                side={side}
                gender="male"
                scale={0.33}
                colors={["#806000", "#B88A00", "#E0AD00", "#FFE04B"]}
                defaultFill="#444444"
                border="none"
                defaultStroke="none"
              />
              <span className="-mt-3 pb-1.5 font-montserrat text-[10px] font-bold uppercase tracking-[0.08em] text-[#8A8A8A]">
                {side === "front" ? "Frente" : "Costas"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
