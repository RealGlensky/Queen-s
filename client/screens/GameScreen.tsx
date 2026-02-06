import React, { useState, useCallback, useEffect, useRef } from "react";
import { StyleSheet, View, ScrollView, Pressable, Dimensions, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

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

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function GameScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<GameRouteProp>();

  const {
    connected,
    reconnecting,
    gameState,
    myPlayer,
    isMyTurn,
    drawFromDeck,
    pickupPile,
    laySet,
    addToSet,
    discard,
    declareLastCard,
    forceReconnect,
  } = useGameSocket();

  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [targetSetId, setTargetSetId] = useState<string | null>(null);
  const [highlightedCards, setHighlightedCards] = useState<string[]>([]);
  const [moveLog, setMoveLog] = useState<MoveLogEntry[]>([]);
  const [showMoveLog, setShowMoveLog] = useState(false);
  const [showScoreHistory, setShowScoreHistory] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const prevHandRef = useRef<string[]>([]);
  const prevRoundRef = useRef<number>(0);
  const moveIdRef = useRef(0);
  const moveLogScrollRef = useRef<ScrollView>(null);
  const seenActionIds = useRef<Set<string>>(new Set());

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
        case "lay_set":
          const setRank = action.cards?.[0]?.rank || "?";
          actionText = `laid set of ${setRank}s`;
          break;
        case "add_to_set":
          actionText = "added to a set";
          break;
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
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    laySet(selectedCards);
    setSelectedCards([]);
  };

  const handleAddToSet = async (setId: string) => {
    if (selectedCards.length === 0) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Add each selected card to the set one by one
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

  if (!gameState || !myPlayer) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[GameColors.casinoGreen, GameColors.casinoGreenDark]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.loadingContainer}>
          <ThemedText style={styles.loadingText}>Loading game...</ThemedText>
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
  const canPickup = topCard && isMyTurn && gameState.turnPhase === "draw" && 
    canPickupPile(myPlayer.hand, topCard);

  const allSets = gameState.players.reduce<CardSetType[]>((acc, player) => {
    return [...acc, ...player.sets];
  }, []);

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

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[GameColors.casinoGreen, GameColors.casinoGreenDark]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.feltTexture} />

      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <View style={styles.headerCenter}>
          <View style={styles.scoresRow}>
            <View style={styles.myScoreContainer}>
              <View style={[styles.myColorDot, { backgroundColor: gameState.gameMode === "2v2" ? teamColors[myPlayer.odexTeam || 1] : myPlayerColor }]} />
              <View>
                <ThemedText style={styles.myScoreLabel}>
                  {gameState.gameMode === "2v2" ? "Your Team" : "You"}
                </ThemedText>
                <ThemedText style={styles.myScoreValue}>
                  {gameState.gameMode === "2v2" ? myTeamScore : myPlayer.totalScore} pts
                </ThemedText>
              </View>
            </View>
            <View style={styles.roundInfo}>
              <ThemedText style={styles.roundText}>Round {gameState.currentRound}</ThemedText>
              <ThemedText style={styles.thresholdText}>Goal: {gameState.pointThreshold}</ThemedText>
            </View>
            {gameState.gameMode === "2v2" ? (
              <View style={styles.opponentScoreContainer}>
                <View style={[styles.myColorDot, { backgroundColor: teamColors[myPlayer.odexTeam === 1 ? 2 : 1] }]} />
                <View>
                  <ThemedText style={styles.myScoreLabel}>Opponents</ThemedText>
                  <ThemedText style={styles.myScoreValue}>{opponentTeamScore} pts</ThemedText>
                </View>
              </View>
            ) : null}
          </View>
        </View>
        <View style={styles.headerButtons}>
          {reconnecting ? (
            <View style={styles.connectionIndicator}>
              <ActivityIndicator size="small" color={GameColors.gold} />
            </View>
          ) : !connected ? (
            <Pressable style={styles.connectionIndicator} onPress={forceReconnect}>
              <Feather name="wifi-off" size={18} color="#FF6B6B" />
            </Pressable>
          ) : null}
        </View>
      </View>

      <View style={styles.playersArea}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.playersScroll}
        >
          {gameState.players.map((player, index) => {
            const isMe = player.id === myPlayer.id;
            return (
              <View key={player.id} style={styles.playerContainer}>
                <PlayerAvatar
                  displayName={isMe ? "You" : player.displayName}
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
          })}
        </ScrollView>
      </View>

      <View style={styles.tableArea}>
        <View style={styles.setsArea}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.setsScroll}
          >
            {gameState.gameMode === "2v2" ? (
              <>
                {/* Team 1 Pile */}
                {team1Sets.length > 0 ? (
                  <View style={[styles.teamPile, { borderColor: teamColors[1] }]}>
                    <ThemedText style={[styles.teamPileLabel, { color: teamColors[1] }]}>
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
                {/* Team 2 Pile */}
                {team2Sets.length > 0 ? (
                  <View style={[styles.teamPile, { borderColor: teamColors[2] }]}>
                    <ThemedText style={[styles.teamPileLabel, { color: teamColors[2] }]}>
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
              allSets.map((set) => {
                const { ownerName, ownerIndex, isMine } = getOwnerInfo(set.ownerId);
                return (
                  <CardSet
                    key={set.id}
                    set={set}
                    ownerName={ownerName}
                    ownerIndex={ownerIndex}
                    isMine={isMine}
                    isTeamSet={isMine}
                    canAddCard={isMyTurn && selectedCards.length >= 1 && isMine}
                    onPress={isMyTurn && selectedCards.length >= 1 && isMine
                      ? () => handleAddToSet(set.id)
                      : undefined}
                  />
                );
              })
            )}
          </ScrollView>
        </View>

        <View style={styles.pilesArea}>
          <CardPile
            cards={gameState.deck}
            label="Deck"
            faceDown
            showCount
            highlighted={isMyTurn && gameState.turnPhase === "draw"}
            onPress={isMyTurn && gameState.turnPhase === "draw" ? handleDrawFromDeck : undefined}
          />
          <CardPile
            cards={gameState.pickupPile}
            label="Pickup"
            faceDown={false}
            showCount
            highlighted={!!canPickup}
            onPress={canPickup ? handlePickupPile : undefined}
          />
        </View>
      </View>

      <View style={styles.playerArea}>
        {isMyTurn ? (
          <Animated.View
            entering={FadeIn.duration(300)}
            style={styles.turnIndicator}
          >
            <ThemedText style={styles.turnText}>Your Turn</ThemedText>
            <ThemedText style={styles.phaseText}>
              {gameState.turnPhase === "draw" ? "Draw a card" :
               gameState.turnPhase === "play" ? "Lay sets or add cards" :
               "Discard a card"}
            </ThemedText>
          </Animated.View>
        ) : null}

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

        <View style={[styles.handContainer, { paddingBottom: insets.bottom + Spacing.sm }]}>
          <CardHand
            cards={sortedHand}
            selectedCardIds={selectedCards}
            highlightedCardIds={highlightedCards}
            onCardPress={handleCardPress}
          />
        </View>
      </View>

      {/* Right Side Panel - Score Breakdown, Move History, Tips */}
      <View style={[styles.rightSidePanel, { top: insets.top + 60 }]}>
        <Pressable 
          style={[styles.sidePanelButton, showScoreHistory && styles.sidePanelButtonActive]}
          onPress={() => setShowScoreHistory(true)}
        >
          <Feather name="bar-chart-2" size={20} color="#FFFFFF" />
          <ThemedText style={styles.sidePanelLabel}>Scores</ThemedText>
        </Pressable>

        <Pressable 
          style={[styles.sidePanelButton, showMoveLog && styles.sidePanelButtonActive]}
          onPress={() => setShowMoveLog(!showMoveLog)}
        >
          <Feather name="list" size={20} color="#FFFFFF" />
          <ThemedText style={styles.sidePanelLabel}>Moves</ThemedText>
        </Pressable>

        <Pressable 
          style={[styles.sidePanelButton, showHelp && styles.sidePanelButtonActive]}
          onPress={() => setShowHelp(true)}
        >
          <Feather name="zap" size={20} color={GameColors.gold} />
          <ThemedText style={styles.sidePanelLabel}>Tips</ThemedText>
        </Pressable>
      </View>

      {/* Move Log Panel */}
      {showMoveLog ? (
        <View style={[styles.moveLogPanel, { top: insets.top + 60 + 48 }]}>
          <View style={styles.moveLogHeader}>
            <ThemedText style={styles.moveLogTitle}>Move History</ThemedText>
            <Pressable onPress={() => setShowMoveLog(false)}>
              <Feather name="x" size={18} color="rgba(255,255,255,0.7)" />
            </Pressable>
          </View>
          <ScrollView 
            ref={moveLogScrollRef}
            style={styles.moveLogScroll}
            onContentSizeChange={() => moveLogScrollRef.current?.scrollToEnd({ animated: true })}
          >
            {moveLog.length === 0 ? (
              <ThemedText style={styles.moveLogEmpty}>No moves yet</ThemedText>
            ) : (
              moveLog.map((entry) => (
                <View key={entry.id} style={styles.moveLogEntry}>
                  <ThemedText style={styles.moveLogPlayer}>{entry.playerName}</ThemedText>
                  <ThemedText style={styles.moveLogAction}>{entry.action}</ThemedText>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      ) : null}

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
    paddingHorizontal: Spacing.lg,
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
    marginRight: Spacing.md,
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
    flexWrap: "wrap",
  },
});
