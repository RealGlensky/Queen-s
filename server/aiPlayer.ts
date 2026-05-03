import type { PlayingCard, GameState, Player, CardSet } from "@shared/gameTypes";
import { isWildCard, isValidSet, getCardPoints, canPickupPile } from "@shared/gameTypes";

export interface AIDecision {
  type: "draw_deck" | "pickup_pile" | "lay_set" | "add_to_set" | "discard";
  cardIds?: string[];
  cardId?: string;
  setId?: string;
}

function countRanks(hand: PlayingCard[]): Map<string, PlayingCard[]> {
  const ranks = new Map<string, PlayingCard[]>();
  for (const card of hand) {
    if (!isWildCard(card)) {
      const existing = ranks.get(card.rank) || [];
      existing.push(card);
      ranks.set(card.rank, existing);
    }
  }
  return ranks;
}

function getHandPoints(hand: PlayingCard[]): number {
  return hand.reduce((sum, c) => sum + getCardPoints(c), 0);
}

function getSetPoints(cards: PlayingCard[]): number {
  return cards.reduce((sum, c) => sum + getCardPoints(c), 0);
}

function isHighValueCard(card: PlayingCard): boolean {
  return getCardPoints(card) >= 10;
}

function getSmallestOpponentHandSize(state: GameState, playerId: string): number {
  const player = state.players.find(p => p.id === playerId);
  const opponents = state.players.filter(p => {
    if (p.id === playerId) return false;
    if (state.gameMode === "2v2" && player && p.odexTeam === player.odexTeam) return false;
    return true;
  });
  if (opponents.length === 0) return Infinity;
  return Math.min(...opponents.map(p => p.hand.length));
}

function isEmergencyMode(state: GameState, playerId: string): boolean {
  const smallestOpponentHand = getSmallestOpponentHandSize(state, playerId);
  return smallestOpponentHand <= 3;
}

function isDesperate(state: GameState, playerId: string): boolean {
  const smallestOpponentHand = getSmallestOpponentHandSize(state, playerId);
  return smallestOpponentHand <= 1;
}

function getOpponentSets(state: GameState, playerId: string): CardSet[] {
  const player = state.players.find(p => p.id === playerId);
  return state.players
    .filter(p => {
      if (p.id === playerId) return false;
      if (state.gameMode === "2v2" && player && p.odexTeam === player.odexTeam) return false;
      return true;
    })
    .flatMap(p => p.sets);
}

function getNextPlayerId(state: GameState, playerId: string): string | null {
  const idx = state.players.findIndex(p => p.id === playerId);
  if (idx === -1) return null;
  const nextIdx = (idx + 1) % state.players.length;
  return state.players[nextIdx].id;
}

function findPotentialSets(hand: PlayingCard[]): PlayingCard[][] {
  const rankGroups = countRanks(hand);
  const wildcards = hand.filter(c => isWildCard(c));
  const potentialSets: PlayingCard[][] = [];

  for (const [_rank, cards] of rankGroups) {
    if (cards.length >= 3) {
      potentialSets.push(cards.slice(0, Math.min(cards.length, 4)));
    } else if (cards.length === 2 && wildcards.length >= 1) {
      potentialSets.push([...cards, wildcards[0]]);
    }
  }

  potentialSets.sort((a, b) => {
    const scoreA = getSetPoints(a);
    const scoreB = getSetPoints(b);
    return scoreB - scoreA;
  });

  return potentialSets;
}

function findCardsToAddToSets(hand: PlayingCard[], sets: CardSet[]): { cardId: string; setId: string; points: number }[] {
  const additions: { cardId: string; setId: string; points: number }[] = [];

  for (const card of hand) {
    for (const set of sets) {
      if (isWildCard(card) || card.rank === set.rank) {
        additions.push({ cardId: card.id, setId: set.id, points: getCardPoints(card) });
      }
    }
  }

  additions.sort((a, b) => b.points - a.points);

  return additions;
}

