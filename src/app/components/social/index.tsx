import { SocialView } from "./components/SocialView";
import { useSocialState } from "./hooks/useSocialState";

export function SocialScreen() {
  const state = useSocialState();

  return <SocialView state={state} />;
}
