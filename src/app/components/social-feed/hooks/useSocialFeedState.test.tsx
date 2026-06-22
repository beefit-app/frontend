import { act, renderHook, waitFor } from "@testing-library/react";
import { vi } from "vitest";

vi.mock("../../../services/socialFeedService", () => ({ socialFeedService: {
  load: vi.fn().mockResolvedValue({ posts: [{ id: "p-1", likes: 2, liked: false }], last: true }),
  toggleLike: vi.fn().mockResolvedValue({ liked: true, likes_count: 3 }), importTemplate: vi.fn().mockResolvedValue({}),
} }));
vi.mock("../../../services/socialEventsService", () => ({ subscribeSocialEvents: vi.fn().mockResolvedValue(undefined) }));
import { useSocialFeedState } from "./useSocialFeedState";

describe("useSocialFeedState", () => {
  it("atualiza curtida com a resposta da API", async () => {
    const { result } = renderHook(() => useSocialFeedState());
    await waitFor(() => expect(result.current.posts).toHaveLength(1));
    act(() => result.current.toggleLike("p-1"));
    await waitFor(() => expect(result.current.posts[0].liked).toBe(true));
    expect(result.current.posts[0].likes).toBe(3);
  });
});
