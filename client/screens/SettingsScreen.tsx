import React, { useState, useEffect } from "react";
import { StyleSheet, View, TextInput, Switch, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";

import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ThemedText } from "@/components/ThemedText";
import { GameButton } from "@/components/GameButton";
import { GameColors, Spacing, BorderRadius } from "@/constants/theme";
import { useFontSize } from "@/contexts/FontSizeContext";

const STORAGE_KEYS = {
  DISPLAY_NAME: "@queens/displayName",
  HAPTICS_ENABLED: "@queens/hapticsEnabled",
  SOUND_ENABLED: "@queens/soundEnabled",
};

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { largeFontEnabled, toggleLargeFont, fs } = useFontSize();

  const [displayName, setDisplayName] = useState("");
  const [hapticsEnabled, setHapticsEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const [name, haptics, sound] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.DISPLAY_NAME),
        AsyncStorage.getItem(STORAGE_KEYS.HAPTICS_ENABLED),
        AsyncStorage.getItem(STORAGE_KEYS.SOUND_ENABLED),
      ]);
      if (name) setDisplayName(name);
      if (haptics !== null) setHapticsEnabled(haptics === "true");
      if (sound !== null) setSoundEnabled(sound === "true");
    } catch (error) {
      console.error("Failed to load settings:", error);
    }
  };

  const handleSave = async () => {
    try {
      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEYS.DISPLAY_NAME, displayName),
        AsyncStorage.setItem(STORAGE_KEYS.HAPTICS_ENABLED, String(hapticsEnabled)),
        AsyncStorage.setItem(STORAGE_KEYS.SOUND_ENABLED, String(soundEnabled)),
      ]);
      if (hapticsEnabled) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error("Failed to save settings:", error);
    }
  };

  const handleToggleHaptics = async (value: boolean) => {
    setHapticsEnabled(value);
    if (value) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleToggleLargeFont = async (value: boolean) => {
    toggleLargeFont(value);
    if (hapticsEnabled) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

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
            paddingTop: headerHeight + Spacing.lg,
            paddingBottom: insets.bottom + Spacing.xl,
          },
        ]}
      >
        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { fontSize: fs(14) }]}>Profile</ThemedText>
          <View style={styles.inputContainer}>
            <ThemedText style={[styles.inputLabel, { fontSize: fs(13) }]}>Display Name</ThemedText>
            <TextInput
              style={[styles.input, { fontSize: fs(16) }]}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Your name"
              placeholderTextColor="rgba(255,255,255,0.4)"
              maxLength={20}
              autoCapitalize="words"
            />
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { fontSize: fs(14) }]}>Preferences</ThemedText>
          
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Feather name="smartphone" size={20} color="#FFFFFF" />
              <View>
                <ThemedText style={[styles.settingLabel, { fontSize: fs(16) }]}>Haptic Feedback</ThemedText>
                <ThemedText style={[styles.settingDescription, { fontSize: fs(12) }]}>
                  Vibration on button presses
                </ThemedText>
              </View>
            </View>
            <Switch
              value={hapticsEnabled}
              onValueChange={handleToggleHaptics}
              trackColor={{ false: "rgba(255,255,255,0.2)", true: GameColors.gold }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Feather name="volume-2" size={20} color="#FFFFFF" />
              <View>
                <ThemedText style={[styles.settingLabel, { fontSize: fs(16) }]}>Sound Effects</ThemedText>
                <ThemedText style={[styles.settingDescription, { fontSize: fs(12) }]}>
                  Card and game sounds
                </ThemedText>
              </View>
            </View>
            <Switch
              value={soundEnabled}
              onValueChange={setSoundEnabled}
              trackColor={{ false: "rgba(255,255,255,0.2)", true: GameColors.gold }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { fontSize: fs(14) }]}>Accessibility</ThemedText>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Feather name="type" size={20} color="#FFFFFF" />
              <View>
                <ThemedText style={[styles.settingLabel, { fontSize: fs(16) }]}>Large Text</ThemedText>
                <ThemedText style={[styles.settingDescription, { fontSize: fs(12) }]}>
                  Increase text size throughout the game
                </ThemedText>
              </View>
            </View>
            <Switch
              value={largeFontEnabled}
              onValueChange={handleToggleLargeFont}
              trackColor={{ false: "rgba(255,255,255,0.2)", true: GameColors.gold }}
              thumbColor="#FFFFFF"
              testID="switch-large-text"
            />
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { fontSize: fs(14) }]}>About</ThemedText>
          <View style={styles.aboutContainer}>
            <ThemedText style={[styles.aboutText, { fontSize: fs(16) }]}>
              Queens - The Card Game
            </ThemedText>
            <ThemedText style={[styles.versionText, { fontSize: fs(12) }]}>
              Version 1.0.0
            </ThemedText>
          </View>
        </View>

        <View style={styles.actions}>
          <GameButton
            label={saved ? "Saved!" : "Save Settings"}
            icon={saved ? "check" : "save"}
            variant={saved ? "secondary" : "primary"}
            size="large"
            onPress={handleSave}
            style={styles.saveButton}
          />
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
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  inputContainer: {
    gap: Spacing.sm,
  },
  inputLabel: {
    color: "rgba(255,255,255,0.6)",
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    color: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: BorderRadius.sm,
    padding: Spacing.lg,
  },
  settingInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    flex: 1,
    marginRight: Spacing.md,
  },
  settingLabel: {
    color: "#FFFFFF",
    fontWeight: "500",
  },
  settingDescription: {
    color: "rgba(255,255,255,0.5)",
    marginTop: 2,
  },
  aboutContainer: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: BorderRadius.sm,
    padding: Spacing.lg,
    alignItems: "center",
    gap: Spacing.xs,
  },
  aboutText: {
    color: "#FFFFFF",
    fontWeight: "500",
  },
  versionText: {
    color: "rgba(255,255,255,0.5)",
  },
  actions: {
    paddingTop: Spacing.lg,
  },
  saveButton: {
    width: "100%",
  },
});
