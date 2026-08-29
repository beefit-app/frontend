import { Code2 } from "lucide-react";

export function DeveloperBadge({ compact = false }: { compact?: boolean }) {
  return (
    <span
      aria-label="Desenvolvedor do BeeFit"
      title="Desenvolvedor do BeeFit"
      className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[rgba(139,92,246,0.48)] bg-[rgba(124,58,237,0.2)] px-1.5 py-0.5 font-inter text-[9px] font-bold uppercase tracking-[0.08em] text-[#DDD6FE]"
    >
      <Code2 size={compact ? 10 : 11} aria-hidden="true" />
      {!compact && "Dev"}
    </span>
  );
}
