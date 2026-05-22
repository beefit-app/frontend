import { SocialFeedView } from "./components/SocialFeedView";
import { useSocialFeedState } from "./hooks/useSocialFeedState";

export function SocialFeedScreen({
  streakCount,
  isStreakFedToday,
  streakBurstToken,
}: {
  streakCount: number;
  isStreakFedToday: boolean;
  streakBurstToken: number;
}) {
  const { posts, liveFriends, toggleLike, saveTemplate } = useSocialFeedState();

  return (
    <SocialFeedView
      posts={posts}
      liveFriends={liveFriends}
      streakCount={streakCount}
      isStreakFedToday={isStreakFedToday}
      streakBurstToken={streakBurstToken}
      onToggleLike={toggleLike}
      onSaveTemplate={saveTemplate}
    />
  );
}
