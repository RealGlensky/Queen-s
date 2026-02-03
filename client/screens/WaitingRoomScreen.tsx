import React, { useEffect, useState, useCallback } from "react";
import { StyleSheet, View, FlatList, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { GameButton } from "@/components/GameButton";
import { GameColors, Spacing, BorderRadius } from "@/constants/theme";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";
import { useGameSocket } from "@/hooks/useGameSocket";
import type { Player } from "@shared/gameTypes";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type WaitingRoomRouteProp = RouteProp<RootStackParamList, "WaitingRoom">;

export default function WaitingRoomScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<WaitingRoomRouteProp>();
  
  const { isHost, displayName, gameMode, maxPlayers, pointThreshold, roomCode } = route.params;

  const {
    connected,
    roomInfo,
    players,
    error,
    createRoom,
    joinRoom,
    startGame,
    leaveRoom,
    addAIPlayer,
    removeAIPlayer,
  } = useGameSocket();

  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    if (isHost && gameMode && maxPlayers && pointThreshold) {
      createRoom(displayName, {
        gameMode,
        maxPlayers,
        pointThreshold,
      });
    } else if (roomCode) {
      joinRoom(displayName, roomCode);
    }
  }, []);

  useEffect(() => {
    if (roomInfo?.status === "playing") {
      navigation.replace("Game", { roomCode: roomInfo.roomCode });
    }
  }, [roomInfo?.status]);

  const handleStartGame = async () => {
    setIsStarting(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    startGame();
  };

  const handleLeaveRoom = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    leaveRoom();
    navigation.goBack();
  };

  const handleAddAI = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    addAIPlayer();
  };

  const handleRemoveAI = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    removeAIPlayer();
  };

  const canStartGame = isHost && players.length >= 2 && 
    (gameMode !== "2v2" || players.length === 4);
  
  const hasAIPlayers = players.some(p => p.displayName.startsWith("Bot "));
  const canAddAI = isHost && players.length < (roomInfo?.maxPlayers || maxPlayers || 4);

  const renderPlayer = useCallback(({ item, index }: { item: Player; index: number }) => (
    <View style={styles.playerItem}>
      <PlayerAvatar
        displayName={item.displayName}
        team={item.odexTeam}
        size="large"
        isConnected={item.isConnected}
      />
      {index === 0 ? (
        <View style={styles.hostBadge}>
          <ThemedText style={styles.hostBadgeText}>Host</ThemedText>
        </View>
      ) : null}
    </View>
  ), []);

  const EmptySlot = () => (
    <View style={styles.emptySlot}>
      <View style={styles.emptyAvatar}>
        <Feather name="user-plus" size={24} color="rgba(255,255,255,0.3)" />
      </View>
      <ThemedText style={styles.emptyText}>Waiting...</ThemedText>
    </View>
  );

  if (!connected || !roomInfo) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[GameColors.casinoGreenDark, "#0A0A0A"]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={GameColors.gold} />
          <ThemedText style={styles.loadingText}>
            {error || "Connecting to room..."}
          </ThemedText>
          {error ? (
            <GameButton
              label="Go Back"
              variant="outline"
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            />
          ) : null}
        </View>
      </View>
    );
  }

  const totalSlots = roomInfo.maxPlayers || maxPlayers || 4;
  const emptySlots = Array.from({ length: totalSlots - players.length });

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[GameColors.casinoGreenDark, "#0A0A0A"]}
        style={StyleSheet.absoluteFill}
      />

      <View
        style={[
          styles.content,
          {
            paddingTop: headerHeight + Spacing.lg,
            paddingBottom: insets.bottom + Spacing.xl,
          },
        ]}
      >
        <View style={styles.roomCodeContainer}>
          <ThemedText style={styles.roomCodeLabel}>Room Code</ThemedText>
          <ThemedText style={styles.roomCode}>{roomInfo.roomCode}</ThemedText>
          <ThemedText style={styles.modeLabel}>
            {roomInfo.gameMode === "2v2" ? "2v2 Teams" : "Solo"} • {roomInfo.pointThreshold} points
          </ThemedText>
        </View>

        <View style={styles.playersSection}>
          <ThemedText style={styles.playersTitle}>
            Players ({players.length}/{totalSlots})
          </ThemedText>
          
          <View style={styles.playersGrid}>
            {players.map((player, index) => (
              <View key={player.id} style={styles.playerItem}>
                <PlayerAvatar
                  displayName={player.displayName}
                  team={player.odexTeam}
                  size="large"
                  isConnected={player.isConnected}
                />
                {index === 0 ? (
                  <View style={styles.hostBadge}>
                    <ThemedText style={styles.hostBadgeText}>Host</ThemedText>
                  </View>
                ) : null}
              </View>
            ))}
            {emptySlots.map((_, index) => (
              <EmptySlot key={`empty-${index}`} />
            ))}
          </View>
        </View>

        <View style={styles.actions}>
          {isHost ? (
            <>
              <View style={styles.aiButtonsRow}>
                <GameButton
                  label="Add AI"
                  icon="cpu"
                  variant="secondary"
                  size="normal"
                  disabled={!canAddAI}
                  onPress={handleAddAI}
                  style={styles.aiButton}
                />
                {hasAIPlayers ? (
                  <GameButton
                    label="Remove AI"
                    icon="user-minus"
                    variant="outline"
                    size="normal"
                    onPress={handleRemoveAI}
                    style={styles.aiButton}
                  />
                ) : null}
              </View>
              <GameButton
                label={isStarting ? "Starting..." : "Start Game"}
                icon="play"
                variant="primary"
                size="large"
                disabled={!canStartGame || isStarting}
                loading={isStarting}
                onPress={handleStartGame}
                style={styles.startButton}
              />
            </>
          ) : (
            <View style={styles.waitingMessage}>
              <Feather name="clock" size={20} color="rgba(255,255,255,0.6)" />
              <ThemedText style={styles.waitingText}>
                Waiting for host to start...
              </ThemedText>
            </View>
          )}

          <GameButton
            label="Leave Room"
            icon="log-out"
            variant="outline"
            size="normal"
            onPress={handleLeaveRoom}
            style={styles.leaveButton}
          />
        </View>
      </View>
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
    gap: Spacing.lg,
    paddingHorizontal: Spacing.xl,
  },
  loadingText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 16,
    textAlign: "center",
  },
  backButton: {
    marginTop: Spacing.lg,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  roomCodeContainer: {
    alignItems: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.xl,
    backgroundColor: "rgba(0,0,0,0.2)",
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.xl,
  },
  roomCodeLabel: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  roomCode: {
    color: GameColors.gold,
    fontSize: 36,
    fontWeight: "700",
    letterSpacing: 8,
  },
  modeLabel: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 14,
  },
  playersSection: {
    flex: 1,
    gap: Spacing.lg,
  },
  playersTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  playersGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.lg,
    justifyContent: "center",
  },
  playerItem: {
    alignItems: "center",
    width: 100,
  },
  hostBadge: {
    marginTop: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    backgroundColor: GameColors.gold,
    borderRadius: BorderRadius.xs,
  },
  hostBadgeText: {
    color: "#000000",
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  emptySlot: {
    alignItems: "center",
    width: 100,
    opacity: 0.5,
  },
  emptyAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.2)",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 12,
    marginTop: Spacing.xs,
  },
  actions: {
    gap: Spacing.lg,
    paddingTop: Spacing.xl,
  },
  aiButtonsRow: {
    flexDirection: "row",
    gap: Spacing.md,
    justifyContent: "center",
  },
  aiButton: {
    flex: 1,
  },
  startButton: {
    width: "100%",
  },
  waitingMessage: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
  },
  waitingText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 16,
  },
  leaveButton: {
    width: "100%",
  },
});
