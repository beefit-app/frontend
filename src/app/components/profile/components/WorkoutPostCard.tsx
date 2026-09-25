import { useState } from "react";
import { WorkoutPostCardBase } from "../../workout-post";
import type { ProfileData, WorkoutPost } from "../types";
import { getProfileInitials } from "../utils";
import { useAuth } from "../../../auth/AuthContext";
import { workoutService } from "../../../services/workoutService";
import { useConfirm } from "../../../hooks/useConfirm";
import { ReportSheet } from "../../ReportSheet";
import { toast } from "sonner";

export function WorkoutPostCard({ post, profile }: { post: WorkoutPost; profile: ProfileData; }) {
  const [liked, setLiked] = useState(post.liked);
  const [likes, setLikes] = useState(post.likes);
  const [templateSaved, setTemplateSaved] = useState(post.templateSaved);
  const [isDeleted, setIsDeleted] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const initials = getProfileInitials(profile);
  const { user } = useAuth();
  const isMe = user?.id === profile.id;
  const { confirm, dialog } = useConfirm();

  function toggleLike() {
    setLiked((current) => {
      setLikes((count) => (current ? count - 1 : count + 1));
      return !current;
    });
  }

  function handleReport() {
    setIsReportOpen(true);
  }

  async function handleDelete() {
    const ok = await confirm({
      title: "Apagar Treino",
      description: "Tem certeza que deseja apagar este treino? Essa ação não pode ser desfeita.",
      confirmLabel: "Apagar",
      cancelLabel: "Cancelar",
      destructive: true,
    });
    if (!ok) return;
    try {
      await workoutService.deleteWorkout(String(post.id));
      setIsDeleted(true);
      toast.success("Treino apagado com sucesso.");
    } catch (e) {
      toast.error("Não foi possível apagar o treino.");
    }
  }

  if (isDeleted) return null;

  return (
    <>
      <WorkoutPostCardBase
        post={post}
        author={{ name: profile.displayName, initials, avatarUrl: profile.avatarUrl, isDeveloper: profile.isDeveloper }}
        bodyWeight={profile.weight ?? 0}
        liked={liked}
        likes={likes}
        templateSaved={templateSaved}
        onToggleLike={toggleLike}
        onToggleTemplate={() => setTemplateSaved((current) => !current)}
        muscleVariant="accent"
        onDelete={isMe ? handleDelete : undefined}
        onReport={isMe ? undefined : handleReport}
      />
      {dialog}
      <ReportSheet
        open={isReportOpen}
        onOpenChange={setIsReportOpen}
        targetType="POST"
        targetId={String(post.id)}
        targetLabel={post.title ?? "esta publicação"}
      />
    </>
  );
}
