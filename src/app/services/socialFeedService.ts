import { INITIAL_POSTS, LIVE_FRIENDS } from "../components/social-feed/mock";

function cloneDeep<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export const socialFeedService = {
  getInitialPosts() {
    return cloneDeep(INITIAL_POSTS);
  },

  getLiveFriends() {
    return cloneDeep(LIVE_FRIENDS);
  },
};
