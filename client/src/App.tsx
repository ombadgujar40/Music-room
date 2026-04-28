import { useEffect, useState } from "react";
import { socket } from "./services/socket";

function App() {
  const [room, setRoom] = useState<any>(null);

  useEffect(() => {

    //display status of rooms
    socket.on("ROOM_UPDATE", (roomData) => {
      console.log("Room State:", roomData);
      setRoom(roomData);
    });

    //room joining handler
    socket.emit("JOIN_ROOM", {
      roomId: "room1",
      name: "User_" + Math.floor(Math.random() * 1000),
    });

    return () => {
      socket.off("ROOM_UPDATE");
    };
  }, []);

  return (
    <div>
      <h1>Music Room App 🎧</h1>

      <h2>Users:</h2>
      {room?.users?.map((user: any) => (
        <div key={user.id}>{user.name}</div>
      ))}
    </div>
  );
}

export default App;