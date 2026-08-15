import { motion as Motion } from "motion/react";
import { HexAvatar, getMuscleBadgeStyle } from "../../workout-post";
import type { LiveFriend } from "../types";
import { formatElapsed } from "../utils";

// O max-w preserva o "peek" do proximo card em telas de 320px, onde a largura
// util do carrossel (~296px) nunca comportaria os 306px cheios.
export function LiveFriendCard({ friend }: { friend: LiveFriend }) {
  return (
    <Motion.div
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
      className="w-[306px] max-w-[88%] shrink-0 rounded-2xl border border-[#2D2D2D] bg-[#1A1A1A] p-3"
    >
      <div className="flex items-center gap-3">
        <div className="relative shrink-0">
          <HexAvatar src={friend.photoUrl} initials={friend.initials} size={46} />
          <span className="absolute -right-1 bottom-1 h-3 w-3 rounded-full border-2 border-[#1A1A1A] bg-[#22C55E]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-montserrat text-[13px] font-bold text-white">{friend.name}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <span className="font-inter text-[11px] font-medium text-[#8A8A8A]">treinando</span>
            {friend.groups.map((group) => {
              const style = getMuscleBadgeStyle(group, "accent");
              return (
                <span
                  key={group}
                  className="rounded-full border px-2 py-0.5 font-inter text-[10px] font-semibold"
                  style={{ borderColor: style.border, background: style.bg, color: style.text }}
                >
                  {group}
                </span>
              );
            })}
          </div>
          <p className="mt-1 font-inter text-[11px] font-semibold text-[#A3A3A3]">
            há <span className="font-montserrat text-[#FFD700]">{formatElapsed(friend.elapsedSeconds)}</span>
          </p>
        </div>
      </div>
    </Motion.div>
  );
}
