import { canShareDirectlyToInstagram } from "../../platform/instagramStories";
import { WorkoutShareView } from "./components/WorkoutShareView";
import { useWorkoutShare } from "./hooks/useWorkoutShare";
import type { WorkoutShareTarget } from "./types";

export type { WorkoutShareTarget } from "./types";

export function WorkoutShareSheet({
  target,
  onClose,
}: {
  target: WorkoutShareTarget | null;
  onClose: () => void;
}) {
  const { status, previewUrl, share } = useWorkoutShare(target);

  return (
    <WorkoutShareView
      open={target !== null}
      status={status}
      previewUrl={previewUrl}
      // Na web não há como abrir o Instagram direto; o botão leva ao share sheet
      // do navegador ou ao download, e prometer o Instagram seria enganoso.
      shareLabel={canShareDirectlyToInstagram() ? "Compartilhar no Instagram Stories" : "Compartilhar card"}
      onShare={() => void share()}
      onClose={onClose}
    />
  );
}
