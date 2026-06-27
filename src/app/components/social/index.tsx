import { SocialView } from "./components/SocialView";
import { useSocialState } from "./hooks/useSocialState";

export function SocialScreen({ isActive = false }: { isActive?: boolean }) {
  const state = useSocialState(isActive);

  return <SocialView state={state} />;
}
