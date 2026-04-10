import React from "react";
import { StyleSheet, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { GameColors, BorderRadius, Spacing } from "@/constants/theme";
import { useFontSize } from "@/contexts/FontSizeContext";

interface PlayerAvatarProps {
  displayName: string;
  isCurrentTurn?: boolean;
  isDealer?: boolean;
  team?: number;
  cardCount?: number;
  score?: number;
  playerColor?: string;
  hasLastCard?: boolean;
  isConnected?: boolean;
  size?: "small" | "normal" | "large";
  isMe?: boolean;
  style?: any;
}

const teamColors = {
  1: "#4CAF50",
  2: "#2196F3",
};

export function PlayerAvatar({
  displayName,
  isCurrentTurn = false,
  isDealer = false,
  team,
  cardCount,
  score,
  playerColor,
  hasLastCard = false,
  isConnected = true,
  size = "normal",
  isMe = false,
  style,
}: PlayerAvatarProps) {
  const { fs, scale } = useFontSize();
  const baseAvatarSize = size === "small" ? 36 : size === "large" ? 56 : 44;
  const avatarSize = Math.round(baseAvatarSize * scale);
  const badgeSize = Math.round(18 * scale);
  const badgeFontSize = Math.round(10 * scale);
  const initialFontSize = size === "small" ? 14 : size === "large" ? 22 : 18;
  const initial = displayName.charAt(0).toUpperCase();
  const borderWidthValue = isCurrentTurn ? 5 : isMe ? 4 : 3;
  const outerSize = avatarSize + (isCurrentTurn ? 4 : 0);
  const innerSize = outerSize - 2 * borderWidthValue;

  return (
    <View style={[styles.container, style]}>
      <View
        style={[
          styles.avatarContainer,
          {
            width: outerSize,
            height: outerSize,
            borderRadius: outerSize / 2,
            borderWidth: borderWidthValue,
            borderColor: isCurrentTurn
              ? (playerColor || (team ? teamColors[team as keyof typeof teamColors] : GameColors.gold))
              : playerColor
                ? playerColor
                : team
                  ? teamColors[team as keyof typeof teamColors]
                  : "rgba(255,255,255,0.3)",
            opacity: isConnected ? 1 : 0.5,
          },
        ]}
      >
        <View
          style={[
            styles.avatar,
            {
              width: innerSize,
              height: innerSize,
              borderRadius: innerSize / 2,
              overflow: "hidden",
              padding: Math.round(6 * scale),
              backgroundColor: team
                ? teamColors[team as keyof typeof teamColors]
                : GameColors.richWood,
            },
          ]}
        >
          <ThemedText style={[styles.initial, { fontSize: Math.round(initialFontSize * scale) }]}>
            {initial}
          </ThemedText>
        </View>
        {isDealer ? (
          <View style={[styles.dealerBadge, { width: badgeSize, height: badgeSize, borderRadius: badgeSize / 2 }]}>
            <ThemedText style={[styles.dealerText, { fontSize: badgeFontSize }]}>D</ThemedText>
          </View>
        ) : null}
        {hasLastCard ? (
          <View style={[styles.lastCardBadge, { width: badgeSize, height: badgeSize, borderRadius: badgeSize / 2 }]}>
            <Feather name="alert-circle" size={Math.round(12 * scale)} color="#FFFFFF" />
          </View>
        ) : null}
      </View>
      <ThemedText
        style={[
          styles.name,
          { fontSize: fs(12), maxWidth: Math.round(80 * scale) },
          isCurrentTurn && {
            color: playerColor || (team ? teamColors[team as keyof typeof teamColors] : GameColors.gold),
            fontWeight: "600" as const,
          },
        ]}
        numberOfLines={1}
      >
        {displayName}
      </ThemedText>
      {cardCount !== undefined ? (
        <View style={styles.cardCountContainer}>
          <Feather name="layers" size={10} color="rgba(255,255,255,0.6)" />
          <ThemedText style={[styles.cardCount, { fontSize: fs(10) }]}>{cardCount}</ThemedText>
        </View>
      ) : null}
      {score !== undefined ? (
        <ThemedText style={[styles.score, { fontSize: fs(10) }]}>{score} pts</ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: Spacing.xs,
  },
  avatarContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  avatar: {
    justifyContent: "center",
    alignItems: "center",
  },
  initial: {
    color: "#FFFFFF",
    fontWeight: "700",
    textAlign: "center",
  },
  dealerBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    backgroundColor: GameColors.gold,
    justifyContent: "center",
    alignItems: "center",
  },
  dealerText: {
    color: "#000000",
    fontWeight: "700",
  },
  lastCardBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: "#F44336",
    justifyContent: "center",
    alignItems: "center",
  },
  name: {
    color: "rgba(255,255,255,0.8)",
    fontWeight: "500",
  },
  cardCountContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  cardCount: {
    color: "rgba(255,255,255,0.6)",
  },
  score: {
    color: GameColors.gold,
    fontWeight: "600",
  },
});
