import { SocialFeedView } from "./components/SocialFeedView";
import { useSocialFeedState } from "./hooks/useSocialFeedState";

export function SocialFeedScreen() {
  const { posts, liveFriends, toggleLike, saveTemplate } = useSocialFeedState();

  return (
    <SocialFeedView
      posts={posts}
      liveFriends={liveFriends}
      onToggleLike={toggleLike}
      onSaveTemplate={saveTemplate}
    />
  );
}