function shouldPickupPile(
  hand: PlayingCard[],
  pickupPile: PlayingCard[],
  playerSets: CardSet[],
  state: GameState,
  playerId: string
): { shouldPickup: boolean; cardIds: string[] } {
  if (pickupPile.length === 0) return { shouldPickup: false, cardIds: [] };

  const topCard = pickupPile[pickupPile.length - 1];
  const topCardPoints = getCardPoints(topCard);
  const pileSize = pickupPile.length;

  const hasSetWithRank = playerSets.some(s => s.rank === topCard.rank);
  if (hasSetWithRank && !topCard.isJoker) {
    return { shouldPickup: false, cardIds: [] };
  }

  const emergency = isEmergencyMode(state, playerId);
  if (emergency && pileSize > 3) {
    return { shouldPickup: false, cardIds: [] };
  }

  const findPickupCards = (): string[] | null => {
    if (isWildCard(topCard)) {
      const naturalCards = hand.filter(c => !isWildCard(c) && !c.isJoker);
      const rankGroups = new Map<string, PlayingCard[]>();
      for (const card of naturalCards) {
        const existing = rankGroups.get(card.rank) || [];
        existing.push(card);
        rankGroups.set(card.rank, existing);
      }
      for (const cards of rankGroups.values()) {
        if (cards.length >= 2) {
          return cards.slice(0, 2).map(c => c.id);
        }
      }
      return null;
    }

    const matchingCards = hand.filter(c => c.rank === topCard.rank);
    const wildcards = hand.filter(c => isWildCard(c));

    if (matchingCards.length >= 2) {
      return matchingCards.slice(0, 2).map(c => c.id);
    }
    if (matchingCards.length >= 1 && wildcards.length >= 1) {
      return [matchingCards[0].id, wildcards[0].id];
    }
    return null;
  };

  const cardIds = findPickupCards();
  if (!cardIds) return { shouldPickup: false, cardIds: [] };

  const pilePoints = pickupPile.reduce((sum, c) => sum + getCardPoints(c), 0);

  if (pileSize <= 3) {
    return { shouldPickup: true, cardIds };
  }

  if (pileSize <= 6 && topCardPoints >= 10) {
    return { shouldPickup: true, cardIds };
  }

  if (pileSize <= 10 && topCardPoints >= 20) {
    return { shouldPickup: true, cardIds };
  }

  if (pilePoints >= pileSize * 8 && pileSize <= 8) {
    return { shouldPickup: true, cardIds };
  }

  if (topCard.rank === "Q" && topCard.suit === "spades") {
    if (pileSize <= 12) {
      return { shouldPickup: true, cardIds };
    }
  }

  if (topCard.isJoker && pileSize <= 8) {
    return { shouldPickup: true, cardIds };
  }

  if (hand.length <= 4 && pileSize > 5) {
    return { shouldPickup: false, cardIds: [] };
  }

  return { shouldPickup: false, cardIds: [] };
}

function selectBestDiscard(
  hand: PlayingCard[],
  state: GameState,
  playerId: string
): string {
  const rankGroups = countRanks(hand);
  const opponentSets = getOpponentSets(state, playerId);
  const opponentSetRanks = new Set(opponentSets.map(s => s.rank));

  const nextPlayerId = getNextPlayerId(state, playerId);
  const nextPlayer = nextPlayerId ? state.players.find(p => p.id === nextPlayerId) : null;
  const nextPlayerSetRanks = new Set((nextPlayer?.sets || []).map(s => s.rank));

  const emergency = isEmergencyMode(state, playerId);
  const desperate = isDesperate(state, playerId);

  interface DiscardCandidate {
    card: PlayingCard;
    score: number;
  }

  const candidates: DiscardCandidate[] = [];

  for (const card of hand) {
    if (isWildCard(card)) continue;

    let score = 0;
    const group = rankGroups.get(card.rank) || [];
    const points = getCardPoints(card);

    if (group.length === 1) {
      score += 100;
    } else if (group.length === 2) {
      score += 20;
    } else {
      score -= 50;
    }

    if (emergency || desperate) {
      score += points * 3;
    } else {
      score -= points * 0.5;
    }

    if (opponentSetRanks.has(card.rank)) {
      score -= 80;
    }

    if (nextPlayerSetRanks.has(card.rank)) {
      score -= 40;
    }

    if (nextPlayer && !nextPlayer.displayName.startsWith("Bot")) {
      const topOfPile = state.pickupPile.length > 0 ? state.pickupPile[state.pickupPile.length - 1] : null;
      if (!topOfPile || topOfPile.rank !== card.rank) {
        if (canPickupPile(nextPlayer.hand, card)) {
          score -= 60;
        }
      }
    }

    if (card.rank === "Q" && card.suit === "spades") {
      if (desperate) {
        score += 500;
      } else {
        score -= 200;
      }
    }

    candidates.push({ card, score });
  }

  if (candidates.length > 0) {
    candidates.sort((a, b) => b.score - a.score);
    return candidates[0].card.id;
  }

  const wildcards = hand.filter(c => isWildCard(c));
  if (wildcards.length > 0) {
    return wildcards[0].id;
  }

  return hand[0].id;
}

