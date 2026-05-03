import React from "react";
import { StyleSheet, View, Pressable } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
  WithSpringConfig,
} from "react-native-reanimated";
import { ThemedText } from "@/components/ThemedText";
import { GameColors, CardDimensions } from "@/constants/theme";
import { useFontSize } from "@/contexts/FontSizeContext";
import type { PlayingCard as PlayingCardType, Suit } from "@shared/gameTypes";

interface PlayingCardProps {
  card: PlayingCardType;
  size?: "small" | "normal";
  faceDown?: boolean;
  selected?: boolean;
  highlighted?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  style?: any;
}

const pressConfig: WithSpringConfig = {
  damping: 15,
  mass: 0.3,
  stiffness: 200,
  overshootClamping: true,
};

const selectionBounceConfig: WithSpringConfig = {
  damping: 10,
  mass: 0.4,
  stiffness: 280,
  overshootClamping: false,
};

const selectionSettleConfig: WithSpringConfig = {
  damping: 18,
  mass: 0.3,
  stiffness: 220,
  overshootClamping: false,
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
  highlighted = false,
  disabled = false,
  onPress,
  style,
}: PlayingCardProps) {
  const scaleAnim = useSharedValue(1);
  const translateY = useSharedValue(0);
  const { scale } = useFontSize();

  const isRed = card.suit === "hearts" || card.suit === "diamonds" || card.jokerColor === "red";
  const suitColor = isRed ? GameColors.redSuit : GameColors.blackSuit;

  const baseWidth = size === "small" ? CardDimensions.smallWidth : CardDimensions.width;
  const baseHeight = size === "small" ? CardDimensions.smallHeight : CardDimensions.height;
  const cardWidth = Math.round(baseWidth * scale);
  const cardHeight = Math.round(baseHeight * scale);

  const cornerRankSize = size === "small" ? Math.round(12 * scale) : Math.round(16 * scale);
  const cornerSuitSize = size === "small" ? Math.round(10 * scale) : Math.round(14 * scale);
  const centerBoxSize = size === "small" ? Math.round(28 * scale) : Math.round(40 * scale);
  const centerSuitSize = size === "small" ? Math.round(24 * scale) : Math.round(32 * scale);
  const jokerFontSize = size === "small" ? Math.round(10 * scale) : Math.round(12 * scale);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scaleAnim.value },
      { translateY: translateY.value },
    ],
  }));

  React.useEffect(() => {
    if (selected) {
      translateY.value = withSpring(-12, selectionBounceConfig);
      scaleAnim.value = withSequence(
        withSpring(1.12, selectionBounceConfig),
        withSpring(1, selectionSettleConfig)
      );
    } else {
      translateY.value = withSpring(0, pressConfig);
      scaleAnim.value = withSpring(1, pressConfig);
    }
  }, [selected]);

  const handlePressIn = () => {
    if (!disabled && onPress) {
      scaleAnim.value = withSpring(0.93, pressConfig);
    }
  };

  const handlePressOut = () => {
    scaleAnim.value = withSpring(1, pressConfig);
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
          borderColor: highlighted ? "#FFD700" : selected ? GameColors.gold : "transparent",
          borderWidth: highlighted || selected ? Math.round(3 * scale) : 0,
        },
        style,
        animatedStyle,
      ]}
    >
      {card.isJoker ? (
        <View style={styles.jokerContent}>
          <ThemedText
            style={[
              styles.jokerText,
              {
                color: card.jokerColor === "red" ? GameColors.redSuit : GameColors.blackSuit,
                fontSize: jokerFontSize,
              },
            ]}
          >
            JOKER
          </ThemedText>
        </View>
      ) : (
        <>
          <View style={styles.topLeft}>
            <ThemedText
              style={[styles.rank, { color: suitColor, fontSize: cornerRankSize }]}
            >
              {rankDisplay}
            </ThemedText>
            <ThemedText
              style={[styles.suit, { color: suitColor, fontSize: cornerSuitSize }]}
            >
              {suitSymbol}
            </ThemedText>
          </View>
          <View style={[styles.center, { marginTop: size === "small" ? 4 : 6 }]}>
            <View style={{ width: centerBoxSize, height: centerBoxSize, justifyContent: "center", alignItems: "center" }}>
              <ThemedText
                style={{
                  color: suitColor,
                  fontSize: centerSuitSize,
                  lineHeight: centerBoxSize,
                  textAlign: "center",
                }}
              >
                {suitSymbol}
              </ThemedText>
            </View>
          </View>
          <View style={styles.bottomRight}>
            <ThemedText
              style={[styles.suit, { color: suitColor, fontSize: cornerSuitSize, transform: [{ rotate: "180deg" }] }]}
            >
              {suitSymbol}
            </ThemedText>
            <ThemedText
              style={[styles.rank, { color: suitColor, fontSize: cornerRankSize, transform: [{ rotate: "180deg" }] }]}
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
    overflow: "visible",
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
    top: 2,
    left: 3,
    alignItems: "center",
  },
  bottomRight: {
    position: "absolute",
    bottom: 2,
    right: 3,
    alignItems: "center",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  rank: {
    fontWeight: "700",
    includeFontPadding: false,
  },
  suit: {
    includeFontPadding: false,
  },
  jokerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  jokerText: {
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: 1,
  },
});
