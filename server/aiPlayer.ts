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
    // Count all non-wild cards by rank (including jokers as their own rank)
    if (!isWildCard(card)) {
      const existing = ranks.get(card.rank) || [];
      existing.push(card);
      ranks.set(card.rank, existing);
    }
  }
  return ranks;
}

function findPotentialSets(hand: PlayingCard[]): PlayingCard[][] {
  const rankGroups = countRanks(hand);
  // Only 2s are wild cards, jokers are NOT wild
  const wildcards = hand.filter(c => isWildCard(c));
  const potentialSets: PlayingCard[][] = [];

  for (const [rank, cards] of rankGroups) {
    if (cards.length >= 3) {
      potentialSets.push(cards.slice(0, Math.min(cards.length, 4)));
    } else if (cards.length === 2 && wildcards.length >= 1) {
      potentialSets.push([...cards, wildcards[0]]);
    }
  }

  potentialSets.sort((a, b) => {
    const scoreA = a.reduce((sum, c) => sum + getCardPoints(c), 0);
    const scoreB = b.reduce((sum, c) => sum + getCardPoints(c), 0);
    return scoreB - scoreA;
  });

  return potentialSets;
}

function findCardsToAddToSets(hand: PlayingCard[], sets: CardSet[]): { cardId: string; setId: string }[] {
  const additions: { cardId: string; setId: string }[] = [];

  for (const card of hand) {
    for (const set of sets) {
      // 2s are wild (can add to any set), other cards must match the set's rank
      if (isWildCard(card) || card.rank === set.rank) {
        additions.push({ cardId: card.id, setId: set.id });
      }
    }
  }

  additions.sort((a, b) => {
    const cardA = hand.find(c => c.id === a.cardId)!;
    const cardB = hand.find(c => c.id === b.cardId)!;
    return getCardPoints(cardB) - getCardPoints(cardA);
  });

  return additions;
}

function selectBestDiscard(hand: PlayingCard[]): string {
  const rankGroups = countRanks(hand);
  const singleCards: PlayingCard[] = [];
  const pairedCards: PlayingCard[] = [];

  for (const card of hand) {
    // Only skip wild cards (2s), jokers are regular cards
    if (isWildCard(card)) continue;
    
    const group = rankGroups.get(card.rank) || [];
    if (group.length === 1) {
      singleCards.push(card);
    } else {
      pairedCards.push(card);
    }
  }

  const sortByPoints = (cards: PlayingCard[]) => 
    [...cards].sort((a, b) => getCardPoints(a) - getCardPoints(b));

  if (singleCards.length > 0) {
    const sorted = sortByPoints(singleCards);
    return sorted[0].id;
  }

  if (pairedCards.length > 0) {
    const sorted = sortByPoints(pairedCards);
    return sorted[0].id;
  }

  // Only 2s are wild cards
  const wildcards = hand.filter(c => isWildCard(c));
  if (wildcards.length > 0) {
    return wildcards[0].id;
  }

  return hand[0].id;
}

function shouldPickupPile(
  hand: PlayingCard[],
  pickupPile: PlayingCard[],
  playerSets: CardSet[]
): { shouldPickup: boolean; cardIds: string[] } {
  if (pickupPile.length === 0) return { shouldPickup: false, cardIds: [] };

  const topCard = pickupPile[pickupPile.length - 1];
  
  const hasSetWithRank = playerSets.some(s => s.rank === topCard.rank);
  if (hasSetWithRank && !topCard.isJoker) {
    return { shouldPickup: false, cardIds: [] };
  }

  // When picking up a wild card (2), need 2 natural cards of the same rank
  // Cannot use another 2 to help pick up a 2
  if (isWildCard(topCard)) {
    const naturalCards = hand.filter(c => !isWildCard(c) && !c.isJoker);
    // Group by rank and find a pair
    const rankGroups = new Map<string, PlayingCard[]>();
    for (const card of naturalCards) {
      const existing = rankGroups.get(card.rank) || [];
      existing.push(card);
      rankGroups.set(card.rank, existing);
    }
    for (const cards of rankGroups.values()) {
      if (cards.length >= 2) {
        return {
          shouldPickup: true,
          cardIds: cards.slice(0, 2).map(c => c.id)
        };
      }
    }
    return { shouldPickup: false, cardIds: [] };
  }

  // Normal pickup: need 2 matching cards, or 1 matching + 1 wild
  const matchingCards = hand.filter(c => c.rank === topCard.rank);
  const wildcards = hand.filter(c => isWildCard(c));

  if (matchingCards.length >= 2) {
    return { 
      shouldPickup: true, 
      cardIds: matchingCards.slice(0, 2).map(c => c.id) 
    };
  }

  if (matchingCards.length >= 1 && wildcards.length >= 1) {
    return { 
      shouldPickup: true, 
      cardIds: [matchingCards[0].id, wildcards[0].id] 
    };
  }

  return { shouldPickup: false, cardIds: [] };
}

export function getAIDrawDecision(state: GameState, playerId: string): AIDecision {
  const player = state.players.find(p => p.id === playerId);
  if (!player) return { type: "draw_deck" };

  const pickupCheck = shouldPickupPile(player.hand, state.pickupPile, player.sets);
  
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

  const potentialSets = findPotentialSets(simulatedHand);
  for (const setCards of potentialSets) {
    if (setCards.every(c => simulatedHand.some(h => h.id === c.id))) {
      if (isValidSet(setCards)) {
        decisions.push({
          type: "lay_set",
          cardIds: setCards.map(c => c.id),
        });
        simulatedHand = simulatedHand.filter(c => !setCards.some(sc => sc.id === c.id));
        
        const newSet: CardSet = {
          id: `temp_${Date.now()}`,
          cards: setCards,
          rank: setCards.find(c => !isWildCard(c))?.rank || "2",
          ownerId: playerId,
        };
        simulatedSets.push(newSet);
      }
    }
  }

  let allSets = [...simulatedSets];
  if (state.gameMode === "2v2") {
    const teamSets = state.players
      .filter(p => p.odexTeam === player.odexTeam && p.id !== playerId)
      .flatMap(p => p.sets);
    allSets = [...allSets, ...teamSets];
  }

  const additions = findCardsToAddToSets(simulatedHand, allSets);
  for (const addition of additions) {
    if (simulatedHand.some(c => c.id === addition.cardId)) {
      const actualSet = state.players
        .flatMap(p => p.sets)
        .find(s => s.id === addition.setId);
      
      if (actualSet) {
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

  const cardId = selectBestDiscard(player.hand);
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
