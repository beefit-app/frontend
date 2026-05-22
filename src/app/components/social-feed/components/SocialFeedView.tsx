import { IonCol, IonGrid, IonRow } from "@ionic/react";
import { Dumbbell, Radio } from "lucide-react";
import { HexagonPattern } from "../../HexagonPattern";
import type { LiveFriend, SocialFeedPost } from "../types";
import { LiveFriendCard } from "./LiveFriendCard";
import { WorkoutPostCard } from "./WorkoutPostCard";

export function SocialFeedView({
  posts,
  liveFriends,
  onToggleLike,
  onSaveTemplate,
}: {
  posts: SocialFeedPost[];
  liveFriends: LiveFriend[];
  onToggleLike: (id: number) => void;
  onSaveTemplate: (id: number) => void;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0A0A0A] pb-8">
      <HexagonPattern />
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
              <header className="pt-3">
                <h1 className="font-montserrat text-[34px] font-[800] leading-none text-white">
                  <span className="text-[#FFD700]">Bee</span>Fit
                </h1>
              </header>

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

              <section className="flex flex-col gap-5">
                <div className="mb-1 flex items-center gap-2">
                  <Dumbbell size={16} color="#FFD700" />
                  <h2 className="font-montserrat text-[14px] font-bold uppercase tracking-wide text-[#A3A3A3]">
                    Posts recentes
                  </h2>
                </div>
                {posts.map((post) => (
                  <WorkoutPostCard
                    key={post.id}
                    post={post}
                    onToggleLike={onToggleLike}
                    onSaveTemplate={onSaveTemplate}
                  />
                ))}
              </section>
            </div>
          </IonCol>
        </IonRow>
      </IonGrid>
    </div>
  );
}
