import { users, gameRooms, gamePlayers, gameHistory, type User, type InsertUser, type GameRoom, type GamePlayer, type GameHistory } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserStats(id: string, stats: { totalScore?: number; gamesPlayed?: number; gamesWon?: number }): Promise<void>;
  createGameRoom(room: Partial<GameRoom>): Promise<GameRoom>;
  getGameRoom(id: string): Promise<GameRoom | undefined>;
  getGameRoomByCode(code: string): Promise<GameRoom | undefined>;
  updateGameRoom(id: string, updates: Partial<GameRoom>): Promise<void>;
  addGamePlayer(player: Partial<GamePlayer>): Promise<GamePlayer>;
  getGamePlayers(roomId: string): Promise<GamePlayer[]>;
  createGameHistory(history: Partial<GameHistory>): Promise<GameHistory>;
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

  async createGameRoom(room: Partial<GameRoom>): Promise<GameRoom> {
    const [created] = await db
      .insert(gameRooms)
      .values(room as any)
      .returning();
    return created;
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
    await db.update(gameRooms).set(updates).where(eq(gameRooms.id, id));
  }

  async addGamePlayer(player: Partial<GamePlayer>): Promise<GamePlayer> {
    const [created] = await db
      .insert(gamePlayers)
      .values(player as any)
      .returning();
    return created;
  }

  async getGamePlayers(roomId: string): Promise<GamePlayer[]> {
    return db.select().from(gamePlayers).where(eq(gamePlayers.roomId, roomId));
  }

  async createGameHistory(history: Partial<GameHistory>): Promise<GameHistory> {
    const [created] = await db
      .insert(gameHistory)
      .values(history as any)
      .returning();
    return created;
  }
}

export const storage = new DatabaseStorage();