function findForcedPickupCardIds(hand: PlayingCard[], topCard: PlayingCard): string[] | null {
  if (isWildCard(topCard)) {
    const naturalCards = hand.filter(c => !isWildCard(c) && !c.isJoker);
    const rankGroups = new Map<string, PlayingCard[]>();
    for (const card of naturalCards) {
      const existing = rankGroups.get(card.rank) || [];
      existing.push(card);
      rankGroups.set(card.rank, existing);
    }
    for (const cards of rankGroups.values()) {
      if (cards.length >= 2) return cards.slice(0, 2).map(c => c.id);
    }
    return null;
  }
  const matchingCards = hand.filter(c => c.rank === topCard.rank);
  const wildcards = hand.filter(c => isWildCard(c));
  if (matchingCards.length >= 2) return matchingCards.slice(0, 2).map(c => c.id);
  if (matchingCards.length >= 1 && wildcards.length >= 1) return [matchingCards[0].id, wildcards[0].id];
  return null;
}

export function getAIDrawDecision(state: GameState, playerId: string): AIDecision {
  const player = state.players.find(p => p.id === playerId);
  if (!player) return { type: "draw_deck" };

  if (state.deck.length === 0) {
    const pile = state.pickupPile;
    if (pile.length > 0) {
      const topCard = pile[pile.length - 1];
      const forcedIds = findForcedPickupCardIds(player.hand, topCard);
      if (forcedIds) {
        return { type: "pickup_pile", cardIds: forcedIds };
      }
    }
    return { type: "draw_deck" };
  }

  let allTeamSets = player.sets;
  if (state.gameMode === "2v2") {
    allTeamSets = state.players
      .filter(p => p.odexTeam === player.odexTeam)
      .flatMap(p => p.sets);
  }
  const pickupCheck = shouldPickupPile(player.hand, state.pickupPile, allTeamSets, state, playerId);
  
  if (pickupCheck.shouldPickup && pickupCheck.cardIds.length >= 2) {
    return {
      type: "pickup_pile",
      cardIds: pickupCheck.cardIds,
    };
  }

  return { type: "draw_deck" };
}

