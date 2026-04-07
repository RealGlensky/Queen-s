import React from "react";
import { StyleSheet, View, Modal, Pressable, ScrollView } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { ThemedText } from "@/components/ThemedText";
import { GameColors, BorderRadius, Spacing, PLAYER_COLORS } from "@/constants/theme";
import { useFontSize } from "@/contexts/FontSizeContext";
import type { GameState } from "@shared/gameTypes";

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
  const { fs } = useFontSize();
  const isTeamMode = gameState.gameMode === "2v2";
  const scoreHistory = gameState.scoreHistory || [];

  const sortedPlayers = [...gameState.players].sort((a, b) => b.totalScore - a.totalScore);

  const getTeamRoundScore = (round: number, teamId: number) => {
    const roundEntry = scoreHistory.find(h => h.round === round);
    if (!roundEntry) return { roundScore: 0, cumulative: 0 };
    const teamScores = roundEntry.scores.filter(s => s.teamId === teamId);
    return {
      roundScore: teamScores.reduce((sum, s) => sum + s.roundScore, 0),
      cumulative: teamScores.reduce((sum, s) => sum + s.cumulativeScore, 0),
    };
  };

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
            <ThemedText style={[styles.title, { fontSize: fs(20) }]}>Score History</ThemedText>
            <Pressable style={styles.closeButton} onPress={onClose}>
              <Feather name="x" size={24} color="#FFFFFF" />
            </Pressable>
          </View>

          <View style={styles.roundInfo}>
            <ThemedText style={[styles.roundLabel, { fontSize: fs(16) }]}>
              {gameState.status === "playing" ? `Playing Round ${gameState.currentRound}` : `Round ${gameState.currentRound}`}
            </ThemedText>
            <ThemedText style={[styles.thresholdLabel, { fontSize: fs(14) }]}>
              Goal: {gameState.pointThreshold} pts
            </ThemedText>
          </View>

          <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
            {isTeamMode ? (
              <View style={styles.tableContainer}>
                <View style={styles.tableHeader}>
                  <View style={styles.roundColumn}>
                    <ThemedText style={[styles.columnHeader, { fontSize: fs(12) }]}>Round</ThemedText>
                  </View>
                  {teamsSorted.map(team => {
                    const isMyTeam = team.players.some(p => p.id === myPlayerId);
                    return (
                      <View key={team.teamId} style={styles.teamColumn}>
                        <ThemedText style={[
                          styles.columnHeader,
                          { fontSize: fs(12), color: teamColors[team.teamId as keyof typeof teamColors] }
                        ]}>
                          {isMyTeam ? "Your Team" : "Opponents"}
                        </ThemedText>
                      </View>
                    );
                  })}
                </View>

                {scoreHistory.length > 0 ? (
                  scoreHistory.map(entry => (
                    <View key={entry.round} style={styles.tableRow}>
                      <View style={styles.roundColumn}>
                        <ThemedText style={[styles.roundNumber, { fontSize: fs(14) }]}>{entry.round}</ThemedText>
                      </View>
                      {teamsSorted.map(team => {
                        const { roundScore, cumulative } = getTeamRoundScore(entry.round, team.teamId);
                        return (
                          <View key={team.teamId} style={styles.teamColumn}>
                            <ThemedText style={[
                              styles.roundScoreValue,
                              { fontSize: fs(14) },
                              roundScore >= 0 ? styles.positiveScore : styles.negativeScore
                            ]}>
                              {roundScore >= 0 ? `+${roundScore}` : roundScore}
                            </ThemedText>
                            <ThemedText style={[styles.cumulativeScore, { fontSize: fs(10) }]}>
                              Total: {cumulative}
                            </ThemedText>
                          </View>
                        );
                      })}
                    </View>
                  ))
                ) : (
                  <View style={styles.noHistory}>
                    <Feather name="clock" size={24} color="rgba(255,255,255,0.4)" />
                    <ThemedText style={[styles.noHistoryText, { fontSize: fs(14) }]}>
                      No rounds completed yet
                    </ThemedText>
                  </View>
                )}

                <View style={[styles.tableRow, styles.totalRow]}>
                  <View style={styles.roundColumn}>
                    <ThemedText style={[styles.totalLabel, { fontSize: fs(14) }]}>Total</ThemedText>
                  </View>
                  {teamsSorted.map(team => (
                    <View key={team.teamId} style={styles.teamColumn}>
                      <ThemedText style={[styles.totalScore, { fontSize: fs(18) }]}>{team.totalScore}</ThemedText>
                    </View>
                  ))}
                </View>
              </View>
            ) : (
              <View style={styles.tableContainer}>
                <View style={styles.tableHeader}>
                  <View style={styles.roundColumn}>
                    <ThemedText style={[styles.columnHeader, { fontSize: fs(12) }]}>Round</ThemedText>
                  </View>
                  {sortedPlayers.map((player) => {
                    const isMe = player.id === myPlayerId;
                    const playerIndex = gameState.players.findIndex(p => p.id === player.id);
                    const playerColor = PLAYER_COLORS[playerIndex % PLAYER_COLORS.length];
                    return (
                      <View key={player.id} style={styles.playerColumn}>
                        <ThemedText
                          style={[styles.columnHeader, { fontSize: fs(12), color: playerColor }]}
                          numberOfLines={1}
                        >
                          {isMe ? "You" : player.displayName}
                        </ThemedText>
                      </View>
                    );
                  })}
                </View>

                {scoreHistory.length > 0 ? (
                  scoreHistory.map(entry => (
                    <View key={entry.round} style={styles.tableRow}>
                      <View style={styles.roundColumn}>
                        <ThemedText style={[styles.roundNumber, { fontSize: fs(14) }]}>{entry.round}</ThemedText>
                      </View>
                      {sortedPlayers.map(player => {
                        const scoreData = entry.scores.find(s => s.playerId === player.id);
                        const roundScore = scoreData?.roundScore || 0;
                        const cumulative = scoreData?.cumulativeScore || 0;
                        return (
                          <View key={player.id} style={styles.playerColumn}>
                            <ThemedText style={[
                              styles.roundScoreValue,
                              { fontSize: fs(14) },
                              roundScore >= 0 ? styles.positiveScore : styles.negativeScore
                            ]}>
                              {roundScore >= 0 ? `+${roundScore}` : roundScore}
                            </ThemedText>
                            <ThemedText style={[styles.cumulativeScore, { fontSize: fs(10) }]}>
                              {cumulative}
                            </ThemedText>
                          </View>
                        );
                      })}
                    </View>
                  ))
                ) : (
                  <View style={styles.noHistory}>
                    <Feather name="clock" size={24} color="rgba(255,255,255,0.4)" />
                    <ThemedText style={[styles.noHistoryText, { fontSize: fs(14) }]}>
                      No rounds completed yet
                    </ThemedText>
                  </View>
                )}

                <View style={[styles.tableRow, styles.totalRow]}>
                  <View style={styles.roundColumn}>
                    <ThemedText style={[styles.totalLabel, { fontSize: fs(14) }]}>Total</ThemedText>
                  </View>
                  {sortedPlayers.map(player => (
                    <View key={player.id} style={styles.playerColumn}>
                      <ThemedText style={[styles.totalScore, { fontSize: fs(18) }]}>{player.totalScore}</ThemedText>
                    </View>
                  ))}
                </View>
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
    fontWeight: "600",
    color: GameColors.gold,
  },
  thresholdLabel: {
    color: "rgba(255,255,255,0.7)",
  },
  scrollArea: {
    flex: 1,
    padding: Spacing.md,
  },
  tableContainer: {
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "rgba(0,0,0,0.4)",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  totalRow: {
    backgroundColor: "rgba(212,175,55,0.1)",
    borderBottomWidth: 0,
    paddingVertical: Spacing.md,
  },
  roundColumn: {
    width: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  teamColumn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  playerColumn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  columnHeader: {
    fontWeight: "700",
    color: "rgba(255,255,255,0.8)",
    textAlign: "center",
  },
  roundNumber: {
    fontWeight: "600",
    color: "#FFFFFF",
  },
  roundScoreValue: {
    fontWeight: "700",
  },
  positiveScore: {
    color: "#4CAF50",
  },
  negativeScore: {
    color: "#F44336",
  },
  cumulativeScore: {
    color: "rgba(255,255,255,0.5)",
    marginTop: 2,
  },
  totalLabel: {
    fontWeight: "700",
    color: GameColors.gold,
  },
  totalScore: {
    fontWeight: "700",
    color: GameColors.gold,
  },
  noHistory: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.xl,
    gap: Spacing.sm,
  },
  noHistoryText: {
    color: "rgba(255,255,255,0.5)",
  },
});
