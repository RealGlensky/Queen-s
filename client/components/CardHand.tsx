import React from "react";
import { StyleSheet, View, ScrollView } from "react-native";
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

  if (cards.length === 0) {
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
      {cards.map((card, index) => (
        <View
          key={card.id}
          style={[
            styles.cardWrapper,
            { marginLeft: index === 0 ? 0 : overlap, zIndex: index },
          ]}
        >
          <PlayingCard
            card={card}
            size={cardSize}
            faceDown={faceDown}
            selected={selectedCardIds.includes(card.id)}
            highlighted={highlightedCardIds.includes(card.id)}
            onPress={onCardPress ? () => onCardPress(card) : undefined}
          />
        </View>
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
