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
  checkAndEndIfDeckExhausted,
} from "./gameEngine";
import {
  executeAITurn,
  getAIDrawDecision,
  getAIPlayDecisions,
  getAIDiscardDecision,
  getNextAIName,
  resetAINames,
  type AIDecision,
} from "./aiPlayer";
import { storage } from "./storage";

async function persistRoom(room: Room) {
  try {
    await storage.saveRoom({
      id: room.id,
      code: room.code,
      hostPlayerId: room.hostId,
      config: room.config,
      players: room.players,
      gameState: room.gameState,
      status: room.status,
    });
  } catch (err) {
    console.error(`[Storage] Failed to persist room ${room.code}:`, err);
  }
}

function isOnlyHumanInRoom(room: Room): boolean {
  const humanPlayers = room.players.filter(p => !p.isAI);
  return humanPlayers.length === 1;
}

function areAllHumansConnected(room: Room): boolean {
  return room.players.filter(p => !p.isAI).every(p => p.isConnected);
}

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

async function initializeRooms() {
  try {
    const cleanedCount = await storage.cleanupStaleRooms(24);
    if (cleanedCount > 0) {
      console.log(`[Storage] Cleaned up ${cleanedCount} stale room(s) from database`);
    }
    
    const activeRooms = await storage.loadActiveRooms();
    console.log(`[Storage] Loading ${activeRooms.length} active room(s) from database`);
    
    for (const persistedRoom of activeRooms) {
      const room: Room = {
        id: persistedRoom.id,
        code: persistedRoom.code,
        hostId: persistedRoom.hostPlayerId,
        config: persistedRoom.config,
        players: persistedRoom.players.map(p => ({
          ...p,
          isConnected: false,
        })),
        gameState: persistedRoom.gameState,
        status: persistedRoom.status,
      };
      rooms.set(room.code, room);
      console.log(`[Storage] Restored room ${room.code} (status: ${room.status}, players: ${room.players.length})`);
    }
  } catch (err) {
    console.error("[Storage] Failed to initialize rooms:", err);
  }
}

