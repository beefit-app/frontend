import { IonCol, IonGrid, IonRow } from "@ionic/react";
import { ChevronRight, Dumbbell, Flame, MoreVertical, Scale, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { BeeCard } from "../../BeeCard";
import { PageBackground } from "../../PageBackground";
import type { ProfileData, WorkoutPost } from "../types";
import { getProfileInitials } from "../utils";
import { GoldDivider, HexAvatar, SectionLabel, StatCard, TrainingCalendar } from "./shared";
import { WorkoutPostCard } from "./WorkoutPostCard";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "../../ui/sheet";

export function ProfileView({
  profile,
  isLoading,
  loadError,
  postsLoadError,
  trainedDays,
  recentPosts,
  onEdit,
  onManageAccount,
  onDismissError,
  onDismissPostsError,
  onLogout,
}: {
  profile: ProfileData;
  isLoading?: boolean;
  loadError?: string | null;
  postsLoadError?: string | null;
  trainedDays: number[];
  recentPosts: WorkoutPost[];
  onEdit: () => void;
  onManageAccount: () => void;
  onDismissError?: () => void;
  onDismissPostsError?: () => void;
  onLogout: () => void;
}) {
  const initials = getProfileInitials(profile);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  return (
    <PageBackground>
      <IonGrid fixed style={{ maxWidth: 393, position: "relative", padding: "0 0 32px", zIndex: 1 }}>
        <IonRow className="ion-justify-content-center">
          <IonCol size="12">
            <div style={{ position: "relative" }}>
              <button
                type="button"
                onClick={() => setIsProfileMenuOpen(true)}
                style={{
                  position: "absolute",
                  top: 16,
                  right: 16,
                  zIndex: 10,
                  width: 40,
                  height: 40,
                  borderRadius: 14,
                  border: "1px solid #2D2D2D",
                  background: "#141414",
                  color: "#D4D4D4",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
                aria-label="Abrir opções do perfil"
              >
                <MoreVertical size={18} />
              </button>

              <Sheet open={isProfileMenuOpen} onOpenChange={setIsProfileMenuOpen}>
                <SheetContent side="right" className="border-l border-[#2D2D2D] bg-[#141414] text-white sm:max-w-[360px]">
                  <SheetHeader className="border-b border-[#2D2D2D] px-5 py-5 text-left">
                    <SheetTitle className="font-montserrat text-[18px] font-bold text-white">
                      Opções do perfil
                    </SheetTitle>
                    <SheetDescription className="font-inter text-[13px] text-[#737373]">
                      Escolha uma das opções abaixo.
                    </SheetDescription>
                  </SheetHeader>

                  <div className="px-4 py-4">
                    <div className="flex flex-col gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          onEdit();
                        }}
                        className="flex w-full items-center justify-between rounded-2xl border border-[#2D2D2D] bg-[#1A1A1A] px-4 py-4 text-left transition-colors hover:border-[#404040] hover:bg-[#202020]"
                      >
                        <div className="flex min-w-0 flex-col gap-1">
                          <span className="font-montserrat text-[14px] font-bold text-white">
                            Alterar informações do perfil
                          </span>
                          <span className="font-inter text-[12px] text-[#737373]">
                            Editar nome, bio e peso.
                          </span>
                        </div>
                        <ChevronRight size={16} color="#A3A3A3" />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          onManageAccount();
                        }}
                        className="flex w-full items-center justify-between rounded-2xl border border-[#2D2D2D] bg-[#1A1A1A] px-4 py-4 text-left transition-colors hover:border-[#404040] hover:bg-[#202020]"
                      >
                        <div className="flex min-w-0 flex-col gap-1">
                          <span className="font-montserrat text-[14px] font-bold text-white">
                            Gerenciar configurações de conta
                          </span>
                          <span className="font-inter text-[12px] text-[#737373]">
                            Alterar senha e controlar o modo fantasma.
                          </span>
                        </div>
                        <ChevronRight size={16} color="#A3A3A3" />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          onLogout();
                        }}
                        className="flex w-full items-center justify-between rounded-2xl border border-[rgba(239,68,68,0.28)] bg-[rgba(239,68,68,0.08)] px-4 py-4 text-left transition-colors hover:border-[rgba(239,68,68,0.4)] hover:bg-[rgba(239,68,68,0.12)]"
                      >
                        <div className="flex min-w-0 flex-col gap-1">
                          <span className="font-montserrat text-[14px] font-bold text-[#FCA5A5]">
                            Sair da conta
                          </span>
                          <span className="font-inter text-[12px] text-[#F87171]">
                            Encerra a sessão atual neste dispositivo.
                          </span>
                        </div>
                        <ChevronRight size={16} color="#FCA5A5" />
                      </button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>

              <div style={{ position: "relative", zIndex: 1, padding: "32px 12px 0" }}>
                {loadError && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                      marginBottom: 20,
                      padding: "14px 16px",
                      borderRadius: 16,
                      border: "1px solid rgba(248,113,113,0.24)",
                      background: "rgba(127,29,29,0.18)",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "var(--font-inter)",
                        fontSize: 13,
                        lineHeight: 1.5,
                        color: "#FCA5A5",
                      }}
                    >
                      {loadError}
                    </span>
                    <button
                      type="button"
                      onClick={onDismissError}
                      style={{
                        border: "none",
                        background: "transparent",
                        color: "#FCA5A5",
                        cursor: "pointer",
                        fontFamily: "var(--font-inter)",
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      Fechar
                    </button>
                  </div>
                )}

                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, marginBottom: 24 }}>
                  <HexAvatar src={profile.avatarUrl} initials={initials} size={96} />
                  <div style={{ textAlign: "center" }}>
                    <h1 style={{ fontFamily: "var(--font-montserrat)", fontSize: 22, fontWeight: 700, color: "#ffffff", margin: "0 0 4px" }}>
                      {profile.displayName}
                    </h1>
                    <span style={{ fontFamily: "var(--font-inter)", fontSize: 13, color: "#737373", fontWeight: 500 }}>
                      {profile.username}
                    </span>
                  </div>
                  {profile.bio && (
                    <p style={{ fontFamily: "var(--font-inter)", fontSize: 13, color: "#D4D4D4", textAlign: "center", lineHeight: 1.65, margin: 0, maxWidth: 300 }}>
                      {profile.bio}
                    </p>
                  )}
                  {isLoading && (
                    <span
                      style={{
                        fontFamily: "var(--font-inter)",
                        fontSize: 12,
                        color: "#B8A65A",
                      }}
                    >
                      Atualizando perfil...
                    </span>
                  )}
                </div>

                <GoldDivider />

                <div style={{ marginTop: 20, marginBottom: 20 }}>
                  <SectionLabel icon={<ShieldCheck size={13} color="#FFD700" />} label="Estatísticas" />
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <StatCard
                      icon={<Scale size={20} />}
                      value={profile.weight === null ? "--" : `${profile.weight}kg`}
                      label="Peso"
                      color="#FFD700"
                    />
                    <StatCard icon={<span style={{ fontSize: 20, lineHeight: 1 }}>🃏</span>} value={profile.cards} label="Cartas" color="#A855F7" />
                    <StatCard icon={<Flame size={20} />} value={`${profile.streak}d`} label="Ofensiva" color="#F97316" />
                    <StatCard icon={<Dumbbell size={20} />} value={profile.totalWorkouts} label="Treinos" color="#22C55E" />
                  </div>
                </div>

                <GoldDivider />

                <div style={{ marginTop: 20, marginBottom: 20 }}>
                  <BeeCard hover={false}>
                    <TrainingCalendar trainedDays={trainedDays} />
                  </BeeCard>
                </div>

                <GoldDivider />

                <div style={{ marginTop: 20 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                    <SectionLabel icon={<Dumbbell size={13} color="#FFD700" />} label="Posts de treino" />
                    <span style={{ fontFamily: "var(--font-inter)", fontSize: 11, color: "#737373" }}>
                      {recentPosts.length} {recentPosts.length === 1 ? "post" : "posts"}
                    </span>
                  </div>
                  {postsLoadError ? (
                    <div
                      style={{
                        border: "1px solid rgba(248,113,113,0.24)",
                        borderRadius: 18,
                        background: "rgba(127,29,29,0.16)",
                        padding: "18px 16px",
                        fontFamily: "var(--font-inter)",
                        fontSize: 13,
                        color: "#FCA5A5",
                        lineHeight: 1.5,
                      }}
                    >
                      <div>{postsLoadError}</div>
                      <button
                        type="button"
                        onClick={onDismissPostsError}
                        style={{
                          marginTop: 10,
                          border: "none",
                          background: "transparent",
                          color: "#FCA5A5",
                          cursor: "pointer",
                          fontFamily: "var(--font-inter)",
                          fontSize: 12,
                          fontWeight: 800,
                          padding: 0,
                        }}
                      >
                        Fechar
                      </button>
                    </div>
                  ) : recentPosts.length === 0 ? (
                    <div
                      style={{
                        border: "1px dashed #2D2D2D",
                        borderRadius: 18,
                        padding: "28px 16px",
                        textAlign: "center",
                        fontFamily: "var(--font-inter)",
                        fontSize: 13,
                        color: "#737373",
                      }}
                    >
                      Os treinos concluídos aparecerão aqui como posts.
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                      {recentPosts.map((post) => (
                        <WorkoutPostCard key={post.id} post={post} profile={profile} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </IonCol>
        </IonRow>
      </IonGrid>

    </PageBackground>
  );
}
