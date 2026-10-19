import { Capacitor, registerPlugin } from "@capacitor/core";
import { Directory, Filesystem } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";

/**
 * Plugin nativo do próprio app (android/.../InstagramStoriesPlugin.java e
 * ios/App/App/InstagramStoriesPlugin.swift). Responde `shared: false` em vez de
 * rejeitar quando o Instagram não pode receber a imagem, para o chamador cair no
 * share sheet sem confundir isso com uma falha real.
 */
interface InstagramStoriesPlugin {
  shareToStory(options: { uri: string; appId: string }): Promise<{
    shared: boolean;
    reason?: "not-installed" | "missing-app-id";
  }>;
}

const InstagramStories = registerPlugin<InstagramStoriesPlugin>("InstagramStories");

const STORY_DIRECTORY = "stories";

export type StoryShareResult = "instagram" | "share-sheet" | "downloaded" | "cancelled";

export interface StoryShareOptions {
  fileName?: string;
  /** Chamado quando o Instagram não está disponível, antes de abrir o share sheet. */
  onInstagramUnavailable?: () => void;
}

function blobToBase64(blob: Blob): Promise<string> {
  return blob.arrayBuffer().then((buffer) => {
    let binary = "";
    new Uint8Array(buffer).forEach((value) => {
      binary += String.fromCharCode(value);
    });
    return btoa(binary);
  });
}

function isShareCancellation(error: unknown) {
  if (error instanceof DOMException && error.name === "AbortError") return true;
  const message = error instanceof Error ? error.message : String(error);
  return /cancel/i.test(message);
}

function metaAppId() {
  return (import.meta.env.VITE_META_APP_ID ?? "").trim();
}

async function writeStoryToCache(png: Blob, fileName: string) {
  // Cada compartilhamento grava um arquivo novo; limpar os anteriores evita que o
  // cache acumule um PNG de 1080x1920 por treino.
  try {
    await Filesystem.rmdir({ path: STORY_DIRECTORY, directory: Directory.Cache, recursive: true });
  } catch {
    // A pasta ainda não existe no primeiro compartilhamento.
  }
  const { uri } = await Filesystem.writeFile({
    path: `${STORY_DIRECTORY}/${fileName}`,
    data: await blobToBase64(png),
    directory: Directory.Cache,
    recursive: true,
  });
  return uri;
}

async function shareNative(png: Blob, fileName: string, options: StoryShareOptions): Promise<StoryShareResult> {
  const uri = await writeStoryToCache(png, fileName);

  try {
    const result = await InstagramStories.shareToStory({ uri, appId: metaAppId() });
    if (result.shared) return "instagram";
  } catch (error) {
    console.warn("Compartilhamento direto no Instagram falhou:", error);
  }

  options.onInstagramUnavailable?.();
  try {
    await Share.share({ files: [uri] });
    return "share-sheet";
  } catch (error) {
    if (isShareCancellation(error)) return "cancelled";
    throw error;
  }
}

async function shareWeb(png: Blob, fileName: string): Promise<StoryShareResult> {
  const file = new File([png], fileName, { type: "image/png" });
  if (typeof navigator.share === "function" && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return "share-sheet";
    } catch (error) {
      if (isShareCancellation(error)) return "cancelled";
      throw error;
    }
  }

  const url = URL.createObjectURL(png);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  // O Safari começa o download depois do clique; revogar na hora cancela o arquivo.
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
  return "downloaded";
}

export function canShareDirectlyToInstagram() {
  return Capacitor.isNativePlatform();
}

export function shareWorkoutStory(png: Blob, options: StoryShareOptions = {}): Promise<StoryShareResult> {
  const fileName = options.fileName ?? `beefit-treino-${Date.now()}.png`;
  return Capacitor.isNativePlatform() ? shareNative(png, fileName, options) : shareWeb(png, fileName);
}
