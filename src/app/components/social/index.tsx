import { SocialView } from "./components/SocialView";
import { useSocialState } from "./hooks/useSocialState";

export function SocialScreen({
  isActive = false,
  profileUsername,
  onOpenProfileFromSocial,
  onProfileClosed,
}: {
  isActive?: boolean;
  profileUsername?: string | null;
  onOpenProfileFromSocial?: () => void;
  onProfileClosed?: () => void;
}) {
  const state = useSocialState(isActive);

  return <SocialView state={state} profileUsername={profileUsername} onOpenProfileFromSocial={onOpenProfileFromSocial} onProfileClosed={onProfileClosed} />;
}