export function setupSocketHandlers(io: Server) {
  initializeRooms();

  io.on("connection", (socket: Socket) => {
    console.log("Client connected:", socket.id);

    socket.on("create_room", async ({ displayName, config }: { displayName: string; config: RoomConfig }) => {
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

      await persistRoom(room);

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
          displayName,
        },
        timestamp: Date.now(),
      });
    });

    socket.on("join_room", async ({ displayName, roomCode }: { displayName: string; roomCode: string }) => {
      const room = rooms.get(roomCode.toUpperCase());

      if (!room) {
        const dbRoom = await storage.getGameRoomByCode(roomCode.toUpperCase());
        
        if (dbRoom) {
          if (dbRoom.status === "waiting") {
            sendMessage(socket, {
              type: "error",
              payload: { message: "Room exists but session expired. Ask the host to create a new room." },
              timestamp: Date.now(),
            });
          } else {
            sendMessage(socket, {
              type: "error",
              payload: { message: "This game has already ended" },
              timestamp: Date.now(),
            });
          }
        } else {
          sendMessage(socket, {
            type: "error",
            payload: { message: "Room not found. Please check the code and try again." },
            timestamp: Date.now(),
          });
        }
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

      const playersForClient = getPlayersForClient(room);
      console.log(`[Socket] Player ${displayName} joined room ${room.code}. Total players: ${playersForClient.length}`);

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
          players: playersForClient,
          playerId,
          displayName,
        },
        timestamp: Date.now(),
      });

      socket.to(room.code).emit("message", {
        type: "player_joined",
        payload: { players: playersForClient },
        timestamp: Date.now(),
      });

      await persistRoom(room);
    });

    socket.on("leave_room", () => {
      handlePlayerLeave(io, socket);
    });

    socket.on("rejoin_room", ({ roomCode, playerId, displayName }: { roomCode: string; playerId: string; displayName: string }) => {
      const room = rooms.get(roomCode.toUpperCase());

      if (!room) {
        sendMessage(socket, {
          type: "error",
          payload: { message: "Room no longer exists" },
          timestamp: Date.now(),
        });
        return;
      }

      let player = room.players.find(p => p.id === playerId);
      
      if (!player && displayName) {
        player = room.players.find(p => p.displayName === displayName && !p.isConnected);
      }
      
      if (!player) {
        sendMessage(socket, {
          type: "error",
          payload: { message: "Player not found in room" },
          timestamp: Date.now(),
        });
        return;
      }

      player.socketId = socket.id;
      player.isConnected = true;

      socketToRoom.set(socket.id, room.code);
      socketToPlayer.set(socket.id, player.id);

      socket.join(room.code);

      const playersForClient = getPlayersForClient(room);
      console.log(`[Socket] Player ${displayName} rejoined room ${roomCode}. Total players: ${playersForClient.length}`);

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
          players: playersForClient,
          playerId: player.id,
          displayName: player.displayName,
        },
        timestamp: Date.now(),
      });

      if (room.gameState) {
        const gamePlayer = room.gameState.players.find(p => p.id === player.id);
        if (gamePlayer) {
          gamePlayer.isConnected = true;
        }

        const playerGameState = getGameStateForPlayer(room.gameState, player.id);
        sendMessage(socket, {
          type: "game_state",
          payload: playerGameState,
          timestamp: Date.now(),
        });

        if (isOnlyHumanInRoom(room) && room.gameState.status === "playing") {
          console.log(`[Socket] Solo player reconnected in room ${roomCode}. Resuming AI turns.`);
          scheduleAITurn(io, room);
        }
      }

      socket.to(room.code).emit("message", {
        type: "player_joined",
        payload: { players: playersForClient },
        timestamp: Date.now(),
      });
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

      persistRoom(room);
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

        persistRoom(room);
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

      persistRoom(room);
      scheduleAITurn(io, room);
    });

    socket.on("game_action", (action: any) => {
      const roomCode = socketToRoom.get(socket.id);
      const playerId = socketToPlayer.get(socket.id);
      
      console.log("Game action received:", action.type, "from player:", playerId);

      if (!roomCode || !playerId) {
        console.log("No roomCode or playerId");
        return;
      }

      const room = rooms.get(roomCode);
      if (!room || !room.gameState) {
        console.log("No room or gameState");
        return;
      }
      
      console.log("Current player:", room.gameState.currentPlayerId, "Turn phase:", room.gameState.turnPhase);

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
          console.log("Discard action - cardId:", action.cardId);
          newState = processDiscard(room.gameState, playerId, action.cardId);
          console.log("Discard result:", newState ? "success" : "failed");
          break;
        case "declare_last_card":
          newState = processDeclareLastCard(room.gameState, playerId);
          break;
      }

      if (!newState) {
        console.log("Action failed - returning error");
        sendMessage(socket, {
          type: "action_result",
          payload: { success: false, error: "Invalid action" },
          timestamp: Date.now(),
        });
        return;
      }

      room.gameState = newState;

      broadcastGameState(io, room);
      persistRoom(room);

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
      persistRoom(room);
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

    if (isOnlyHumanInRoom(room)) {
      console.log(`[Socket] Solo player disconnected from room ${roomCode} (AI-only opponents). Room preserved for reconnection.`);
      persistRoom(room);
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
  if (!room.gameState || room.gameState.status !== "playing") {
    console.log("scheduleAITurn: Game not playing, status:", room.gameState?.status);
    return;
  }

  if (isOnlyHumanInRoom(room) && !areAllHumansConnected(room)) {
    console.log("scheduleAITurn: Pausing AI - solo human player is disconnected");
    return;
  }

  const currentPlayer = room.players.find(p => p.id === room.gameState?.currentPlayerId);
  console.log("scheduleAITurn: Current player:", currentPlayer?.displayName, "isAI:", currentPlayer?.isAI);
  
  if (!currentPlayer?.isAI) {
    console.log("scheduleAITurn: Not an AI player's turn");
    return;
  }

  console.log("scheduleAITurn: Scheduling AI turn for", currentPlayer.displayName);
  setTimeout(() => {
    executeAITurnActions(io, room, currentPlayer.id);
  }, 800);
}

function executeAITurnActions(io: Server, room: Room, aiPlayerId: string) {
  if (!room.gameState || room.gameState.status !== "playing") {
    console.log("executeAITurnActions: Game not playing");
    return;
  }
  if (room.gameState.currentPlayerId !== aiPlayerId) {
    console.log("executeAITurnActions: Not AI's turn anymore");
    return;
  }

  console.log("executeAITurnActions: Executing AI turn for", aiPlayerId);
  
  const executeNextAction = (actionIndex: number) => {
    if (!room.gameState || room.gameState.status !== "playing") {
      console.log("executeAITurnActions: Game ended during AI turn");
      return;
    }

    const player = room.gameState.players.find(p => p.id === aiPlayerId);
    if (!player) {
      console.log("executeAITurnActions: AI player not found");
      return;
    }

    const phase = room.gameState.turnPhase;
    let newState: GameState | null = null;
    let actionDescription = "";

    if (phase === "draw") {
      const drawDecision = getAIDrawDecision(room.gameState, aiPlayerId);
      actionDescription = drawDecision.type;
      
      if (drawDecision.type === "pickup_pile") {
        newState = processPickupPile(room.gameState, aiPlayerId, drawDecision.cardIds || []);
      } else {
        newState = processDrawFromDeck(room.gameState, aiPlayerId);
      }
      
      if (newState) {
        room.gameState = newState;
        broadcastGameState(io, room);
        console.log("executeAITurnActions: AI drew - action:", actionDescription);
        setTimeout(() => executeNextAction(actionIndex + 1), 600);
      } else {
        console.log("executeAITurnActions: Draw failed, trying deck");
        newState = processDrawFromDeck(room.gameState, aiPlayerId);
        if (newState) {
          room.gameState = newState;
          broadcastGameState(io, room);
          setTimeout(() => executeNextAction(actionIndex + 1), 600);
        } else {
          console.log("executeAITurnActions: All draw attempts failed");
          forceEndAITurn(io, room, aiPlayerId);
        }
      }
    } else if (phase === "play") {
      const playDecisions = getAIPlayDecisions(room.gameState, aiPlayerId);
      
      if (playDecisions.length > 0) {
        const decision = playDecisions[0];
        actionDescription = decision.type;
        
        if (decision.type === "lay_set") {
          newState = processLaySet(room.gameState, aiPlayerId, decision.cardIds || []);
        } else if (decision.type === "add_to_set") {
          newState = processAddToSet(room.gameState, aiPlayerId, decision.setId!, decision.cardId!);
        }
        
        if (newState) {
          room.gameState = newState;
          broadcastGameState(io, room);
          console.log("executeAITurnActions: AI played - action:", actionDescription);
          setTimeout(() => executeNextAction(actionIndex + 1), 600);
        } else {
          console.log("executeAITurnActions: Play action failed, trying discard");
          executeDiscard();
        }
      } else {
        executeDiscard();
      }
    } else {
      console.log("executeAITurnActions: Unknown phase", phase);
      forceEndAITurn(io, room, aiPlayerId);
    }
    
    function executeDiscard() {
      if (!room.gameState) return;
      
      const discardDecision = getAIDiscardDecision(room.gameState, aiPlayerId);
      console.log("executeAITurnActions: AI discarding card:", discardDecision.cardId);
      
      if (!discardDecision.cardId) {
        console.log("executeAITurnActions: No card to discard - player hand empty?");
        forceEndAITurn(io, room, aiPlayerId);
        return;
      }
      
      const discardState = processDiscard(room.gameState, aiPlayerId, discardDecision.cardId);
      
      if (discardState) {
        room.gameState = discardState;
        broadcastGameState(io, room);
        persistRoom(room);
        console.log("executeAITurnActions: AI discarded successfully");
        
        if (discardState.status === "playing") {
          setTimeout(() => scheduleAITurn(io, room), 200);
        }
      } else {
        console.log("executeAITurnActions: Discard failed");
        forceEndAITurn(io, room, aiPlayerId);
      }
    }
  };
  
  setTimeout(() => executeNextAction(0), 600);
}

function forceEndAITurn(io: Server, room: Room, aiPlayerId: string) {
  console.log("forceEndAITurn: Forcing turn end for stuck AI", aiPlayerId);
  
  if (!room.gameState || room.gameState.status !== "playing") return;
  
  const player = room.gameState.players.find(p => p.id === aiPlayerId);
  if (!player || player.hand.length === 0) {
    console.log("forceEndAITurn: Player has no cards, advancing turn");
  }
  
  if (player && player.hand.length > 0) {
    const cardToDiscard = player.hand[0];
    console.log("forceEndAITurn: Force discarding first card:", cardToDiscard.id);
    const newState = processDiscard(room.gameState, aiPlayerId, cardToDiscard.id);
    if (newState) {
      room.gameState = newState;
      broadcastGameState(io, room);
      if (newState.status === "playing") {
        setTimeout(() => scheduleAITurn(io, room), 200);
      }
      return;
    }
  }
  
  const currentIndex = room.gameState.players.findIndex(p => p.id === aiPlayerId);
  const nextIndex = (currentIndex + 1) % room.gameState.players.length;
  const nextPlayer = room.gameState.players[nextIndex];

  const exhaustedState = checkAndEndIfDeckExhausted(room.gameState, nextPlayer.id);
  if (exhaustedState) {
    room.gameState = exhaustedState;
    broadcastGameState(io, room);
    persistRoom(room);
    return;
  }

  room.gameState.currentPlayerId = nextPlayer.id;
  room.gameState.turnPhase = "draw";
  broadcastGameState(io, room);
  setTimeout(() => scheduleAITurn(io, room), 200);
}
