import React, { useEffect } from "react";
import { StyleSheet, View, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { ScoreCard } from "@/components/ScoreCard";
import { GameButton } from "@/components/GameButton";
import { GameColors, Spacing, BorderRadius } from "@/constants/theme";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";
import { useGameSocket } from "@/hooks/useGameSocket";
import { getCardPoints } from "@shared/gameTypes";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type ScoreRouteProp = RouteProp<RootStackParamList, "Score">;

export default function ScoreScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ScoreRouteProp>();

  const { gameState, nextRound, leaveRoom } = useGameSocket();

  useEffect(() => {
    if (gameState?.status === "playing") {
      navigation.replace("Game", { roomCode: route.params.roomCode });
    }
  }, [gameState?.status]);

  const handleNextRound = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    nextRound();
  };

  const handlePlayAgain = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    leaveRoom();
    navigation.navigate("Lobby");
  };

  const handleGoHome = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    leaveRoom();
    navigation.navigate("Home");
  };

  if (!gameState) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[GameColors.casinoGreenDark, "#0A0A0A"]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.loadingContainer}>
          <ThemedText style={styles.loadingText}>Loading scores...</ThemedText>
        </View>
      </View>
    );
  }

  const isGameOver = gameState.status === "game_over";
  const sortedPlayers = [...gameState.players].sort((a, b) => b.totalScore - a.totalScore);
  const winnerId = gameState.winner?.playerId;
  const winnerTeam = gameState.winner?.teamId;
  const isTeamMode = gameState.gameMode === "2v2";

  // Find the winning team (team of the player who went out - has empty hand)
  const roundWinner = gameState.players.find(p => p.hand.length === 0);
  const winningTeamId = isTeamMode ? roundWinner?.odexTeam : undefined;

  const calculateScores = (player: typeof sortedPlayers[0]) => {
    const setsScore = player.sets.reduce((acc, set) => {
      return acc + set.cards.reduce((sum, card) => sum + getCardPoints(card), 0);
    }, 0);
    // In 2v2 mode, winning team has no hand penalty
    const handPenalty = (isTeamMode && winningTeamId !== undefined && player.odexTeam === winningTeamId)
      ? 0
      : player.hand.reduce((acc, card) => acc + getCardPoints(card), 0);
    const roundScore = setsScore - handPenalty + (gameState.perfectCutBonus && player.id === gameState.dealerId ? 100 : 0);
    return { setsScore, handPenalty, roundScore };
  };

  // Calculate team scores for 2v2 mode
  const calculateTeamScores = (teamId: number) => {
    const teamPlayers = gameState.players.filter(p => p.odexTeam === teamId);
    let totalSetsScore = 0;
    let totalHandPenalty = 0;
    let totalRoundScore = 0;
    let totalScore = 0;

    teamPlayers.forEach(player => {
      const { setsScore, handPenalty, roundScore } = calculateScores(player);
      totalSetsScore += setsScore;
      totalHandPenalty += handPenalty;
      totalRoundScore += roundScore;
      totalScore += player.totalScore;
    });

    return {
      setsScore: totalSetsScore,
      handPenalty: totalHandPenalty,
      roundScore: totalRoundScore,
      totalScore,
      playerNames: teamPlayers.map(p => p.displayName).join(" & "),
    };
  };

  const team1Scores = isTeamMode ? calculateTeamScores(1) : null;
  const team2Scores = isTeamMode ? calculateTeamScores(2) : null;
  const teamScoresSorted = isTeamMode && team1Scores && team2Scores
    ? [
        { teamId: 1, ...team1Scores },
        { teamId: 2, ...team2Scores },
      ].sort((a, b) => b.totalScore - a.totalScore)
    : [];

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[GameColors.casinoGreenDark, "#0A0A0A"]}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: headerHeight + Spacing.lg,
            paddingBottom: insets.bottom + Spacing.xl,
          },
        ]}
      >
        <Animated.View
          entering={FadeInDown.delay(200).duration(400)}
          style={styles.header}
        >
          {isGameOver ? (
            <>
              <Feather name="award" size={48} color={GameColors.gold} />
              <ThemedText style={styles.title}>Game Over!</ThemedText>
              <ThemedText style={styles.subtitle}>
                {winnerTeam
                  ? `Team ${winnerTeam} Wins!`
                  : sortedPlayers[0]?.displayName + " Wins!"}
              </ThemedText>
            </>
          ) : (
            <>
              <ThemedText style={styles.roundTitle}>
                Round {gameState.currentRound} Complete
              </ThemedText>
              <ThemedText style={styles.subtitle}>
                {isTeamMode && teamScoresSorted.length > 0
                  ? `${gameState.pointThreshold - teamScoresSorted[0].totalScore} points to go`
                  : `${gameState.pointThreshold - Math.max(...sortedPlayers.map(p => p.totalScore))} points to go`
                }
              </ThemedText>
            </>
          )}
        </Animated.View>

        <View style={styles.scoresContainer}>
          {isTeamMode ? (
            teamScoresSorted.map((team, index) => (
              <Animated.View
                key={`team-${team.teamId}`}
                entering={FadeInDown.delay(300 + index * 100).duration(400)}
              >
                <ScoreCard
                  displayName={`Team ${team.teamId}`}
                  subtitle={team.playerNames}
                  roundScore={team.roundScore}
                  totalScore={team.totalScore}
                  setsScore={team.setsScore}
                  handPenalty={team.handPenalty}
                  isWinner={isGameOver && winnerTeam === team.teamId}
                  team={team.teamId}
                  rank={index + 1}
                />
              </Animated.View>
            ))
          ) : (
            sortedPlayers.map((player, index) => {
              const { setsScore, handPenalty, roundScore } = calculateScores(player);
              const isWinner = !!(isGameOver && (
                (winnerId && player.id === winnerId) ||
                (winnerTeam && player.odexTeam === winnerTeam)
              ));

              return (
                <Animated.View
                  key={player.id}
                  entering={FadeInDown.delay(300 + index * 100).duration(400)}
                >
                  <ScoreCard
                    displayName={player.displayName}
                    roundScore={roundScore}
                    totalScore={player.totalScore}
                    setsScore={setsScore}
                    handPenalty={handPenalty}
                    isWinner={isWinner}
                    team={player.odexTeam}
                    perfectCutBonus={!!(gameState.perfectCutBonus && player.id === gameState.dealerId)}
                    rank={index + 1}
                  />
                </Animated.View>
              );
            })
          )}
        </View>

        <Animated.View
          entering={FadeInDown.delay(600).duration(400)}
          style={styles.actions}
        >
          {isGameOver ? (
            <>
              <GameButton
                label="Play Again"
                icon="refresh-cw"
                variant="primary"
                size="large"
                onPress={handlePlayAgain}
                style={styles.actionButton}
              />
              <GameButton
                label="Go Home"
                icon="home"
                variant="outline"
                size="normal"
                onPress={handleGoHome}
                style={styles.actionButton}
              />
            </>
          ) : (
            <GameButton
              label="Next Round"
              icon="arrow-right"
              variant="primary"
              size="large"
              onPress={handleNextRound}
              style={styles.actionButton}
            />
          )}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: GameColors.casinoGreenDark,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing["2xl"],
  },
  header: {
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.xl,
  },
  title: {
    color: GameColors.gold,
    fontSize: 32,
    fontWeight: "700",
  },
  roundTitle: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "700",
  },
  subtitle: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 16,
  },
  scoresContainer: {
    gap: Spacing.md,
  },
  actions: {
    gap: Spacing.md,
    paddingTop: Spacing.lg,
  },
  actionButton: {
    width: "100%",
  },
});
