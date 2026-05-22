import { useEffect, useState } from "react";
import { INITIAL_POSTS, LIVE_FRIENDS } from "../mock";

export function useSocialFeedState() {
  const [posts, setPosts] = useState(INITIAL_POSTS);
  const [liveFriends, setLiveFriends] = useState(LIVE_FRIENDS);

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
