import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "./apiClient";
import { commentService } from "./commentService";

vi.mock("./apiClient", () => ({ apiClient: { get: vi.fn(), post: vi.fn(), delete: vi.fn() } }));

describe("commentService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lista uma página autenticada sem carregar comentários no feed", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ content: [{ id: "c1", text: "Olá" }], last: false, totalElements: 21 });
    const result = await commentService.list("p1", 1);
    expect(apiClient.get).toHaveBeenCalledWith("/api/posts/p1/comments?page=1&size=20", { auth: true });
    expect(result.content[0].avatarUrl).toBeNull();
    expect(result.last).toBe(false);
  });

  it("publica e notifica outras telas somente após sucesso", async () => {
    const listener = vi.fn();
    const unsubscribe = commentService.subscribe(listener);
    vi.mocked(apiClient.post).mockResolvedValue({ id: "c1" });
    await commentService.create("p1", "Bom treino!");
    expect(apiClient.post).toHaveBeenCalledWith("/api/posts/p1/comments", { text: "Bom treino!" }, { auth: true });
    expect(listener).toHaveBeenCalledWith("p1");
    listener.mockClear();
    vi.mocked(apiClient.post).mockRejectedValue(new Error("Offline"));
    await expect(commentService.create("p1", "Outro")).rejects.toThrow("Offline");
    expect(listener).not.toHaveBeenCalled();
    unsubscribe();
  });

  it("exclui sem corpo e com autenticação", async () => {
    await commentService.remove("p1", "c1");
    expect(apiClient.delete).toHaveBeenCalledWith("/api/posts/p1/comments/c1", undefined, { auth: true });
  });
});
