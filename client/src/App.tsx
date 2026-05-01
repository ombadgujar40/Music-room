import { useEffect, useState, useRef } from "react";
import { socket } from "./services/socket";
import YouTube from "react-youtube";

function App() {
  const [room, setRoom] = useState<any>(null);
  const [songId, setSongId] = useState("");
  const isDJ = socket.id === room?.currentDJ;
  const [currentSong, setCurrentSong] = useState<any>(null);
  const [shouldPlay, setShouldPlay] = useState(false);
  const [hasUnlockedAudio, setHasUnlockedAudio] = useState(false);
  const playerRef = useRef<any>(null);
  const hasSyncedRef = useRef(false);
  const prevSongRef = useRef<any>(null);

  useEffect(() => {

    //display status of rooms
    socket.on("ROOM_UPDATE", (roomData) => {
      console.log("Room State:", roomData);
      setRoom(roomData);

      setCurrentSong(roomData.currentSong);
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
    if (!currentSong && playerRef.current && !playerRef.current) {
      playerRef.current.stopVideo();
      playerRef.current = null;
    }
  }, [currentSong]);

 



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

  useEffect(() => {
    if (!currentSong || !playerRef.current) return;


    if (hasSyncedRef.current) return;

    const elapsed = (Date.now() - currentSong.startAt) / 1000;

    playerRef.current.seekTo(elapsed, true);
    playerRef.current.playVideo();

    hasSyncedRef.current = true;
  }, [currentSong]);

  useEffect(() => {
    if (currentSong) {
      hasSyncedRef.current = false;
    }
  }, [currentSong?.id]);


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
      {isDJ && !currentSong && (
        <p>⏳ Your turn! Play a song within 15 seconds</p>
      )}
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


      {!hasUnlockedAudio && (
        <button onClick={() => setHasUnlockedAudio(true)}>
          Start Listening 🎧
        </button>
      )}
      <br />
      <br />



      <h2>Now Playing:</h2>
      <p>{room?.currentSong?.title || "No song"}</p>
      {currentSong ? (
        <YouTube
          key={currentSong?.id}
          videoId={currentSong?.id}
          onEnd={() => {
            if (playerRef.current) {
              playerRef.current.stopVideo();
            }
            socket.emit("SONG_ENDED", { roomId: "room1" });
          }}
          onReady={(e) => {
            // if(!playerRef.current) return;
            playerRef.current = e.target;
            if (!currentSong) return;
            if (currentSong) {
              const elapsed = (Date.now() - currentSong.startAt) / 1000;

              e.target.seekTo(elapsed, true);
              e.target.playVideo();

              hasSyncedRef.current = true;
            }
          }}
        />
      ) : (
        <p>No song playing</p>
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