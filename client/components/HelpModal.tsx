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

type TabType = "controls" | "rules" | "tips";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export function HelpModal({ visible, onClose }: HelpModalProps) {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<TabType>("controls");

  const tabs: { key: TabType; label: string; icon: string }[] = [
    { key: "controls", label: "Controls", icon: "hand" },
    { key: "rules", label: "Rules", icon: "book-open" },
    { key: "tips", label: "Tips", icon: "zap" },
  ];

  const contentHeight = SCREEN_HEIGHT * 0.6;

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
            style={[styles.content, { height: contentHeight }]}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={true}
          >
            {activeTab === "controls" ? <ControlsContent /> : null}
            {activeTab === "rules" ? <RulesContent /> : null}
            {activeTab === "tips" ? <TipsContent /> : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function ControlsContent() {
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
          <ThemedText style={styles.text}>If you can match the top card of the pile, </ThemedText>
          <ThemedText style={styles.boldText}>tap the pile</ThemedText>
          <ThemedText style={styles.text}> to take ALL cards from it. (See Rules tab for pickup requirements.)</ThemedText>
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
          <ThemedText style={styles.text}> (your own or teammate's in 2v2) to add the card to it.</ThemedText>
        </BulletPoint>
        <View style={styles.spacer} />
        <ThemedText style={styles.noteText}>
          You must always keep at least 1 card in hand so you can discard to end your turn.
        </ThemedText>
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

function RulesContent() {
  return (
    <View style={styles.section}>
      <SectionCard title="Goal of the Game" icon="target">
        <ThemedText style={styles.text}>
          Build sets of matching cards to earn points. The first player (or team) to reach the point threshold wins the game. Points come from cards you've laid on the table, minus any cards left in your hand when a round ends.
        </ThemedText>
      </SectionCard>

      <SectionCard title="Valid Sets" icon="layers">
        <BulletPoint>
          <ThemedText style={styles.text}>A set is </ThemedText>
          <ThemedText style={styles.boldText}>3 or more cards</ThemedText>
          <ThemedText style={styles.text}> of the same rank (e.g., three 7s, four Kings).</ThemedText>
        </BulletPoint>
        <BulletPoint>
          <ThemedText style={styles.text}>You need at least </ThemedText>
          <ThemedText style={styles.boldText}>2 natural (non-wild) cards</ThemedText>
          <ThemedText style={styles.text}> in every set.</ThemedText>
        </BulletPoint>
        <BulletPoint>
          <ThemedText style={styles.boldText}>2s are wild</ThemedText>
          <ThemedText style={styles.text}> - they can substitute for any rank in a set. Only one wild card (2) is allowed per set.</ThemedText>
        </BulletPoint>
        <BulletPoint>
          <ThemedText style={styles.boldText}>Jokers</ThemedText>
          <ThemedText style={styles.text}> are not wild. They can only be used in a set of jokers (e.g., 2 jokers + a wild 2).</ThemedText>
        </BulletPoint>
      </SectionCard>

      <SectionCard title="Picking Up the Pile" icon="download">
        <ThemedText style={styles.text}>
          Instead of drawing from the deck, you can pick up the entire discard pile if you meet the requirements:
        </ThemedText>
        <View style={styles.spacer} />
        <ThemedText style={styles.highlightText}>Normal card on top:</ThemedText>
        <BulletPoint>
          <ThemedText style={styles.text}>You need </ThemedText>
          <ThemedText style={styles.boldText}>2 cards matching</ThemedText>
          <ThemedText style={styles.text}> the top card's rank, or 1 matching card + 1 wild (2).</ThemedText>
        </BulletPoint>
        <View style={styles.spacer} />
        <ThemedText style={styles.highlightText}>Wild card (2) on top:</ThemedText>
        <BulletPoint>
          <ThemedText style={styles.text}>You need </ThemedText>
          <ThemedText style={styles.boldText}>2 natural cards of the same rank</ThemedText>
          <ThemedText style={styles.text}> (any rank). You cannot use another 2 to help pick up a 2.</ThemedText>
        </BulletPoint>
        <View style={styles.spacer} />
        <ThemedText style={styles.noteText}>
          You take the entire pile - every card in it!
        </ThemedText>
      </SectionCard>

      <SectionCard title="Special Cards" icon="star">
        <BulletPoint>
          <ThemedText style={styles.boldText}>Queen of Spades</ThemedText>
          <ThemedText style={styles.text}> - The most valuable card in the game, worth </ThemedText>
          <ThemedText style={styles.boldText}>100 points</ThemedText>
          <ThemedText style={styles.text}>! It counts as a normal Queen for sets.</ThemedText>
        </BulletPoint>
        <BulletPoint>
          <ThemedText style={styles.boldText}>2s (Wild cards)</ThemedText>
          <ThemedText style={styles.text}> - Worth 20 points. Can substitute for any rank in a set (one per set).</ThemedText>
        </BulletPoint>
        <BulletPoint>
          <ThemedText style={styles.boldText}>Jokers</ThemedText>
          <ThemedText style={styles.text}> - Worth 50 points. Not wild - they can only form sets with other jokers (+ a wild 2).</ThemedText>
        </BulletPoint>
      </SectionCard>

      <SectionCard title="Card Values" icon="hash">
        <View style={styles.scoreTable}>
          <ScoreRow label="Queen of Spades" value="100 points" highlight />
          <ScoreRow label="Jokers" value="50 points" />
          <ScoreRow label="Aces" value="20 points" />
          <ScoreRow label="2s (Wild)" value="20 points" />
          <ScoreRow label="10, J, Q, K" value="10 points" />
          <ScoreRow label="Number cards (3-9)" value="5 points" />
        </View>
      </SectionCard>

      <SectionCard title="Ending a Round" icon="flag">
        <BulletPoint>
          <ThemedText style={styles.text}>A round ends when a player </ThemedText>
          <ThemedText style={styles.boldText}>discards their last card</ThemedText>
          <ThemedText style={styles.text}> (goes out).</ThemedText>
        </BulletPoint>
        <BulletPoint>
          <ThemedText style={styles.text}>You must declare "Last Card" when you're down to 1 card.</ThemedText>
        </BulletPoint>
      </SectionCard>

      <SectionCard title="Scoring" icon="bar-chart-2">
        <BulletPoint>
          <ThemedText style={styles.boldText}>Sets you laid:</ThemedText>
          <ThemedText style={styles.text}> You earn points for every card in your sets on the table.</ThemedText>
        </BulletPoint>
        <BulletPoint>
          <ThemedText style={styles.boldText}>Cards in hand:</ThemedText>
          <ThemedText style={styles.text}> You lose points for any cards still in your hand when the round ends.</ThemedText>
        </BulletPoint>
        <BulletPoint>
          <ThemedText style={styles.boldText}>Round score =</ThemedText>
          <ThemedText style={styles.text}> Set points - Hand penalty.</ThemedText>
        </BulletPoint>
      </SectionCard>

      <SectionCard title="Perfect Cut Bonus" icon="award">
        <ThemedText style={styles.text}>
          When dealing, if the deck is cut perfectly (exactly enough cards for all hands plus the first discard), the dealer earns a </ThemedText>
        <ThemedText style={styles.boldText}>100 point bonus</ThemedText>
        <ThemedText style={styles.text}> for that round!</ThemedText>
      </SectionCard>

      <SectionCard title="Deck Runs Out" icon="refresh-cw">
        <ThemedText style={styles.text}>
          If the draw deck runs out of cards, the discard pile is automatically reshuffled into a new deck so the game can continue.
        </ThemedText>
      </SectionCard>

      <SectionCard title="Game Modes" icon="users">
        <ThemedText style={styles.highlightText}>Solo Mode (2-6 players):</ThemedText>
        <BulletPoint>
          <ThemedText style={styles.text}>Every player plays for themselves.</ThemedText>
        </BulletPoint>
        <BulletPoint>
          <ThemedText style={styles.text}>First to </ThemedText>
          <ThemedText style={styles.boldText}>1,000 points</ThemedText>
          <ThemedText style={styles.text}> wins.</ThemedText>
        </BulletPoint>
        <View style={styles.spacer} />
        <ThemedText style={styles.highlightText}>2v2 Team Mode (4 players):</ThemedText>
        <BulletPoint>
          <ThemedText style={styles.text}>Two teams of two. Teammates sit across from each other.</ThemedText>
        </BulletPoint>
        <BulletPoint>
          <ThemedText style={styles.text}>First team to </ThemedText>
          <ThemedText style={styles.boldText}>1,500 points</ThemedText>
          <ThemedText style={styles.text}> wins.</ThemedText>
        </BulletPoint>
        <BulletPoint>
          <ThemedText style={styles.text}>You can </ThemedText>
          <ThemedText style={styles.boldText}>add cards to your teammate's sets</ThemedText>
          <ThemedText style={styles.text}>.</ThemedText>
        </BulletPoint>
        <BulletPoint>
          <ThemedText style={styles.text}>If you lay a set of the same rank as your teammate's, they </ThemedText>
          <ThemedText style={styles.boldText}>automatically merge</ThemedText>
          <ThemedText style={styles.text}>.</ThemedText>
        </BulletPoint>
        <BulletPoint>
          <ThemedText style={styles.text}>When your teammate goes out, </ThemedText>
          <ThemedText style={styles.boldText}>no hand penalty</ThemedText>
          <ThemedText style={styles.text}> for you.</ThemedText>
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

      <SectionCard title="Strategy" icon="target">
        <BulletPoint>
          <ThemedText style={styles.boldText}>Protect the Queen of Spades:</ThemedText>
          <ThemedText style={styles.text}> At 100 points, she's your biggest asset in a set - and your biggest liability stuck in hand.</ThemedText>
        </BulletPoint>
        <BulletPoint>
          <ThemedText style={styles.boldText}>Save your 2s wisely:</ThemedText>
          <ThemedText style={styles.text}> Wild cards help complete hard-to-build sets, but they're also 20 penalty points if caught in hand.</ThemedText>
        </BulletPoint>
        <BulletPoint>
          <ThemedText style={styles.boldText}>Lay sets early:</ThemedText>
          <ThemedText style={styles.text}> Don't hold cards too long - secure your points before someone goes out!</ThemedText>
        </BulletPoint>
        <BulletPoint>
          <ThemedText style={styles.boldText}>Discard high cards:</ThemedText>
          <ThemedText style={styles.text}> Get rid of Aces, face cards, and jokers you can't use to reduce penalty risk.</ThemedText>
        </BulletPoint>
        <BulletPoint>
          <ThemedText style={styles.boldText}>Watch the pile:</ThemedText>
          <ThemedText style={styles.text}> A big pile is tempting to pick up, but it also helps opponents if they grab it.</ThemedText>
        </BulletPoint>
        <BulletPoint>
          <ThemedText style={styles.boldText}>Team play:</ThemedText>
          <ThemedText style={styles.text}> Add cards to your teammate's sets to boost your shared score. Your sets merge automatically!</ThemedText>
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

function ScoreRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={[styles.scoreRow, highlight ? styles.scoreRowHighlight : undefined]}>
      <ThemedText style={[styles.scoreLabel, highlight ? styles.scoreLabelHighlight : undefined]}>{label}</ThemedText>
      <ThemedText style={[styles.scoreValue, highlight ? styles.scoreValueHighlight : undefined]}>{value}</ThemedText>
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
    flexGrow: 0,
    flexShrink: 0,
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
  noteText: {
    color: "rgba(255,200,100,0.9)",
    fontSize: 13,
    fontStyle: "italic",
    lineHeight: 18,
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
  scoreRowHighlight: {
    backgroundColor: "rgba(255,215,0,0.1)",
    borderRadius: 4,
    paddingHorizontal: 6,
  },
  scoreLabel: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 14,
  },
  scoreLabelHighlight: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  scoreValue: {
    color: GameColors.gold,
    fontSize: 14,
    fontWeight: "600",
  },
  scoreValueHighlight: {
    fontSize: 15,
    fontWeight: "700",
  },
});
