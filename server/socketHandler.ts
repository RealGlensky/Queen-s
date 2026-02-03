import { Server, Socket } from "socket.io";
import { v4 as uuidv4 } from "uuid";
import type { GameState, Player, RoomConfig, GameMessage } from "@shared/gameTypes";
import { generateRoomCode } from "@shared/gameTypes";
import {
  createGameState,
  processDrawFromDeck,
  processPickupPile,
  processLaySet,
  processAddToSet,
  processDiscard,
  processDeclareLastCard,
  startNextRound,
} from "./gameEngine";
import {
  executeAITurn,
  getNextAIName,
  resetAINames,
  type AIDecision,
} from "./aiPlayer";

interface Room {
  id: string;
  code: string;
  hostId: string;
  config: RoomConfig;
  players: {
    id: string;
    odexId: string;
    socketId: string;
    displayName: string;
    odexTeam?: number;
    seatPosition: number;
    isConnected: boolean;
    isAI?: boolean;
  }[];
  gameState: GameState | null;
  status: "waiting" | "playing" | "ended";
}

const rooms = new Map<string, Room>();
const socketToRoom = new Map<string, string>();
const socketToPlayer = new Map<string, string>();

function sendMessage(socket: Socket, message: GameMessage) {
  socket.emit("message", message);
}

function broadcastToRoom(io: Server, roomCode: string, message: GameMessage) {
  io.to(roomCode).emit("message", message);
}

function getPlayersForClient(room: Room): Player[] {
  return room.players.map((p, index) => ({
    id: p.id,
    odexId: p.odexId,
    displayName: p.displayName,
    odexTeam: p.odexTeam,
    seatPosition: p.seatPosition,
    hand: [],
    sets: [],
    totalScore: 0,
    roundScore: 0,
    isConnected: p.isConnected,
    hasLastCard: false,
  }));
}

function assignTeams(players: Room["players"], gameMode: "solo" | "2v2"): void {
  if (gameMode !== "2v2" || players.length !== 4) return;
  
  players[0].odexTeam = 1;
  players[1].odexTeam = 2;
  players[2].odexTeam = 1;
  players[3].odexTeam = 2;
}

