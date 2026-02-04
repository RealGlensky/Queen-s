import React from "react";
import { StyleSheet, View, Modal, Pressable, ScrollView } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { ThemedText } from "@/components/ThemedText";
import { GameColors, BorderRadius, Spacing, PLAYER_COLORS } from "@/constants/theme";
import type { GameState, Player } from "@shared/gameTypes";
import { getCardPoints } from "@shared/gameTypes";

interface ScoreHistoryModalProps {
  visible: boolean;
  onClose: () => void;
  gameState: GameState;
  myPlayerId: string;
}

const teamColors = {
  1: "#4CAF50",
  2: "#2196F3",
};

export function ScoreHistoryModal({
  visible,
  onClose,
  gameState,
  myPlayerId,
}: ScoreHistoryModalProps) {
  const insets = useSafeAreaInsets();
  const isTeamMode = gameState.gameMode === "2v2";

  const calculatePlayerScoreBreakdown = (player: Player) => {
    const setsScore = player.sets.reduce((acc, set) => {
      return acc + set.cards.reduce((sum, card) => sum + getCardPoints(card), 0);
    }, 0);
    const handValue = player.hand.reduce((acc, card) => acc + getCardPoints(card), 0);
    return { setsScore, handValue };
  };

  const sortedPlayers = [...gameState.players].sort((a, b) => b.totalScore - a.totalScore);

  const team1Players = gameState.players.filter(p => p.odexTeam === 1);
  const team2Players = gameState.players.filter(p => p.odexTeam === 2);
  const team1Score = team1Players.reduce((sum, p) => sum + p.totalScore, 0);
  const team2Score = team2Players.reduce((sum, p) => sum + p.totalScore, 0);

  const teamsSorted = [
    { teamId: 1, players: team1Players, totalScore: team1Score },
    { teamId: 2, players: team2Players, totalScore: team2Score },
  ].sort((a, b) => b.totalScore - a.totalScore);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={[styles.overlay, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <LinearGradient
          colors={[GameColors.casinoGreen, "#0A4A18"]}
          style={styles.container}
        >
          <View style={styles.header}>
            <ThemedText style={styles.title}>Score Standings</ThemedText>
            <Pressable style={styles.closeButton} onPress={onClose}>
              <Feather name="x" size={24} color="#FFFFFF" />
            </Pressable>
          </View>

          <View style={styles.roundInfo}>
            <ThemedText style={styles.roundLabel}>Round {gameState.currentRound}</ThemedText>
            <ThemedText style={styles.thresholdLabel}>
              Goal: {gameState.pointThreshold} pts
            </ThemedText>
          </View>

          <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
            {isTeamMode ? (
              <View style={styles.teamsContainer}>
                {teamsSorted.map((team, index) => {
                  const isMyTeam = team.players.some(p => p.id === myPlayerId);
                  return (
                    <View
                      key={team.teamId}
                      style={[
                        styles.teamCard,
                        { borderLeftColor: teamColors[team.teamId as keyof typeof teamColors] },
                        isMyTeam && styles.myTeamCard,
                      ]}
                    >
                      <View style={styles.teamHeader}>
                        <View style={styles.teamRank}>
                          <ThemedText style={styles.rankText}>#{index + 1}</ThemedText>
                        </View>
                        <View style={styles.teamInfo}>
                          <ThemedText style={styles.teamName}>
                            {isMyTeam ? "Your Team" : "Opponents"}
                          </ThemedText>
                          <ThemedText style={styles.teamMembers}>
                            {team.players.map(p => p.displayName).join(" & ")}
                          </ThemedText>
                        </View>
                        <ThemedText style={styles.teamScore}>{team.totalScore}</ThemedText>
                      </View>

                      <View style={styles.playerBreakdown}>
                        {team.players.map(player => {
                          const { setsScore, handValue } = calculatePlayerScoreBreakdown(player);
                          return (
                            <View key={player.id} style={styles.playerRow}>
                              <ThemedText style={styles.playerName}>{player.displayName}</ThemedText>
                              <View style={styles.playerStats}>
                                <View style={styles.statItem}>
                                  <Feather name="layers" size={12} color="rgba(255,255,255,0.6)" />
                                  <ThemedText style={styles.statValue}>+{setsScore}</ThemedText>
                                </View>
                                <View style={styles.statItem}>
                                  <Feather name="credit-card" size={12} color="rgba(255,255,255,0.6)" />
                                  <ThemedText style={styles.statValue}>{player.hand.length}</ThemedText>
                                </View>
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : (
              <View style={styles.playersContainer}>
                {sortedPlayers.map((player, index) => {
                  const isMe = player.id === myPlayerId;
                  const { setsScore, handValue } = calculatePlayerScoreBreakdown(player);
                  const playerIndex = gameState.players.findIndex(p => p.id === player.id);
                  const playerColor = PLAYER_COLORS[playerIndex % PLAYER_COLORS.length];

                  return (
                    <View
                      key={player.id}
                      style={[
                        styles.playerCard,
                        { borderLeftColor: playerColor },
                        isMe && styles.myPlayerCard,
                      ]}
                    >
                      <View style={styles.playerCardHeader}>
                        <View style={styles.playerRank}>
                          <ThemedText style={styles.rankText}>#{index + 1}</ThemedText>
                        </View>
                        <View style={styles.playerInfo}>
                          <ThemedText style={styles.playerCardName}>
                            {player.displayName}
                            {isMe ? " (You)" : ""}
                          </ThemedText>
                        </View>
                        <ThemedText style={styles.playerScore}>{player.totalScore}</ThemedText>
                      </View>

                      <View style={styles.scoreBreakdown}>
                        <View style={styles.breakdownItem}>
                          <Feather name="layers" size={14} color="rgba(255,255,255,0.6)" />
                          <ThemedText style={styles.breakdownLabel}>Sets laid</ThemedText>
                          <ThemedText style={styles.breakdownValue}>+{setsScore}</ThemedText>
                        </View>
                        <View style={styles.breakdownItem}>
                          <Feather name="credit-card" size={14} color="rgba(255,255,255,0.6)" />
                          <ThemedText style={styles.breakdownLabel}>Cards in hand</ThemedText>
                          <ThemedText style={styles.breakdownValue}>{player.hand.length} ({handValue} pts)</ThemedText>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </ScrollView>
        </LinearGradient>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
  },
  container: {
    flex: 1,
    margin: Spacing.md,
    borderRadius: BorderRadius.xl,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  closeButton: {
    padding: Spacing.xs,
  },
  roundInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  roundLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: GameColors.gold,
  },
  thresholdLabel: {
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
  },
  scrollArea: {
    flex: 1,
    padding: Spacing.md,
  },
  teamsContainer: {
    gap: Spacing.md,
  },
  teamCard: {
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderLeftWidth: 4,
  },
  myTeamCard: {
    backgroundColor: "rgba(212,175,55,0.15)",
  },
  teamHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  teamRank: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  rankText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  teamInfo: {
    flex: 1,
  },
  teamName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  teamMembers: {
    fontSize: 12,
    color: "rgba(255,255,255,0.6)",
  },
  teamScore: {
    fontSize: 24,
    fontWeight: "700",
    color: GameColors.gold,
  },
  playerBreakdown: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
    gap: Spacing.xs,
  },
  playerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  playerName: {
    fontSize: 13,
    color: "rgba(255,255,255,0.8)",
  },
  playerStats: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statValue: {
    fontSize: 12,
    color: "rgba(255,255,255,0.6)",
  },
  playersContainer: {
    gap: Spacing.md,
  },
  playerCard: {
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderLeftWidth: 4,
  },
  myPlayerCard: {
    backgroundColor: "rgba(212,175,55,0.15)",
  },
  playerCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  playerRank: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  playerInfo: {
    flex: 1,
  },
  playerCardName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  playerScore: {
    fontSize: 24,
    fontWeight: "700",
    color: GameColors.gold,
  },
  scoreBreakdown: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
    gap: Spacing.xs,
  },
  breakdownItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  breakdownLabel: {
    flex: 1,
    fontSize: 13,
    color: "rgba(255,255,255,0.6)",
  },
  breakdownValue: {
    fontSize: 13,
    color: "rgba(255,255,255,0.8)",
  },
});
