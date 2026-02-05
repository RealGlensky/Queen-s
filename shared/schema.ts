import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  displayName: text("display_name"),
  totalScore: integer("total_score").default(0),
  gamesPlayed: integer("games_played").default(0),
  gamesWon: integer("games_won").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const gameRooms = pgTable("game_rooms", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 6 }).notNull().unique(),
  hostPlayerId: varchar("host_player_id").notNull(),
  gameMode: varchar("game_mode", { length: 20 }).notNull().default("solo"),
  maxPlayers: integer("max_players").notNull().default(4),
  pointThreshold: integer("point_threshold").notNull().default(1000),
  status: varchar("status", { length: 20 }).notNull().default("waiting"),
  currentRound: integer("current_round").default(1),
  playersData: jsonb("players_data"),
  gameStateData: jsonb("game_state_data"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const gameHistory = pgTable("game_history", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  roomId: varchar("room_id").notNull(),
  winnerName: text("winner_name"),
  winnerTeam: integer("winner_team"),
  finalScores: jsonb("final_scores"),
  totalRounds: integer("total_rounds").default(1),
  gameMode: varchar("game_mode", { length: 20 }).notNull(),
  completedAt: timestamp("completed_at").defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  hostedRooms: many(gameRooms),
}));

export const gameRoomsRelations = relations(gameRooms, ({ many }) => ({
  history: many(gameHistory),
}));

export const gameHistoryRelations = relations(gameHistory, ({ one }) => ({
  room: one(gameRooms, {
    fields: [gameHistory.roomId],
    references: [gameRooms.id],
  }),
}));

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  displayName: true,
});

export const insertGameRoomSchema = createInsertSchema(gameRooms).pick({
  hostPlayerId: true,
  gameMode: true,
  maxPlayers: true,
  pointThreshold: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type GameRoom = typeof gameRooms.$inferSelect;
export type GameHistory = typeof gameHistory.$inferSelect;
