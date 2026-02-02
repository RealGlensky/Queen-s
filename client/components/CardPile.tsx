import React from "react";
import { StyleSheet, View, Pressable } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { PlayingCard } from "@/components/PlayingCard";
import { ThemedText } from "@/components/ThemedText";
import type { PlayingCard as PlayingCardType } from "@shared/gameTypes";
import { GameColors, CardDimensions, Spacing, BorderRadius } from "@/constants/theme";

interface CardPileProps {
  cards: PlayingCardType[];
  label: string;
  faceDown?: boolean;
  showCount?: boolean;
  highlighted?: boolean;
  onPress?: () => void;
  style?: any;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function CardPile({
  cards,
  label,
  faceDown = false,
  showCount = true,
  highlighted = false,
  onPress,
  style,
}: CardPileProps) {
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

  const topCard = cards.length > 0 ? cards[cards.length - 1] : null;

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={!onPress || cards.length === 0}
      style={[
        styles.container,
        highlighted && styles.highlighted,
        style,
        animatedStyle,
      ]}
    >
      <View style={styles.pileContainer}>
        {cards.length > 2 ? (
          <View style={[styles.shadowCard, styles.shadowCard2]} />
        ) : null}
        {cards.length > 1 ? (
          <View style={[styles.shadowCard, styles.shadowCard1]} />
        ) : null}
        {topCard ? (
          <PlayingCard card={topCard} faceDown={faceDown} />
        ) : (
          <View style={styles.emptyPile}>
            <ThemedText style={styles.emptyText}>Empty</ThemedText>
          </View>
        )}
      </View>
      <View style={styles.labelContainer}>
        <ThemedText style={styles.label}>{label}</ThemedText>
        {showCount && cards.length > 0 ? (
          <ThemedText style={styles.count}>{cards.length}</ThemedText>
        ) : null}
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  highlighted: {
    backgroundColor: "rgba(212, 175, 55, 0.2)",
    borderWidth: 2,
    borderColor: GameColors.gold,
  },
  pileContainer: {
    width: CardDimensions.width,
    height: CardDimensions.height,
    position: "relative",
  },
  shadowCard: {
    position: "absolute",
    width: CardDimensions.width,
    height: CardDimensions.height,
    backgroundColor: GameColors.cardBack,
    borderRadius: CardDimensions.borderRadius,
  },
  shadowCard1: {
    top: -2,
    left: -2,
    opacity: 0.7,
  },
  shadowCard2: {
    top: -4,
    left: -4,
    opacity: 0.4,
  },
  emptyPile: {
    width: CardDimensions.width,
    height: CardDimensions.height,
    borderRadius: CardDimensions.borderRadius,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.2)",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    color: "rgba(255,255,255,0.3)",
    fontSize: 12,
  },
  labelContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.sm,
    gap: Spacing.xs,
  },
  label: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "500",
  },
  count: {
    color: GameColors.gold,
    fontSize: 12,
    fontWeight: "600",
  },
});
