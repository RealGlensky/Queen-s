import React from "react";
import { StyleSheet, View, Pressable } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  WithSpringConfig,
} from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { GameColors, CardDimensions } from "@/constants/theme";
import type { PlayingCard as PlayingCardType, Suit } from "@shared/gameTypes";

interface PlayingCardProps {
  card: PlayingCardType;
  size?: "small" | "normal";
  faceDown?: boolean;
  selected?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  style?: any;
}

const springConfig: WithSpringConfig = {
  damping: 15,
  mass: 0.3,
  stiffness: 200,
  overshootClamping: true,
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const suitSymbols: Record<Suit, string> = {
  hearts: "♥",
  diamonds: "♦",
  clubs: "♣",
  spades: "♠",
};

export function PlayingCard({
  card,
  size = "normal",
  faceDown = false,
  selected = false,
  disabled = false,
  onPress,
  style,
}: PlayingCardProps) {
  const scale = useSharedValue(1);
  const translateY = useSharedValue(0);

  const isRed = card.suit === "hearts" || card.suit === "diamonds" || card.jokerColor === "red";
  const suitColor = isRed ? GameColors.redSuit : GameColors.blackSuit;

  const cardWidth = size === "small" ? CardDimensions.smallWidth : CardDimensions.width;
  const cardHeight = size === "small" ? CardDimensions.smallHeight : CardDimensions.height;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { translateY: translateY.value },
    ],
  }));

  React.useEffect(() => {
    translateY.value = withSpring(selected ? -10 : 0, springConfig);
  }, [selected]);

  const handlePressIn = () => {
    if (!disabled && onPress) {
      scale.value = withSpring(0.95, springConfig);
    }
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, springConfig);
  };

  if (faceDown) {
    return (
      <Animated.View
        style={[
          styles.card,
          {
            width: cardWidth,
            height: cardHeight,
            backgroundColor: GameColors.cardBack,
          },
          style,
          animatedStyle,
        ]}
      >
        <View style={styles.cardBackPattern}>
          <View style={[styles.cardBackInner, { borderColor: GameColors.gold }]} />
        </View>
      </Animated.View>
    );
  }

  const rankDisplay = card.rank === "10" ? "10" : card.rank;
  const suitSymbol = card.suit ? suitSymbols[card.suit] : "";

  return (
    <AnimatedPressable
      onPress={disabled ? undefined : onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || !onPress}
      style={[
        styles.card,
        {
          width: cardWidth,
          height: cardHeight,
          backgroundColor: GameColors.cardFace,
          borderColor: selected ? GameColors.gold : "transparent",
          borderWidth: selected ? 2 : 0,
        },
        style,
        animatedStyle,
      ]}
    >
      {card.isJoker ? (
        <View style={styles.jokerContent}>
          <Feather
            name="star"
            size={size === "small" ? 20 : 28}
            color={card.jokerColor === "red" ? GameColors.redSuit : GameColors.blackSuit}
          />
        </View>
      ) : (
        <>
          <View style={styles.topLeft}>
            <ThemedText
              style={[
                styles.rank,
                { color: suitColor, fontSize: size === "small" ? 12 : 16 },
              ]}
            >
              {rankDisplay}
            </ThemedText>
            <ThemedText
              style={[
                styles.suit,
                { color: suitColor, fontSize: size === "small" ? 10 : 14 },
              ]}
            >
              {suitSymbol}
            </ThemedText>
          </View>
          <View style={styles.center}>
            <ThemedText
              style={[
                styles.centerSuit,
                { color: suitColor, fontSize: size === "small" ? 24 : 32 },
              ]}
            >
              {suitSymbol}
            </ThemedText>
          </View>
          <View style={styles.bottomRight}>
            <ThemedText
              style={[
                styles.suit,
                { color: suitColor, fontSize: size === "small" ? 10 : 14, transform: [{ rotate: "180deg" }] },
              ]}
            >
              {suitSymbol}
            </ThemedText>
            <ThemedText
              style={[
                styles.rank,
                { color: suitColor, fontSize: size === "small" ? 12 : 16, transform: [{ rotate: "180deg" }] },
              ]}
            >
              {rankDisplay}
            </ThemedText>
          </View>
        </>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: CardDimensions.borderRadius,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    overflow: "hidden",
  },
  cardBackPattern: {
    flex: 1,
    padding: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  cardBackInner: {
    flex: 1,
    width: "100%",
    borderWidth: 2,
    borderRadius: 4,
    backgroundColor: "rgba(0,0,0,0.1)",
  },
  topLeft: {
    position: "absolute",
    top: 4,
    left: 4,
    alignItems: "center",
  },
  bottomRight: {
    position: "absolute",
    bottom: 4,
    right: 4,
    alignItems: "center",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  rank: {
    fontWeight: "700",
    lineHeight: 18,
  },
  suit: {
    lineHeight: 16,
  },
  centerSuit: {
    fontWeight: "400",
  },
  jokerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
