import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";
import { AppState, AppStateStatus, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { io, Socket } from "socket.io-client";
import { getApiUrl } from "@/lib/query-client";
import type {
  GameState,
  Player,
  RoomConfig,
  GameMessage,
} from "@shared/gameTypes";

const SESSION_STORAGE_KEY = "@queens_session";

interface SessionInfo {
  roomCode: string;
  playerId: string;
  displayName: string;
}

interface RoomInfo {
  roomCode: string;
  gameMode: "solo" | "2v2";
  maxPlayers: number;
  pointThreshold: number;
  status: string;
}

interface GameSocketContextType {
  connected: boolean;
  reconnecting: boolean;
  roomInfo: RoomInfo | null;
  players: Player[];
  gameState: GameState | null;
  myPlayerId: string | null;
  myPlayer: Player | null;
  isMyTurn: boolean;
  error: string | null;
  createRoom: (displayName: string, config: RoomConfig) => void;
  joinRoom: (displayName: string, roomCode: string) => void;
  leaveRoom: () => void;
  startGame: () => void;
  addAIPlayer: () => void;
  removeAIPlayer: () => void;
  drawFromDeck: () => void;
  pickupPile: (cardIds: string[]) => void;
  laySet: (cardIds: string[]) => void;
  addToSet: (setId: string, cardId: string) => void;
  discard: (cardId: string) => void;
  declareLastCard: () => void;
  nextRound: () => void;
  clearError: () => void;
  forceReconnect: () => void;
}

const GameSocketContext = createContext<GameSocketContextType | null>(null);

async function saveSession(session: SessionInfo | null): Promise<void> {
  try {
    if (session) {
      await AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
      console.log("[Session] Saved to storage:", session.roomCode);
    } else {
      await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
      console.log("[Session] Cleared from storage");
    }
  } catch (e) {
    console.error("[Session] Error saving session:", e);
  }
}

async function loadSession(): Promise<SessionInfo | null> {
  try {
    const stored = await AsyncStorage.getItem(SESSION_STORAGE_KEY);
    if (stored) {
      const session = JSON.parse(stored) as SessionInfo;
      console.log("[Session] Loaded from storage:", session.roomCode);
      return session;
    }
  } catch (e) {
    console.error("[Session] Error loading session:", e);
  }
  return null;
}

export function GameSocketProvider({ children }: { children: ReactNode }) {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [roomInfo, setRoomInfo] = useState<RoomInfo | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const sessionInfoRef = useRef<SessionInfo | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const lastActiveRef = useRef<number>(Date.now());

  const attemptRejoin = useCallback((socket: Socket, session: SessionInfo) => {
    console.log("[Socket] Attempting to rejoin room:", session.roomCode);
    setReconnecting(true);
    socket.emit("rejoin_room", {
      roomCode: session.roomCode,
      playerId: session.playerId,
      displayName: session.displayName,
    });
  }, []);

  const handleMessage = useCallback((message: GameMessage) => {
    console.log("[Socket] Received message:", message.type);
    setReconnecting(false);
    
    switch (message.type) {
      case "room_created":
      case "room_info":
        setRoomInfo(message.payload.roomInfo);
        setPlayers(message.payload.players || []);
        if (message.payload.playerId) {
          setMyPlayerId(message.payload.playerId);
          if (message.payload.roomInfo?.roomCode && message.payload.displayName) {
            const session: SessionInfo = {
              roomCode: message.payload.roomInfo.roomCode,
              playerId: message.payload.playerId,
              displayName: message.payload.displayName,
            };
            sessionInfoRef.current = session;
            saveSession(session);
          }
        }
        break;
      case "player_joined":
        console.log("[Socket] Player joined, updating players list:", message.payload.players?.length);
        setPlayers(message.payload.players);
        break;
      case "player_left":
        console.log("[Socket] Player left, updating players list:", message.payload.players?.length);
        setPlayers(message.payload.players);
        break;
      case "game_started":
      case "game_state":
        setGameState(message.payload);
        if (message.payload.players) {
          setPlayers(message.payload.players);
        }
        if (message.type === "game_started") {
          setRoomInfo(prev => prev ? { ...prev, status: "playing" } : prev);
        }
        break;
      case "action_result":
        if (message.payload.success && message.payload.gameState) {
          setGameState(message.payload.gameState);
        } else if (!message.payload.success) {
          setError(message.payload.error || "Action failed");
        }
        break;
      case "round_end":
      case "game_over":
        setGameState(message.payload);
        break;
      case "error":
        setError(message.payload.message || "An error occurred");
        if (message.payload.message?.includes("Room no longer exists") || 
            message.payload.message?.includes("Player not found")) {
          sessionInfoRef.current = null;
          saveSession(null);
          setRoomInfo(null);
          setGameState(null);
        }
        break;
    }
  }, []);

  useEffect(() => {
    const apiUrl = getApiUrl();
    console.log("[Socket] Connecting to:", apiUrl);
    
    const socket = io(apiUrl, {
      transports: ["websocket", "polling"],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,
      reconnectionDelayMax: 3000,
      timeout: 20000,
    });

    socketRef.current = socket;

    socket.on("connect", async () => {
      console.log("[Socket] Connected successfully, id:", socket.id);
      setConnected(true);
      setError(null);
      
      if (sessionInfoRef.current) {
        attemptRejoin(socket, sessionInfoRef.current);
      } else {
        const savedSession = await loadSession();
        if (savedSession) {
          sessionInfoRef.current = savedSession;
          attemptRejoin(socket, savedSession);
        }
      }
    });

    socket.on("disconnect", (reason) => {
      console.log("[Socket] Disconnected, reason:", reason);
      setConnected(false);
    });

    socket.on("reconnect_attempt", (attemptNumber) => {
      console.log("[Socket] Reconnection attempt:", attemptNumber);
      setReconnecting(true);
    });

    socket.on("reconnect", () => {
      console.log("[Socket] Reconnected!");
      setReconnecting(false);
    });

    socket.on("connect_error", (err) => {
      console.log("[Socket] Connection error:", err.message, "(retrying)");
      setConnected(false);
      setReconnecting(true);
    });

    socket.on("message", handleMessage);

    loadSession().then(savedSession => {
      if (savedSession) {
        sessionInfoRef.current = savedSession;
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [attemptRejoin, handleMessage]);

  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      console.log("[AppState] Changed from", appStateRef.current, "to", nextAppState);
      
      if (appStateRef.current.match(/inactive|background/) && nextAppState === "active") {
        const timeSinceActive = Date.now() - lastActiveRef.current;
        console.log("[AppState] App came to foreground after", timeSinceActive, "ms");
        
        const socket = socketRef.current;
        if (socket) {
          if (!socket.connected) {
            console.log("[AppState] Socket disconnected, reconnecting...");
            socket.connect();
          } else if (sessionInfoRef.current && timeSinceActive > 5000) {
            console.log("[AppState] Requesting state refresh after background...");
            attemptRejoin(socket, sessionInfoRef.current);
          }
        }
      }
      
      if (nextAppState.match(/inactive|background/)) {
        lastActiveRef.current = Date.now();
      }
      
      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener("change", handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [attemptRejoin]);

  const createRoom = useCallback((displayName: string, config: RoomConfig) => {
    if (!socketRef.current) {
      console.error("[Socket] Cannot create room - socket not connected");
      return;
    }
    console.log("[Socket] Creating room with config:", config);
    setError(null);
    socketRef.current.emit("create_room", { displayName, config });
  }, []);

  const joinRoom = useCallback((displayName: string, roomCode: string) => {
    if (!socketRef.current) {
      console.error("[Socket] Cannot join room - socket not connected");
      return;
    }
    console.log("[Socket] Joining room:", roomCode);
    setError(null);
    socketRef.current.emit("join_room", { displayName, roomCode });
  }, []);

  const leaveRoom = useCallback(() => {
    if (!socketRef.current) return;
    socketRef.current.emit("leave_room");
    setRoomInfo(null);
    setPlayers([]);
    setGameState(null);
    setMyPlayerId(null);
    sessionInfoRef.current = null;
    saveSession(null);
  }, []);

  const startGame = useCallback(() => {
    if (!socketRef.current) return;
    socketRef.current.emit("start_game");
  }, []);

  const addAIPlayer = useCallback(() => {
    if (!socketRef.current) return;
    socketRef.current.emit("add_ai_player");
  }, []);

  const removeAIPlayer = useCallback(() => {
    if (!socketRef.current) return;
    socketRef.current.emit("remove_ai_player");
  }, []);

  const drawFromDeck = useCallback(() => {
    if (!socketRef.current) return;
    socketRef.current.emit("game_action", { type: "draw_deck" });
  }, []);

  const pickupPile = useCallback((cardIds: string[]) => {
    if (!socketRef.current) return;
    socketRef.current.emit("game_action", { type: "pickup_pile", cardIds });
  }, []);

  const laySet = useCallback((cardIds: string[]) => {
    if (!socketRef.current) return;
    socketRef.current.emit("game_action", { type: "lay_set", cardIds });
  }, []);

  const addToSet = useCallback((setId: string, cardId: string) => {
    if (!socketRef.current) return;
    socketRef.current.emit("game_action", { type: "add_to_set", setId, cardId });
  }, []);

  const discard = useCallback((cardId: string) => {
    if (!socketRef.current) return;
    socketRef.current.emit("game_action", { type: "discard", cardId });
  }, []);

  const declareLastCard = useCallback(() => {
    if (!socketRef.current) return;
    socketRef.current.emit("game_action", { type: "declare_last_card" });
  }, []);

  const nextRound = useCallback(() => {
    if (!socketRef.current) return;
    socketRef.current.emit("next_round");
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const forceReconnect = useCallback(() => {
    const socket = socketRef.current;
    if (!socket) return;
    
    if (socket.connected && sessionInfoRef.current) {
      attemptRejoin(socket, sessionInfoRef.current);
    } else if (!socket.connected) {
      socket.connect();
    }
  }, [attemptRejoin]);

  const myPlayer = gameState?.players.find((p) => p.id === myPlayerId) || null;
  const isMyTurn = gameState?.currentPlayerId === myPlayerId;

  return (
    <GameSocketContext.Provider
      value={{
        connected,
        reconnecting,
        roomInfo,
        players,
        gameState,
        myPlayerId,
        myPlayer,
        isMyTurn,
        error,
        createRoom,
        joinRoom,
        leaveRoom,
        startGame,
        addAIPlayer,
        removeAIPlayer,
        drawFromDeck,
        pickupPile,
        laySet,
        addToSet,
        discard,
        declareLastCard,
        nextRound,
        clearError,
        forceReconnect,
      }}
    >
      {children}
    </GameSocketContext.Provider>
  );
}

export function useGameSocket() {
  const context = useContext(GameSocketContext);
  if (!context) {
    throw new Error("useGameSocket must be used within a GameSocketProvider");
  }
  return context;
}
