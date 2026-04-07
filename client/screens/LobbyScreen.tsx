import React, { useState } from "react";
import { StyleSheet, View, TextInput, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ThemedText } from "@/components/ThemedText";
import { GameButton } from "@/components/GameButton";
import { GameColors, Spacing, BorderRadius } from "@/constants/theme";
import { useFontSize } from "@/contexts/FontSizeContext";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type GameMode = "solo" | "2v2";

export default function LobbyScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const navigation = useNavigation<NavigationProp>();
  const { fs } = useFontSize();

  const [displayName, setDisplayName] = useState("");
  const [gameMode, setGameMode] = useState<GameMode>("solo");
  const [playerCount, setPlayerCount] = useState(4);
  const [joinCode, setJoinCode] = useState("");
  const [showJoinInput, setShowJoinInput] = useState(false);

  const getPointThreshold = () => {
    return gameMode === "solo" ? 1000 : 1500;
  };

  const handleCreateRoom = async () => {
    if (!displayName.trim()) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate("WaitingRoom", {
      isHost: true,
      displayName: displayName.trim(),
      gameMode,
      maxPlayers: playerCount,
      pointThreshold: getPointThreshold(),
    });
  };

  const handleJoinRoom = async () => {
    if (!displayName.trim() || !joinCode.trim()) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate("WaitingRoom", {
      isHost: false,
      displayName: displayName.trim(),
      roomCode: joinCode.trim().toUpperCase(),
    });
  };

  const playerCountOptions = gameMode === "solo" ? [2, 3, 4, 5, 6] : [4];

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[GameColors.casinoGreenDark, "#0A0A0A"]}
        style={StyleSheet.absoluteFill}
      />

      <KeyboardAwareScrollViewCompat
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: headerHeight + Spacing.xl,
            paddingBottom: insets.bottom + Spacing.xl,
          },
        ]}
      >
        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { fontSize: fs(14) }]}>Your Name</ThemedText>
          <TextInput
            style={styles.input}
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Enter your display name"
            placeholderTextColor="rgba(255,255,255,0.4)"
            maxLength={20}
            autoCapitalize="words"
          />
        </View>

        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { fontSize: fs(14) }]}>Game Mode</ThemedText>
          <View style={styles.modeButtons}>
            <Pressable
              onPress={() => {
                setGameMode("solo");
                if (playerCount > 6) setPlayerCount(4);
              }}
              style={[
                styles.modeButton,
                gameMode === "solo" && styles.modeButtonActive,
              ]}
            >
              <Feather
                name="user"
                size={24}
                color={gameMode === "solo" ? "#000000" : "#FFFFFF"}
              />
              <ThemedText
                style={[
                  styles.modeButtonText,
                  gameMode === "solo" && styles.modeButtonTextActive,
                  { fontSize: fs(16) },
                ]}
              >
                Solo
              </ThemedText>
              <ThemedText
                style={[
                  styles.modeButtonSubtext,
                  gameMode === "solo" && styles.modeButtonTextActive,
                  { fontSize: fs(12) },
                ]}
              >
                1000 points
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={() => {
                setGameMode("2v2");
                setPlayerCount(4);
              }}
              style={[
                styles.modeButton,
                gameMode === "2v2" && styles.modeButtonActive,
              ]}
            >
              <Feather
                name="users"
                size={24}
                color={gameMode === "2v2" ? "#000000" : "#FFFFFF"}
              />
              <ThemedText
                style={[
                  styles.modeButtonText,
                  gameMode === "2v2" && styles.modeButtonTextActive,
                  { fontSize: fs(16) },
                ]}
              >
                2v2 Teams
              </ThemedText>
              <ThemedText
                style={[
                  styles.modeButtonSubtext,
                  gameMode === "2v2" && styles.modeButtonTextActive,
                  { fontSize: fs(12) },
                ]}
              >
                1500 points
              </ThemedText>
            </Pressable>
          </View>
        </View>

        {gameMode === "solo" ? (
          <View style={styles.section}>
            <ThemedText style={[styles.sectionTitle, { fontSize: fs(14) }]}>Number of Players</ThemedText>
            <View style={styles.playerCountButtons}>
              {playerCountOptions.map((count) => (
                <Pressable
                  key={count}
                  onPress={() => setPlayerCount(count)}
                  style={[
                    styles.countButton,
                    playerCount === count && styles.countButtonActive,
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.countButtonText,
                      playerCount === count && styles.countButtonTextActive,
                      { fontSize: fs(18) },
                    ]}
                  >
                    {count}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
            <ThemedText style={[styles.deckInfo, { fontSize: fs(12) }]}>
              {Math.ceil(playerCount / 2)} deck{Math.ceil(playerCount / 2) > 1 ? "s" : ""} will be used
            </ThemedText>
          </View>
        ) : null}

        <View style={styles.actionButtons}>
          <GameButton
            label="Create Room"
            icon="plus-circle"
            variant="primary"
            size="large"
            disabled={!displayName.trim()}
            onPress={handleCreateRoom}
            style={styles.createButton}
          />

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <ThemedText style={styles.dividerText}>OR</ThemedText>
            <View style={styles.dividerLine} />
          </View>

          {showJoinInput ? (
            <View style={styles.joinSection}>
              <TextInput
                style={[styles.input, styles.codeInput]}
                value={joinCode}
                onChangeText={(text) => setJoinCode(text.toUpperCase())}
                placeholder="Enter room code"
                placeholderTextColor="rgba(255,255,255,0.4)"
                maxLength={6}
                autoCapitalize="characters"
              />
              <GameButton
                label="Join Room"
                icon="log-in"
                variant="secondary"
                size="normal"
                disabled={!displayName.trim() || joinCode.length < 6}
                onPress={handleJoinRoom}
                style={styles.joinButton}
              />
            </View>
          ) : (
            <GameButton
              label="Join Existing Room"
              icon="log-in"
              variant="outline"
              size="normal"
              onPress={() => setShowJoinInput(true)}
              style={styles.joinExistingButton}
            />
          )}
        </View>
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: GameColors.casinoGreenDark,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing["2xl"],
  },
  section: {
    gap: Spacing.md,
  },
  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: 16,
    color: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  modeButtons: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  modeButton: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    alignItems: "center",
    gap: Spacing.sm,
    borderWidth: 2,
    borderColor: "transparent",
  },
  modeButtonActive: {
    backgroundColor: GameColors.gold,
    borderColor: GameColors.goldLight,
  },
  modeButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  modeButtonTextActive: {
    color: "#000000",
  },
  modeButtonSubtext: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
  },
  playerCountButtons: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  countButton: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: BorderRadius.sm,
    paddingVertical: Spacing.md,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  countButtonActive: {
    backgroundColor: GameColors.gold,
    borderColor: GameColors.goldLight,
  },
  countButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
  },
  countButtonTextActive: {
    color: "#000000",
  },
  deckInfo: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 12,
    textAlign: "center",
  },
  actionButtons: {
    gap: Spacing.xl,
    marginTop: Spacing.lg,
  },
  createButton: {
    width: "100%",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  dividerText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 12,
    fontWeight: "500",
  },
  joinSection: {
    gap: Spacing.md,
  },
  codeInput: {
    textAlign: "center",
    fontSize: 20,
    letterSpacing: 4,
    fontWeight: "600",
  },
  joinButton: {
    width: "100%",
  },
  joinExistingButton: {
    width: "100%",
  },
});
