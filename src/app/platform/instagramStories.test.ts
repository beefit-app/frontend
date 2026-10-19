import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Duplos: nem a bridge do Capacitor nem os plugins nativos existem no jsdom.
const isNativePlatform = vi.hoisted(() => vi.fn(() => true));
const shareToStory = vi.hoisted(() => vi.fn());
const writeFile = vi.hoisted(() => vi.fn(async () => ({ uri: "file:///cache/stories/card.png" })));
const rmdir = vi.hoisted(() => vi.fn(async () => undefined));
const nativeShare = vi.hoisted(() => vi.fn(async () => ({})));

vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform },
  registerPlugin: () => ({ shareToStory }),
}));
vi.mock("@capacitor/filesystem", () => ({
  Directory: { Cache: "CACHE" },
  Filesystem: { writeFile, rmdir },
}));
vi.mock("@capacitor/share", () => ({ Share: { share: nativeShare } }));

const png = new Blob([new Uint8Array([137, 80, 78, 71])], { type: "image/png" });

describe("shareWorkoutStory", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    isNativePlatform.mockReturnValue(true);
    vi.stubEnv("VITE_META_APP_ID", "123456");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("no nativo", () => {
    it("grava o PNG no cache e abre os Stories com o App ID", async () => {
      shareToStory.mockResolvedValue({ shared: true });
      const { shareWorkoutStory } = await import("./instagramStories");

      const result = await shareWorkoutStory(png, { fileName: "card.png" });

      expect(result).toBe("instagram");
      expect(writeFile).toHaveBeenCalledWith(
        expect.objectContaining({ path: "stories/card.png", directory: "CACHE", data: btoa("\x89PNG") }),
      );
      expect(shareToStory).toHaveBeenCalledWith({ uri: "file:///cache/stories/card.png", appId: "123456" });
      expect(nativeShare).not.toHaveBeenCalled();
    });

    it("avisa e abre o share sheet quando o Instagram nao esta instalado", async () => {
      shareToStory.mockResolvedValue({ shared: false, reason: "not-installed" });
      const onInstagramUnavailable = vi.fn();
      const { shareWorkoutStory } = await import("./instagramStories");

      const result = await shareWorkoutStory(png, { fileName: "card.png", onInstagramUnavailable });

      expect(result).toBe("share-sheet");
      expect(onInstagramUnavailable).toHaveBeenCalledTimes(1);
      expect(nativeShare).toHaveBeenCalledWith({ files: ["file:///cache/stories/card.png"] });
    });

    it("cai no share sheet tambem quando o plugin falha", async () => {
      shareToStory.mockRejectedValue(new Error("plugin ausente"));
      const { shareWorkoutStory } = await import("./instagramStories");

      await expect(shareWorkoutStory(png)).resolves.toBe("share-sheet");
    });

    it("trata o share sheet fechado pelo usuario como cancelamento, nao erro", async () => {
      shareToStory.mockResolvedValue({ shared: false, reason: "not-installed" });
      nativeShare.mockRejectedValueOnce(new Error("Share canceled"));
      const { shareWorkoutStory } = await import("./instagramStories");

      await expect(shareWorkoutStory(png)).resolves.toBe("cancelled");
    });
  });

  describe("na web", () => {
    beforeEach(() => {
      isNativePlatform.mockReturnValue(false);
    });

    afterEach(() => {
      Reflect.deleteProperty(navigator, "share");
      Reflect.deleteProperty(navigator, "canShare");
    });

    it("usa o share do navegador quando ele aceita arquivos", async () => {
      const share = vi.fn(async () => undefined);
      Object.assign(navigator, { share, canShare: () => true });
      const { shareWorkoutStory } = await import("./instagramStories");

      const result = await shareWorkoutStory(png, { fileName: "card.png" });

      expect(result).toBe("share-sheet");
      const [[payload]] = share.mock.calls as unknown as [[{ files: File[] }]];
      expect(payload.files[0].name).toBe("card.png");
      expect(writeFile).not.toHaveBeenCalled();
    });

    it("baixa o PNG quando o navegador nao compartilha arquivos", async () => {
      const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
      const createObjectURL = vi.fn(() => "blob:card");
      Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() });
      const { shareWorkoutStory } = await import("./instagramStories");

      const result = await shareWorkoutStory(png, { fileName: "card.png" });

      expect(result).toBe("downloaded");
      expect(createObjectURL).toHaveBeenCalledWith(png);
      expect(click).toHaveBeenCalledTimes(1);
      click.mockRestore();
    });
  });
});
