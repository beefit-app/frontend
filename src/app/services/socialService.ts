import { apiClient } from "./apiClient";
import type { FriendProfile, FriendRequest, Hive, HiveMember, HiveRankingPeriod } from "../components/social/types";

interface ApiUser { id: string; fullName: string; username: string; profilePicture?: string | null }
interface ApiFriendship { id: string; user: ApiUser; status: string; direction: string }
interface ApiHive { id: string; name: string; creatorId: string; inviteCode: string; startDate: string; endDate: string }
interface ApiRanking { userId: string; fullName: string; username: string; profilePicture?: string | null; score: number }

function initials(name: string) { return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase(); }
function profile(user: ApiUser, status: FriendProfile["status"]): FriendProfile {
  return { id: user.id, name: user.fullName, username: `@${user.username.replace(/^@/, "")}`, initials: initials(user.fullName), status };
}
function period(hive: ApiHive): HiveRankingPeriod { return (new Date(hive.endDate).getMonth() === new Date(hive.startDate).getMonth() && new Date(hive.endDate).getDate() - new Date(hive.startDate).getDate() <= 7) ? "Semanal" : "Mensal"; }
function hiveMember(item: ApiRanking): HiveMember { return { id: item.userId, name: item.fullName, initials: initials(item.fullName), workouts: item.score, honeys: 0 }; }

function datesForPeriod(value: HiveRankingPeriod) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start);
  if (value === "Semanal") end.setDate(start.getDate() + ((7 - start.getDay()) % 7 || 7));
  else end.setMonth(start.getMonth() + 1, 0);
  return { startDate: start.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10) };
}

export const socialService = {
  async loadFriends() { return (await apiClient.get<ApiFriendship[]>("/api/social/friends", { auth: true })).map((item) => ({ ...profile(item.user, "friend"), friendshipId: item.id })); },
  async loadRequests(): Promise<FriendRequest[]> {
    const items = await apiClient.get<ApiFriendship[]>("/api/social/friends/requests/incoming", { auth: true });
    return items.map((item) => ({ id: item.id, profile: profile(item.user, "available") }));
  },
  async search(query: string) {
    const response = await apiClient.get<{ content?: ApiUser[] }>(`/api/social/friends/search?query=${encodeURIComponent(query)}&size=20`, { auth: true });
    return (response.content ?? []).map((item) => profile(item, "available"));
  },
  async sendRequest(userId: string) { return apiClient.post<ApiFriendship>(`/api/social/friends/request/${userId}`, undefined, { auth: true }); },
  async acceptRequest(id: string) { return apiClient.post<ApiFriendship>(`/api/social/friends/${id}/accept`, undefined, { auth: true }); },
  async rejectRequest(id: string) { return apiClient.post(`/api/social/friends/${id}/reject`, undefined, { auth: true }); },
  async removeFriend(id: string) { return apiClient.delete(`/api/social/friends/${id}`, undefined, { auth: true }); },
  async loadHives(currentUserId: string) {
    const hives = await apiClient.get<ApiHive[]>("/api/hives/mine", { auth: true });
    return Promise.all(hives.map(async (item): Promise<Hive> => {
      const ranking = await apiClient.get<ApiRanking[]>(`/api/hives/${item.id}/getData`, { auth: true });
      return { id: item.id, name: item.name, period: period(item), inviteCode: item.inviteCode, creatorId: item.creatorId,
        members: ranking.map((member) => ({ ...hiveMember(member), isCurrentUser: member.userId === currentUserId })) };
    }));
  },
  async createHive(name: string, rankingPeriod: HiveRankingPeriod, currentUserId: string) {
    const dates = datesForPeriod(rankingPeriod);
    await apiClient.post<ApiHive>("/api/hives/", { name, ...dates }, { auth: true });
    return this.loadHives(currentUserId);
  },
  async joinHive(code: string, currentUserId: string) { await apiClient.post(`/api/hives/${encodeURIComponent(code)}/join`, undefined, { auth: true }); return this.loadHives(currentUserId); },
  async leaveHive(id: string) { return apiClient.delete(`/api/hives/${id}/membership`, undefined, { auth: true }); },
};
