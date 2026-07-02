import type { ProfileData } from "./types";

export function getProfileInitials(profile: Pick<ProfileData, "displayName">) {
  return profile.displayName
    .split(" ")
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
