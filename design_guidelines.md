# Queens Card Game - Design Guidelines

## 1. Brand Identity

**Purpose**: Queens is a competitive multiplayer rummy-variant card game that brings the classic card table experience to mobile devices. Players engage in strategic gameplay involving set-building, blocking opponents, and managing risk.

**Aesthetic Direction**: **Classic Casino/Card Room** - Evoke the feeling of sitting at a traditional card table with rich materials, elegant details, and timeless design. Think green felt, wood grain, gold accents, and premium playing cards. This should feel sophisticated and focused, not playful or cartoonish.

**Memorable Element**: The authentic card table surface with subtle felt texture serves as the game board. All cards cast realistic shadows onto the table, creating depth and tactility.

## 2. Navigation Architecture

**Root Navigation**: Stack-only (no tabs)
- Home → Lobby → Game Room → Score Screen → Home

**Screen List**:
1. Home Screen - Start game, view rules, settings
2. Lobby Screen - Create/join room, select mode (solo/2v2)
3. Waiting Room - View players, chat, start game
4. Game Screen - Main gameplay interface
5. Score Screen - Round/game results
6. Rules Screen - Complete game instructions
7. Settings Screen - Audio, display name, notifications

## 3. Screen-by-Screen Specifications

### Home Screen
- **Purpose**: Entry point, primary navigation
- **Layout**:
  - Transparent header with settings icon (top-right)
  - Main content: Centered vertically, non-scrollable
  - Large "QUEENS" title at top third
  - Two large buttons: "Play" and "Rules"
  - Bottom: Small "How to Play" link
- **Safe Area**: top: insets.top + 60, bottom: insets.bottom + 40

### Lobby Screen
- **Purpose**: Room creation and matchmaking
- **Layout**:
  - Default header with back button, title "New Game"
  - Scrollable form content
  - Form fields: Game Mode (Solo/2v2), Player Count (2-6), Point Threshold
  - "Create Room" button below form
  - Divider with "OR"
  - "Join Existing Room" button
- **Safe Area**: top: 24, bottom: insets.bottom + 24

### Waiting Room Screen
- **Purpose**: Show joined players before game starts
- **Layout**:
  - Header with room code (center), leave button (left)
  - Player list showing avatars, names, team indicators
  - Floating "Start Game" button (host only)
- **Safe Area**: top: 24, bottom: tabBarHeight + 24

### Game Screen
- **Purpose**: Main gameplay - the card table
- **Layout**:
  - Transparent header with menu icon (left), score icon (right)
  - Full-screen card table background
  - Top: Opponent hand areas (fanned cards, face-down)
  - Center: Table sets area (horizontally scrollable), pickup pile, deck
  - Bottom: Player hand (fanned cards, face-up), action buttons
  - Floating turn indicator and timer
- **Components**: Draggable cards, set containers, pickup pile stack, discard animation
- **Safe Area**: None (full bleed), but interactive elements respect insets

### Score Screen
- **Purpose**: Display round/game results
- **Layout**:
  - Header with close button, title "Round Results" or "Game Over"
  - Scrollable list of players with point breakdown
  - Highlight winner with crown icon
  - "Next Round" or "Play Again" button at bottom
- **Safe Area**: top: 24, bottom: insets.bottom + 24

## 4. Color Palette

**Primary Colors**:
- Casino Green (felt): `#0B5D1E` (table surface)
- Rich Wood: `#3E2723` (backgrounds, headers)
- Gold Accent: `#D4AF37` (highlights, winner indicators)

**Card Colors**:
- Card Face: `#FFFFFF`
- Red Suits: `#C41E3A`
- Black Suits: `#1C1C1C`

**UI Colors**:
- Background: `#1A1A1A`
- Surface: `#2C2C2C`
- Text Primary: `#FFFFFF`
- Text Secondary: `#B0B0B0`
- Border: `rgba(212, 175, 55, 0.3)`

**Semantic**:
- Success: `#4CAF50`
- Warning: `#FF9800`
- Error: `#F44336`

## 5. Typography

**Font**: System default (SF Pro for iOS, Roboto for Android)

**Type Scale**:
- Hero: 48px, Bold (QUEENS title)
- H1: 28px, Bold (screen titles)
- H2: 20px, Semibold (section headers)
- Body: 16px, Regular (main text)
- Caption: 13px, Regular (card values, small labels)
- Button: 17px, Semibold

## 6. Assets to Generate

**App Icon** (icon.png): A single playing card (Queen of Spades) on green felt background, gold border. Used: Device home screen.

**Splash Icon** (splash-icon.png): Simplified Queen of Spades symbol in gold on dark background. Used: App launch screen.

**Card Deck** (cards/): Complete 52-card deck + 2 jokers in classic style. Each card as PNG (e.g., queen-spades.png, ace-hearts.png). Used: Throughout gameplay.

**Card Back** (card-back.png): Classic red pattern playing card back design. Used: Opponent hands, deck pile.

**Table Texture** (table-felt.png): Seamless green felt texture with subtle grain. Used: Game screen background.

**Empty State** (empty-lobby.png): Illustration of empty card table with single spotlight. Used: Waiting room when no players joined.

**Trophy Icon** (trophy.png): Gold trophy illustration. Used: Score screen winner indicator.

**Crown Icon** (crown.png): Small gold crown. Used: Current dealer indicator, winner badges.