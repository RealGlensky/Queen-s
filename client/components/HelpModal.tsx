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
    { key: "basics", label: "Basics", icon: "book-open" },
    { key: "scoring", label: "Scoring", icon: "award" },
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
      <SectionCard title="Objective" icon="target">
        <ThemedText style={styles.text}>
          Be the first player (or team) to reach the point threshold by laying down sets of matching cards and going out before your opponents.
        </ThemedText>
      </SectionCard>

      <SectionCard title="Game Modes" icon="users">
        <BulletPoint>
          <ThemedText style={styles.boldText}>Solo Mode:</ThemedText>
          <ThemedText style={styles.text}> 2-6 players compete individually. First to 1000 points wins.</ThemedText>
        </BulletPoint>
        <BulletPoint>
          <ThemedText style={styles.boldText}>2v2 Teams:</ThemedText>
          <ThemedText style={styles.text}> 4 players in 2 teams. First team to 1500 points wins.</ThemedText>
        </BulletPoint>
      </SectionCard>

      <SectionCard title="Turn Structure" icon="rotate-cw">
        <BulletPoint number={1}>
          <ThemedText style={styles.boldText}>Draw:</ThemedText>
          <ThemedText style={styles.text}> Take a card from the deck OR pick up the discard pile (if you can use the top card).</ThemedText>
        </BulletPoint>
        <BulletPoint number={2}>
          <ThemedText style={styles.boldText}>Play:</ThemedText>
          <ThemedText style={styles.text}> Lay down sets of 3+ matching cards, or add cards to existing sets.</ThemedText>
        </BulletPoint>
        <BulletPoint number={3}>
          <ThemedText style={styles.boldText}>Discard:</ThemedText>
          <ThemedText style={styles.text}> End your turn by discarding one card to the pile.</ThemedText>
        </BulletPoint>
      </SectionCard>

      <SectionCard title="Sets" icon="layers">
        <ThemedText style={styles.text}>
          A valid set contains 3 or more cards of the same rank. For example: three 7s, four Kings, or five Aces.
        </ThemedText>
        <View style={styles.spacer} />
        <ThemedText style={styles.text}>
          You can add cards to your own sets (or your teammate's sets in 2v2 mode) to increase your score.
        </ThemedText>
      </SectionCard>

      <SectionCard title="Wild Cards" icon="star">
        <ThemedText style={styles.text}>
          <ThemedText style={styles.boldText}>2s are wild!</ThemedText> They can substitute for any rank when forming sets.
        </ThemedText>
        <View style={styles.spacer} />
        <ThemedText style={styles.text}>
          A set can have at most one wild card. Wild 2s are worth 20 points when laid down.
        </ThemedText>
      </SectionCard>

      <SectionCard title="Picking Up the Pile" icon="download">
        <ThemedText style={styles.text}>
          Instead of drawing from the deck, you can pick up the entire discard pile IF you have at least 2 cards that match the top card.
        </ThemedText>
        <View style={styles.spacer} />
        <ThemedText style={styles.text}>
          This is powerful for building big sets but gives you more cards to get rid of!
        </ThemedText>
      </SectionCard>

      <SectionCard title="Last Card" icon="alert-circle">
        <ThemedText style={styles.text}>
          When you have exactly 1 card left, you must declare "Last Card!" before your next turn. If you forget and go out, you receive a penalty.
        </ThemedText>
      </SectionCard>
    </View>
  );
}

