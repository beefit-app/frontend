import { CURRENT_USER_MEMBER, INVITABLE_HIVES, SOCIAL_INITIAL_STATE } from "../components/social/mock";
import type { Hive, SocialInitialState } from "../components/social/types";

function cloneDeep<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export const socialService = {
  getInitialState(): SocialInitialState {
    return cloneDeep(SOCIAL_INITIAL_STATE);
  },

  getInvitedHive(inviteCode: string): Hive | null {
    const normalizedCode = inviteCode.trim().toUpperCase();
    const hive = INVITABLE_HIVES.find((item) => item.inviteCode === normalizedCode);
    if (!hive) return null;

    return {
      ...cloneDeep(hive),
      members: [...cloneDeep(hive.members), cloneDeep(CURRENT_USER_MEMBER)],
    };
  },

  getCurrentUserMember() {
    return cloneDeep(CURRENT_USER_MEMBER);
  },
};
