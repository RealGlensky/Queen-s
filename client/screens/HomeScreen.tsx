import React, { useEffect, useRef } from "react";
import { StyleSheet, View, ImageBackground, Pressable, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withDelay,
  FadeIn,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { GameButton } from "@/components/GameButton";
import { GameColors, Spacing, BorderRadius, Typography } from "@/constants/theme";
import { useGameSocket } from "@/contexts/GameSocketContext";
import { useFontSize } from "@/contexts/FontSizeContext";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const { gameState, roomInfo, leaveRoom, connected, reconnecting, offlinePermanent, forceReconnect } = useGameSocket();
  const { fs } = useFontSize();
  const hasAutoNavigated = useRef(false);

  useEffect(() => {
    if (
      gameState &&
      roomInfo &&
      roomInfo.status === "playing" &&
      !hasAutoNavigated.current
    ) {
      hasAutoNavigated.current = true;
      console.log("[HomeScreen] Active game detected, auto-navigating to Game screen");
      navigation.navigate("Game", { roomCode: roomInfo.roomCode });
    }
  }, [gameState, roomInfo, navigation]);

  const hasActiveGame = gameState && roomInfo && roomInfo.status === "playing";
  const isOffline = !connected || reconnecting;

  const handlePlay = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (hasActiveGame) {
      leaveRoom();
    }
    navigation.navigate("Lobby");
  };

  const handleResumeGame = async () => {
    if (!roomInfo) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate("Game", { roomCode: roomInfo.roomCode });
  };

  const handleRules = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate("Rules");
  };

  const handleSettings = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate("Settings");
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[GameColors.casinoGreenDark, "#0A0A0A"]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      <View style={styles.feltOverlay} />

      {isOffline ? (
        <Pressable
          onPress={offlinePermanent ? forceReconnect : undefined}
          style={[styles.reconnectBanner, { top: insets.top }]}
          testID="banner-reconnect"
        >
          {offlinePermanent ? (
            <Feather name="wifi-off" size={14} color={GameColors.gold} style={styles.reconnectSpinner} />
          ) : (
            <ActivityIndicator size="small" color={GameColors.gold} style={styles.reconnectSpinner} />
          )}
          <ThemedText style={styles.reconnectText}>
            {offlinePermanent ? "Unable to reach server — tap to retry" : "Connecting to server…"}
          </ThemedText>
        </Pressable>
      ) : null}

      <Pressable
        onPress={handleSettings}
        style={[styles.settingsButton, { top: insets.top + Spacing.lg }]}
      >
        <Feather name="settings" size={24} color="rgba(255,255,255,0.7)" />
      </Pressable>

      <View
        style={[
          styles.content,
          { paddingTop: insets.top + 80, paddingBottom: insets.bottom + 40 },
        ]}
      >
        <Animated.View
          entering={FadeIn.delay(200).duration(600)}
          style={styles.titleContainer}
        >
          <View style={styles.crownContainer}>
            <Feather name="award" size={48} color={GameColors.gold} />
          </View>
          <ThemedText style={styles.title}>QUEENS</ThemedText>
          <ThemedText style={[styles.subtitle, { fontSize: fs(16) }]}>The Card Game</ThemedText>
        </Animated.View>

        <Animated.View
          entering={FadeIn.delay(400).duration(600)}
          style={styles.cardDecorations}
        >
          <View style={styles.decorativeCard}>
            <Feather name="heart" size={32} color={GameColors.redSuit} />
          </View>
          <View style={[styles.decorativeCard, styles.decorativeCardOffset]}>
            <ThemedText style={styles.decorativeQ}>Q</ThemedText>
          </View>
        </Animated.View>

        <Animated.View
          entering={FadeIn.delay(600).duration(600)}
          style={styles.buttonsContainer}
        >
          {hasActiveGame ? (
            <GameButton
              label="Resume Game"
              icon="refresh-cw"
              variant="primary"
              size="large"
              onPress={handleResumeGame}
              disabled={isOffline}
              style={styles.playButton}
            />
          ) : null}
          <GameButton
            label={hasActiveGame ? "New Game" : "Play"}
            icon="play"
            variant={hasActiveGame ? "outline" : "primary"}
            size={hasActiveGame ? "normal" : "large"}
            onPress={handlePlay}
            disabled={isOffline}
            style={styles.playButton}
          />
          <GameButton
            label="How to Play"
            icon="book-open"
            variant="outline"
            size="normal"
            onPress={handleRules}
            style={styles.rulesButton}
          />
        </Animated.View>

        <Animated.View
          entering={FadeIn.delay(800).duration(600)}
          style={styles.footer}
        >
          <ThemedText style={[styles.footerText, { fontSize: fs(13) }]}>
            A classic rummy-style card game
          </ThemedText>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: GameColors.casinoGreenDark,
  },
  feltOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  settingsButton: {
    position: "absolute",
    right: Spacing.lg,
    zIndex: 10,
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    flex: 1,
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
  },
  titleContainer: {
    alignItems: "center",
    gap: Spacing.sm,
  },
  crownContainer: {
    marginBottom: Spacing.md,
  },
  title: {
    ...Typography.hero,
    color: GameColors.gold,
    letterSpacing: 8,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 8,
  },
  subtitle: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 16,
    letterSpacing: 4,
    textTransform: "uppercase",
  },
  cardDecorations: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
  },
  decorativeCard: {
    width: 80,
    height: 112,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
    overflow: "visible",
  },
  decorativeCardOffset: {
    marginLeft: -20,
    transform: [{ rotate: "10deg" }],
  },
  decorativeQ: {
    fontSize: 48,
    lineHeight: 56,
    fontWeight: "700",
    color: GameColors.blackSuit,
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  buttonsContainer: {
    width: "100%",
    gap: Spacing.lg,
    alignItems: "center",
  },
  playButton: {
    width: "100%",
    maxWidth: 280,
  },
  rulesButton: {
    width: "100%",
    maxWidth: 280,
  },
  footer: {
    alignItems: "center",
  },
  footerText: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 13,
  },
  reconnectBanner: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.75)",
    paddingVertical: 8,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  reconnectSpinner: {
    marginRight: 4,
  },
  reconnectText: {
    color: GameColors.gold,
    fontSize: 13,
    letterSpacing: 0.5,
  },
});
