import { WorkoutPostCardBase } from "../../workout-post";
import type { SocialFeedPost } from "../types";

export function WorkoutPostCard({
  post,
  onToggleLike,
  onSaveTemplate,
  onOpenAuthorProfile,
}: {
  post: SocialFeedPost;
  onToggleLike: (id: string | number) => void;
  onSaveTemplate: (id: string | number) => void;
  onOpenAuthorProfile?: (username: string) => void;
}) {
  return (
    <WorkoutPostCardBase
      post={post}
      author={{
        name: post.author,
        initials: post.initials,
        avatarUrl: post.authorAvatarUrl,
        onClick: onOpenAuthorProfile ? () => onOpenAuthorProfile(post.username) : undefined,
      }}
      bodyWeight={post.bodyWeight}
      liked={post.liked}
      likes={post.likes}
      templateSaved={post.templateSaved}
      onToggleLike={() => onToggleLike(post.id)}
      onToggleTemplate={() => onSaveTemplate(post.id)}
      muscleVariant="accent"
    />
  );
}
