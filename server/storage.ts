import { users, gameRooms, gameHistory, type User, type InsertUser, type GameRoom, type GameHistory } from "@shared/schema";
import { db } from "./db";
import { eq, and, lt, or, inArray, sql } from "drizzle-orm";
import type { GameState, Player, RoomConfig } from "@shared/gameTypes";

interface RoomPlayer {
  id: string;
  odexId: string;
  socketId: string;
  displayName: string;
  odexTeam?: number;
  seatPosition: number;
  isConnected: boolean;
  isAI?: boolean;
}

interface PersistedRoom {
  id: string;
  code: string;
  hostPlayerId: string;
  config: RoomConfig;
  players: RoomPlayer[];
  gameState: GameState | null;
  status: "waiting" | "playing" | "ended";
}

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserStats(id: string, stats: { totalScore?: number; gamesPlayed?: number; gamesWon?: number }): Promise<void>;
  getGameRoom(id: string): Promise<GameRoom | undefined>;
  getGameRoomByCode(code: string): Promise<GameRoom | undefined>;
  updateGameRoom(id: string, updates: Partial<GameRoom>): Promise<void>;
  createGameHistory(history: Partial<GameHistory>): Promise<GameHistory>;
  saveRoom(room: PersistedRoom): Promise<void>;
  loadActiveRooms(): Promise<PersistedRoom[]>;
  deleteRoom(code: string): Promise<void>;
  cleanupStaleRooms(hoursOld: number): Promise<number>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUserStats(id: string, stats: { totalScore?: number; gamesPlayed?: number; gamesWon?: number }): Promise<void> {
    await db.update(users).set(stats).where(eq(users.id, id));
  }

  async getGameRoom(id: string): Promise<GameRoom | undefined> {
    const [room] = await db.select().from(gameRooms).where(eq(gameRooms.id, id));
    return room || undefined;
  }

  async getGameRoomByCode(code: string): Promise<GameRoom | undefined> {
    const [room] = await db.select().from(gameRooms).where(eq(gameRooms.code, code));
    return room || undefined;
  }

  async updateGameRoom(id: string, updates: Partial<GameRoom>): Promise<void> {
    await db.update(gameRooms).set({ ...updates, updatedAt: new Date() }).where(eq(gameRooms.id, id));
  }

  async createGameHistory(history: Partial<GameHistory>): Promise<GameHistory> {
    const [created] = await db
      .insert(gameHistory)
      .values(history as any)
      .returning();
    return created;
  }

  async saveRoom(room: PersistedRoom): Promise<void> {
    const existing = await this.getGameRoomByCode(room.code);
    
    const roomData = {
      id: room.id,
      code: room.code,
      hostPlayerId: room.hostPlayerId,
      gameMode: room.config.gameMode,
      maxPlayers: room.config.maxPlayers,
      pointThreshold: room.config.pointThreshold,
      status: room.status,
      currentRound: room.gameState?.currentRound || 1,
      playersData: room.players as any,
      gameStateData: room.gameState as any,
      updatedAt: new Date(),
    };

    if (existing) {
      await db.update(gameRooms)
        .set(roomData)
        .where(eq(gameRooms.code, room.code));
      console.log(`[Storage] Updated room ${room.code}`);
    } else {
      await db.insert(gameRooms)
        .values({ ...roomData, createdAt: new Date() });
      console.log(`[Storage] Created room ${room.code}`);
    }
  }

  async loadActiveRooms(): Promise<PersistedRoom[]> {
    const rooms = await db.select()
      .from(gameRooms)
      .where(or(
        eq(gameRooms.status, "waiting"),
        eq(gameRooms.status, "playing")
      ));

    return rooms.map(room => ({
      id: room.id,
      code: room.code,
      hostPlayerId: room.hostPlayerId,
      config: {
        gameMode: room.gameMode as "solo" | "2v2",
        maxPlayers: room.maxPlayers,
        pointThreshold: room.pointThreshold,
      },
      players: (room.playersData as RoomPlayer[]) || [],
      gameState: room.gameStateData as GameState | null,
      status: room.status as "waiting" | "playing" | "ended",
    }));
  }

  async deleteRoom(code: string): Promise<void> {
    await db.delete(gameRooms).where(eq(gameRooms.code, code));
    console.log(`[Storage] Deleted room ${code}`);
  }

  async cleanupStaleRooms(hoursOld: number = 24): Promise<number> {
    const cutoffTime = new Date(Date.now() - hoursOld * 60 * 60 * 1000);
    const staleRooms = await db
      .select()
      .from(gameRooms)
      .where(lt(gameRooms.updatedAt, cutoffTime));
    
    if (staleRooms.length > 0) {
      const staleCodes = staleRooms.map(r => r.code);
      await db.delete(gameRooms).where(inArray(gameRooms.code, staleCodes));
    }
    
    return staleRooms.length;
  }
}

export const storage = new DatabaseStorage();
