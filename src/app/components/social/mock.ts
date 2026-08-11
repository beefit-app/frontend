import type { Hive, HiveMember, SocialInitialState } from "./types";

export const CURRENT_USER_MEMBER: HiveMember = {
  id: "me",
  name: "Alex Ferreira",
  username: "@alexferreira",
  initials: "AF",
  workouts: 4,
  honeys: 15,
  isCurrentUser: true,
};

export const SOCIAL_INITIAL_STATE: SocialInitialState = {
  friends: [
    { id: "rafa", name: "Rafa Mendes", username: "@rafamendes", initials: "RM", status: "friend" },
    { id: "bianca", name: "Bianca Reis", username: "@biareis", initials: "BR", status: "friend" },
    { id: "marina", name: "Marina Costa", username: "@maricosta", initials: "MC", status: "friend" },
  ],
  friendRequests: [
    {
      id: "request-lia",
      profile: { id: "lia", name: "Lia Rocha", username: "@liarocha", initials: "LR", status: "available" },
    },
    {
      id: "request-joao",
      profile: { id: "joao", name: "Joao Lima", username: "@joaolima", initials: "JL", status: "available" },
    },
  ],
  discoverablePeople: [
    { id: "caio", name: "Caio Alves", username: "@caioalves", initials: "CA", status: "available" },
    { id: "nina", name: "Nina Souza", username: "@ninasouza", initials: "NS", status: "available" },
    { id: "pedro", name: "Pedro Sales", username: "@pedrosales", initials: "PS", status: "available" },
  ],
  hives: [
    {
      id: "hive-iron",
      name: "Ferro das 6",
      period: "Semanal",
      inviteCode: "FERRO-06",
      creatorId: "rafa",
      members: [
        { id: "rafa", name: "Rafa Mendes", username: "@rafamendes", initials: "RM", workouts: 5, honeys: 19 },
        CURRENT_USER_MEMBER,
        { id: "bianca", name: "Bianca Reis", username: "@biancareis", initials: "BR", workouts: 3, honeys: 12 },
      ],
    },
  ],
};

export const INVITABLE_HIVES: Hive[] = [
  {
    id: "hive-power",
    name: "Power Queens",
    period: "Mensal",
    inviteCode: "BEE-POWER",
    creatorId: "bianca",
    members: [
      { id: "bianca", name: "Bianca Reis", username: "@biancareis", initials: "BR", workouts: 18, honeys: 24 },
      { id: "marina", name: "Marina Costa", username: "@marinacosta", initials: "MC", workouts: 16, honeys: 20 },
    ],
  },
  {
    id: "hive-sprint",
    name: "Sprint do Mel",
    period: "Semanal",
    inviteCode: "MEL-7D",
    creatorId: "lia",
    members: [{ id: "lia", name: "Lia Rocha", username: "@liarocha", initials: "LR", workouts: 4, honeys: 8 }],
  },
];
