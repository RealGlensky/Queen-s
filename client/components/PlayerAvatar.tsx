import React from "react";
import { StyleSheet, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { GameColors, BorderRadius, Spacing } from "@/constants/theme";

interface PlayerAvatarProps {
  displayName: string;
  isCurrentTurn?: boolean;
  isDealer?: boolean;
  team?: number;
  cardCount?: number;
  hasLastCard?: boolean;
  isConnected?: boolean;
  size?: "small" | "normal" | "large";
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
  hasLastCard = false,
  isConnected = true,
  size = "normal",
  style,
}: PlayerAvatarProps) {
  const avatarSize = size === "small" ? 36 : size === "large" ? 56 : 44;
  const fontSize = size === "small" ? 14 : size === "large" ? 22 : 18;
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <View style={[styles.container, style]}>
      <View
        style={[
          styles.avatarContainer,
          {
            width: avatarSize,
            height: avatarSize,
            borderRadius: avatarSize / 2,
            borderColor: isCurrentTurn
              ? GameColors.gold
              : team
                ? teamColors[team as keyof typeof teamColors]
                : "transparent",
            opacity: isConnected ? 1 : 0.5,
          },
        ]}
      >
        <View
          style={[
            styles.avatar,
            {
              width: avatarSize - 4,
              height: avatarSize - 4,
              borderRadius: (avatarSize - 4) / 2,
              backgroundColor: team
                ? teamColors[team as keyof typeof teamColors]
                : GameColors.richWood,
            },
          ]}
        >
          <ThemedText style={[styles.initial, { fontSize }]}>
            {initial}
          </ThemedText>
        </View>
        {isDealer ? (
          <View style={styles.dealerBadge}>
            <ThemedText style={styles.dealerText}>D</ThemedText>
          </View>
        ) : null}
        {hasLastCard ? (
          <View style={styles.lastCardBadge}>
            <Feather name="alert-circle" size={12} color="#FFFFFF" />
          </View>
        ) : null}
      </View>
      <ThemedText
        style={[
          styles.name,
          isCurrentTurn && styles.nameCurrent,
        ]}
        numberOfLines={1}
      >
        {displayName}
      </ThemedText>
      {cardCount !== undefined ? (
        <View style={styles.cardCountContainer}>
          <Feather name="layers" size={10} color="rgba(255,255,255,0.6)" />
          <ThemedText style={styles.cardCount}>{cardCount}</ThemedText>
        </View>
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
    borderWidth: 3,
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
  },
  dealerBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: GameColors.gold,
    justifyContent: "center",
    alignItems: "center",
  },
  dealerText: {
    color: "#000000",
    fontSize: 10,
    fontWeight: "700",
  },
  lastCardBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#F44336",
    justifyContent: "center",
    alignItems: "center",
  },
  name: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
    fontWeight: "500",
    maxWidth: 80,
  },
  nameCurrent: {
    color: GameColors.gold,
    fontWeight: "600",
  },
  cardCountContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  cardCount: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 10,
  },
});
