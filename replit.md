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
- Deck exhaustion: when the deck runs out and the next player cannot pick up the pile, the round ends immediately. All remaining hand cards count as negative points for all players (no winner exemption).
- AI players use basic strategy for set building and pile pickup decisions

### AI Player System
- AI logic in `/server/aiPlayer.ts` handles automated decision-making
- Host can add/remove AI players in waiting room before game starts
- AI automatically takes turns with configurable delays (~600-800ms between actions)
- AI strategy includes:
  - Evaluating whether to pick up pile or draw from deck
  - Finding valid sets (3+ matching cards) to lay down
  - Adding cards to existing sets when possible
  - Discarding lowest-value unpaired cards

### Socket Context
- `GameSocketProvider` in `/client/contexts/GameSocketContext.tsx` shares socket connection across all screens
- Single socket instance ensures game state persists during navigation
- All game actions flow through the shared context

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