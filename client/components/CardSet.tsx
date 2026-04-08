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
import { useFontSize } from "@/contexts/FontSizeContext";

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
  const scaleAnim = useSharedValue(1);
  const { fs, scale } = useFontSize();

  const scaledSmallWidth = Math.round(CardDimensions.smallWidth * scale);
  const scaledSmallHeight = Math.round(CardDimensions.smallHeight * scale);
  const cardOverlap = Math.round(35 * scale);
  const scaledPadding = Math.round(Spacing.sm * scale);
  const scaledBorderWidth = Math.round(2 * scale);
  const scaledBorderRadius = Math.round(BorderRadius.sm * scale);
  const scaledLabelMarginTop = Math.round(Spacing.xs * scale);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleAnim.value }],
  }));

  const handlePressIn = () => {
    if (onPress) {
      scaleAnim.value = withSpring(0.95, { damping: 15, stiffness: 200 });
    }
  };

  const handlePressOut = () => {
    scaleAnim.value = withSpring(1, { damping: 15, stiffness: 200 });
  };

  const hasQueenOfSpades = set.cards.some(
    (c) => c.rank === "Q" && c.suit === "spades"
  );

  const sortedCards = [...set.cards].sort((a, b) => {
    if (a.rank === "Q" && a.suit === "spades") return 1;
    if (b.rank === "Q" && b.suit === "spades") return -1;
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
          borderWidth: scaledBorderWidth,
          borderRadius: scaledBorderRadius,
          padding: scaledPadding,
          backgroundColor: isMine
            ? "rgba(212, 175, 55, 0.15)"
            : `${ownerColor}22`,
        },
        style,
        animatedStyle,
      ]}
    >
      <View style={[styles.cardsContainer, { paddingRight: scaledSmallWidth - cardOverlap }]}>
        {sortedCards.slice(0, 4).map((card, index) => (
          <View
            key={card.id}
            style={[
              styles.cardWrapper,
              { marginLeft: index === 0 ? 0 : -cardOverlap, zIndex: index },
            ]}
          >
            <PlayingCard card={card} size="small" />
          </View>
        ))}
        {sortedCards.length > 4 ? (
          <View style={[
            styles.moreCards,
            {
              width: scaledSmallWidth,
              height: scaledSmallHeight,
              marginLeft: -cardOverlap,
              zIndex: 5,
            },
          ]}>
            <ThemedText style={[styles.moreCardsText, { fontSize: fs(14) }]}>
              +{sortedCards.length - 4}
            </ThemedText>
          </View>
        ) : null}
      </View>
      <View style={[styles.labelContainer, { marginTop: scaledLabelMarginTop }]}>
        {!hideOwnerName ? (
          <ThemedText style={[styles.ownerLabel, { color: ownerColor, fontSize: fs(10) }]}>
            {ownerName || "Unknown"}
          </ThemedText>
        ) : null}
        <ThemedText style={[styles.setLabel, { fontSize: fs(12) }]}>
          {set.rank}s
        </ThemedText>
        {hasQueenOfSpades ? (
          <ThemedText style={[styles.specialLabel, { fontSize: fs(10) }]}>
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
  },
  cardWrapper: {
    alignItems: "center",
  },
  labelContainer: {
    marginTop: Spacing.xs,
    alignItems: "center",
  },
  ownerLabel: {
    fontWeight: "700",
    textTransform: "uppercase",
  },
  setLabel: {
    fontWeight: "600",
    color: "#FFFFFF",
  },
  specialLabel: {
    color: GameColors.gold,
    fontWeight: "500",
  },
  moreCards: {
    borderRadius: CardDimensions.borderRadius,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  moreCardsText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
});
