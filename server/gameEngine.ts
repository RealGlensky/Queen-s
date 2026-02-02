import { v4 as uuidv4 } from "uuid";
import type {
  PlayingCard,
  CardSet,
  Player,
  GameState,
  RoomConfig,
  Suit,
  Rank,
} from "@shared/gameTypes";
import { getCardPoints, isWildCard, isValidSet, canPickupPile, generateRoomCode } from "@shared/gameTypes";

export function createDeck(numDecks: number = 1): PlayingCard[] {
  const suits: Suit[] = ["hearts", "diamonds", "clubs", "spades"];
  const ranks: Rank[] = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
  
  const deck: PlayingCard[] = [];
  
  for (let d = 0; d < numDecks; d++) {
    for (const suit of suits) {
      for (const rank of ranks) {
        deck.push({
          id: uuidv4(),
          suit,
          rank,
        });
      }
    }
    
    deck.push({
      id: uuidv4(),
      suit: null,
      rank: "joker",
      isJoker: true,
      jokerColor: "red",
    });
    deck.push({
      id: uuidv4(),
      suit: null,
      rank: "joker",
      isJoker: true,
      jokerColor: "black",
    });
  }
  
  return shuffleDeck(deck);
}

export function shuffleDeck(deck: PlayingCard[]): PlayingCard[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function dealCards(
  deck: PlayingCard[],
  numPlayers: number,
  cardsPerPlayer: number = 13
): { hands: PlayingCard[][]; remainingDeck: PlayingCard[]; pickupCard: PlayingCard | null; perfectCut: boolean } {
  const hands: PlayingCard[][] = Array.from({ length: numPlayers }, () => []);
  let deckIndex = 0;
  const totalCardsNeeded = numPlayers * cardsPerPlayer + 1;
  
  for (let cardNum = 0; cardNum < cardsPerPlayer; cardNum++) {
    for (let player = 0; player < numPlayers; player++) {
      if (deckIndex < deck.length) {
        hands[player].push(deck[deckIndex]);
        deckIndex++;
      }
    }
  }
  
  const pickupCard = deckIndex < deck.length ? deck[deckIndex] : null;
  deckIndex++;
  
  const perfectCut = deckIndex === totalCardsNeeded && deckIndex === deck.length;
  
  const remainingDeck = deck.slice(deckIndex);
  
  return { hands, remainingDeck, pickupCard, perfectCut };
}

export function createGameState(
  roomId: string,
  roomCode: string,
  config: RoomConfig,
  players: { id: string; odexId: string; displayName: string; odexTeam?: number }[]
): GameState {
  const numDecks = Math.ceil(players.length / 2);
  const deck = createDeck(numDecks);
  
  const { hands, remainingDeck, pickupCard, perfectCut } = dealCards(deck, players.length);
  
  const dealerIndex = Math.floor(Math.random() * players.length);
  const firstPlayerIndex = (dealerIndex + 1) % players.length;
  
  const gamePlayers: Player[] = players.map((p, index) => ({
    id: p.id,
    odexId: p.odexId,
    displayName: p.displayName,
    odexTeam: p.odexTeam,
    seatPosition: index,
    hand: hands[index],
    sets: [],
    totalScore: 0,
    roundScore: 0,
    isConnected: true,
    hasLastCard: false,
  }));
  
  return {
    roomId,
    roomCode,
    gameMode: config.gameMode,
    status: "playing",
    currentRound: 1,
    pointThreshold: config.pointThreshold,
    players: gamePlayers,
    dealerId: gamePlayers[dealerIndex].id,
    currentPlayerId: gamePlayers[firstPlayerIndex].id,
    deck: remainingDeck,
    pickupPile: pickupCard ? [pickupCard] : [],
    discardPile: [],
    perfectCutBonus: perfectCut,
    turnPhase: "draw",
  };
}

export function processDrawFromDeck(state: GameState, playerId: string): GameState | null {
  if (state.currentPlayerId !== playerId || state.turnPhase !== "draw") {
    return null;
  }
  
  if (state.deck.length === 0) {
    const reshuffled = shuffleDeck([...state.discardPile]);
    state.deck = reshuffled;
    state.discardPile = [];
  }
  
  if (state.deck.length === 0) {
    return null;
  }
  
  const card = state.deck.pop()!;
  const player = state.players.find(p => p.id === playerId);
  if (!player) return null;
  
  player.hand.push(card);
  state.turnPhase = "play";
  
  return state;
}

export function processPickupPile(
  state: GameState,
  playerId: string,
  cardIds: string[]
): GameState | null {
  if (state.currentPlayerId !== playerId || state.turnPhase !== "draw") {
    return null;
  }
  
  const player = state.players.find(p => p.id === playerId);
  if (!player || state.pickupPile.length === 0) return null;
  
  const topCard = state.pickupPile[state.pickupPile.length - 1];
  
  const playerHasSetWithRank = player.sets.some(s => s.rank === topCard.rank);
  if (playerHasSetWithRank && !topCard.isJoker) {
    return null;
  }
  
  const selectedCards = player.hand.filter(c => cardIds.includes(c.id));
  const matchingCards = selectedCards.filter(c => c.rank === topCard.rank);
  const wildcards = selectedCards.filter(c => isWildCard(c));
  
  if (matchingCards.length < 2 && !(matchingCards.length >= 1 && wildcards.length >= 1)) {
    return null;
  }
  
  player.hand = player.hand.filter(c => !cardIds.includes(c.id));
  
  const pileCards = state.pickupPile;
  state.pickupPile = [];
  
  player.hand.push(...pileCards);
  
  const setCards = [...selectedCards, topCard];
  const newSet: CardSet = {
    id: uuidv4(),
    cards: setCards,
    rank: topCard.rank,
    ownerId: playerId,
    teamId: player.odexTeam,
  };
  
  player.hand = player.hand.filter(c => !setCards.some(sc => sc.id === c.id));
  player.sets.push(newSet);
  
  state.turnPhase = "play";
  
  return state;
}

export function processLaySet(
  state: GameState,
  playerId: string,
  cardIds: string[]
): GameState | null {
  if (state.currentPlayerId !== playerId || state.turnPhase !== "play") {
    return null;
  }
  
  const player = state.players.find(p => p.id === playerId);
  if (!player) return null;
  
  const cards = player.hand.filter(c => cardIds.includes(c.id));
  if (cards.length < 3 || !isValidSet(cards)) {
    return null;
  }
  
  const nonWildcards = cards.filter(c => !isWildCard(c) && !c.isJoker);
  const rank = nonWildcards[0]?.rank || "2";
  
  const hasQueenOfSpades = cards.some(c => c.rank === "Q" && c.suit === "spades");
  let sortedCards = [...cards];
  if (hasQueenOfSpades) {
    sortedCards = sortedCards.sort((a, b) => {
      if (a.rank === "Q" && a.suit === "spades") return 1;
      if (b.rank === "Q" && b.suit === "spades") return -1;
      return 0;
    });
  }
  
  const newSet: CardSet = {
    id: uuidv4(),
    cards: sortedCards,
    rank,
    ownerId: playerId,
    teamId: player.odexTeam,
  };
  
  player.hand = player.hand.filter(c => !cardIds.includes(c.id));
  player.sets.push(newSet);
  
  return state;
}

export function processAddToSet(
  state: GameState,
  playerId: string,
  setId: string,
  cardId: string
): GameState | null {
  if (state.currentPlayerId !== playerId || state.turnPhase !== "play") {
    return null;
  }
  
  const player = state.players.find(p => p.id === playerId);
  if (!player) return null;
  
  const card = player.hand.find(c => c.id === cardId);
  if (!card) return null;
  
  let targetSet: CardSet | undefined;
  let setOwner: Player | undefined;
  
  for (const p of state.players) {
    const set = p.sets.find(s => s.id === setId);
    if (set) {
      targetSet = set;
      setOwner = p;
      break;
    }
  }
  
  if (!targetSet || !setOwner) return null;
  
  if (state.gameMode === "2v2") {
    if (player.odexTeam !== setOwner.odexTeam) {
      return null;
    }
  } else {
    if (setOwner.id !== playerId) {
      return null;
    }
  }
  
  if (!isWildCard(card) && !card.isJoker && card.rank !== targetSet.rank) {
    return null;
  }
  
  player.hand = player.hand.filter(c => c.id !== cardId);
  
  if (card.rank === "Q" && card.suit === "spades") {
    targetSet.cards.push(card);
  } else {
    targetSet.cards.unshift(card);
  }
  
  return state;
}

export function processDiscard(
  state: GameState,
  playerId: string,
  cardId: string
): GameState | null {
  const player = state.players.find(p => p.id === playerId);
  if (!player) return null;
  
  if (state.currentPlayerId !== playerId) return null;
  if (state.turnPhase !== "play" && state.turnPhase !== "discard") return null;
  
  const cardIndex = player.hand.findIndex(c => c.id === cardId);
  if (cardIndex === -1) return null;
  
  const [discardedCard] = player.hand.splice(cardIndex, 1);
  state.pickupPile.push(discardedCard);
  
  if (player.hand.length === 0) {
    return endRound(state, playerId);
  }
  
  player.hasLastCard = player.hand.length === 1;
  
  const currentIndex = state.players.findIndex(p => p.id === playerId);
  const nextIndex = (currentIndex + 1) % state.players.length;
  state.currentPlayerId = state.players[nextIndex].id;
  state.turnPhase = "draw";
  
  return state;
}

export function processDeclareLastCard(
  state: GameState,
  playerId: string
): GameState | null {
  const player = state.players.find(p => p.id === playerId);
  if (!player) return null;
  
  if (player.hand.length <= 2) {
    player.hasLastCard = true;
  }
  
  return state;
}

function endRound(state: GameState, winnerId: string): GameState {
  const winner = state.players.find(p => p.id === winnerId);
  
  for (const player of state.players) {
    let setsScore = 0;
    for (const set of player.sets) {
      for (const card of set.cards) {
        setsScore += getCardPoints(card);
      }
    }
    
    let handPenalty = 0;
    for (const card of player.hand) {
      handPenalty += getCardPoints(card);
    }
    
    let perfectBonus = 0;
    if (state.perfectCutBonus && player.id === state.dealerId) {
      perfectBonus = 100;
    }
    
    player.roundScore = setsScore - handPenalty + perfectBonus;
    player.totalScore += player.roundScore;
  }
  
  let gameOver = false;
  let gameWinnerId: string | undefined;
  let gameWinnerTeam: number | undefined;
  
  if (state.gameMode === "2v2") {
    const team1Score = state.players
      .filter(p => p.odexTeam === 1)
      .reduce((sum, p) => sum + p.totalScore, 0);
    const team2Score = state.players
      .filter(p => p.odexTeam === 2)
      .reduce((sum, p) => sum + p.totalScore, 0);
    
    if (team1Score >= state.pointThreshold || team2Score >= state.pointThreshold) {
      gameOver = true;
      gameWinnerTeam = team1Score >= team2Score ? 1 : 2;
    }
  } else {
    for (const player of state.players) {
      if (player.totalScore >= state.pointThreshold) {
        gameOver = true;
        const highestScorer = state.players.reduce((max, p) => 
          p.totalScore > max.totalScore ? p : max
        );
        gameWinnerId = highestScorer.id;
        break;
      }
    }
  }
  
  if (gameOver) {
    state.status = "game_over";
    state.winner = {
      playerId: gameWinnerId,
      teamId: gameWinnerTeam,
      finalScores: state.players.map(p => ({
        playerId: p.id,
        score: p.totalScore,
      })),
    };
  } else {
    state.status = "round_end";
  }
  
  return state;
}

export function startNextRound(state: GameState): GameState {
  const numDecks = Math.ceil(state.players.length / 2);
  const deck = createDeck(numDecks);
  
  const { hands, remainingDeck, pickupCard, perfectCut } = dealCards(deck, state.players.length);
  
  const currentDealerIndex = state.players.findIndex(p => p.id === state.dealerId);
  const newDealerIndex = (currentDealerIndex + 1) % state.players.length;
  const firstPlayerIndex = (newDealerIndex + 1) % state.players.length;
  
  for (let i = 0; i < state.players.length; i++) {
    state.players[i].hand = hands[i];
    state.players[i].sets = [];
    state.players[i].roundScore = 0;
    state.players[i].hasLastCard = false;
  }
  
  state.currentRound++;
  state.status = "playing";
  state.dealerId = state.players[newDealerIndex].id;
  state.currentPlayerId = state.players[firstPlayerIndex].id;
  state.deck = remainingDeck;
  state.pickupPile = pickupCard ? [pickupCard] : [];
  state.discardPile = [];
  state.perfectCutBonus = perfectCut;
  state.turnPhase = "draw";
  state.lastAction = undefined;
  state.winner = undefined;
  
  return state;
}