export function setupSocketHandlers(io: Server) {
  io.on("connection", (socket: Socket) => {
    console.log("Client connected:", socket.id);

    socket.on("create_room", ({ displayName, config }: { displayName: string; config: RoomConfig }) => {
      const roomId = uuidv4();
      const roomCode = generateRoomCode();
      const playerId = uuidv4();
      const odexId = uuidv4();

      const room: Room = {
        id: roomId,
        code: roomCode,
        hostId: playerId,
        config,
        players: [
          {
            id: playerId,
            odexId,
            socketId: socket.id,
            displayName,
            seatPosition: 0,
            isConnected: true,
          },
        ],
        gameState: null,
        status: "waiting",
      };

      rooms.set(roomCode, room);
      socketToRoom.set(socket.id, roomCode);
      socketToPlayer.set(socket.id, playerId);

      socket.join(roomCode);

      sendMessage(socket, {
        type: "room_created",
        payload: {
          roomInfo: {
            roomCode,
            gameMode: config.gameMode,
            maxPlayers: config.maxPlayers,
            pointThreshold: config.pointThreshold,
            status: "waiting",
          },
          players: getPlayersForClient(room),
          playerId,
        },
        timestamp: Date.now(),
      });
    });

    socket.on("join_room", ({ displayName, roomCode }: { displayName: string; roomCode: string }) => {
      const room = rooms.get(roomCode.toUpperCase());

      if (!room) {
        sendMessage(socket, {
          type: "error",
          payload: { message: "Room not found" },
          timestamp: Date.now(),
        });
        return;
      }

      if (room.status !== "waiting") {
        sendMessage(socket, {
          type: "error",
          payload: { message: "Game already in progress" },
          timestamp: Date.now(),
        });
        return;
      }

      if (room.players.length >= room.config.maxPlayers) {
        sendMessage(socket, {
          type: "error",
          payload: { message: "Room is full" },
          timestamp: Date.now(),
        });
        return;
      }

      const playerId = uuidv4();
      const odexId = uuidv4();

      room.players.push({
        id: playerId,
        odexId,
        socketId: socket.id,
        displayName,
        seatPosition: room.players.length,
        isConnected: true,
      });

      socketToRoom.set(socket.id, room.code);
      socketToPlayer.set(socket.id, playerId);

      socket.join(room.code);

      sendMessage(socket, {
        type: "room_info",
        payload: {
          roomInfo: {
            roomCode: room.code,
            gameMode: room.config.gameMode,
            maxPlayers: room.config.maxPlayers,
            pointThreshold: room.config.pointThreshold,
            status: room.status,
          },
          players: getPlayersForClient(room),
          playerId,
        },
        timestamp: Date.now(),
      });

      broadcastToRoom(io, room.code, {
        type: "player_joined",
        payload: { players: getPlayersForClient(room) },
        timestamp: Date.now(),
      });
    });

    socket.on("leave_room", () => {
      handlePlayerLeave(io, socket);
    });

    socket.on("add_ai_player", () => {
      const roomCode = socketToRoom.get(socket.id);
      const playerId = socketToPlayer.get(socket.id);

      if (!roomCode || !playerId) return;

      const room = rooms.get(roomCode);
      if (!room || room.hostId !== playerId) {
        sendMessage(socket, {
          type: "error",
          payload: { message: "Only the host can add AI players" },
          timestamp: Date.now(),
        });
        return;
      }

      if (room.status !== "waiting") {
        sendMessage(socket, {
          type: "error",
          payload: { message: "Cannot add AI during game" },
          timestamp: Date.now(),
        });
        return;
      }

      if (room.players.length >= room.config.maxPlayers) {
        sendMessage(socket, {
          type: "error",
          payload: { message: "Room is full" },
          timestamp: Date.now(),
        });
        return;
      }

      const aiPlayerId = uuidv4();
      const aiOdexId = uuidv4();
      const aiName = getNextAIName();

      room.players.push({
        id: aiPlayerId,
        odexId: aiOdexId,
        socketId: "",
        displayName: aiName,
        seatPosition: room.players.length,
        isConnected: true,
        isAI: true,
      });

      broadcastToRoom(io, room.code, {
        type: "player_joined",
        payload: { players: getPlayersForClient(room) },
        timestamp: Date.now(),
      });
    });

    socket.on("remove_ai_player", () => {
      const roomCode = socketToRoom.get(socket.id);
      const playerId = socketToPlayer.get(socket.id);

      if (!roomCode || !playerId) return;

      const room = rooms.get(roomCode);
      if (!room || room.hostId !== playerId || room.status !== "waiting") return;

      const aiIndex = room.players.findIndex(p => p.isAI);
      if (aiIndex !== -1) {
        room.players.splice(aiIndex, 1);
        
        room.players.forEach((p, idx) => {
          p.seatPosition = idx;
        });

        broadcastToRoom(io, room.code, {
          type: "player_left",
          payload: { players: getPlayersForClient(room) },
          timestamp: Date.now(),
        });
      }
    });

    socket.on("start_game", () => {
      const roomCode = socketToRoom.get(socket.id);
      const playerId = socketToPlayer.get(socket.id);

      if (!roomCode || !playerId) return;

      const room = rooms.get(roomCode);
      if (!room || room.hostId !== playerId) return;

      if (room.players.length < 2) {
        sendMessage(socket, {
          type: "error",
          payload: { message: "Need at least 2 players to start" },
          timestamp: Date.now(),
        });
        return;
      }

      if (room.config.gameMode === "2v2" && room.players.length !== 4) {
        sendMessage(socket, {
          type: "error",
          payload: { message: "2v2 mode requires exactly 4 players" },
          timestamp: Date.now(),
        });
        return;
      }

      assignTeams(room.players, room.config.gameMode);

      const gameState = createGameState(
        room.id,
        room.code,
        room.config,
        room.players.map((p) => ({
          id: p.id,
          odexId: p.odexId,
          displayName: p.displayName,
          odexTeam: p.odexTeam,
        }))
      );

      room.gameState = gameState;
      room.status = "playing";

      for (const player of room.players) {
        const playerSocket = io.sockets.sockets.get(player.socketId);
        if (playerSocket) {
          const playerGameState = getGameStateForPlayer(gameState, player.id);
          sendMessage(playerSocket, {
            type: "game_started",
            payload: playerGameState,
            timestamp: Date.now(),
          });
        }
      }

      scheduleAITurn(io, room);
    });

    socket.on("game_action", (action: any) => {
      const roomCode = socketToRoom.get(socket.id);
      const playerId = socketToPlayer.get(socket.id);

      if (!roomCode || !playerId) return;

      const room = rooms.get(roomCode);
      if (!room || !room.gameState) return;

      let newState: GameState | null = null;

      switch (action.type) {
        case "draw_deck":
          newState = processDrawFromDeck(room.gameState, playerId);
          break;
        case "pickup_pile":
          newState = processPickupPile(room.gameState, playerId, action.cardIds || []);
          break;
        case "lay_set":
          newState = processLaySet(room.gameState, playerId, action.cardIds || []);
          break;
        case "add_to_set":
          newState = processAddToSet(room.gameState, playerId, action.setId, action.cardId);
          break;
        case "discard":
          newState = processDiscard(room.gameState, playerId, action.cardId);
          break;
        case "declare_last_card":
          newState = processDeclareLastCard(room.gameState, playerId);
          break;
      }

      if (!newState) {
        sendMessage(socket, {
          type: "action_result",
          payload: { success: false, error: "Invalid action" },
          timestamp: Date.now(),
        });
        return;
      }

      room.gameState = newState;

      broadcastGameState(io, room);

      if (newState.status === "playing") {
        scheduleAITurn(io, room);
      }
    });

    socket.on("next_round", () => {
      const roomCode = socketToRoom.get(socket.id);
      if (!roomCode) return;

      const room = rooms.get(roomCode);
      if (!room || !room.gameState || room.gameState.status !== "round_end") return;

      const newState = startNextRound(room.gameState);
      room.gameState = newState;

      broadcastGameState(io, room);
      scheduleAITurn(io, room);
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
      handlePlayerLeave(io, socket, true);
    });
  });
}

