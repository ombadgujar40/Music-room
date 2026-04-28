type User = {
  id: string;
  name: string;
};

type Room = {
  id: string;
  users: User[];
};

export const rooms: Record<string, Room> = {};