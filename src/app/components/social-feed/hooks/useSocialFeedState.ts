import { useEffect, useState } from "react";
import { socialFeedService } from "../../../services/socialFeedService";

export function useSocialFeedState() {
  const [posts, setPosts] = useState(() => socialFeedService.getInitialPosts());
  const [liveFriends, setLiveFriends] = useState(() => socialFeedService.getLiveFriends());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setLiveFriends((current) =>
        current.map((friend) => ({ ...friend, elapsedSeconds: friend.elapsedSeconds + 1 })),
      );
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  function toggleLike(id: number) {
    setPosts((current) =>
      current.map((post) =>
        post.id === id
          ? { ...post, liked: !post.liked, likes: post.liked ? post.likes - 1 : post.likes + 1 }
          : post,
      ),
    );
  }

  function saveTemplate(id: number) {
    setPosts((current) =>
      current.map((post) => (post.id === id ? { ...post, templateSaved: !post.templateSaved } : post)),
    );
  }

  return {
    posts,
    liveFriends,
    toggleLike,
    saveTemplate,
  };
}
