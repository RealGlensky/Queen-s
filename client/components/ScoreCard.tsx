import React from "react";
import { StyleSheet, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { GameColors, BorderRadius, Spacing } from "@/constants/theme";
import { useFontSize } from "@/contexts/FontSizeContext";

interface ScoreCardProps {
  displayName: string;
  subtitle?: string;
  roundScore: number;
  totalScore: number;
  setsScore: number;
  handPenalty: number;
  isWinner?: boolean;
  team?: number;
  perfectCutBonus?: boolean;
  rank?: number;
  style?: any;
}

const teamColors = {
  1: "#4CAF50",
  2: "#2196F3",
};

export function ScoreCard({
  displayName,
  subtitle,
  roundScore,
  totalScore,
  setsScore,
  handPenalty,
  isWinner = false,
  team,
  perfectCutBonus = false,
  rank,
  style,
}: ScoreCardProps) {
  const { fs } = useFontSize();

  return (
    <View
      style={[
        styles.container,
        isWinner && styles.winnerContainer,
        team && { borderLeftColor: teamColors[team as keyof typeof teamColors], borderLeftWidth: 4 },
        style,
      ]}
    >
      <View style={styles.header}>
        <View style={styles.nameContainer}>
          {rank !== undefined ? (
            <View style={[styles.rankBadge, isWinner && styles.winnerRank]}>
              <ThemedText style={[styles.rankText, { fontSize: fs(12) }]}>#{rank}</ThemedText>
            </View>
          ) : null}
          <View>
            <ThemedText style={[styles.name, { fontSize: fs(16) }]}>{displayName}</ThemedText>
            {subtitle ? (
              <ThemedText style={[styles.subtitle, { fontSize: fs(12) }]}>{subtitle}</ThemedText>
            ) : null}
          </View>
          {isWinner ? (
            <Feather name="award" size={20} color={GameColors.gold} />
          ) : null}
        </View>
        <ThemedText style={[styles.totalScore, { fontSize: fs(24) }, isWinner && styles.winnerScore]}>
          {totalScore}
        </ThemedText>
      </View>

      <View style={styles.breakdown}>
        <View style={styles.breakdownRow}>
          <ThemedText style={[styles.breakdownLabel, { fontSize: fs(13) }]}>Sets laid down</ThemedText>
          <ThemedText style={[styles.breakdownValue, { fontSize: fs(13) }, styles.positive]}>
            +{setsScore}
          </ThemedText>
        </View>
        <View style={styles.breakdownRow}>
          <ThemedText style={[styles.breakdownLabel, { fontSize: fs(13) }]}>Cards in hand</ThemedText>
          <ThemedText style={[styles.breakdownValue, { fontSize: fs(13) }, styles.negative]}>
            -{handPenalty}
          </ThemedText>
        </View>
        {perfectCutBonus ? (
          <View style={styles.breakdownRow}>
            <ThemedText style={[styles.breakdownLabel, { fontSize: fs(13) }]}>Perfect cut bonus</ThemedText>
            <ThemedText style={[styles.breakdownValue, { fontSize: fs(13) }, styles.bonus]}>
              +100
            </ThemedText>
          </View>
        ) : null}
        <View style={[styles.breakdownRow, styles.roundTotal]}>
          <ThemedText style={[styles.roundLabel, { fontSize: fs(14) }]}>Round score</ThemedText>
          <ThemedText
            style={[
              styles.roundValue,
              { fontSize: fs(16) },
              roundScore >= 0 ? styles.positive : styles.negative,
            ]}
          >
            {roundScore >= 0 ? "+" : ""}{roundScore}
          </ThemedText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  winnerContainer: {
    backgroundColor: "rgba(212, 175, 55, 0.15)",
    borderWidth: 2,
    borderColor: GameColors.gold,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  nameContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  rankBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  winnerRank: {
    backgroundColor: GameColors.gold,
  },
  rankText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  name: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  subtitle: {
    color: "rgba(255,255,255,0.6)",
  },
  totalScore: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  winnerScore: {
    color: GameColors.gold,
  },
  breakdown: {
    gap: Spacing.xs,
  },
  breakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  breakdownLabel: {
    color: "rgba(255,255,255,0.6)",
  },
  breakdownValue: {
    fontWeight: "500",
  },
  positive: {
    color: "#4CAF50",
  },
  negative: {
    color: "#F44336",
  },
  bonus: {
    color: GameColors.gold,
  },
  roundTotal: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
  },
  roundLabel: {
    color: "#FFFFFF",
    fontWeight: "500",
  },
  roundValue: {
    fontWeight: "700",
  },
});
