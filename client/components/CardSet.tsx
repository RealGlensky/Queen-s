import React from "react";
import { StyleSheet, View, Pressable } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { PlayingCard } from "@/components/PlayingCard";
import { ThemedText } from "@/components/ThemedText";
import type { CardSet as CardSetType } from "@shared/gameTypes";
import { GameColors, CardDimensions, Spacing, BorderRadius, PLAYER_COLORS } from "@/constants/theme";

interface CardSetProps {
  set: CardSetType;
  ownerName?: string;
  ownerIndex?: number;
  isTeamSet?: boolean;
  isMine?: boolean;
  hideOwnerName?: boolean;
  canAddCard?: boolean;
  onPress?: () => void;
  style?: any;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function CardSet({
  set,
  ownerName,
  ownerIndex = 0,
  isTeamSet = false,
  isMine = false,
  hideOwnerName = false,
  canAddCard = false,
  onPress,
  style,
}: CardSetProps) {
  const ownerColor = PLAYER_COLORS[ownerIndex % PLAYER_COLORS.length];
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (onPress) {
      scale.value = withSpring(0.95, { damping: 15, stiffness: 200 });
    }
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 200 });
  };

  const hasQueenOfSpades = set.cards.some(
    (c) => c.rank === "Q" && c.suit === "spades"
  );

  // Sort cards for display: 2s first (underneath), then normal cards, Queen of Spades last (on top)
  const sortedCards = [...set.cards].sort((a, b) => {
    // Queen of Spades goes to very end (on top visually - highest zIndex)
    if (a.rank === "Q" && a.suit === "spades") return 1;
    if (b.rank === "Q" && b.suit === "spades") return -1;
    // Wild cards (2s) go to beginning (underneath visually - lowest zIndex)
    if (a.rank === "2" && b.rank !== "2") return -1;
    if (a.rank !== "2" && b.rank === "2") return 1;
    return 0;
  });

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={!onPress}
      style={[
        styles.container,
        {
          borderColor: canAddCard ? GameColors.gold : ownerColor,
          borderWidth: 2,
          backgroundColor: isMine
            ? "rgba(212, 175, 55, 0.15)"
            : `${ownerColor}22`,
        },
        style,
        animatedStyle,
      ]}
    >
      <View style={styles.cardsContainer}>
        {sortedCards.slice(0, 4).map((card, index) => (
          <View
            key={card.id}
            style={[
              styles.cardWrapper,
              { marginLeft: index === 0 ? 0 : -35, zIndex: index },
            ]}
          >
            <PlayingCard card={card} size="small" />
          </View>
        ))}
        {sortedCards.length > 4 ? (
          <View style={[styles.moreCards, { zIndex: 5 }]}>
            <ThemedText style={styles.moreCardsText}>
              +{sortedCards.length - 4}
            </ThemedText>
          </View>
        ) : null}
      </View>
      <View style={styles.labelContainer}>
        {!hideOwnerName ? (
          <ThemedText style={[styles.ownerLabel, { color: ownerColor }]}>
            {ownerName || "Unknown"}
          </ThemedText>
        ) : null}
        <ThemedText style={styles.setLabel}>
          {set.rank}s
        </ThemedText>
        {hasQueenOfSpades ? (
          <ThemedText style={styles.specialLabel}>
            Queen of Spades
          </ThemedText>
        ) : null}
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.sm,
    borderWidth: 2,
    padding: Spacing.sm,
    alignItems: "center",
  },
  cardsContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingRight: CardDimensions.smallWidth - 35,
  },
  cardWrapper: {
    alignItems: "center",
  },
  labelContainer: {
    marginTop: Spacing.xs,
    alignItems: "center",
  },
  ownerLabel: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  setLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  specialLabel: {
    fontSize: 10,
    color: GameColors.gold,
    fontWeight: "500",
  },
  moreCards: {
    width: CardDimensions.smallWidth,
    height: CardDimensions.smallHeight,
    borderRadius: CardDimensions.borderRadius,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: -35,
  },
  moreCardsText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
});
