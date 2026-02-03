import React from "react";
import { StyleSheet, Pressable, ViewStyle, StyleProp } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { GameColors, BorderRadius, Spacing } from "@/constants/theme";

interface GameButtonProps {
  label: string;
  icon?: keyof typeof Feather.glyphMap;
  variant?: "primary" | "secondary" | "outline" | "danger";
  size?: "small" | "normal" | "large";
  disabled?: boolean;
  loading?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function GameButton({
  label,
  icon,
  variant = "primary",
  size = "normal",
  disabled = false,
  loading = false,
  onPress,
  style,
}: GameButtonProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (!disabled && !loading) {
      scale.value = withSpring(0.95, { damping: 15, stiffness: 200 });
    }
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 200 });
  };

  const handlePress = () => {
    if (disabled || loading || !onPress) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {
      // Haptics not available on web
    }
    onPress();
  };

  const getBackgroundColor = () => {
    if (disabled) return "rgba(255,255,255,0.1)";
    switch (variant) {
      case "primary":
        return GameColors.gold;
      case "secondary":
        return GameColors.richWood;
      case "danger":
        return "#F44336";
      case "outline":
        return "transparent";
      default:
        return GameColors.gold;
    }
  };

  const getTextColor = () => {
    if (disabled) return "rgba(255,255,255,0.4)";
    switch (variant) {
      case "primary":
        return "#000000";
      case "outline":
        return GameColors.gold;
      default:
        return "#FFFFFF";
    }
  };

  const getBorderColor = () => {
    if (variant === "outline") {
      return disabled ? "rgba(255,255,255,0.2)" : GameColors.gold;
    }
    return "transparent";
  };

  const getPadding = () => {
    switch (size) {
      case "small":
        return { paddingVertical: Spacing.sm, paddingHorizontal: Spacing.lg };
      case "large":
        return { paddingVertical: Spacing.xl, paddingHorizontal: Spacing["3xl"] };
      default:
        return { paddingVertical: Spacing.md, paddingHorizontal: Spacing.xl };
    }
  };

  const getFontSize = () => {
    switch (size) {
      case "small":
        return 14;
      case "large":
        return 18;
      default:
        return 16;
    }
  };

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      style={[
        styles.button,
        {
          backgroundColor: getBackgroundColor(),
          borderColor: getBorderColor(),
          borderWidth: variant === "outline" ? 2 : 0,
          ...getPadding(),
        },
        style,
        animatedStyle,
      ]}
    >
      {icon ? (
        <Feather
          name={icon}
          size={getFontSize() + 2}
          color={getTextColor()}
          style={styles.icon}
        />
      ) : null}
      <ThemedText
        style={[
          styles.label,
          { color: getTextColor(), fontSize: getFontSize() },
        ]}
      >
        {loading ? "..." : label}
      </ThemedText>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  icon: {},
  label: {
    fontWeight: "600",
  },
});
