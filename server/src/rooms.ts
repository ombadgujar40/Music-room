type User = {
  id: string;
  name: string;
};

type Song = {
  id: string;
  title: string;
  addedBy: string;
  startAt: number;
};

export type Room = {
  id: string;
  users: User[];
  queue: string[];        // userIds
  currentDJ: string | null;
  currentSong: Song | null;
  votes: Record<string, "like" | "skip">;
  scores: Record<string, number>;
};

export const rooms: Record<string, Room> = {};