import React from "react";
import { StyleSheet, View, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { GameColors, Spacing, BorderRadius } from "@/constants/theme";

interface RuleSectionProps {
  title: string;
  icon: keyof typeof Feather.glyphMap;
  children: React.ReactNode;
}

function RuleSection({ title, icon, children }: RuleSectionProps) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Feather name={icon} size={20} color={GameColors.gold} />
        <ThemedText style={styles.sectionTitle}>{title}</ThemedText>
      </View>
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );
}

function RuleItem({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.ruleItem}>
      <View style={styles.bullet} />
      <ThemedText style={styles.ruleText}>{children}</ThemedText>
    </View>
  );
}

export default function RulesScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();

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
        <RuleSection title="Objective" icon="target">
          <RuleItem>Be the first player or team to reach the point threshold</RuleItem>
          <RuleItem>Solo play: 1000 points</RuleItem>
          <RuleItem>2v2 Teams: 1500 points</RuleItem>
        </RuleSection>

        <RuleSection title="Setup" icon="layers">
          <RuleItem>1 deck per 2 players (1-2 players: 1 deck, 3-4 players: 2 decks, etc.)</RuleItem>
          <RuleItem>Each player is dealt 13 cards</RuleItem>
          <RuleItem>One card is turned face-up to start the pickup pile</RuleItem>
          <RuleItem>Perfect cut bonus: If the dealer splits the deck perfectly, they earn 100 points!</RuleItem>
        </RuleSection>

        <RuleSection title="Taking Your Turn" icon="play">
          <RuleItem>Draw: Take the top card from the deck OR pick up the entire pickup pile</RuleItem>
          <RuleItem>To pick up the pile, you need 2 cards matching the top card (or 1 matching + 1 wild card)</RuleItem>
          <RuleItem>Play: Lay down new sets or add cards to existing sets</RuleItem>
          <RuleItem>Discard: End your turn by placing one card on the pickup pile</RuleItem>
        </RuleSection>

        <RuleSection title="Sets" icon="grid">
          <RuleItem>A set is 3 or more cards of the same rank (e.g., three 8s)</RuleItem>
          <RuleItem>You can use wild cards (2s) to complete sets</RuleItem>
          <RuleItem>Minimum 2 natural cards required for any set</RuleItem>
          <RuleItem>Once laid, you can add matching cards to your sets (or team's sets in 2v2)</RuleItem>
        </RuleSection>

        <RuleSection title="Wild Cards & Special Cards" icon="star">
          <RuleItem>All 2s are wild cards (20 points each)</RuleItem>
          <RuleItem>Jokers are worth 50 points each</RuleItem>
          <RuleItem>Queen of Spades is worth 100 points and must be placed on top of its set</RuleItem>
          <RuleItem>Aces are worth 20 points</RuleItem>
          <RuleItem>Face cards (J, Q, K) and 10s are worth 10 points</RuleItem>
          <RuleItem>All other cards are worth 5 points</RuleItem>
        </RuleSection>

        <RuleSection title="Blocking" icon="shield">
          <RuleItem>You can block the next player from picking up the pile</RuleItem>
          <RuleItem>Discard a card matching one of their existing sets</RuleItem>
          <RuleItem>They cannot pick up a pile topped with a card from a set they already have</RuleItem>
        </RuleSection>

        <RuleSection title="Going Out" icon="check-circle">
          <RuleItem>The round ends when a player has no cards left after discarding</RuleItem>
          <RuleItem>You must discard to go out - you can't end with 0 cards mid-turn</RuleItem>
          <RuleItem>Courtesy rule: Declare when you have one card left!</RuleItem>
        </RuleSection>

        <RuleSection title="Scoring" icon="award">
          <RuleItem>Cards in your sets = positive points</RuleItem>
          <RuleItem>Cards left in your hand = negative points</RuleItem>
          <RuleItem>The player who goes out scores first (no negative points from hand)</RuleItem>
          <RuleItem>In teams, all sets count for the team's score</RuleItem>
        </RuleSection>

        <RuleSection title="Team Play (2v2)" icon="users">
          <RuleItem>Teammates sit across from each other (not adjacent)</RuleItem>
          <RuleItem>Team shares one set collection - add cards to any teammate's set</RuleItem>
          <RuleItem>First team to 1500 points wins</RuleItem>
          <RuleItem>Lay sets early to help teammates shed cards!</RuleItem>
        </RuleSection>
      </ScrollView>
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
    gap: Spacing.xl,
  },
  section: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
  },
  sectionContent: {
    gap: Spacing.sm,
  },
  ruleItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: GameColors.gold,
    marginTop: 8,
  },
  ruleText: {
    flex: 1,
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
    lineHeight: 22,
  },
});
