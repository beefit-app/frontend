import { useEffect, useState } from "react";
import { toast } from "sonner";
import { messages } from "../../../constants/messages";
import { renderStoryCard } from "../../../platform/storyCard";
import { shareWorkoutStory } from "../../../platform/instagramStories";
import type { WorkoutShareTarget } from "../types";
import { buildStoryCardData } from "../utils";

export type WorkoutShareStatus = "idle" | "generating" | "ready" | "sharing" | "error";

export function useWorkoutShare(target: WorkoutShareTarget | null) {
  const [status, setStatus] = useState<WorkoutShareStatus>("idle");
  const [card, setCard] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!target) {
      setStatus("idle");
      setCard(null);
      setPreviewUrl(null);
      return;
    }

    let cancelled = false;
    let url: string | null = null;
    setStatus("generating");
    renderStoryCard(buildStoryCardData(target))
      .then((blob) => {
        if (cancelled) return;
        url = URL.createObjectURL(blob);
        setCard(blob);
        setPreviewUrl(url);
        setStatus("ready");
      })
      .catch((error) => {
        console.warn("Falha ao gerar o card do treino:", error);
        if (!cancelled) setStatus("error");
      });

    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [target]);

  async function share() {
    if (!card || status === "sharing") return;
    setStatus("sharing");
    try {
      const result = await shareWorkoutStory(card, {
        onInstagramUnavailable: () => toast.info(messages.storyInstagramUnavailable),
      });
      if (result === "downloaded") toast.success(messages.storyDownloaded);
    } catch (error) {
      console.warn("Falha ao compartilhar o card do treino:", error);
      toast.error(messages.actionFailed("compartilhar o card do treino"));
    } finally {
      setStatus("ready");
    }
  }

  return { status, previewUrl, share };
}
