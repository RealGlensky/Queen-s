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
import { useFontSize } from "@/contexts/FontSizeContext";

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
  const { fs, scale } = useFontSize();
  const pressScale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }],
  }));

  const handlePressIn = () => {
    if (onPress) {
      pressScale.value = withSpring(0.95, { damping: 15, stiffness: 200 });
    }
  };

  const handlePressOut = () => {
    pressScale.value = withSpring(1, { damping: 15, stiffness: 200 });
  };

  const topCard = cards.length > 0 ? cards[cards.length - 1] : null;

  const scaledWidth = Math.round(CardDimensions.width * scale);
  const scaledHeight = Math.round(CardDimensions.height * scale);
  const scaledBorderRadius = Math.round(CardDimensions.borderRadius * scale);
  const scaledPadding = Math.round(Spacing.sm * scale);
  const scaledHighlightBorder = Math.round(2 * scale);

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={!onPress || cards.length === 0}
      style={[
        styles.container,
        { padding: scaledPadding },
        highlighted && {
          backgroundColor: "rgba(212, 175, 55, 0.2)",
          borderWidth: scaledHighlightBorder,
          borderColor: GameColors.gold,
          borderRadius: BorderRadius.sm,
        },
        style,
        animatedStyle,
      ]}
    >
      <View style={[styles.pileContainer, { width: scaledWidth, height: scaledHeight }]}>
        {cards.length > 2 ? (
          <View
            style={[
              styles.shadowCard,
              styles.shadowCard2,
              { width: scaledWidth, height: scaledHeight, borderRadius: scaledBorderRadius },
            ]}
          />
        ) : null}
        {cards.length > 1 ? (
          <View
            style={[
              styles.shadowCard,
              styles.shadowCard1,
              { width: scaledWidth, height: scaledHeight, borderRadius: scaledBorderRadius },
            ]}
          />
        ) : null}
        {topCard ? (
          <PlayingCard card={topCard} faceDown={faceDown} />
        ) : (
          <View
            style={[
              styles.emptyPile,
              {
                width: scaledWidth,
                height: scaledHeight,
                borderRadius: scaledBorderRadius,
              },
            ]}
          >
            <ThemedText style={[styles.emptyText, { fontSize: fs(12) }]}>Empty</ThemedText>
          </View>
        )}
      </View>
      <View style={styles.labelContainer}>
        <ThemedText style={[styles.label, { fontSize: fs(12) }]}>{label}</ThemedText>
        {showCount && cards.length > 0 ? (
          <ThemedText style={[styles.count, { fontSize: fs(12) }]}>{cards.length}</ThemedText>
        ) : null}
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    borderRadius: BorderRadius.sm,
  },
  pileContainer: {
    position: "relative",
  },
  shadowCard: {
    position: "absolute",
    backgroundColor: GameColors.cardBack,
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
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.2)",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    color: "rgba(255,255,255,0.3)",
  },
  labelContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.sm,
    gap: Spacing.xs,
  },
  label: {
    color: "#FFFFFF",
    fontWeight: "500",
  },
  count: {
    color: GameColors.gold,
    fontWeight: "600",
  },
});
