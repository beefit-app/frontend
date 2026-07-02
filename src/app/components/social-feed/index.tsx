import { SocialFeedView } from "./components/SocialFeedView";
import { useSocialFeedState } from "./hooks/useSocialFeedState";

export function SocialFeedScreen({
  streakCount,
  isStreakFedToday,
  streakBurstToken,
  onOpenUserProfile,
}: {
  streakCount: number;
  isStreakFedToday: boolean;
  streakBurstToken: number;
  onOpenUserProfile?: (username: string) => void;
}) {
  const { posts, liveFriends, toggleLike, saveTemplate, isLoading, isLoadingMore, hasMore, error, loadMore, retry } =
    useSocialFeedState();

  return (
    <SocialFeedView
      posts={posts}
      liveFriends={liveFriends}
      streakCount={streakCount}
      isStreakFedToday={isStreakFedToday}
      streakBurstToken={streakBurstToken}
      onToggleLike={toggleLike}
      onSaveTemplate={saveTemplate}
      onOpenAuthorProfile={onOpenUserProfile}
      isLoading={isLoading}
      isLoadingMore={isLoadingMore}
      hasMore={hasMore}
      error={error}
      onLoadMore={loadMore}
      onRetry={retry}
    />
  );
}
