import { useEffect, useState } from "react";
import { profileService } from "../../../services/profileService";
import { socialService } from "../../../services/socialService";
import type { PublicUserProfile } from "../../../types/user";
import type { WorkoutPost } from "../types";
import { ProfileView } from "./ProfileView";
import { ReportSheet } from "../../ReportSheet";
import { Sheet, SheetContent } from "../../ui/sheet";

function actionLabel(profile: PublicUserProfile | null) {
  if (!profile) return null;
  if (profile.relationshipStatus === "NONE") return "Adicionar amigo";
  if (profile.relationshipStatus === "REQUEST_SENT") return "Cancelar solicitação";
  if (profile.relationshipStatus === "REQUEST_RECEIVED") return "Aceitar solicitação";
  if (profile.relationshipStatus === "FRIEND") return "Amigos";
  return null;
}

function actionDisabled(profile: PublicUserProfile | null, isSubmitting: boolean) {
  if (isSubmitting || !profile) return true;
  return profile.relationshipStatus === "FRIEND";
}

export function PublicProfileSheet({
  username,
  open,
  onOpenChange,
  onFriendshipChange,
}: {
  username: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFriendshipChange?: () => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="beefit-sheet-width max-h-[94dvh] overflow-y-auto rounded-t-[28px] border-[#2D2D2D] bg-[#0A0A0A] p-0 text-white">
        <PublicProfileContent username={open ? username : null} onFriendshipChange={onFriendshipChange} />
      </SheetContent>
    </Sheet>
  );
}

export function PublicProfilePage({
  username,
  onBack,
  onFriendshipChange,
}: {
  username: string;
  onBack: () => void;
  onFriendshipChange?: () => void;
}) {
  return (
    <PublicProfileContent
      username={username}
      onBack={onBack}
      onFriendshipChange={onFriendshipChange}
    />
  );
}

function PublicProfileContent({
  username,
  onBack,
  onFriendshipChange,
}: {
  username: string | null;
  onBack?: () => void;
  onFriendshipChange?: () => void;
}) {
  const [profile, setProfile] = useState<PublicUserProfile | null>(null);
  const [posts, setPosts] = useState<WorkoutPost[]>([]);
  const [trainedDays, setTrainedDays] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [postsLoadError, setPostsLoadError] = useState<string | null>(null);
  const [isReportOpen, setIsReportOpen] = useState(false);

  useEffect(() => {
    if (!username) return;

    let cancelled = false;
    setIsLoading(true);
    setLoadError(null);
    setPostsLoadError(null);
    setProfile(null);
    setPosts([]);
    setTrainedDays([]);

    void profileService
      .getPublicProfile(username)
      .then((nextProfile) => {
        if (!cancelled) setProfile(nextProfile);
      })
      .catch((error: unknown) => {
        if (!cancelled) setLoadError(error instanceof Error ? error.message : "Não foi possível carregar o perfil.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    void profileService
      .getPublicPosts(username)
      .then((nextPosts) => {
        if (!cancelled) setPosts(nextPosts);
      })
      .catch(() => {
        if (!cancelled) {
          setPosts([]);
          setPostsLoadError(null);
        }
      });

    void profileService
      .getPublicTrainedDays(username)
      .then((days) => {
        if (!cancelled) setTrainedDays(days);
      })
      .catch(() => {
        if (!cancelled) setTrainedDays([]);
      });

    return () => {
      cancelled = true;
    };
  }, [username]);

  async function handlePublicAction() {
    if (!profile || actionDisabled(profile, isSubmitting)) return;

    setIsSubmitting(true);
    try {
      if (profile.relationshipStatus === "NONE") {
        const response = await socialService.sendRequest(profile.userId);
        setProfile((current) => current && {
          ...current,
          relationshipStatus: "REQUEST_SENT",
          friendshipId: response.id,
        });
      } else if (profile.relationshipStatus === "REQUEST_RECEIVED" && profile.friendshipId) {
        const response = await socialService.acceptRequest(profile.friendshipId);
        setProfile((current) => current && {
          ...current,
          relationshipStatus: "FRIEND",
          friendshipId: response.id,
        });
      } else if (profile.relationshipStatus === "REQUEST_SENT" && profile.friendshipId) {
        await socialService.cancelRequest(profile.friendshipId);
        setProfile((current) => current && {
          ...current,
          relationshipStatus: "NONE",
          friendshipId: null,
        });
      }
      onFriendshipChange?.();
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Não foi possível concluir a ação.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!profile) {
    return (
      <div className="min-h-[420px] bg-[#0A0A0A] px-6 py-14 text-center">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="mb-8 rounded-2xl border border-[#2D2D2D] bg-[#141414] px-4 py-3 font-montserrat text-[12px] font-bold text-[#D4D4D4]"
          >
            Voltar
          </button>
        )}
        <p className="font-montserrat text-[16px] font-bold text-white">
          {loadError ? "Não foi possível carregar o perfil." : "Carregando perfil..."}
        </p>
        {loadError && <p className="mt-2 font-inter text-[13px] leading-5 text-[#FCA5A5]">{loadError}</p>}
      </div>
    );
  }

  return (
    <>
    <ProfileView
      profile={profile}
      isLoading={isLoading || isSubmitting}
      loadError={loadError}
      postsLoadError={postsLoadError}
      trainedDays={trainedDays}
      recentPosts={posts}
      managementEnabled={false}
      onReportProfile={() => setIsReportOpen(true)}
      publicActionLabel={isSubmitting ? "Atualizando..." : actionLabel(profile)}
      publicActionDisabled={actionDisabled(profile, isSubmitting)}
      onPublicAction={handlePublicAction}
      onBack={onBack}
      onDismissError={() => setLoadError(null)}
      onDismissPostsError={() => setPostsLoadError(null)}
    />
    <ReportSheet
      open={isReportOpen}
      onOpenChange={setIsReportOpen}
      targetType="USER"
      targetId={profile.userId}
      targetLabel={`o perfil de ${profile.displayName}`}
    />
    </>
  );
}
