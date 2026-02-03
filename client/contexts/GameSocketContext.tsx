import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";
import { io, Socket } from "socket.io-client";
import { getApiUrl } from "@/lib/query-client";
import type {
  GameState,
  Player,
  RoomConfig,
  GameMessage,
} from "@shared/gameTypes";

interface RoomInfo {
  roomCode: string;
  gameMode: "solo" | "2v2";
  maxPlayers: number;
  pointThreshold: number;
  status: string;
}

interface GameSocketContextType {
  connected: boolean;
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
}

const GameSocketContext = createContext<GameSocketContextType | null>(null);

export function GameSocketProvider({ children }: { children: ReactNode }) {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [roomInfo, setRoomInfo] = useState<RoomInfo | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const apiUrl = getApiUrl();
    const socket = io(apiUrl, {
      transports: ["websocket", "polling"],
      autoConnect: true,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      setError(null);
    });

    socket.on("disconnect", () => {
      setConnected(false);
    });

    socket.on("connect_error", (err) => {
      setError("Connection failed. Please try again.");
      console.error("Socket connection error:", err);
    });

    socket.on("message", (message: GameMessage) => {
      handleMessage(message);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const handleMessage = useCallback((message: GameMessage) => {
    switch (message.type) {
      case "room_created":
      case "room_info":
        setRoomInfo(message.payload.roomInfo);
        setPlayers(message.payload.players || []);
        if (message.payload.playerId) {
          setMyPlayerId(message.payload.playerId);
        }
        break;
      case "player_joined":
        setPlayers(message.payload.players);
        break;
      case "player_left":
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
        break;
    }
  }, []);

  const createRoom = useCallback((displayName: string, config: RoomConfig) => {
    if (!socketRef.current) return;
    setError(null);
    socketRef.current.emit("create_room", { displayName, config });
  }, []);

  const joinRoom = useCallback((displayName: string, roomCode: string) => {
    if (!socketRef.current) return;
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

  const myPlayer = gameState?.players.find((p) => p.id === myPlayerId) || null;
  const isMyTurn = gameState?.currentPlayerId === myPlayerId;

  return (
    <GameSocketContext.Provider
      value={{
        connected,
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
