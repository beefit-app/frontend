export interface PostComment {
  id: string;
  authorId: string;
  username: string;
  avatarUrl: string | null;
  developer: boolean;
  text: string;
  createdAt: string;
  canDelete: boolean;
  canReport: boolean;
}
