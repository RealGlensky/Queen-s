# Queens Card Game

## Overview

Queens is a multiplayer rummy-variant card game built as a cross-platform mobile application using React Native with Expo. The game supports 2-6 players in solo mode or 2v2 team play, featuring real-time multiplayer via WebSockets, AI opponents, and a casino-themed visual design. Players build sets of matching cards, strategically pick up piles, and race to reach point thresholds (1000 for solo, 1500 for teams).

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React Native with Expo SDK 54, targeting iOS, Android, and Web
- **Navigation**: React Navigation with native stack navigator (stack-only, no tabs)
- **State Management**: React Query for server state, React hooks for local state
- **Animations**: React Native Reanimated for smooth card and UI animations
- **Styling**: StyleSheet with a custom theme system (casino green/gold color palette)

The client code lives in `/client` with screens in `/client/screens`, reusable components in `/client/components`, and hooks in `/client/hooks`. Path aliases use `@/` for client code and `@shared/` for shared types.

### Backend Architecture
- **Server**: Express.js running on Node with TypeScript
- **Real-time Communication**: Socket.IO for game state synchronization
- **Database**: PostgreSQL with Drizzle ORM
- **Game Logic**: Server-authoritative game engine in `/server/gameEngine.ts`

The server handles room management, game state, turn validation, and AI player decisions. All game actions are processed server-side to prevent cheating.

### Game Engine Design
- Rooms are managed in-memory with a `Map<string, Room>` structure
- Game state includes deck, pickup pile, player hands, and laid sets
- Turn phases: draw → play → discard
- AI players use basic strategy for set building and pile pickup decisions

### Data Layer
- Schema defined in `/shared/schema.ts` using Drizzle
- Tables: users, game_rooms, game_players, game_history
- Migrations output to `/migrations` directory

## External Dependencies

### Database
- PostgreSQL database (connection via `DATABASE_URL` environment variable)
- Drizzle ORM for type-safe queries and migrations

### Real-time Communication
- Socket.IO for WebSocket connections between client and server
- Supports both WebSocket and polling transports

### Mobile/Cross-Platform
- Expo SDK 54 with new architecture enabled
- expo-haptics for tactile feedback
- expo-linear-gradient for casino-style backgrounds
- AsyncStorage for local settings persistence

### Development Tools
- TypeScript for type safety across client, server, and shared code
- ESLint with Expo config and Prettier for code formatting
- esbuild for server production builds