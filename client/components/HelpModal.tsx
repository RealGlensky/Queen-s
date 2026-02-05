import React, { useState } from "react";
import {
  StyleSheet,
  View,
  Modal,
  ScrollView,
  Pressable,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { GameColors, Spacing, BorderRadius } from "@/constants/theme";

interface HelpModalProps {
  visible: boolean;
  onClose: () => void;
}

type TabType = "basics" | "scoring" | "tips";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export function HelpModal({ visible, onClose }: HelpModalProps) {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<TabType>("basics");

  const tabs: { key: TabType; label: string; icon: string }[] = [
    { key: "basics", label: "Controls", icon: "hand" },
    { key: "scoring", label: "Rules", icon: "book-open" },
    { key: "tips", label: "Tips", icon: "zap" },
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View
          style={[
            styles.container,
            {
              paddingTop: insets.top + Spacing.md,
              paddingBottom: insets.bottom + Spacing.lg,
              maxHeight: SCREEN_HEIGHT * 0.85,
            },
          ]}
        >
          <View style={styles.header}>
            <ThemedText style={styles.title}>How to Play Queens</ThemedText>
            <Pressable style={styles.closeButton} onPress={onClose}>
              <Feather name="x" size={24} color="#FFFFFF" />
            </Pressable>
          </View>

          <View style={styles.tabs}>
            {tabs.map((tab) => (
              <Pressable
                key={tab.key}
                style={[
                  styles.tab,
                  activeTab === tab.key && styles.tabActive,
                ]}
                onPress={() => setActiveTab(tab.key)}
              >
                <Feather
                  name={tab.icon as any}
                  size={16}
                  color={activeTab === tab.key ? GameColors.gold : "rgba(255,255,255,0.6)"}
                />
                <ThemedText
                  style={[
                    styles.tabText,
                    activeTab === tab.key && styles.tabTextActive,
                  ]}
                >
                  {tab.label}
                </ThemedText>
              </Pressable>
            ))}
          </View>

          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
            {activeTab === "basics" ? <BasicsContent /> : null}
            {activeTab === "scoring" ? <ScoringContent /> : null}
            {activeTab === "tips" ? <TipsContent /> : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function BasicsContent() {
  return (
    <View style={styles.section}>
      <SectionCard title="Your Turn - Step by Step" icon="play-circle">
        <ThemedText style={styles.text}>
          Each turn has 3 phases. Follow these steps in order:
        </ThemedText>
      </SectionCard>

      <SectionCard title="Step 1: Draw a Card" icon="download">
        <BulletPoint>
          <ThemedText style={styles.boldText}>Tap the deck</ThemedText>
          <ThemedText style={styles.text}> (face-down card pile) to draw 1 card into your hand.</ThemedText>
        </BulletPoint>
        <View style={styles.spacer} />
        <ThemedText style={styles.highlightText}>OR pick up the discard pile:</ThemedText>
        <BulletPoint>
          <ThemedText style={styles.text}>If you have 2+ cards matching the top card of the pile, </ThemedText>
          <ThemedText style={styles.boldText}>tap the pile</ThemedText>
          <ThemedText style={styles.text}> to take ALL cards from it.</ThemedText>
        </BulletPoint>
      </SectionCard>

      <SectionCard title="Step 2: Play Cards (Optional)" icon="layers">
        <ThemedText style={styles.highlightText}>Lay down a new set:</ThemedText>
        <BulletPoint number={1}>
          <ThemedText style={styles.boldText}>Tap cards</ThemedText>
          <ThemedText style={styles.text}> in your hand to select 3+ matching cards.</ThemedText>
        </BulletPoint>
        <BulletPoint number={2}>
          <ThemedText style={styles.text}>Selected cards rise up and get highlighted.</ThemedText>
        </BulletPoint>
        <BulletPoint number={3}>
          <ThemedText style={styles.boldText}>Tap "Lay Set"</ThemedText>
          <ThemedText style={styles.text}> button to place them on the table.</ThemedText>
        </BulletPoint>
        <View style={styles.spacer} />
        <ThemedText style={styles.highlightText}>Add to existing sets:</ThemedText>
        <BulletPoint number={1}>
          <ThemedText style={styles.boldText}>Tap a card</ThemedText>
          <ThemedText style={styles.text}> in your hand that matches a set on the table.</ThemedText>
        </BulletPoint>
        <BulletPoint number={2}>
          <ThemedText style={styles.boldText}>Tap the set</ThemedText>
          <ThemedText style={styles.text}> (your own or teammate's) to add the card to it.</ThemedText>
        </BulletPoint>
      </SectionCard>

      <SectionCard title="Step 3: Discard" icon="arrow-down-circle">
        <BulletPoint number={1}>
          <ThemedText style={styles.boldText}>Tap a card</ThemedText>
          <ThemedText style={styles.text}> in your hand to select it.</ThemedText>
        </BulletPoint>
        <BulletPoint number={2}>
          <ThemedText style={styles.boldText}>Tap "Discard"</ThemedText>
          <ThemedText style={styles.text}> button to end your turn.</ThemedText>
        </BulletPoint>
        <View style={styles.spacer} />
        <ThemedText style={styles.text}>
          Your turn ends after discarding. The next player then takes their turn.
        </ThemedText>
      </SectionCard>

      <SectionCard title="Selecting Cards" icon="mouse-pointer">
        <BulletPoint>
          <ThemedText style={styles.boldText}>Tap once</ThemedText>
          <ThemedText style={styles.text}> to select a card (it moves up).</ThemedText>
        </BulletPoint>
        <BulletPoint>
          <ThemedText style={styles.boldText}>Tap again</ThemedText>
          <ThemedText style={styles.text}> to deselect it.</ThemedText>
        </BulletPoint>
        <BulletPoint>
          <ThemedText style={styles.text}>You can select multiple cards at once for laying sets.</ThemedText>
        </BulletPoint>
      </SectionCard>

      <SectionCard title="Last Card Warning" icon="alert-circle">
        <ThemedText style={styles.text}>
          When you have exactly 1 card left, tap the </ThemedText>
        <ThemedText style={styles.boldText}>"Last Card!"</ThemedText>
        <ThemedText style={styles.text}> button that appears. You must declare this before going out!</ThemedText>
      </SectionCard>
    </View>
  );
}

function ScoringContent() {
  return (
    <View style={styles.section}>
      <SectionCard title="Valid Sets" icon="layers">
        <BulletPoint>
          <ThemedText style={styles.text}>A set is 3 or more cards of the </ThemedText>
          <ThemedText style={styles.boldText}>same rank</ThemedText>
          <ThemedText style={styles.text}> (e.g., three 7s, four Kings).</ThemedText>
        </BulletPoint>
        <BulletPoint>
          <ThemedText style={styles.boldText}>2s are wild</ThemedText>
          <ThemedText style={styles.text}> - they can substitute for any rank in a set.</ThemedText>
        </BulletPoint>
        <BulletPoint>
          <ThemedText style={styles.text}>Each set can only have </ThemedText>
          <ThemedText style={styles.boldText}>one wild card (2)</ThemedText>
          <ThemedText style={styles.text}>.</ThemedText>
        </BulletPoint>
      </SectionCard>

      <SectionCard title="Picking Up the Pile" icon="download">
        <ThemedText style={styles.text}>
          To pick up the discard pile instead of drawing:
        </ThemedText>
        <BulletPoint>
          <ThemedText style={styles.text}>You must have </ThemedText>
          <ThemedText style={styles.boldText}>2+ cards matching</ThemedText>
          <ThemedText style={styles.text}> the top card of the pile.</ThemedText>
        </BulletPoint>
        <BulletPoint>
          <ThemedText style={styles.text}>You take the </ThemedText>
          <ThemedText style={styles.boldText}>entire pile</ThemedText>
          <ThemedText style={styles.text}> (all cards in it).</ThemedText>
        </BulletPoint>
      </SectionCard>

      <SectionCard title="Card Values" icon="hash">
        <View style={styles.scoreTable}>
          <ScoreRow label="Number cards (3-10)" value="Face value" />
          <ScoreRow label="Jacks, Queens, Kings" value="10 points" />
          <ScoreRow label="Aces" value="15 points" />
          <ScoreRow label="2s (Wild)" value="20 points" />
          <ScoreRow label="Jokers" value="50 points" />
        </View>
      </SectionCard>

      <SectionCard title="Scoring" icon="bar-chart-2">
        <BulletPoint>
          <ThemedText style={styles.text}>Round ends when someone discards their last card.</ThemedText>
        </BulletPoint>
        <BulletPoint>
          <ThemedText style={styles.boldText}>Winner:</ThemedText>
          <ThemedText style={styles.text}> Gets points from cards in their laid sets.</ThemedText>
        </BulletPoint>
        <BulletPoint>
          <ThemedText style={styles.boldText}>Others:</ThemedText>
          <ThemedText style={styles.text}> Lose points for cards left in hand.</ThemedText>
        </BulletPoint>
      </SectionCard>

      <SectionCard title="Winning the Game" icon="award">
        <BulletPoint>
          <ThemedText style={styles.boldText}>Solo Mode:</ThemedText>
          <ThemedText style={styles.text}> First to 1000 points wins.</ThemedText>
        </BulletPoint>
        <BulletPoint>
          <ThemedText style={styles.boldText}>2v2 Teams:</ThemedText>
          <ThemedText style={styles.text}> First team to 1500 points wins. Teammate's hand penalty doesn't count when you go out.</ThemedText>
        </BulletPoint>
      </SectionCard>
    </View>
  );
}

function TipsContent() {
  return (
    <View style={styles.section}>
      <SectionCard title="Reading the Screen" icon="monitor">
        <BulletPoint>
          <ThemedText style={styles.boldText}>Player bar (top):</ThemedText>
          <ThemedText style={styles.text}> Shows all players, their card count, and who is currently playing (highlighted).</ThemedText>
        </BulletPoint>
        <BulletPoint>
          <ThemedText style={styles.boldText}>Deck & Pile (center):</ThemedText>
          <ThemedText style={styles.text}> Left is the draw deck, right is the discard pile.</ThemedText>
        </BulletPoint>
        <BulletPoint>
          <ThemedText style={styles.boldText}>Your hand (bottom):</ThemedText>
          <ThemedText style={styles.text}> Your cards appear at the bottom. Scroll to see all cards.</ThemedText>
        </BulletPoint>
        <BulletPoint>
          <ThemedText style={styles.boldText}>Laid sets (above hand):</ThemedText>
          <ThemedText style={styles.text}> Your sets and teammates' sets appear here.</ThemedText>
        </BulletPoint>
      </SectionCard>

      <SectionCard title="Visual Indicators" icon="eye">
        <BulletPoint>
          <ThemedText style={styles.boldText}>Gold border:</ThemedText>
          <ThemedText style={styles.text}> Indicates it's that player's turn.</ThemedText>
        </BulletPoint>
        <BulletPoint>
          <ThemedText style={styles.boldText}>Raised card:</ThemedText>
          <ThemedText style={styles.text}> Card is selected in your hand.</ThemedText>
        </BulletPoint>
        <BulletPoint>
          <ThemedText style={styles.boldText}>Glowing cards:</ThemedText>
          <ThemedText style={styles.text}> Newly drawn or picked up cards glow briefly.</ThemedText>
        </BulletPoint>
        <BulletPoint>
          <ThemedText style={styles.boldText}>Team colors:</ThemedText>
          <ThemedText style={styles.text}> In 2v2, green = your team, blue = opponents.</ThemedText>
        </BulletPoint>
      </SectionCard>

      <SectionCard title="Strategy Tips" icon="lightbulb">
        <BulletPoint>
          <ThemedText style={styles.boldText}>Save your 2s:</ThemedText>
          <ThemedText style={styles.text}> Wild cards help complete hard-to-build sets.</ThemedText>
        </BulletPoint>
        <BulletPoint>
          <ThemedText style={styles.boldText}>Lay sets early:</ThemedText>
          <ThemedText style={styles.text}> Don't hold cards too long - secure your points!</ThemedText>
        </BulletPoint>
        <BulletPoint>
          <ThemedText style={styles.boldText}>Discard high cards:</ThemedText>
          <ThemedText style={styles.text}> Get rid of Aces and face cards you can't use.</ThemedText>
        </BulletPoint>
        <BulletPoint>
          <ThemedText style={styles.boldText}>Watch the pile size:</ThemedText>
          <ThemedText style={styles.text}> Big pile = big risk if someone else picks it up!</ThemedText>
        </BulletPoint>
      </SectionCard>
    </View>
  );
}

function SectionCard({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Feather name={icon as any} size={18} color={GameColors.gold} />
        <ThemedText style={styles.cardTitle}>{title}</ThemedText>
      </View>
      <View style={styles.cardContent}>{children}</View>
    </View>
  );
}

function BulletPoint({ children, number }: { children: React.ReactNode; number?: number }) {
  return (
    <View style={styles.bulletPoint}>
      {number ? (
        <View style={styles.numberBadge}>
          <ThemedText style={styles.numberText}>{number}</ThemedText>
        </View>
      ) : (
        <View style={styles.bullet} />
      )}
      <View style={styles.bulletContent}>{children}</View>
    </View>
  );
}

function ScoreRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.scoreRow}>
      <ThemedText style={styles.scoreLabel}>{label}</ThemedText>
      <ThemedText style={styles.scoreValue}>{value}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  container: {
    backgroundColor: GameColors.casinoGreenDark,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.lg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "700",
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  tabs: {
    flexDirection: "row",
    backgroundColor: "rgba(0,0,0,0.2)",
    borderRadius: BorderRadius.md,
    padding: 4,
    marginBottom: Spacing.lg,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  tabActive: {
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  tabText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 13,
    fontWeight: "500",
  },
  tabTextActive: {
    color: GameColors.gold,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: Spacing.xl,
  },
  section: {
    gap: Spacing.md,
  },
  card: {
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  cardTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  cardContent: {
    gap: Spacing.xs,
  },
  text: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 14,
    lineHeight: 20,
  },
  boldText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  highlightText: {
    color: GameColors.gold,
    fontSize: 14,
    fontWeight: "600",
    marginTop: Spacing.xs,
  },
  spacer: {
    height: Spacing.xs,
  },
  bulletPoint: {
    flexDirection: "row",
    gap: Spacing.sm,
    paddingVertical: 2,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: GameColors.gold,
    marginTop: 7,
  },
  bulletContent: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
  },
  numberBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: GameColors.gold,
    justifyContent: "center",
    alignItems: "center",
  },
  numberText: {
    color: "#000000",
    fontSize: 12,
    fontWeight: "700",
  },
  scoreTable: {
    gap: Spacing.xs,
  },
  scoreRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  scoreLabel: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 14,
  },
  scoreValue: {
    color: GameColors.gold,
    fontSize: 14,
    fontWeight: "600",
  },
});
