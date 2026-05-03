import React, { useEffect, useRef, useState, useCallback } from "react";
import { StyleSheet, View, ScrollView } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { PlayingCard } from "@/components/PlayingCard";
import type { PlayingCard as PlayingCardType } from "@shared/gameTypes";
import { CardDimensions, Spacing } from "@/constants/theme";
import { useFontSize } from "@/contexts/FontSizeContext";

interface CardHandProps {
  cards: PlayingCardType[];
  selectedCardIds?: string[];
  highlightedCardIds?: string[];
  faceDown?: boolean;
  compact?: boolean;
  onCardPress?: (card: PlayingCardType) => void;
  style?: any;
}

interface CardSlot {
  card: PlayingCardType;
  exiting: boolean;
  index: number;
}

interface AnimatedCardSlotProps {
  slot: CardSlot;
  cardSize: "small" | "normal";
  overlap: number;
  faceDown: boolean;
  isSelected: boolean;
  isHighlighted: boolean;
  onCardPress?: (card: PlayingCardType) => void;
  onExitComplete: (cardId: string) => void;
}

function AnimatedCardSlot({
  slot,
  cardSize,
  overlap,
  faceDown,
  isSelected,
  isHighlighted,
  onCardPress,
  onExitComplete,
}: AnimatedCardSlotProps) {
  const opacity = useSharedValue(1);
  const scale = useSharedValue(1);
  const translateY = useSharedValue(0);

  const handleExitComplete = useCallback(() => {
    onExitComplete(slot.card.id);
  }, [slot.card.id, onExitComplete]);

  useEffect(() => {
    if (slot.exiting) {
      opacity.value = withTiming(0, { duration: 180 });
      scale.value = withTiming(0.6, { duration: 180 });
      translateY.value = withTiming(20, { duration: 180 }, (finished) => {
        if (finished) {
          runOnJS(handleExitComplete)();
        }
      });
    }
  }, [slot.exiting, handleExitComplete]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { scale: scale.value },
      { translateY: translateY.value },
    ],
  }));

  return (
    <Animated.View
      style={[
        styles.cardWrapper,
        { marginLeft: slot.index === 0 ? 0 : overlap, zIndex: slot.index },
        animStyle,
      ]}
    >
      <PlayingCard
        card={slot.card}
        size={cardSize}
        faceDown={faceDown}
        selected={isSelected}
        highlighted={isHighlighted}
        onPress={onCardPress && !slot.exiting ? () => onCardPress(slot.card) : undefined}
      />
    </Animated.View>
  );
}

export function CardHand({
  cards,
  selectedCardIds = [],
  highlightedCardIds = [],
  faceDown = false,
  compact = false,
  onCardPress,
  style,
}: CardHandProps) {
  const { scale } = useFontSize();
  const baseCardWidth = compact ? CardDimensions.smallWidth : CardDimensions.width;
  const cardWidth = Math.round(baseCardWidth * scale);
  const overlap = compact ? -Math.round(40 * scale) : -Math.round(30 * scale);
  const cardSize = compact ? "small" : "normal";

  const [slots, setSlots] = useState<CardSlot[]>(() =>
    cards.map((card, index) => ({ card, exiting: false, index }))
  );
  const prevCardIdsRef = useRef<string[]>(cards.map((c) => c.id));

  useEffect(() => {
    const prevIds = prevCardIdsRef.current;
    const nextIds = cards.map((c) => c.id);

    const removedIds = new Set(prevIds.filter((id) => !nextIds.includes(id)));

    setSlots((prev) => {
      const existingExiting = prev.filter((s) => s.exiting);
      const combined: CardSlot[] = [];

      const nextCards = cards.map((card, index) => ({ card, exiting: false, index }));

      for (const slot of prev) {
        if (removedIds.has(slot.card.id) && !slot.exiting) {
          combined.push({ ...slot, exiting: true });
        }
      }

      for (const slot of nextCards) {
        combined.push(slot);
      }

      for (const slot of existingExiting) {
        if (!removedIds.has(slot.card.id) && !combined.find((s) => s.card.id === slot.card.id)) {
          combined.push(slot);
        }
      }

      combined.sort((a, b) => {
        if (a.exiting && !b.exiting) return -1;
        if (!a.exiting && b.exiting) return 1;
        return a.index - b.index;
      });

      return combined;
    });

    prevCardIdsRef.current = nextIds;
  }, [cards]);

  const handleExitComplete = useCallback((cardId: string) => {
    setSlots((prev) => prev.filter((s) => s.card.id !== cardId));
  }, []);

  if (cards.length === 0 && slots.every((s) => !s.exiting)) {
    return null;
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[
        styles.container,
        { paddingRight: cardWidth },
        style,
      ]}
    >
      {slots.map((slot) => (
        <AnimatedCardSlot
          key={slot.card.id}
          slot={slot}
          cardSize={cardSize}
          overlap={overlap}
          faceDown={faceDown}
          isSelected={selectedCardIds.includes(slot.card.id)}
          isHighlighted={highlightedCardIds.includes(slot.card.id)}
          onCardPress={onCardPress}
          onExitComplete={handleExitComplete}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  cardWrapper: {
    alignItems: "center",
  },
});