export function getAIPlayDecisions(state: GameState, playerId: string): AIDecision[] {
  const player = state.players.find(p => p.id === playerId);
  if (!player) return [];

  const decisions: AIDecision[] = [];
  let simulatedHand = [...player.hand];
  const simulatedSets = [...player.sets];

  let teammateSets: CardSet[] = [];
  if (state.gameMode === "2v2") {
    teammateSets = state.players
      .filter(p => p.odexTeam === player.odexTeam && p.id !== playerId)
      .flatMap(p => p.sets);
  }

  const emergency = isEmergencyMode(state, playerId);
  const handSize = simulatedHand.length;

  const potentialSets = findPotentialSets(simulatedHand);

  const shouldHoldWild = (setCards: PlayingCard[]): boolean => {
    if (emergency) return false;
    if (handSize <= 5) return false;

    const usesWild = setCards.some(c => isWildCard(c));
    if (!usesWild) return false;

    const nonWild = setCards.find(c => !isWildCard(c) && !c.isJoker);
    const setRank = nonWild?.rank;
    if (!setRank) return false;

    const setPointsPerCard = getCardPoints(nonWild);

    if (setPointsPerCard <= 5) {
      const wildcards = simulatedHand.filter(c => isWildCard(c));
      if (wildcards.length <= 1) {
        const highPairs = Array.from(countRanks(simulatedHand).entries())
          .filter(([_rank, cards]) => cards.length === 2 && getCardPoints(cards[0]) >= 10);
        if (highPairs.length > 0) {
          return true;
        }
      }
    }

    return false;
  };

  for (const setCards of potentialSets) {
    if (setCards.every(c => simulatedHand.some(h => h.id === c.id))) {
      if (isValidSet(setCards) && simulatedHand.length - setCards.length >= 1) {
        const nonWildNonJoker = setCards.find(c => !isWildCard(c) && !c.isJoker);
        const hasJokers = setCards.some(c => c.isJoker);
        const setRank = nonWildNonJoker?.rank || (hasJokers ? "joker" : "2");
        const existingOwnSet = simulatedSets.find(s => s.rank === setRank);
        const existingTeamSet = existingOwnSet || teammateSets.find(s => s.rank === setRank);

        if (shouldHoldWild(setCards)) {
          continue;
        }

        if (existingTeamSet) {
          for (const card of setCards) {
            if (simulatedHand.length >= 2) {
              decisions.push({
                type: "add_to_set",
                cardId: card.id,
                setId: existingTeamSet.id,
              });
              simulatedHand = simulatedHand.filter(c => c.id !== card.id);
            }
          }
        } else {
          decisions.push({
            type: "lay_set",
            cardIds: setCards.map(c => c.id),
          });
          simulatedHand = simulatedHand.filter(c => !setCards.some(sc => sc.id === c.id));
          
          const newSet: CardSet = {
            id: `temp_${Date.now()}_${Math.random()}`,
            cards: setCards,
            rank: setRank,
            ownerId: playerId,
          };
          simulatedSets.push(newSet);
        }
      }
    }
  }

  let allSets = [...simulatedSets];
  if (state.gameMode === "2v2") {
    allSets = [...allSets, ...teammateSets];
  }

  const additions = findCardsToAddToSets(simulatedHand, allSets);
  
  const shouldAddToSet = (card: PlayingCard): boolean => {
    if (emergency) return true;

    if (isWildCard(card)) {
      const wildcards = simulatedHand.filter(c => isWildCard(c));
      if (wildcards.length <= 1) {
        const pairs = Array.from(countRanks(simulatedHand).entries())
          .filter(([_rank, cards]) => cards.length === 2);
        if (pairs.length > 0) {
          return false;
        }
      }
      return true;
    }

    const group = countRanks(simulatedHand).get(card.rank) || [];
    if (group.length === 1) {
      return true;
    }

    if (isHighValueCard(card) && group.length <= 2) {
      return true;
    }

    return group.length === 1;
  };

  for (const addition of additions) {
    if (simulatedHand.some(c => c.id === addition.cardId) && simulatedHand.length >= 2) {
      const card = simulatedHand.find(c => c.id === addition.cardId);
      if (!card) continue;

      const actualSet = state.players
        .flatMap(p => p.sets)
        .find(s => s.id === addition.setId);
      
      if (actualSet && shouldAddToSet(card)) {
        decisions.push({
          type: "add_to_set",
          cardId: addition.cardId,
          setId: addition.setId,
        });
        simulatedHand = simulatedHand.filter(c => c.id !== addition.cardId);
      }
    }
  }

  return decisions;
}

export function getAIDiscardDecision(state: GameState, playerId: string): AIDecision {
  const player = state.players.find(p => p.id === playerId);
  if (!player || player.hand.length === 0) {
    return { type: "discard", cardId: "" };
  }

  const cardId = selectBestDiscard(player.hand, state, playerId);
  return { type: "discard", cardId };
}

export function executeAITurn(state: GameState, playerId: string): AIDecision[] {
  const decisions: AIDecision[] = [];

  if (state.turnPhase === "draw") {
    decisions.push(getAIDrawDecision(state, playerId));
  }

  if (state.turnPhase === "play" || decisions.length > 0) {
    const playDecisions = getAIPlayDecisions(state, playerId);
    decisions.push(...playDecisions);
    
    decisions.push(getAIDiscardDecision(state, playerId));
  }

  return decisions;
}

const AI_NAMES = [
  "Bot Alex", "Bot Sam", "Bot Jordan", "Bot Taylor",
  "Bot Morgan", "Bot Casey", "Bot Riley", "Bot Quinn",
  "Bot Avery", "Bot Cameron", "Bot Dakota", "Bot Skyler"
];

let aiNameIndex = 0;

export function getNextAIName(): string {
  const name = AI_NAMES[aiNameIndex % AI_NAMES.length];
  aiNameIndex++;
  return name;
}

export function resetAINames(): void {
  aiNameIndex = 0;
}