function handlePlayerLeave(io: Server, socket: Socket, isDisconnect: boolean = false) {
  const roomCode = socketToRoom.get(socket.id);
  const playerId = socketToPlayer.get(socket.id);

  if (!roomCode || !playerId) return;

  const room = rooms.get(roomCode);
  if (!room) return;

  if (room.status === "waiting") {
    room.players = room.players.filter((p) => p.id !== playerId);

    if (room.players.length === 0) {
      rooms.delete(roomCode);
    } else {
      if (room.hostId === playerId) {
        room.hostId = room.players[0].id;
      }

      broadcastToRoom(io, roomCode, {
        type: "player_left",
        payload: { players: getPlayersForClient(room) },
        timestamp: Date.now(),
      });
    }
  } else {
    const player = room.players.find((p) => p.id === playerId);
    if (player) {
      player.isConnected = false;
    }

    if (room.gameState) {
      const gamePlayer = room.gameState.players.find((p) => p.id === playerId);
      if (gamePlayer) {
        gamePlayer.isConnected = false;
      }
    }
  }

  socketToRoom.delete(socket.id);
  socketToPlayer.delete(socket.id);
  socket.leave(roomCode);
}

function getGameStateForPlayer(state: GameState, playerId: string): GameState {
  const stateCopy: GameState = JSON.parse(JSON.stringify(state));

  for (const player of stateCopy.players) {
    if (player.id !== playerId) {
      player.hand = player.hand.map((card) => ({
        id: card.id,
        suit: null,
        rank: "joker" as const,
        isJoker: false,
      }));
    }
  }

  stateCopy.deck = stateCopy.deck.map((card) => ({
    id: card.id,
    suit: null,
    rank: "joker" as const,
    isJoker: false,
  }));

  return stateCopy;
}

function broadcastGameState(io: Server, room: Room) {
  if (!room.gameState) return;

  const newState = room.gameState;
  
  for (const player of room.players) {
    if (player.isAI) continue;
    
    const playerSocket = io.sockets.sockets.get(player.socketId);
    if (playerSocket) {
      const playerGameState = getGameStateForPlayer(newState, player.id);
      
      const messageType = newState.status === "game_over" 
        ? "game_over" 
        : newState.status === "round_end" 
          ? "round_end" 
          : "game_state";

      sendMessage(playerSocket, {
        type: messageType,
        payload: playerGameState,
        timestamp: Date.now(),
      });
    }
  }
}

function scheduleAITurn(io: Server, room: Room) {
  if (!room.gameState || room.gameState.status !== "playing") return;

  const currentPlayer = room.players.find(p => p.id === room.gameState?.currentPlayerId);
  if (!currentPlayer?.isAI) return;

  setTimeout(() => {
    executeAITurnActions(io, room, currentPlayer.id);
  }, 800);
}

function executeAITurnActions(io: Server, room: Room, aiPlayerId: string) {
  if (!room.gameState || room.gameState.status !== "playing") return;
  if (room.gameState.currentPlayerId !== aiPlayerId) return;

  const decisions = executeAITurn(room.gameState, aiPlayerId);
  
  let delay = 0;
  const actionDelay = 600;

  for (const decision of decisions) {
    setTimeout(() => {
      if (!room.gameState || room.gameState.status !== "playing") return;
      if (room.gameState.currentPlayerId !== aiPlayerId && decision.type !== "lay_set" && decision.type !== "add_to_set") return;

      let newState: GameState | null = null;

      switch (decision.type) {
        case "draw_deck":
          newState = processDrawFromDeck(room.gameState, aiPlayerId);
          break;
        case "pickup_pile":
          newState = processPickupPile(room.gameState, aiPlayerId, decision.cardIds || []);
          break;
        case "lay_set":
          newState = processLaySet(room.gameState, aiPlayerId, decision.cardIds || []);
          break;
        case "add_to_set":
          newState = processAddToSet(room.gameState, aiPlayerId, decision.setId!, decision.cardId!);
          break;
        case "discard":
          newState = processDiscard(room.gameState, aiPlayerId, decision.cardId!);
          break;
      }

      if (newState) {
        room.gameState = newState;
        broadcastGameState(io, room);

        if (newState.status === "playing" && decision.type === "discard") {
          scheduleAITurn(io, room);
        }
      }
    }, delay);

    delay += actionDelay;
  }
}
