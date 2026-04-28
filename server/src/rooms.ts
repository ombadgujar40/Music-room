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




type Room = {
  id: string;
  users: User[];
  queue: string[];        // userIds
  currentDJ: string | null;
  currentSong: Song | null;
  votes: Record<string, "like" | "skip">;
};

export const rooms: Record<string, Room> = {};