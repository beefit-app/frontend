import { useState } from "react";
import { WorkoutPostCardBase } from "../../workout-post";
import type { SocialFeedPost } from "../types";
import { useAuth } from "../../../auth/AuthContext";
import { ReportSheet } from "../../ReportSheet";

export function WorkoutPostCard({
  post,
  onToggleLike,
  onSaveTemplate,
  onOpenAuthorProfile,
  onDeletePost,
}: {
  post: SocialFeedPost;
  onToggleLike: (id: string | number) => void;
  onSaveTemplate: (id: string | number) => void;
  onOpenAuthorProfile?: (username: string) => void;
  onDeletePost?: (id: string | number) => void;
}) {
  const { user } = useAuth();
  const [isReportOpen, setIsReportOpen] = useState(false);
  const isMine = user?.id === post.authorId;

  return (
    <>
      <WorkoutPostCardBase
        post={post}
        author={{
          name: post.author,
          initials: post.initials,
          avatarUrl: post.authorAvatarUrl,
          isDeveloper: post.authorIsDeveloper,
          onClick: onOpenAuthorProfile ? () => onOpenAuthorProfile(post.username) : undefined,
        }}
        bodyWeight={post.bodyWeight}
        liked={post.liked}
        likes={post.likes}
        templateSaved={post.templateSaved}
        onToggleLike={() => onToggleLike(post.id)}
        onToggleTemplate={() => onSaveTemplate(post.id)}
        muscleVariant="accent"
        onDelete={isMine && onDeletePost ? () => onDeletePost(post.id) : undefined}
        onReport={isMine ? undefined : () => setIsReportOpen(true)}
      />
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
