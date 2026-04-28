import { useEffect, useState, useRef } from "react";
import { socket } from "./services/socket";
import YouTube from "react-youtube";

function App() {
  const [room, setRoom] = useState<any>(null);
  const [songId, setSongId] = useState("");
  const isDJ = socket.id === room?.currentDJ;
  const [currentSong, setCurrentSong] = useState<any>(null);
  const [shouldPlay, setShouldPlay] = useState(false);
  const playerRef = useRef<any>(null);

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

  useEffect(() => {
    socket.on("PLAY_SONG", (song) => {
      setCurrentSong(song);
    });

    return () => {
      socket.off("PLAY_SONG");
    };
  }, []);

  useEffect(() => {
    if (!currentSong?.startAt) return;

    const delay = currentSong.startAt - Date.now();

    if (delay > 0) {
      setTimeout(() => {
        setShouldPlay(true);
      }, delay);
    } else {
      setShouldPlay(true);
    }
  }, [currentSong]);

  const handleStart = () => {
    if (!currentSong || !playerRef.current) return;

    const now = Date.now();

    const elapsed = (now - currentSong.startAt) / 1000;

    playerRef.current.seekTo(elapsed, true);
    playerRef.current.playVideo();
  };

  return (
    <div>
      <h2>Current DJ:</h2>
      <p>
        {room?.users?.find((u: any) => u.id === room?.currentDJ)?.name || "None"}
      </p>

      <p>
        Skip Votes: {
          Object.values(room?.votes || {}).filter(v => v === "skip").length
        }
      </p>
      <br />
      <br />


      <input
        placeholder="Enter YouTube video ID"
        value={songId}
        onChange={(e) => setSongId(e.target.value)}
        disabled={!isDJ}
      />

      <button
        onClick={() => {
          socket.emit("PLAY_SONG", {
            roomId: "room1",
            song: {
              id: songId,
              title: "Custom Song",
            },
          });
        }}
      >
        Play Song
      </button>

      <h2>Queue:</h2>
      {room?.queue?.map((id: string) => {
        const user = room.users.find((u: any) => u.id === id);
        return <div key={id}>{user?.name}</div>;
      })}

      {isDJ && (
        <button
          onClick={() => {
            socket.emit("NEXT_TURN", { roomId: "room1" });
          }}
        >
          Next Turn
        </button>
      )}<br />


      <button onClick={handleStart}>
        Start Listening 🎧
      </button>



      <h2>Now Playing:</h2>
      <p>{room?.currentSong?.title || "No song"}</p>
      {currentSong && (
        <YouTube
          videoId={currentSong?.id}
          onReady={(e) => {
            playerRef.current = e.target;
          }}
        />
      )}

      <button onClick={() => socket.emit("VOTE", { roomId: "room1", vote: "like" })}>
        👍 Like
      </button>

      <button onClick={() => socket.emit("VOTE", { roomId: "room1", vote: "skip" })}>
        ⏭ Skip
      </button>
    </div>


  );
}

export default App;