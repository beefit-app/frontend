import { act, renderHook } from "@testing-library/react";
import { useSocialFeedState } from "./useSocialFeedState";

describe("useSocialFeedState", () => {
  it("alternates like state and updates the counter", () => {
    const { result } = renderHook(() => useSocialFeedState());
    const firstPost = result.current.posts[0];

    act(() => {
      result.current.toggleLike(firstPost.id);
    });

    expect(result.current.posts[0].liked).toBe(!firstPost.liked);
    expect(result.current.posts[0].likes).toBe(firstPost.likes + 1);

    act(() => {
      result.current.toggleLike(firstPost.id);
    });

    expect(result.current.posts[0].liked).toBe(firstPost.liked);
    expect(result.current.posts[0].likes).toBe(firstPost.likes);
  });
});
