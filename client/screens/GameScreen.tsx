import React, { useState, useCallback, useEffect, useRef } from "react";
import { StyleSheet, View, ScrollView, Pressable, ActivityIndicator, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
  FadeIn,
  FadeOut,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { PlayingCard } from "@/components/PlayingCard";
import { CardHand } from "@/components/CardHand";
import { CardSet } from "@/components/CardSet";
import { CardPile } from "@/components/CardPile";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { GameButton } from "@/components/GameButton";
import { ScoreHistoryModal } from "@/components/ScoreHistoryModal";
import { HelpModal } from "@/components/HelpModal";
import { GameColors, Spacing, BorderRadius, CardDimensions, PLAYER_COLORS } from "@/constants/theme";
import { useFontSize } from "@/contexts/FontSizeContext";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";
import { useGameSocket } from "@/hooks/useGameSocket";
import type { PlayingCard as PlayingCardType, CardSet as CardSetType, Player, GameAction } from "@shared/gameTypes";
import { isValidSet, canPickupPile, getCardPoints } from "@shared/gameTypes";

interface MoveLogEntry {
  id: number;
  playerName: string;
  action: string;
  timestamp: number;
}

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type GameRouteProp = RouteProp<RootStackParamList, "Game">;

export default function GameScreen() {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<GameRouteProp>();

  const {
    connected,
    reconnecting,
    gameState,
    myPlayer,
    isMyTurn,
    error: socketError,
    drawFromDeck,
    pickupPile,
    laySet,
    addToSet,
    discard,
    declareLastCard,
    leaveRoom,
    forceReconnect,
    clearError,
  } = useGameSocket();

  const { fs, scale } = useFontSize();
  const scaledTeamPileStyle = {
    padding: Math.round(Spacing.sm * scale),
    borderWidth: Math.round(2 * scale),
    borderRadius: Math.round(BorderRadius.lg * scale),
  };

  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [targetSetId, setTargetSetId] = useState<string | null>(null);
  const [highlightedCards, setHighlightedCards] = useState<string[]>([]);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [loadingTimedOut, setLoadingTimedOut] = useState(false);
  const [moveLog, setMoveLog] = useState<MoveLogEntry[]>([]);
  const [showMoveLog, setShowMoveLog] = useState(false);
  const [showScoreHistory, setShowScoreHistory] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const prevHandRef = useRef<string[]>([]);
  const prevRoundRef = useRef<number>(0);
  const moveIdRef = useRef(0);
  const moveLogScrollRef = useRef<ScrollView>(null);
  const seenActionIds = useRef<Set<string>>(new Set());
  const actionMessageTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (actionMessage) {
      if (actionMessageTimer.current) clearTimeout(actionMessageTimer.current);
      actionMessageTimer.current = setTimeout(() => setActionMessage(null), 3000);
    }
    return () => {
      if (actionMessageTimer.current) clearTimeout(actionMessageTimer.current);
    };
  }, [actionMessage]);

  useEffect(() => {
    if (gameState && myPlayer) {
      setLoadingTimedOut(false);
      return;
    }
    const timer = setTimeout(() => setLoadingTimedOut(true), 10000);
    return () => clearTimeout(timer);
  }, [gameState, myPlayer]);

  useEffect(() => {
    if (gameState?.status === "round_end" || gameState?.status === "game_over") {
      navigation.replace("Score", { roomCode: route.params.roomCode });
    }
  }, [gameState?.status]);

  // Reset tracking when a new round starts
  useEffect(() => {
    if (!gameState || !myPlayer) return;
    
    if (gameState.currentRound !== prevRoundRef.current) {
      // New round started - reset hand tracking to avoid highlighting all dealt cards
      prevHandRef.current = myPlayer.hand.map(c => c.id);
      prevRoundRef.current = gameState.currentRound;
      setHighlightedCards([]);
      setMoveLog([]);
    }
  }, [gameState?.currentRound, myPlayer?.hand]);

  // Track newly acquired cards (only during active gameplay, not at round start)
  useEffect(() => {
    if (!myPlayer || !gameState) return;
    
    // Skip if this is the initial hand for a new round (already handled above)
    if (prevHandRef.current.length === 0) {
      prevHandRef.current = myPlayer.hand.map(c => c.id);
      return;
    }
    
    const currentHandIds = myPlayer.hand.map(c => c.id);
    const prevHandIds = prevHandRef.current;
    
    // Find new cards (in current hand but not in previous)
    const newCards = currentHandIds.filter(id => !prevHandIds.includes(id));
    
    // Always update prev ref
    prevHandRef.current = currentHandIds;
    
    // Highlight all new cards (no upper limit - pile pickups can be large)
    if (newCards.length > 0) {
      setHighlightedCards(newCards);
      // Clear highlight after 3 seconds
      const timeout = setTimeout(() => {
        setHighlightedCards([]);
      }, 3000);
      return () => clearTimeout(timeout);
    }
  }, [myPlayer?.hand, gameState?.currentRound]);

  // Track game actions for move log - process all actions from recentActions queue
  useEffect(() => {
    if (!gameState?.recentActions || gameState.recentActions.length === 0) return;
    
    const newEntries: MoveLogEntry[] = [];
    
    for (const action of gameState.recentActions) {
      // Skip if we've already processed this action
      if (seenActionIds.current.has(action.id)) continue;
      seenActionIds.current.add(action.id);
      
      const player = gameState.players.find(p => p.id === action.playerId);
      const playerName = player?.displayName || "Unknown";
      
      let actionText = "";
      switch (action.type) {
        case "draw_deck":
          actionText = "drew from deck";
          break;
        case "pickup_pile":
          actionText = `picked up pile (${action.cards?.length || 0} cards)`;
          break;
        case "lay_set": {
          const cards = action.cards || [];
          const totalCount = cards.length;
          const naturalCards = cards.filter(c => !c.isJoker && c.rank !== "2");
          const wildCards = cards.filter(c => !c.isJoker && c.rank === "2");
          const jokerCards = cards.filter(c => c.isJoker);
          const setRank = naturalCards.length > 0 ? naturalCards[0].rank : (jokerCards.length > 0 ? "Joker" : "?");
          const isJokerSet = jokerCards.length > 0 && naturalCards.length === 0;

          let setDesc = isJokerSet
            ? `laid set of (${totalCount}) Jokers`
            : `laid set of (${totalCount}) ${setRank}s`;

          const parts: string[] = [];
          if (isJokerSet) {
            if (jokerCards.length > 0) parts.push(`${jokerCards.length} Joker${jokerCards.length > 1 ? "s" : ""}`);
          } else {
            if (naturalCards.length > 0) parts.push(`${naturalCards.length} ${setRank}${naturalCards.length > 1 ? "s" : ""}`);
          }
          if (wildCards.length > 0) parts.push(`${wildCards.length} wild 2`);

          if (parts.length > 1) {
            setDesc += ` using ${parts.join(" and ")}`;
          }
          actionText = setDesc;
          break;
        }
        case "add_to_set": {
          const addedCard = action.cards?.[0];
          let targetSetRank = "?";
          if (action.setId && gameState) {
            for (const p of gameState.players) {
              const foundSet = p.sets.find(s => s.id === action.setId);
              if (foundSet) {
                targetSetRank = foundSet.rank;
                break;
              }
            }
          }
          if (addedCard) {
            const cardLabel = addedCard.isJoker ? "Joker" : (addedCard.rank === "2" ? "wild 2" : addedCard.rank);
            const isJokerSet = targetSetRank === "joker";
            const setLabel = isJokerSet ? "Jokers" : `${targetSetRank}s`;
            actionText = `added (1) ${cardLabel} to set of ${setLabel}`;
          } else {
            actionText = "added to a set";
          }
          break;
        }
        case "discard":
          const discardCard = action.cards?.[0];
          if (discardCard) {
            const rankDisplay = discardCard.isJoker ? "Joker" : `${discardCard.rank}${discardCard.suit ? " of " + discardCard.suit : ""}`;
            actionText = `discarded ${rankDisplay}`;
          } else {
            actionText = "discarded a card";
          }
          break;
        case "declare_last_card":
          actionText = "declared LAST CARD!";
          break;
        case "deck_exhausted":
          actionText = "cannot pick up pile - deck empty, round over!";
          break;
        default:
          actionText = action.type;
      }
      
      newEntries.push({
        id: moveIdRef.current++,
        playerName,
        action: actionText,
        timestamp: action.timestamp,
      });
    }
    
    if (newEntries.length > 0) {
      setMoveLog(prev => [...prev, ...newEntries].slice(-50)); // Keep last 50 moves
    }
    
    // Keep only last 100 action IDs to prevent memory leak
    if (seenActionIds.current.size > 100) {
      const idsArray = Array.from(seenActionIds.current);
      seenActionIds.current = new Set(idsArray.slice(-50));
    }
  }, [gameState?.recentActions]);

  const handleCardPress = useCallback((card: PlayingCardType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedCards((prev) => {
      if (prev.includes(card.id)) {
        return prev.filter((id) => id !== card.id);
      }
      return [...prev, card.id];
    });
  }, []);

  const handleDrawFromDeck = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    drawFromDeck();
    setSelectedCards([]);
  };

  const handlePickupPile = async () => {
    if (!gameState?.pickupPile.length) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    pickupPile(selectedCards);
    setSelectedCards([]);
  };

  const handleLaySet = async () => {
    if (selectedCards.length < 3) return;
    const cards = myPlayer?.hand.filter((c) => selectedCards.includes(c.id)) || [];
    if (!isValidSet(cards)) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    const handSize = myPlayer?.hand.length || 0;
    if (handSize - cards.length < 1) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setActionMessage("You must keep at least 1 card to discard");
      return;
    }
    const nonWild = cards.filter(c => c.rank !== "2" && !c.isJoker);
    const setRank = nonWild[0]?.rank;
    if (setRank && gameState && myPlayer) {
      const teamAlreadyHasSet = gameState.players.some(p => {
        if (gameState.gameMode === "2v2") {
          return p.odexTeam === myPlayer!.odexTeam && p.sets.some(s => s.rank === setRank);
        }
        return p.id === myPlayer!.id && p.sets.some(s => s.rank === setRank);
      });
      if (teamAlreadyHasSet) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setActionMessage("Your team already has this set - tap the set to add cards");
        return;
      }
    }
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    laySet(selectedCards);
    setSelectedCards([]);
  };

  const handleAddToSet = async (setId: string) => {
    if (selectedCards.length === 0) return;
    const handSize = myPlayer?.hand.length || 0;
    if (handSize - selectedCards.length < 1) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setActionMessage("You must keep at least 1 card to discard");
      return;
    }
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    for (const cardId of selectedCards) {
      addToSet(setId, cardId);
    }
    setSelectedCards([]);
  };

  const handleDiscard = () => {
    if (selectedCards.length !== 1) return;
    console.log("Discarding card:", selectedCards[0]);
    discard(selectedCards[0]);
    setSelectedCards([]);
  };

  const handleDeclareLastCard = async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    declareLastCard();
  };

  const handleGoBack = () => {
    clearError();
    navigation.reset({ index: 0, routes: [{ name: "Home" }] });
  };

  const handleExitGame = () => {
    leaveRoom();
    navigation.reset({ index: 0, routes: [{ name: "Home" }] });
  };

  if (!gameState || !myPlayer) {
    const showError = socketError || loadingTimedOut;
    const errorMessage = socketError || "Could not connect to the game. The room may no longer exist.";

    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[GameColors.casinoGreen, GameColors.casinoGreenDark]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.loadingContainer}>
          {showError ? (
            <>
              <Feather name="alert-circle" size={48} color="rgba(255,255,255,0.7)" style={{ marginBottom: Spacing.md }} />
              <ThemedText style={[styles.loadingText, { fontSize: fs(16) }]}>{errorMessage}</ThemedText>
              <View style={{ flexDirection: "row", gap: Spacing.md, marginTop: Spacing.lg }}>
                <Pressable
                  style={styles.loadingRetryButton}
                  onPress={forceReconnect}
                >
                  <ThemedText style={[styles.loadingRetryText, { fontSize: fs(15) }]}>Retry</ThemedText>
                </Pressable>
                <Pressable
                  style={[styles.loadingRetryButton, { backgroundColor: "rgba(255,255,255,0.15)" }]}
                  onPress={handleGoBack}
                >
                  <ThemedText style={[styles.loadingRetryText, { fontSize: fs(15) }]}>Go Back</ThemedText>
                </Pressable>
              </View>
            </>
          ) : (
            <>
              <ActivityIndicator size="large" color="rgba(255,255,255,0.7)" style={{ marginBottom: Spacing.md }} />
              <ThemedText style={[styles.loadingText, { fontSize: fs(16) }]}>Loading game...</ThemedText>
            </>
          )}
        </View>
      </View>
    );
  }

  const otherPlayers = gameState.players.filter((p) => p.id !== myPlayer.id);
  const myPlayerIndex = gameState.players.findIndex((p) => p.id === myPlayer.id);
  const myPlayerColor = PLAYER_COLORS[myPlayerIndex % PLAYER_COLORS.length];
  const topCard = gameState.pickupPile.length > 0 
    ? gameState.pickupPile[gameState.pickupPile.length - 1] 
    : null;
  const teamHasTopCardRank = topCard && !topCard.isJoker && gameState.players.some(p => {
    if (gameState.gameMode === "2v2") {
      return p.odexTeam === myPlayer.odexTeam && p.sets.some(s => s.rank === topCard.rank);
    }
    return p.id === myPlayer.id && p.sets.some(s => s.rank === topCard.rank);
  });
  const canPickup = topCard && isMyTurn && gameState.turnPhase === "draw" && 
    !teamHasTopCardRank && canPickupPile(myPlayer.hand, topCard);

  const setRankOrder: Record<string, number> = {
    "A": 1, "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7,
    "8": 8, "9": 9, "10": 10, "J": 11, "Q": 12, "K": 13, "joker": 14,
  };

  const allSets = gameState.players.reduce<CardSetType[]>((acc, player) => {
    return [...acc, ...player.sets];
  }, []).sort((a, b) => (setRankOrder[a.rank] || 0) - (setRankOrder[b.rank] || 0));

  const playerGroupedSets = gameState.gameMode !== "2v2"
    ? gameState.players
        .map((p, idx) => ({
          playerId: p.id,
          displayName: p.displayName,
          playerIndex: idx,
          isMine: p.id === myPlayer.id,
          sets: [...p.sets].sort((a, b) => (setRankOrder[a.rank] || 0) - (setRankOrder[b.rank] || 0)),
        }))
        .filter(g => g.sets.length > 0)
        .sort((a, b) => {
          if (a.isMine && !b.isMine) return -1;
          if (!a.isMine && b.isMine) return 1;
          return 0;
        })
    : [];

  // Team colors for 2v2 mode
  const teamColors: Record<number, string> = {
    1: "#4CAF50",
    2: "#2196F3",
  };

  // Calculate team scores for 2v2 mode
  const team1Score = gameState.gameMode === "2v2"
    ? gameState.players.filter(p => p.odexTeam === 1).reduce((sum, p) => sum + p.totalScore, 0)
    : 0;
  const team2Score = gameState.gameMode === "2v2"
    ? gameState.players.filter(p => p.odexTeam === 2).reduce((sum, p) => sum + p.totalScore, 0)
    : 0;
  const myTeamScore = myPlayer.odexTeam === 1 ? team1Score : team2Score;
  const opponentTeamScore = myPlayer.odexTeam === 1 ? team2Score : team1Score;

  // In 2v2 mode, group sets by team; otherwise show all sets
  const getTeamForSet = (set: CardSetType) => {
    const owner = gameState.players.find((p) => p.id === set.ownerId);
    return owner?.odexTeam;
  };

  const team1Sets = gameState.gameMode === "2v2" 
    ? allSets.filter(s => getTeamForSet(s) === 1)
    : [];
  const team2Sets = gameState.gameMode === "2v2"
    ? allSets.filter(s => getTeamForSet(s) === 2)
    : [];

  const myTeamSets = gameState.gameMode === "2v2" && myPlayer.odexTeam
    ? allSets.filter((s) => {
        const owner = gameState.players.find((p) => p.id === s.ownerId);
        return owner?.odexTeam === myPlayer.odexTeam;
      })
    : myPlayer.sets;

  const getOwnerInfo = (ownerId: string) => {
    const ownerIndex = gameState.players.findIndex((p) => p.id === ownerId);
    const owner = gameState.players[ownerIndex];
    return {
      ownerName: owner?.displayName || "Unknown",
      ownerIndex: ownerIndex >= 0 ? ownerIndex : 0,
      isMine: ownerId === myPlayer.id,
      team: owner?.odexTeam,
    };
  };

  const rankOrder: Record<string, number> = {
    "A": 1, "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7,
    "8": 8, "9": 9, "10": 10, "J": 11, "Q": 12, "K": 13, "joker": 14,
  };

  const sortedHand = [...myPlayer.hand].sort((a, b) => {
    const rankA = rankOrder[a.rank] || 0;
    const rankB = rankOrder[b.rank] || 0;
    if (rankA !== rankB) return rankA - rankB;
    const suitOrder: Record<string, number> = { spades: 1, hearts: 2, diamonds: 3, clubs: 4 };
    return (suitOrder[a.suit || ""] || 5) - (suitOrder[b.suit || ""] || 5);
  });

  const setsScrollContent = (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.setsScroll, { gap: Math.round(Spacing.md * scale) }]}
    >
      {gameState.gameMode === "2v2" ? (
        <>
          {team1Sets.length > 0 ? (
            <View style={[styles.teamPile, scaledTeamPileStyle, { borderColor: teamColors[1] }]}>
              <ThemedText style={[styles.teamPileLabel, { color: teamColors[1], fontSize: fs(12) }]}>
                Team 1
              </ThemedText>
              <View style={styles.teamPileSets}>
                {team1Sets.map((set) => {
                  const isMyTeamSet = myPlayer.odexTeam === 1;
                  return (
                    <CardSet
                      key={set.id}
                      set={set}
                      ownerIndex={0}
                      isMine={isMyTeamSet}
                      isTeamSet={isMyTeamSet}
                      hideOwnerName
                      canAddCard={isMyTurn && selectedCards.length >= 1 && isMyTeamSet}
                      onPress={isMyTurn && selectedCards.length >= 1 && isMyTeamSet
                        ? () => handleAddToSet(set.id)
                        : undefined}
                    />
                  );
                })}
              </View>
            </View>
          ) : null}
          {team2Sets.length > 0 ? (
            <View style={[styles.teamPile, scaledTeamPileStyle, { borderColor: teamColors[2] }]}>
              <ThemedText style={[styles.teamPileLabel, { color: teamColors[2], fontSize: fs(12) }]}>
                Team 2
              </ThemedText>
              <View style={styles.teamPileSets}>
                {team2Sets.map((set) => {
                  const isMyTeamSet = myPlayer.odexTeam === 2;
                  return (
                    <CardSet
                      key={set.id}
                      set={set}
                      ownerIndex={1}
                      isMine={isMyTeamSet}
                      isTeamSet={isMyTeamSet}
                      hideOwnerName
                      canAddCard={isMyTurn && selectedCards.length >= 1 && isMyTeamSet}
                      onPress={isMyTurn && selectedCards.length >= 1 && isMyTeamSet
                        ? () => handleAddToSet(set.id)
                        : undefined}
                    />
                  );
                })}
              </View>
            </View>
          ) : null}
        </>
      ) : (
        playerGroupedSets.map((group) => {
          const playerColor = PLAYER_COLORS[group.playerIndex % PLAYER_COLORS.length];
          return (
            <View key={group.playerId} style={[styles.teamPile, scaledTeamPileStyle, { borderColor: playerColor }]}>
              <ThemedText style={[styles.teamPileLabel, { color: playerColor, fontSize: fs(12) }]}>
                {group.isMine ? "You" : group.displayName}
              </ThemedText>
              <View style={styles.teamPileSets}>
                {group.sets.map((set) => (
                  <CardSet
                    key={set.id}
                    set={set}
                    ownerIndex={group.playerIndex}
                    isMine={group.isMine}
                    isTeamSet={group.isMine}
                    hideOwnerName
                    canAddCard={isMyTurn && selectedCards.length >= 1 && group.isMine}
                    onPress={isMyTurn && selectedCards.length >= 1 && group.isMine
                      ? () => handleAddToSet(set.id)
                      : undefined}
                  />
                ))}
              </View>
            </View>
          );
        })
      )}
    </ScrollView>
  );

  const pilesContent = (
    <>
      <CardPile
        cards={gameState.deck}
        label="Deck"
        faceDown
        showCount
        compact={isLandscape}
        highlighted={isMyTurn && gameState.turnPhase === "draw"}
        onPress={isMyTurn && gameState.turnPhase === "draw" ? handleDrawFromDeck : undefined}
      />
      <CardPile
        cards={gameState.pickupPile}
        label="Pickup"
        faceDown={false}
        showCount
        compact={isLandscape}
        highlighted={!!canPickup}
        onPress={canPickup ? handlePickupPile : undefined}
      />
    </>
  );

  const scoresRow = (
    <View style={styles.scoresRow}>
      <View style={styles.myScoreContainer}>
        <View style={[styles.myColorDot, { backgroundColor: gameState.gameMode === "2v2" ? teamColors[myPlayer.odexTeam || 1] : myPlayerColor }]} />
        <View>
          <ThemedText style={[styles.myScoreLabel, { fontSize: fs(10) }]}>
            {gameState.gameMode === "2v2" ? "Your Team" : "You"}
          </ThemedText>
          <ThemedText style={[styles.myScoreValue, { fontSize: fs(14) }]}>
            {gameState.gameMode === "2v2" ? myTeamScore : myPlayer.totalScore} pts
          </ThemedText>
        </View>
      </View>
      <View style={styles.roundInfo}>
        <ThemedText style={[styles.roundText, { fontSize: fs(16) }]}>Round {gameState.currentRound}</ThemedText>
        <ThemedText style={[styles.thresholdText, { fontSize: fs(12) }]}>Goal: {gameState.pointThreshold}</ThemedText>
      </View>
      {gameState.gameMode === "2v2" ? (
        <View style={styles.opponentScoreContainer}>
          <View style={[styles.myColorDot, { backgroundColor: teamColors[myPlayer.odexTeam === 1 ? 2 : 1] }]} />
          <View>
            <ThemedText style={[styles.myScoreLabel, { fontSize: fs(10) }]}>Opponents</ThemedText>
            <ThemedText style={[styles.myScoreValue, { fontSize: fs(14) }]}>{opponentTeamScore} pts</ThemedText>
          </View>
        </View>
      ) : null}
    </View>
  );

  const compactScores = (
    <View style={styles.compactScoresColumn}>
      <ThemedText style={[styles.roundText, { fontSize: fs(13), textAlign: "center" }]}>
        Round {gameState.currentRound}
      </ThemedText>
      <ThemedText style={[styles.thresholdText, { fontSize: fs(10), textAlign: "center" }]}>
        Goal: {gameState.pointThreshold}
      </ThemedText>
      <View style={styles.compactScoreRow}>
        <View style={[styles.myColorDot, { backgroundColor: gameState.gameMode === "2v2" ? teamColors[myPlayer.odexTeam || 1] : myPlayerColor }]} />
        <ThemedText style={[styles.myScoreValue, { fontSize: fs(11) }]}>
          {gameState.gameMode === "2v2" ? myTeamScore : myPlayer.totalScore} pts
        </ThemedText>
      </View>
      {gameState.gameMode === "2v2" ? (
        <View style={styles.compactScoreRow}>
          <View style={[styles.myColorDot, { backgroundColor: teamColors[myPlayer.odexTeam === 1 ? 2 : 1] }]} />
          <ThemedText style={[styles.myScoreValue, { fontSize: fs(11) }]}>{opponentTeamScore} pts</ThemedText>
        </View>
      ) : null}
    </View>
  );

  const playersListContent = gameState.players.map((player, index) => {
    const isMe = player.id === myPlayer.id;
    const label = isMe ? "You" : player.displayName.length > 9 ? player.displayName.slice(0, 8) + "…" : player.displayName;
    return (
      <View key={player.id} style={[styles.playerContainer, { width: Math.round(72 * scale) }]}>
        <PlayerAvatar
          displayName={label}
          isCurrentTurn={gameState.currentPlayerId === player.id}
          isDealer={gameState.dealerId === player.id}
          team={player.odexTeam}
          cardCount={player.hand.length}
          score={gameState.gameMode === "2v2" ? undefined : player.totalScore}
          playerColor={PLAYER_COLORS[index % PLAYER_COLORS.length]}
          hasLastCard={player.hasLastCard}
          isConnected={player.isConnected}
          size="small"
          isMe={isMe}
        />
      </View>
    );
  });

  const actionButtonsContent = (
    <View style={styles.actionButtons}>
      {isMyTurn && gameState.turnPhase === "play" && selectedCards.length >= 3 ? (
        <GameButton
          label="Lay Set"
          icon="layers"
          variant="primary"
          size="small"
          onPress={handleLaySet}
        />
      ) : null}
      {isMyTurn && (gameState.turnPhase === "play" || gameState.turnPhase === "discard") && selectedCards.length === 1 ? (
        <GameButton
          label="Discard"
          icon="corner-down-left"
          variant="secondary"
          size="small"
          onPress={handleDiscard}
        />
      ) : null}
      {myPlayer.hand.length === 1 ? (
        <GameButton
          label="Last Card!"
          icon="alert-circle"
          variant="danger"
          size="small"
          onPress={handleDeclareLastCard}
        />
      ) : null}
    </View>
  );

  const handContent = (
    <CardHand
      cards={sortedHand}
      selectedCardIds={selectedCards}
      highlightedCardIds={highlightedCards}
      onCardPress={handleCardPress}
    />
  );

  const connectionIndicatorContent = reconnecting ? (
    <View style={styles.connectionIndicator}>
      <ActivityIndicator size="small" color={GameColors.gold} />
    </View>
  ) : !connected ? (
    <Pressable style={styles.connectionIndicator} onPress={forceReconnect}>
      <Feather name="wifi-off" size={18} color="#FF6B6B" />
    </Pressable>
  ) : null;

  const sidePanelRight = insets.right + Spacing.sm;

  const sidePanelContent = (
    <View style={[styles.rightSidePanel, { top: isLandscape ? insets.top + 8 : insets.top + 60, right: sidePanelRight }]}>
      <Pressable
        style={[styles.sidePanelButton, { width: Math.round(44 * scale), height: Math.round(44 * scale) }, showScoreHistory && styles.sidePanelButtonActive]}
        onPress={() => setShowScoreHistory(true)}
      >
        <Feather name="bar-chart-2" size={20} color="#FFFFFF" />
        <ThemedText style={[styles.sidePanelLabel, { fontSize: fs(8) }]}>Scores</ThemedText>
      </Pressable>
      <Pressable
        style={[styles.sidePanelButton, { width: Math.round(44 * scale), height: Math.round(44 * scale) }, showMoveLog && styles.sidePanelButtonActive]}
        onPress={() => setShowMoveLog(!showMoveLog)}
      >
        <Feather name="list" size={20} color="#FFFFFF" />
        <ThemedText style={[styles.sidePanelLabel, { fontSize: fs(8) }]}>Moves</ThemedText>
      </Pressable>
      <Pressable
        style={[styles.sidePanelButton, { width: Math.round(44 * scale), height: Math.round(44 * scale) }, showHelp && styles.sidePanelButtonActive]}
        onPress={() => setShowHelp(true)}
      >
        <Feather name="help-circle" size={20} color={GameColors.gold} />
        <ThemedText style={[styles.sidePanelLabel, { fontSize: fs(8) }]}>Help</ThemedText>
      </Pressable>
    </View>
  );

  const moveLogContent = showMoveLog ? (
    <View style={[
      styles.moveLogPanel,
      {
        top: isLandscape ? insets.top + 8 + Math.round(48 * scale) : insets.top + 60 + Math.round(48 * scale),
        width: Math.round(200 * scale),
        maxHeight: Math.round(250 * scale),
        right: sidePanelRight + Math.round(44 * scale) + Spacing.sm,
      },
    ]}>
      <View style={styles.moveLogHeader}>
        <ThemedText style={[styles.moveLogTitle, { fontSize: fs(14) }]}>Move History</ThemedText>
        <Pressable onPress={() => setShowMoveLog(false)}>
          <Feather name="x" size={18} color="rgba(255,255,255,0.7)" />
        </Pressable>
      </View>
      <ScrollView
        ref={moveLogScrollRef}
        style={[styles.moveLogScroll, { maxHeight: Math.round(180 * scale) }]}
        onContentSizeChange={() => moveLogScrollRef.current?.scrollToEnd({ animated: true })}
      >
        {moveLog.length === 0 ? (
          <ThemedText style={[styles.moveLogEmpty, { fontSize: fs(12) }]}>No moves yet</ThemedText>
        ) : (
          moveLog.map((entry) => (
            <View key={entry.id} style={styles.moveLogEntry}>
              <ThemedText style={[styles.moveLogPlayer, { fontSize: fs(11) }]}>{entry.playerName}</ThemedText>
              <ThemedText style={[styles.moveLogAction, { fontSize: fs(11) }]}>{entry.action}</ThemedText>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  ) : null;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[GameColors.casinoGreen, GameColors.casinoGreenDark]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.feltTexture} />

      {actionMessage ? (
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(200)}
          style={[styles.actionMessageContainer, { top: insets.top + 60 }]}
          pointerEvents="none"
        >
          <View style={styles.actionMessageBubble}>
            <Feather name="alert-circle" size={16} color="#fff" />
            <ThemedText style={[styles.actionMessageText, { fontSize: fs(14) }]}>{actionMessage}</ThemedText>
          </View>
        </Animated.View>
      ) : null}

      <Animated.View
        key={isLandscape ? "landscape" : "portrait"}
        entering={FadeIn.duration(220)}
        exiting={FadeOut.duration(130)}
        style={{ flex: 1 }}
      >
      {isLandscape ? (
        /* ── LANDSCAPE: two-column layout ── */
        <View style={[styles.landscapeRoot, { paddingLeft: insets.left, paddingRight: insets.right }]}>
          {/* Left column: scores + players + piles */}
          <View style={[styles.landscapeLeft, { paddingTop: insets.top + 52, paddingBottom: insets.bottom }]}>
            {/* Compact score header */}
            <View style={styles.landscapeScores}>
              {compactScores}
              {connectionIndicatorContent ? (
                <View style={{ alignItems: "center", marginTop: 2 }}>{connectionIndicatorContent}</View>
              ) : null}
            </View>

            {/* Players - vertical scroll */}
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={[styles.landscapePlayersScroll, { gap: Math.round(Spacing.sm * scale) }]}
              style={{ flex: 1 }}
            >
              {playersListContent}
            </ScrollView>

            {/* Piles stacked vertically */}
            <View style={[styles.landscapePiles, { gap: Math.round(Spacing.lg * scale), paddingBottom: Math.round(Spacing.sm * scale) }]}>
              {pilesContent}
            </View>
          </View>

          {/* Right column: sets + turn info + actions + hand */}
          <View style={[styles.landscapeRight, { paddingTop: insets.top + Spacing.xs, paddingBottom: insets.bottom, paddingRight: Math.round(44 * scale) + sidePanelRight }]}>
            {/* Sets area */}
            <View style={[styles.landscapeSets, { minHeight: Math.round(120 * scale) }]}>
              {setsScrollContent}
            </View>

            {/* Player area: turn indicator + actions + hand */}
            <View style={[styles.playerArea, { flex: 1 }]}>
              {isMyTurn ? (
                <Animated.View entering={FadeIn.duration(300)} style={styles.turnIndicator}>
                  <ThemedText style={[styles.turnText, { fontSize: fs(14) }]}>Your Turn</ThemedText>
                  <ThemedText style={[styles.phaseText, { fontSize: fs(11) }]}>
                    {gameState.turnPhase === "draw" ? "Draw a card" :
                     gameState.turnPhase === "play" ? "Lay sets or add cards" :
                     "Discard a card"}
                  </ThemedText>
                </Animated.View>
              ) : null}
              {actionButtonsContent}
              <View style={[styles.handContainer, { paddingBottom: Spacing.xs, flex: 1, justifyContent: "flex-end" }]}>
                {handContent}
              </View>
            </View>
          </View>
        </View>
      ) : (
        /* ── PORTRAIT: original vertical layout ── */
        <>
          <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
            <View style={styles.headerCenter}>
              {scoresRow}
            </View>
            <View style={styles.headerButtons}>
              {connectionIndicatorContent}
            </View>
          </View>

          <View style={[styles.playersArea, { minHeight: Math.round(100 * scale), marginTop: Math.round(Spacing.md * scale), paddingBottom: Math.round(Spacing.sm * scale) }]}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[styles.playersScroll, { gap: Math.round(Spacing.lg * scale) }]}
            >
              {playersListContent}
            </ScrollView>
          </View>

          <View style={[styles.tableArea, { gap: Math.round(Spacing.xl * scale), paddingVertical: Math.round(Spacing.sm * scale) }]}>
            <View style={[styles.setsArea, { minHeight: Math.round(120 * scale), maxHeight: Math.round(280 * scale) }]}>
              {setsScrollContent}
            </View>
            <View style={[styles.pilesArea, { gap: Math.round(Spacing["3xl"] * scale) }]}>
              {pilesContent}
            </View>
          </View>

          <View style={[styles.playerArea, { minHeight: Math.round(160 * scale) }]}>
            {isMyTurn ? (
              <Animated.View entering={FadeIn.duration(300)} style={styles.turnIndicator}>
                <ThemedText style={[styles.turnText, { fontSize: fs(16) }]}>Your Turn</ThemedText>
                <ThemedText style={[styles.phaseText, { fontSize: fs(12) }]}>
                  {gameState.turnPhase === "draw" ? "Draw a card" :
                   gameState.turnPhase === "play" ? "Lay sets or add cards" :
                   "Discard a card"}
                </ThemedText>
              </Animated.View>
            ) : null}
            {actionButtonsContent}
            <View style={[styles.handContainer, { paddingBottom: insets.bottom + Spacing.sm, minHeight: Math.round((CardDimensions.height + Spacing.xl) * scale) }]}>
              {handContent}
            </View>
          </View>
        </>
      )}
      </Animated.View>

      {/* Back Button - Top Left */}
      <Pressable
        style={[styles.backButton, { top: insets.top + 8, left: insets.left + Spacing.sm }]}
        onPress={handleExitGame}
        testID="button-exit-game"
      >
        <Feather name="arrow-left" size={22} color="#FFFFFF" />
      </Pressable>

      {sidePanelContent}
      {moveLogContent}

      <ScoreHistoryModal
        visible={showScoreHistory}
        onClose={() => setShowScoreHistory(false)}
        gameState={gameState}
        myPlayerId={myPlayer.id}
      />

      <HelpModal visible={showHelp} onClose={() => setShowHelp(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: GameColors.casinoGreen,
  },
  feltTexture: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.2)",
    pointerEvents: "none",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 16,
    textAlign: "center",
    paddingHorizontal: Spacing.lg,
  },
  loadingRetryButton: {
    backgroundColor: "rgba(255,255,255,0.25)",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  loadingRetryText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  header: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  headerCenter: {
    alignItems: "center",
  },
  scoresRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.lg,
  },
  headerButtons: {
    position: "absolute",
    right: Spacing.xs,
    bottom: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  connectionIndicator: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerButton: {
    width: 34,
    height: 34,
    justifyContent: "center",
    alignItems: "center",
  },

  myScoreContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  opponentScoreContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  myColorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  myScoreLabel: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 10,
  },
  myScoreValue: {
    color: GameColors.gold,
    fontSize: 14,
    fontWeight: "700",
  },
  roundInfo: {
    alignItems: "center",
  },
  roundText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  thresholdText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
  },
  playersArea: {
    minHeight: 100,
    marginTop: Spacing.md,
    paddingBottom: Spacing.xs,
  },
  playersScroll: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.lg,
    alignItems: "flex-start",
  },
  playerContainer: {
    alignItems: "center",
  },
  tableArea: {
    flex: 1,
    justifyContent: "center",
    gap: Spacing.xl,
  },
  setsArea: {
    minHeight: 160,
    maxHeight: 180,
  },
  setsScroll: {
    paddingLeft: Spacing.lg,
    paddingRight: Spacing.lg + 52,
    gap: Spacing.md,
    alignItems: "center",
  },
  pilesArea: {
    flexDirection: "row",
    justifyContent: "center",
    gap: Spacing["3xl"],
  },
  playerArea: {
    backgroundColor: "rgba(0,0,0,0.3)",
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
  },
  turnIndicator: {
    alignItems: "center",
    paddingTop: Spacing.md,
    gap: 2,
  },
  turnText: {
    color: GameColors.gold,
    fontSize: 16,
    fontWeight: "700",
  },
  phaseText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "center",
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  handContainer: {
    minHeight: CardDimensions.height + Spacing.xl,
  },
  backButton: {
    position: "absolute",
    left: Spacing.sm,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  rightSidePanel: {
    position: "absolute",
    right: Spacing.sm,
    flexDirection: "column",
    gap: Spacing.xs,
    zIndex: 10,
  },
  sidePanelButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    gap: 1,
  },
  sidePanelButtonActive: {
    backgroundColor: "rgba(0,0,0,0.75)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  sidePanelLabel: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 8,
    fontWeight: "600",
  },
  moveLogPanel: {
    position: "absolute",
    right: Spacing.sm + 44 + Spacing.sm,
    width: 200,
    maxHeight: 250,
    backgroundColor: "rgba(0,0,0,0.85)",
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm,
    zIndex: 9,
  },
  moveLogHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.xs,
    paddingBottom: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.2)",
  },
  moveLogTitle: {
    color: GameColors.gold,
    fontSize: 14,
    fontWeight: "700",
  },
  moveLogScroll: {
    maxHeight: 180,
  },
  moveLogEmpty: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 12,
    textAlign: "center",
    paddingVertical: Spacing.md,
  },
  moveLogEntry: {
    flexDirection: "row",
    gap: Spacing.xs,
    paddingVertical: 3,
    flexWrap: "wrap",
  },
  moveLogPlayer: {
    color: GameColors.gold,
    fontSize: 11,
    fontWeight: "600",
  },
  moveLogAction: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 11,
    flex: 1,
  },
  teamPile: {
    borderWidth: 2,
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm,
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  teamPileLabel: {
    fontSize: 12,
    fontWeight: "700",
    marginBottom: Spacing.xs,
    textAlign: "center",
  },
  teamPileSets: {
    flexDirection: "row",
    gap: Spacing.sm,
    flexWrap: "nowrap",
  },
  landscapeRoot: {
    flex: 1,
    flexDirection: "row",
  },
  landscapeLeft: {
    width: 160,
    flexDirection: "column",
    borderRightWidth: 1,
    borderRightColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(0,0,0,0.15)",
    paddingHorizontal: Spacing.xs,
  },
  landscapeScores: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
    marginBottom: Spacing.xs,
  },
  landscapePlayersScroll: {
    alignItems: "center",
    paddingVertical: Spacing.xs,
  },
  landscapePiles: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.sm,
  },
  landscapeRight: {
    flex: 1,
    flexDirection: "column",
  },
  landscapeSets: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  compactScoresColumn: {
    alignItems: "center",
    gap: 2,
  },
  compactScoreRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  actionMessageContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 1000,
    alignItems: "center",
  },
  actionMessageBubble: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    backgroundColor: "rgba(200, 50, 50, 0.9)",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
  },
  actionMessageText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
});
