import { WorkoutPostCardBase } from "../../workout-post";
import type { SocialFeedPost } from "../types";

export function WorkoutPostCard({
  post,
  onToggleLike,
  onSaveTemplate,
}: {
  post: SocialFeedPost;
  onToggleLike: (id: string | number) => void;
  onSaveTemplate: (id: string | number) => void;
}) {
  return (
    <WorkoutPostCardBase
      post={post}
      author={{ name: post.author, initials: post.initials }}
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
