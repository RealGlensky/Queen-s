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
import { GameColors, CardDimensions, Spacing, BorderRadius } from "@/constants/theme";

interface CardSetProps {
  set: CardSetType;
  isTeamSet?: boolean;
  canAddCard?: boolean;
  onPress?: () => void;
  style?: any;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function CardSet({
  set,
  isTeamSet = false,
  canAddCard = false,
  onPress,
  style,
}: CardSetProps) {
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

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={!onPress}
      style={[
        styles.container,
        {
          borderColor: canAddCard ? GameColors.gold : "transparent",
          backgroundColor: isTeamSet
            ? "rgba(212, 175, 55, 0.1)"
            : "rgba(0, 0, 0, 0.2)",
        },
        style,
        animatedStyle,
      ]}
    >
      <View style={styles.cardsContainer}>
        {set.cards.slice(0, 4).map((card, index) => (
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
        {set.cards.length > 4 ? (
          <View style={[styles.moreCards, { zIndex: 5 }]}>
            <ThemedText style={styles.moreCardsText}>
              +{set.cards.length - 4}
            </ThemedText>
          </View>
        ) : null}
      </View>
      <View style={styles.labelContainer}>
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
