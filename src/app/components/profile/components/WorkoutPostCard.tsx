import { useState } from "react";
import { WorkoutPostCardBase } from "../../workout-post";
import type { ProfileData, WorkoutPost } from "../types";
import { getProfileInitials } from "../utils";

export function WorkoutPostCard({ post, profile }: { post: WorkoutPost; profile: ProfileData }) {
  const [liked, setLiked] = useState(post.liked);
  const [likes, setLikes] = useState(post.likes);
  const [templateSaved, setTemplateSaved] = useState(post.templateSaved);
  const initials = getProfileInitials(profile);

  function toggleLike() {
    setLiked((current) => {
      setLikes((count) => (current ? count - 1 : count + 1));
      return !current;
    });
  }

  return (
    <WorkoutPostCardBase
      post={post}
      author={{ name: profile.displayName, initials, avatarUrl: profile.avatarUrl }}
      bodyWeight={profile.weight}
      liked={liked}
      likes={likes}
      templateSaved={templateSaved}
      onToggleLike={toggleLike}
      onToggleTemplate={() => setTemplateSaved((current) => !current)}
      muscleVariant="neutral"
    />
  );
}
