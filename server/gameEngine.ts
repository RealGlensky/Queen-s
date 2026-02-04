import { v4 as uuidv4 } from "uuid";
import type {
  PlayingCard,
  CardSet,
  Player,
  GameState,
  GameAction,
  RoomConfig,
  Suit,
  Rank,
  RoundHistoryEntry,
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
    recentActions: [],
    scoreHistory: [],
  };
}

// Helper to add an action to the recent actions queue
function addAction(state: GameState, action: GameAction): void {
  state.lastAction = action;
  state.recentActions.push(action);
  // Keep only last 20 actions to prevent memory bloat
  if (state.recentActions.length > 20) {
    state.recentActions = state.recentActions.slice(-20);
  }
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
  
  addAction(state, {
    id: uuidv4(),
    type: 'draw_deck',
    playerId,
    timestamp: Date.now(),
  });
  
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
  
  // When picking up a wild card (2), you need 2 natural cards of the same rank
  // You cannot use another 2 to help pick up a 2
  if (isWildCard(topCard)) {
    // Filter out wild cards - only natural cards count
    const naturalCards = selectedCards.filter(c => !isWildCard(c) && !c.isJoker);
    if (naturalCards.length < 2) {
      return null;
    }
    // All natural cards must be the same rank
    const firstRank = naturalCards[0].rank;
    const allSameRank = naturalCards.every(c => c.rank === firstRank);
    if (!allSameRank) {
      return null;
    }
  } else {
    // Normal pickup: need 2 matching cards, or 1 matching + 1 wild
    const matchingCards = selectedCards.filter(c => c.rank === topCard.rank);
    const wildcards = selectedCards.filter(c => isWildCard(c));
    
    if (matchingCards.length < 2 && !(matchingCards.length >= 1 && wildcards.length >= 1)) {
      return null;
    }
  }
  
  player.hand = player.hand.filter(c => !cardIds.includes(c.id));
  
  const pileCards = state.pickupPile;
  state.pickupPile = [];
  
  player.hand.push(...pileCards);
  
  const setCards = [...selectedCards, topCard];
  
  // Determine set rank: if top card is wild, use the natural cards' rank
  let setRank = topCard.rank;
  if (isWildCard(topCard)) {
    const naturalCards = selectedCards.filter(c => !isWildCard(c) && !c.isJoker);
    if (naturalCards.length > 0) {
      setRank = naturalCards[0].rank;
    }
  }
  
  // Sort cards: 2s (wild) first (underneath), then normal cards, then Queen of Spades on top
  const sortedSetCards = [...setCards].sort((a, b) => {
    // Queen of Spades goes to very end (on top visually)
    if (a.rank === "Q" && a.suit === "spades") return 1;
    if (b.rank === "Q" && b.suit === "spades") return -1;
    // Wild cards (2s) go to beginning (underneath visually)
    if (isWildCard(a) && !isWildCard(b)) return -1;
    if (!isWildCard(a) && isWildCard(b)) return 1;
    return 0;
  });
  
  const newSet: CardSet = {
    id: uuidv4(),
    cards: sortedSetCards,
    rank: setRank,
    ownerId: playerId,
    teamId: player.odexTeam,
  };
  
  player.hand = player.hand.filter(c => !setCards.some(sc => sc.id === c.id));
  player.sets.push(newSet);
  
  state.turnPhase = "play";
  
  addAction(state, {
    id: uuidv4(),
    type: 'pickup_pile',
    playerId,
    cards: pileCards,
    timestamp: Date.now(),
  });
  
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
  
  // Sort cards: 2s (wild) first (underneath), then normal cards, then Queen of Spades on top
  let sortedCards = [...cards].sort((a, b) => {
    // Queen of Spades goes to very end (on top visually)
    if (a.rank === "Q" && a.suit === "spades") return 1;
    if (b.rank === "Q" && b.suit === "spades") return -1;
    // Wild cards (2s) go to beginning (underneath visually)
    if (isWildCard(a) && !isWildCard(b)) return -1;
    if (!isWildCard(a) && isWildCard(b)) return 1;
    return 0;
  });
  
  const newSet: CardSet = {
    id: uuidv4(),
    cards: sortedCards,
    rank,
    ownerId: playerId,
    teamId: player.odexTeam,
  };
  
  player.hand = player.hand.filter(c => !cardIds.includes(c.id));
  player.sets.push(newSet);
  
  addAction(state, {
    id: uuidv4(),
    type: 'lay_set',
    playerId,
    cards: sortedCards,
    timestamp: Date.now(),
  });
  
  // Check if player reached last card status after laying set
  const wasLastCard = player.hasLastCard;
  player.hasLastCard = player.hand.length === 1;
  if (player.hasLastCard && !wasLastCard) {
    addAction(state, {
      id: uuidv4(),
      type: 'declare_last_card',
      playerId,
      timestamp: Date.now(),
    });
  }
  
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
  
  // Add the card and re-sort: 2s first (underneath), normal cards, Queen of Spades on top
  targetSet.cards.push(card);
  targetSet.cards.sort((a, b) => {
    // Queen of Spades goes to very end (on top visually)
    if (a.rank === "Q" && a.suit === "spades") return 1;
    if (b.rank === "Q" && b.suit === "spades") return -1;
    // Wild cards (2s) go to beginning (underneath visually)
    if (isWildCard(a) && !isWildCard(b)) return -1;
    if (!isWildCard(a) && isWildCard(b)) return 1;
    return 0;
  });
  
  addAction(state, {
    id: uuidv4(),
    type: 'add_to_set',
    playerId,
    cards: [card],
    setId,
    timestamp: Date.now(),
  });
  
  // Check if player reached last card status after adding to set
  const wasLastCard = player.hasLastCard;
  player.hasLastCard = player.hand.length === 1;
  if (player.hasLastCard && !wasLastCard) {
    addAction(state, {
      id: uuidv4(),
      type: 'declare_last_card',
      playerId,
      timestamp: Date.now(),
    });
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
  
  addAction(state, {
    id: uuidv4(),
    type: 'discard',
    playerId,
    cards: [discardedCard],
    timestamp: Date.now(),
  });
  
  if (player.hand.length === 0) {
    return endRound(state, playerId);
  }
  
  // Check if player just reached "last card" status (exactly 1 card remaining)
  const wasLastCard = player.hasLastCard;
  player.hasLastCard = player.hand.length === 1;
  
  // Add action to log when player first reaches last card status
  if (player.hasLastCard && !wasLastCard) {
    addAction(state, {
      id: uuidv4(),
      type: 'declare_last_card',
      playerId,
      timestamp: Date.now(),
    });
  }
  
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
  
  if (player.hand.length === 1) {
    player.hasLastCard = true;
    
    addAction(state, {
      id: uuidv4(),
      type: 'declare_last_card',
      playerId,
      timestamp: Date.now(),
    });
  }
  
  return state;
}

function endRound(state: GameState, winnerId: string): GameState {
  const winner = state.players.find(p => p.id === winnerId);
  const winningTeam = state.gameMode === "2v2" ? winner?.odexTeam : undefined;
  
  for (const player of state.players) {
    let setsScore = 0;
    for (const set of player.sets) {
      for (const card of set.cards) {
        setsScore += getCardPoints(card);
      }
    }
    
    let handPenalty = 0;
    if (state.gameMode === "2v2" && winningTeam !== undefined && player.odexTeam === winningTeam) {
      handPenalty = 0;
    } else {
      for (const card of player.hand) {
        handPenalty += getCardPoints(card);
      }
    }
    
    let perfectBonus = 0;
    if (state.perfectCutBonus && player.id === state.dealerId) {
      perfectBonus = 100;
    }
    
    player.roundScore = setsScore - handPenalty + perfectBonus;
    player.totalScore += player.roundScore;
  }
  
  const roundHistoryEntry: RoundHistoryEntry = {
    round: state.currentRound,
    scores: state.players.map(p => ({
      playerId: p.id,
      displayName: p.displayName,
      roundScore: p.roundScore,
      cumulativeScore: p.totalScore,
      teamId: p.odexTeam,
    })),
  };
  state.scoreHistory.push(roundHistoryEntry);
  
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
  state.recentActions = [];
  state.winner = undefined;
  
  return state;
}
