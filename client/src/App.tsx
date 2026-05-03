import { useEffect, useState, useRef } from "react";
import { socket } from "./services/socket";
import YouTube from "react-youtube";

function App() {
  // =========================
  // 🔹 CORE STATE
  // =========================
  const [room, setRoom] = useState<any>(null);
  const [currentSong, setCurrentSong] = useState<any>(null);

  // =========================
  // 🔹 USER / ROOM CONTROL
  // =========================
  const [roomId, setRoomId] = useState("room1");
  const [username, setUsername] = useState("");
  const [joined, setJoined] = useState(false);

  // =========================
  // 🔹 DJ + INPUT CONTROL
  // =========================
  const [songId, setSongId] = useState("");
  const isDJ = socket.id === room?.currentDJ;

  // =========================
  // 🔹 YOUTUBE PLAYER CONTROL
  // =========================
  const playerRef = useRef<any>(null);      // stores YouTube player instance
  const hasSyncedRef = useRef(false);       // prevents repeated syncing

  // =========================
  // 🔹 SEARCH STATE
  // =========================
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // =========================
  // 🔍 YOUTUBE SEARCH FUNCTION
  // =========================
  const searchYouTube = async () => {
    if (!query.trim()) return;

    try {
      setLoading(true);

      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=5&q=${encodeURIComponent(query)}&key=${import.meta.env.VITE_YT_API_KEY}`
      );

      const data = await res.json();
      setResults(data.items || []);

    } catch (e) {
      console.error("Search error", e);
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // 🔁 SOCKET LISTENER (ROOM STATE)
  // =========================
  useEffect(() => {
    if (!joined) return;

    socket.on("ROOM_UPDATE", (roomData) => {
      console.log("Room State:", roomData);

      setRoom(roomData);
      setCurrentSong(roomData.currentSong); // single source of truth
    });

    return () => {
      socket.off("ROOM_UPDATE");
    };
  }, [joined]);

  // =========================
  // 🏆 LEADERBOARD SORTING
  // =========================
  const sortedUsers = [...(room?.users || [])].sort((a, b) => {
    const scoreA = room?.scores?.[a.id] || 0;
    const scoreB = room?.scores?.[b.id] || 0;
    return scoreB - scoreA; // highest first
  });

  // =========================
  // ⛔ STOP VIDEO WHEN SONG ENDS
  // =========================
  useEffect(() => {
    // NOTE: this condition is logically incorrect but kept as-is per instruction
    if (!currentSong && playerRef.current && !playerRef.current) {
      playerRef.current.stopVideo();
      playerRef.current = null;
    }
  }, [currentSong]);

  // =========================
  // 🎯 SYNC VIDEO POSITION
  // =========================
  useEffect(() => {
    if (!currentSong || !playerRef.current) return;

    // prevent repeated syncing
    if (hasSyncedRef.current) return;

    const elapsed = (Date.now() - currentSong.startAt) / 1000;

    playerRef.current.seekTo(elapsed, true);
    playerRef.current.playVideo();

    hasSyncedRef.current = true;
  }, [currentSong]);

  // =========================
  // 🔄 RESET SYNC ON NEW SONG
  // =========================
  useEffect(() => {
    if (currentSong) {
      hasSyncedRef.current = false;
    }
  }, [currentSong?.id]);

  // =========================
  // ⏱ DEBOUNCED SEARCH
  // =========================
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (query.trim()) {
        searchYouTube();
      }
    }, 400);

    return () => clearTimeout(timeout);
  }, [query]);

  // =========================
  // 🎨 UI
  // =========================
  return (
    <div className="app">

      {/* =========================
          🔹 JOIN SCREEN
      ========================= */}
      {!joined && (
        <div className="join-wrapper">
          <div className="card join-card">

            <h1 className="logo">🎧 <span>SyncRoom</span></h1>

            {/* Username input */}
            <input
              className="input"
              placeholder="Enter your name"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />

            {/* Room input */}
            <input
              className="input"
              placeholder="Enter Room ID"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
            />

            {/* Join button */}
            <button
              className="btn primary"
              onClick={() => {
                socket.emit("JOIN_ROOM", {
                  roomId,
                  name: username || "User_" + Math.floor(Math.random() * 1000),
                });
                setJoined(true);
              }}
            >
              Join Room →
            </button>

          </div>
        </div>
      )}

      {/* =========================
          🔹 ROOM SCREEN
      ========================= */}
      {joined && (
        <>
          {/* 🔝 NAVBAR */}
          <div className="navbar">
            <div className="logo">🎧 <span>SyncRoom</span></div>

            <div className="nav-info">
              <div className="badge">Room: {roomId}</div>
              <div className="badge">Users: {room?.users?.length || 0}</div>
              <div className="badge">👤 {username} {isDJ && "🎧"}</div>
            </div>
          </div>

          <div className="container">

            {/* =========================
                🔹 LEFT PANEL
            ========================= */}
            <div className="left">

              {/* 🔍 SEARCH */}
              <div className="card">
                <h3>Search</h3>

                <div className="row">
                  <input
                    className="input"
                    placeholder="Search songs..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && searchYouTube()}
                    disabled={!isDJ}
                  />

                  <button className="btn" onClick={searchYouTube}>
                    Search
                  </button>

                  {query && (
                    <button
                      className="btn small"
                      onClick={() => {
                        setQuery("");
                        setResults([]);
                      }}
                    >
                      ✖ Clear
                    </button>
                  )}
                </div>

                {loading && <p>Loading...</p>}
                {!loading && results.length === 0 && query && (
                  <p>No results found</p>
                )}

                {/* Search results */}
                <div className="search-results">
                  {results.map((item) => (
                    <div
                      key={item.id.videoId}
                      className="search-card"
                      onClick={() => {
                        socket.emit("PLAY_SONG", {
                          roomId,
                          song: {
                            id: item.id.videoId,
                            title: item.snippet.title,
                          },
                        });

                        setResults([]);
                        setQuery("");
                      }}
                    >
                      <img src={item.snippet.thumbnails.default.url} alt="thumb" />

                      <div className="meta">
                        <p className="title">{item.snippet.title.slice(0, 60)}</p>
                        <p className="channel">{item.snippet.channelTitle}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 🎵 NOW PLAYING */}
              <div className="card">
                <h3>Now Playing</h3>

                <div className="video">
                  {currentSong ? (
                    <YouTube
                      key={currentSong?.id}
                      videoId={currentSong?.id}
                      onEnd={() => {
                        if (playerRef.current) {
                          playerRef.current.stopVideo();
                        }
                        socket.emit("SONG_ENDED", { roomId });
                      }}
                      onReady={(e) => {
                        playerRef.current = e.target;

                        if (!currentSong) return;

                        const elapsed =
                          (Date.now() - currentSong.startAt) / 1000;

                        e.target.seekTo(elapsed, true);
                        e.target.playVideo();

                        hasSyncedRef.current = true;
                      }}
                    />
                  ) : (
                    <p>No song playing</p>
                  )}
                </div>
              </div>

              {/* 🎛 CONTROLS */}
              <div className="card">

                <div className="row">
                  <input
                    className="input"
                    placeholder="Enter YouTube video ID"
                    value={songId}
                    onChange={(e) => setSongId(e.target.value)}
                    disabled={!isDJ}
                  />

                  <button
                    className="btn primary"
                    onClick={() => {
                      socket.emit("PLAY_SONG", {
                        roomId,
                        song: { id: songId, title: "Custom Song" },
                      });
                    }}
                  >
                    Play
                  </button>
                </div>

                <div className="row">
                  <button
                    className="btn"
                    onClick={() => socket.emit("VOTE", { roomId, vote: "like" })}
                  >
                    👍 Like
                  </button>

                  <button
                    className="btn"
                    onClick={() => socket.emit("VOTE", { roomId, vote: "skip" })}
                  >
                    ⏭ Skip
                  </button>
                </div>

              </div>
            </div>

            {/* =========================
                🔹 RIGHT PANEL
            ========================= */}
            <div className="right">

              {/* 🎧 DJ */}
              <div className="card">
                <h3>Current DJ</h3>
                <p>
                  {room?.users?.find((u: any) => u.id === room?.currentDJ)?.name || "None"}
                </p>

                {isDJ && !currentSong && (
                  <p className="highlight">🎧 Your Turn</p>
                )}
              </div>

              {/* 🏆 LEADERBOARD */}
              <div className="card">
                <h3>Leaderboard</h3>

                <div className="leaderboard">
                  {sortedUsers.map((u: any) => (
                    <div key={u.id} className="list-item">
                      <span>{u.name}</span>
                      <span>{room?.scores?.[u.id] || 0}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 🔁 QUEUE */}
              <div className="card">
                <h3>Queue</h3>

                {room?.queue?.map((id: string) => {
                  const user = room.users.find((u: any) => u.id === id);
                  return <div key={id} className="list-item">{user?.name}</div>;
                })}
              </div>

            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default App;