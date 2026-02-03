import React, { useState, useCallback, useEffect } from "react";
import { StyleSheet, View, ScrollView, Pressable, Dimensions } from "react-native";
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
import { GameColors, Spacing, BorderRadius, CardDimensions } from "@/constants/theme";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";
import { useGameSocket } from "@/hooks/useGameSocket";
import type { PlayingCard as PlayingCardType, CardSet as CardSetType, Player } from "@shared/gameTypes";
import { isValidSet, canPickupPile, getCardPoints } from "@shared/gameTypes";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type GameRouteProp = RouteProp<RootStackParamList, "Game">;

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function GameScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<GameRouteProp>();

  const {
    gameState,
    myPlayer,
    isMyTurn,
    drawFromDeck,
    pickupPile,
    laySet,
    addToSet,
    discard,
    declareLastCard,
  } = useGameSocket();

  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [targetSetId, setTargetSetId] = useState<string | null>(null);

  useEffect(() => {
    if (gameState?.status === "round_end" || gameState?.status === "game_over") {
      navigation.replace("Score", { roomCode: route.params.roomCode });
    }
  }, [gameState?.status]);

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
    if (selectedCards.length !== 1) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    addToSet(setId, selectedCards[0]);
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
  const topCard = gameState.pickupPile.length > 0 
    ? gameState.pickupPile[gameState.pickupPile.length - 1] 
    : null;
  const canPickup = topCard && isMyTurn && gameState.turnPhase === "draw" && 
    canPickupPile(myPlayer.hand, topCard);

  const allSets = gameState.players.reduce<CardSetType[]>((acc, player) => {
    return [...acc, ...player.sets];
  }, []);

  const myTeamSets = gameState.gameMode === "2v2" && myPlayer.odexTeam
    ? allSets.filter((s) => {
        const owner = gameState.players.find((p) => p.id === s.ownerId);
        return owner?.odexTeam === myPlayer.odexTeam;
      })
    : myPlayer.sets;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[GameColors.casinoGreen, GameColors.casinoGreenDark]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.feltTexture} />

      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable style={styles.headerButton}>
          <Feather name="menu" size={24} color="#FFFFFF" />
        </Pressable>
        <View style={styles.roundInfo}>
          <ThemedText style={styles.roundText}>Round {gameState.currentRound}</ThemedText>
          <ThemedText style={styles.thresholdText}>Goal: {gameState.pointThreshold}</ThemedText>
        </View>
        <Pressable style={styles.headerButton}>
          <Feather name="bar-chart-2" size={24} color="#FFFFFF" />
        </Pressable>
      </View>

      <View style={styles.opponentsArea}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.opponentsScroll}
        >
          {otherPlayers.map((player) => (
            <View key={player.id} style={styles.opponentContainer}>
              <PlayerAvatar
                displayName={player.displayName}
                isCurrentTurn={gameState.currentPlayerId === player.id}
                isDealer={gameState.dealerId === player.id}
                team={player.odexTeam}
                cardCount={player.hand.length}
                hasLastCard={player.hasLastCard}
                isConnected={player.isConnected}
                size="small"
              />
            </View>
          ))}
        </ScrollView>
      </View>

      <View style={styles.tableArea}>
        <View style={styles.setsArea}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.setsScroll}
          >
            {allSets.map((set) => {
              const isMyTeamSet = gameState.gameMode === "2v2" && myPlayer.odexTeam
                ? gameState.players.find((p) => p.id === set.ownerId)?.odexTeam === myPlayer.odexTeam
                : set.ownerId === myPlayer.id;
              return (
                <CardSet
                  key={set.id}
                  set={set}
                  isTeamSet={isMyTeamSet}
                  canAddCard={isMyTurn && selectedCards.length === 1 && isMyTeamSet}
                  onPress={isMyTurn && selectedCards.length === 1 && isMyTeamSet
                    ? () => handleAddToSet(set.id)
                    : undefined}
                />
              );
            })}
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
            highlighted={canPickup}
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
          {myPlayer.hand.length === 2 && !myPlayer.hasLastCard ? (
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
            cards={myPlayer.hand}
            selectedCardIds={selectedCards}
            onCardPress={handleCardPress}
          />
        </View>
      </View>
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  headerButton: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
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
  opponentsArea: {
    height: 80,
  },
  opponentsScroll: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.lg,
    alignItems: "center",
  },
  opponentContainer: {
    alignItems: "center",
  },
  tableArea: {
    flex: 1,
    justifyContent: "center",
    gap: Spacing.xl,
  },
  setsArea: {
    height: 120,
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
});