function ScoringContent() {
  return (
    <View style={styles.section}>
      <SectionCard title="Card Values" icon="hash">
        <View style={styles.scoreTable}>
          <ScoreRow label="Number cards (3-10)" value="Face value" />
          <ScoreRow label="Jacks, Queens, Kings" value="10 points" />
          <ScoreRow label="Aces" value="15 points" />
          <ScoreRow label="2s (Wild)" value="20 points" />
          <ScoreRow label="Jokers" value="50 points" />
        </View>
      </SectionCard>

      <SectionCard title="Scoring Rounds" icon="bar-chart-2">
        <BulletPoint>
          <ThemedText style={styles.text}>When a player goes out (discards their last card), the round ends.</ThemedText>
        </BulletPoint>
        <BulletPoint>
          <ThemedText style={styles.boldText}>Winner:</ThemedText>
          <ThemedText style={styles.text}> Gets points from all cards in their laid sets.</ThemedText>
        </BulletPoint>
        <BulletPoint>
          <ThemedText style={styles.boldText}>Other players:</ThemedText>
          <ThemedText style={styles.text}> Lose points equal to cards left in their hand.</ThemedText>
        </BulletPoint>
      </SectionCard>

      <SectionCard title="Team Scoring (2v2)" icon="users">
        <ThemedText style={styles.text}>
          In 2v2 mode, when one player goes out, their teammate's remaining hand cards are NOT counted as penalties.
        </ThemedText>
        <View style={styles.spacer} />
        <ThemedText style={styles.text}>
          Team scores are combined. First team to reach 1500 points wins!
        </ThemedText>
      </SectionCard>

      <SectionCard title="Perfect Cut Bonus" icon="gift">
        <ThemedText style={styles.text}>
          If you go out by discarding exactly the right card (perfect timing), you earn a bonus 50 points!
        </ThemedText>
      </SectionCard>
    </View>
  );
}

function TipsContent() {
  return (
    <View style={styles.section}>
      <SectionCard title="Strategy Tips" icon="lightbulb">
        <BulletPoint>
          <ThemedText style={styles.boldText}>Hold onto 2s:</ThemedText>
          <ThemedText style={styles.text}> Wild cards are valuable for completing sets.</ThemedText>
        </BulletPoint>
        <BulletPoint>
          <ThemedText style={styles.boldText}>Watch the pile:</ThemedText>
          <ThemedText style={styles.text}> Picking up can be powerful but also risky.</ThemedText>
        </BulletPoint>
        <BulletPoint>
          <ThemedText style={styles.boldText}>Lay sets early:</ThemedText>
          <ThemedText style={styles.text}> Don't hold cards too long - secure your points!</ThemedText>
        </BulletPoint>
        <BulletPoint>
          <ThemedText style={styles.boldText}>Discard high cards:</ThemedText>
          <ThemedText style={styles.text}> Get rid of Aces and face cards you can't use.</ThemedText>
        </BulletPoint>
      </SectionCard>

      <SectionCard title="Game Controls" icon="hand">
        <BulletPoint>
          <ThemedText style={styles.boldText}>Tap cards:</ThemedText>
          <ThemedText style={styles.text}> Select cards from your hand.</ThemedText>
        </BulletPoint>
        <BulletPoint>
          <ThemedText style={styles.boldText}>Tap deck:</ThemedText>
          <ThemedText style={styles.text}> Draw a new card.</ThemedText>
        </BulletPoint>
        <BulletPoint>
          <ThemedText style={styles.boldText}>Tap pickup pile:</ThemedText>
          <ThemedText style={styles.text}> Pick up the discard pile (when valid).</ThemedText>
        </BulletPoint>
        <BulletPoint>
          <ThemedText style={styles.boldText}>Lay Set button:</ThemedText>
          <ThemedText style={styles.text}> Select 3+ matching cards, then tap to lay them.</ThemedText>
        </BulletPoint>
        <BulletPoint>
          <ThemedText style={styles.boldText}>Tap your sets:</ThemedText>
          <ThemedText style={styles.text}> Add selected cards to existing sets.</ThemedText>
        </BulletPoint>
      </SectionCard>

      <SectionCard title="Reading the Screen" icon="monitor">
        <BulletPoint>
          <ThemedText style={styles.boldText}>Player icons:</ThemedText>
          <ThemedText style={styles.text}> Shows all players, their card count, and whose turn it is.</ThemedText>
        </BulletPoint>
        <BulletPoint>
          <ThemedText style={styles.boldText}>Score display:</ThemedText>
          <ThemedText style={styles.text}> Your score (or team score) appears at the top.</ThemedText>
        </BulletPoint>
        <BulletPoint>
          <ThemedText style={styles.boldText}>Round info:</ThemedText>
          <ThemedText style={styles.text}> Shows current round and point goal.</ThemedText>
        </BulletPoint>
        <BulletPoint>
          <ThemedText style={styles.boldText}>Highlighted cards:</ThemedText>
          <ThemedText style={styles.text}> Newly acquired cards glow briefly.</ThemedText>
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
