export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'joker';

export interface PlayingCard {
  id: string;
  suit: Suit | null;
  rank: Rank;
  isJoker?: boolean;
  jokerColor?: 'red' | 'black';
}

export interface CardSet {
  id: string;
  cards: PlayingCard[];
  rank: Rank;
  ownerId: string;
  teamId?: number;
}

export interface Player {
  id: string;
  odexId: string;
  displayName: string;
  odexTeam?: number;
  seatPosition: number;
  hand: PlayingCard[];
  sets: CardSet[];
  totalScore: number;
  roundScore: number;
  isConnected: boolean;
  hasLastCard: boolean;
}

export interface GameState {
  roomId: string;
  roomCode: string;
  gameMode: 'solo' | '2v2';
  status: 'waiting' | 'playing' | 'round_end' | 'game_over';
  currentRound: number;
  pointThreshold: number;
  players: Player[];
  dealerId: string;
  currentPlayerId: string;
  deck: PlayingCard[];
  pickupPile: PlayingCard[];
  discardPile: PlayingCard[];
  perfectCutBonus: boolean;
  turnPhase: 'draw' | 'play' | 'discard';
  lastAction?: GameAction;
  winner?: {
    playerId?: string;
    teamId?: number;
    finalScores: { playerId: string; score: number }[];
  };
}

export type GameActionType = 
  | 'draw_deck'
  | 'pickup_pile'
  | 'lay_set'
  | 'add_to_set'
  | 'discard'
  | 'declare_last_card';

export interface GameAction {
  type: GameActionType;
  playerId: string;
  cards?: PlayingCard[];
  setId?: string;
  timestamp: number;
}

export interface RoomConfig {
  gameMode: 'solo' | '2v2';
  maxPlayers: number;
  pointThreshold: number;
}

export interface JoinRoomPayload {
  odexId: string;
  displayName: string;
  roomCode?: string;
  roomConfig?: RoomConfig;
}

export interface GameMessage {
  type: 'room_created' | 'player_joined' | 'player_left' | 'game_started' | 'game_state' | 'action_result' | 'round_end' | 'game_over' | 'error' | 'room_info';
  payload: any;
  timestamp: number;
}

export function getCardPoints(card: PlayingCard): number {
  if (card.isJoker) return 50;
  if (card.rank === '2') return 20;
  if (card.rank === 'Q' && card.suit === 'spades') return 100;
  if (card.rank === 'A') return 20;
  if (['10', 'J', 'Q', 'K'].includes(card.rank)) return 10;
  return 5;
}

export function isWildCard(card: PlayingCard): boolean {
  return card.rank === '2';
}

export function canPickupPile(hand: PlayingCard[], topCard: PlayingCard): boolean {
  const matchingCards = hand.filter(c => c.rank === topCard.rank);
  const wildcards = hand.filter(c => isWildCard(c));
  
  if (matchingCards.length >= 2) return true;
  if (matchingCards.length >= 1 && wildcards.length >= 1) return true;
  
  return false;
}

export function isValidSet(cards: PlayingCard[]): boolean {
  if (cards.length < 3) return false;
  
  const jokers = cards.filter(c => c.rank === 'joker');
  const nonJokers = cards.filter(c => c.rank !== 'joker');
  
  // If set contains jokers, it must be ALL jokers (jokers aren't wild)
  if (jokers.length > 0) {
    return jokers.length === cards.length; // Valid only if all cards are jokers
  }
  
  // For non-joker sets: 2s are wild cards
  const wildcards = cards.filter(c => isWildCard(c));
  const naturalCards = cards.filter(c => !isWildCard(c));
  
  // Need at least 2 natural matching cards
  if (naturalCards.length < 2) return false;
  
  const targetRank = naturalCards[0].rank;
  return naturalCards.every(c => c.rank === targetRank);
}

export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
