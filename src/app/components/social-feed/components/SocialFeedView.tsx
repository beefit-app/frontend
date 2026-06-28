import { IonCol, IonGrid, IonRow } from "@ionic/react";
import { Dumbbell, Radio } from "lucide-react";
import { useEffect, useRef } from "react";
import logoImg from "../../../../imports/logo.png";
import type { LiveFriend, SocialFeedPost } from "../types";
import { LiveFriendCard } from "./LiveFriendCard";
import { StreakCard } from "./StreakCard";
import { WorkoutPostCard } from "./WorkoutPostCard";

export function SocialFeedView({
  posts,
  liveFriends,
  streakCount,
  isStreakFedToday,
  streakBurstToken,
  onToggleLike,
  onSaveTemplate,
  onOpenAuthorProfile,
  isLoading,
  isLoadingMore,
  hasMore,
  error,
  onLoadMore,
  onRetry,
}: {
  posts: SocialFeedPost[];
  liveFriends: LiveFriend[];
  streakCount: number;
  isStreakFedToday: boolean;
  streakBurstToken: number;
  onToggleLike: (id: string | number) => void;
  onSaveTemplate: (id: string | number) => void;
  onOpenAuthorProfile?: (username: string) => void;
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  onLoadMore: () => void;
  onRetry: () => void;
}) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (error || !hasMore || isLoading || isLoadingMore || !sentinelRef.current) return;
    const observer = new IntersectionObserver((entries) => { if (entries[0]?.isIntersecting) onLoadMore(); }, { rootMargin: "240px" });
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [error, hasMore, isLoading, isLoadingMore, onLoadMore]);
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0A0A0A] pb-8">
      <div
        style={{
          position: "absolute",
          top: -180,
          left: 0,
          right: 0,
          height: 540,
          background: "linear-gradient(180deg, rgba(255,215,0,0.07) 0%, transparent 100%)",
          pointerEvents: "none",
        }}
      />
      <IonGrid fixed className="relative z-10 px-3 py-5">
        <IonRow className="ion-justify-content-center">
          <IonCol size="12" style={{ maxWidth: 393 }}>
            <div className="flex flex-col gap-6">
              <header className="relative z-20 pt-0">
                <div className="flex items-start justify-between gap-4">
                  <div
                    style={{
                      height: 56,
                      width: 56,
                      overflow: "hidden",
                      borderRadius: 16,
                      flexShrink: 0,
                    }}
                  >
                    <img
                      src={logoImg}
                      alt="BeeFit"
                      style={{
                        height: "100%",
                        width: "100%",
                        display: "block",
                        objectFit: "cover",
                        objectPosition: "center",
                        transform: "scale(1.32)",
                        transformOrigin: "center",
                      }}
                    />
                  </div>
                  <StreakCard
                    count={streakCount}
                    isFedToday={isStreakFedToday}
                    burstToken={streakBurstToken}
                  />
                </div>
              </header>

              {liveFriends.length > 0 && (
                <section>
                  <div className="mb-3 flex items-center gap-2">
                    <Radio size={16} color="#FFD700" />
                    <h2 className="font-montserrat text-[14px] font-bold uppercase tracking-wide text-[#A3A3A3]">
                      Treinando agora
                    </h2>
                  </div>
                  <div className="flex gap-3 overflow-x-auto pb-1">
                    {liveFriends.map((friend) => (
                      <LiveFriendCard key={friend.id} friend={friend} />
                    ))}
                  </div>
                </section>
              )}

              <section className="flex flex-col gap-5">
                <div className="mb-1 flex items-center gap-2">
                  <Dumbbell size={16} color="#FFD700" />
                  <h2 className="font-montserrat text-[14px] font-bold uppercase tracking-wide text-[#A3A3A3]">
                    Posts recentes
                  </h2>
                </div>
                {isLoading && <div className="rounded-2xl border border-[#2D2D2D] px-4 py-8 text-center font-inter text-sm text-[#737373]">Carregando os treinos da colmeia...</div>}
                {!isLoading && !error && posts.length === 0 && <div className="rounded-2xl border border-dashed border-[#2D2D2D] px-4 py-8 text-center font-inter text-sm text-[#737373]">Ainda não há treinos publicados por aqui.</div>}
                {posts.map((post) => (
                  <WorkoutPostCard
                    key={post.id}
                    post={post}
                    onToggleLike={onToggleLike}
                    onSaveTemplate={onSaveTemplate}
                    onOpenAuthorProfile={onOpenAuthorProfile}
                  />
                ))}
                {error && <div className="rounded-2xl border border-[rgba(248,113,113,0.28)] px-4 py-4 text-center font-inter text-sm text-[#FCA5A5]">{error}<button type="button" onClick={onRetry} className="ml-2 font-bold underline">Tentar novamente</button></div>}
                {!error && hasMore && <div ref={sentinelRef} className="py-4 text-center font-inter text-xs text-[#737373]">{isLoadingMore ? "Buscando mais treinos..." : ""}</div>}
              </section>
            </div>
          </IonCol>
        </IonRow>
      </IonGrid>
    </div>
  );
}
