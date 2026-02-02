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
  hostId: varchar("host_id").notNull().references(() => users.id),
  gameMode: varchar("game_mode", { length: 20 }).notNull().default("solo"),
  maxPlayers: integer("max_players").notNull().default(4),
  pointThreshold: integer("point_threshold").notNull().default(1000),
  status: varchar("status", { length: 20 }).notNull().default("waiting"),
  currentRound: integer("current_round").default(1),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const gamePlayers = pgTable("game_players", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  roomId: varchar("room_id").notNull().references(() => gameRooms.id),
  odexId: varchar("user_id").notNull().references(() => users.id),
  odexName: text("display_name").notNull(),
  odexTeam: integer("team"),
  seatPosition: integer("seat_position").notNull(),
  totalScore: integer("total_score").default(0),
  isConnected: boolean("is_connected").default(true),
  joinedAt: timestamp("joined_at").defaultNow(),
});

export const gameHistory = pgTable("game_history", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  roomId: varchar("room_id").notNull().references(() => gameRooms.id),
  winnerId: varchar("winner_id").references(() => users.id),
  winnerTeam: integer("winner_team"),
  finalScores: jsonb("final_scores"),
  totalRounds: integer("total_rounds").default(1),
  gameMode: varchar("game_mode", { length: 20 }).notNull(),
  completedAt: timestamp("completed_at").defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  hostedRooms: many(gameRooms),
  gamePlayers: many(gamePlayers),
  gamesWon: many(gameHistory),
}));

export const gameRoomsRelations = relations(gameRooms, ({ one, many }) => ({
  host: one(users, {
    fields: [gameRooms.hostId],
    references: [users.id],
  }),
  players: many(gamePlayers),
  history: many(gameHistory),
}));

export const gamePlayersRelations = relations(gamePlayers, ({ one }) => ({
  room: one(gameRooms, {
    fields: [gamePlayers.roomId],
    references: [gameRooms.id],
  }),
  user: one(users, {
    fields: [gamePlayers.odexId],
    references: [users.id],
  }),
}));

export const gameHistoryRelations = relations(gameHistory, ({ one }) => ({
  room: one(gameRooms, {
    fields: [gameHistory.roomId],
    references: [gameRooms.id],
  }),
  winner: one(users, {
    fields: [gameHistory.winnerId],
    references: [users.id],
  }),
}));

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  displayName: true,
});

export const insertGameRoomSchema = createInsertSchema(gameRooms).pick({
  hostId: true,
  gameMode: true,
  maxPlayers: true,
  pointThreshold: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type GameRoom = typeof gameRooms.$inferSelect;
export type GamePlayer = typeof gamePlayers.$inferSelect;
export type GameHistory = typeof gameHistory.$inferSelect;
