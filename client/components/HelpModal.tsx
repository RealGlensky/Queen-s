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
import { useFontSize } from "@/contexts/FontSizeContext";

interface HelpModalProps {
  visible: boolean;
  onClose: () => void;
}

type TabType = "controls" | "rules" | "tips";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export function HelpModal({ visible, onClose }: HelpModalProps) {
  const insets = useSafeAreaInsets();
  const { fs, largeFontEnabled } = useFontSize();
  const [activeTab, setActiveTab] = useState<TabType>("controls");

  const tabs: { key: TabType; label: string; icon: string }[] = [
    { key: "controls", label: "Controls", icon: "hand" },
    { key: "rules", label: "Rules", icon: "book-open" },
    { key: "tips", label: "Tips", icon: "zap" },
  ];

  const contentHeight = SCREEN_HEIGHT * (largeFontEnabled ? 0.82 : 0.62);

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
            <ThemedText style={[styles.title, { fontSize: fs(22) }]}>How to Play Queens</ThemedText>
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
                  size={fs(16)}
                  color={activeTab === tab.key ? GameColors.gold : "rgba(255,255,255,0.6)"}
                />
                <ThemedText
                  style={[
                    styles.tabText,
                    { fontSize: fs(13) },
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
  const { fs } = useFontSize();
  return (
    <View style={styles.section}>
      <SectionCard title="Your Turn - Step by Step" icon="play-circle">
        <ThemedText style={[styles.text, { fontSize: fs(14) }]}>
          Each turn has 3 phases. Follow these steps in order:
        </ThemedText>
      </SectionCard>

      <SectionCard title="Step 1: Draw a Card" icon="download">
        <BulletPoint>
          <ThemedText style={[styles.boldText, { fontSize: fs(14) }]}>Tap the deck</ThemedText>
          <ThemedText style={[styles.text, { fontSize: fs(14) }]}> (face-down card pile) to draw 1 card into your hand.</ThemedText>
        </BulletPoint>
        <View style={styles.spacer} />
        <ThemedText style={[styles.highlightText, { fontSize: fs(14) }]}>OR pick up the discard pile:</ThemedText>
        <BulletPoint number={1}>
          <ThemedText style={[styles.text, { fontSize: fs(14) }]}>First, </ThemedText>
          <ThemedText style={[styles.boldText, { fontSize: fs(14) }]}>tap the 2 matching cards</ThemedText>
          <ThemedText style={[styles.text, { fontSize: fs(14) }]}> in your hand to select them. You need 2 cards that match the top card's rank (or 1 matching + 1 wild 2).</ThemedText>
        </BulletPoint>
        <BulletPoint number={2}>
          <ThemedText style={[styles.text, { fontSize: fs(14) }]}>The pile will </ThemedText>
          <ThemedText style={[styles.boldText, { fontSize: fs(14) }]}>glow/highlight</ThemedText>
          <ThemedText style={[styles.text, { fontSize: fs(14) }]}> when you have valid matching cards selected.</ThemedText>
        </BulletPoint>
        <BulletPoint number={3}>
          <ThemedText style={[styles.boldText, { fontSize: fs(14) }]}>Tap the pile</ThemedText>
          <ThemedText style={[styles.text, { fontSize: fs(14) }]}> to pick up ALL cards from it. The matching cards stay in your hand.</ThemedText>
        </BulletPoint>
        <View style={styles.spacer} />
        <ThemedText style={[styles.noteText, { fontSize: fs(13) }]}>
          If a wild 2 is on top, you need 2 natural cards of the same rank (any rank) - you cannot use another 2. See Rules tab for full details.
        </ThemedText>
      </SectionCard>

      <SectionCard title="Step 2: Play Cards (Optional)" icon="layers">
        <ThemedText style={[styles.highlightText, { fontSize: fs(14) }]}>Lay down a new set:</ThemedText>
        <BulletPoint number={1}>
          <ThemedText style={[styles.boldText, { fontSize: fs(14) }]}>Tap cards</ThemedText>
          <ThemedText style={[styles.text, { fontSize: fs(14) }]}> in your hand to select 3+ matching cards.</ThemedText>
        </BulletPoint>
        <BulletPoint number={2}>
          <ThemedText style={[styles.text, { fontSize: fs(14) }]}>Selected cards rise up and get highlighted.</ThemedText>
        </BulletPoint>
        <BulletPoint number={3}>
          <ThemedText style={[styles.boldText, { fontSize: fs(14) }]}>Tap "Lay Set"</ThemedText>
          <ThemedText style={[styles.text, { fontSize: fs(14) }]}> button to place them on the table.</ThemedText>
        </BulletPoint>
        <View style={styles.spacer} />
        <ThemedText style={[styles.highlightText, { fontSize: fs(14) }]}>Add to existing sets:</ThemedText>
        <BulletPoint number={1}>
          <ThemedText style={[styles.boldText, { fontSize: fs(14) }]}>Tap a card</ThemedText>
          <ThemedText style={[styles.text, { fontSize: fs(14) }]}> in your hand that matches the rank of one of your sets on the table (or your teammate's sets in 2v2).</ThemedText>
        </BulletPoint>
        <BulletPoint number={2}>
          <ThemedText style={[styles.text, { fontSize: fs(14) }]}>The matching set will become </ThemedText>
          <ThemedText style={[styles.boldText, { fontSize: fs(14) }]}>tappable</ThemedText>
          <ThemedText style={[styles.text, { fontSize: fs(14) }]}>.</ThemedText>
        </BulletPoint>
        <BulletPoint number={3}>
          <ThemedText style={[styles.boldText, { fontSize: fs(14) }]}>Tap the set</ThemedText>
          <ThemedText style={[styles.text, { fontSize: fs(14) }]}> on the table to add your selected card to it.</ThemedText>
        </BulletPoint>
        <View style={styles.spacer} />
        <ThemedText style={[styles.noteText, { fontSize: fs(13) }]}>
          You must always keep at least 1 card in hand so you can discard to end your turn.
        </ThemedText>
      </SectionCard>

      <SectionCard title="Step 3: Discard" icon="arrow-down-circle">
        <BulletPoint number={1}>
          <ThemedText style={[styles.boldText, { fontSize: fs(14) }]}>Tap a card</ThemedText>
          <ThemedText style={[styles.text, { fontSize: fs(14) }]}> in your hand to select it.</ThemedText>
        </BulletPoint>
        <BulletPoint number={2}>
          <ThemedText style={[styles.boldText, { fontSize: fs(14) }]}>Tap "Discard"</ThemedText>
          <ThemedText style={[styles.text, { fontSize: fs(14) }]}> button to end your turn.</ThemedText>
        </BulletPoint>
        <View style={styles.spacer} />
        <ThemedText style={[styles.text, { fontSize: fs(14) }]}>
          Your turn ends after discarding. The next player then takes their turn.
        </ThemedText>
      </SectionCard>

      <SectionCard title="Selecting Cards" icon="mouse-pointer">
        <BulletPoint>
          <ThemedText style={[styles.boldText, { fontSize: fs(14) }]}>Tap once</ThemedText>
          <ThemedText style={[styles.text, { fontSize: fs(14) }]}> to select a card (it moves up).</ThemedText>
        </BulletPoint>
        <BulletPoint>
          <ThemedText style={[styles.boldText, { fontSize: fs(14) }]}>Tap again</ThemedText>
          <ThemedText style={[styles.text, { fontSize: fs(14) }]}> to deselect it.</ThemedText>
        </BulletPoint>
        <BulletPoint>
          <ThemedText style={[styles.text, { fontSize: fs(14) }]}>You can select multiple cards at once for laying sets.</ThemedText>
        </BulletPoint>
      </SectionCard>

      <SectionCard title="Last Card Warning" icon="alert-circle">
        <ThemedText style={[styles.text, { fontSize: fs(14) }]}>
          When you have exactly 1 card left, tap the </ThemedText>
        <ThemedText style={[styles.boldText, { fontSize: fs(14) }]}>"Last Card!"</ThemedText>
        <ThemedText style={[styles.text, { fontSize: fs(14) }]}> button that appears. You must declare this before going out!</ThemedText>
      </SectionCard>

      <SectionCard title="Side Panel Buttons" icon="sidebar">
        <BulletPoint>
          <ThemedText style={[styles.boldText, { fontSize: fs(14) }]}>Scores</ThemedText>
          <ThemedText style={[styles.text, { fontSize: fs(14) }]}> - View the score breakdown for each round and cumulative totals.</ThemedText>
        </BulletPoint>
        <BulletPoint>
          <ThemedText style={[styles.boldText, { fontSize: fs(14) }]}>Moves</ThemedText>
          <ThemedText style={[styles.text, { fontSize: fs(14) }]}> - Opens a move-by-move log showing what each player has done.</ThemedText>
        </BulletPoint>
        <BulletPoint>
          <ThemedText style={[styles.boldText, { fontSize: fs(14) }]}>Help</ThemedText>
          <ThemedText style={[styles.text, { fontSize: fs(14) }]}> - Opens this help guide.</ThemedText>
        </BulletPoint>
      </SectionCard>

      <SectionCard title="Connection Status" icon="wifi">
        <ThemedText style={[styles.text, { fontSize: fs(14) }]}>
          The small dot in the top-right corner shows your connection. </ThemedText>
        <ThemedText style={[styles.boldText, { fontSize: fs(14) }]}>Green</ThemedText>
        <ThemedText style={[styles.text, { fontSize: fs(14) }]}> means connected; </ThemedText>
        <ThemedText style={[styles.boldText, { fontSize: fs(14) }]}>red</ThemedText>
        <ThemedText style={[styles.text, { fontSize: fs(14) }]}> means disconnected. Tap it to reconnect if you lose connection.</ThemedText>
      </SectionCard>
    </View>
  );
}

function RulesContent() {
  const { fs } = useFontSize();
  return (
    <View style={styles.section}>
      <SectionCard title="Goal of the Game" icon="target">
        <ThemedText style={[styles.text, { fontSize: fs(14) }]}>
          Build sets of matching cards to earn points. The first player (or team) to reach the point threshold wins the game.
        </ThemedText>
      </SectionCard>

      <SectionCard title="Valid Sets" icon="layers">
        <BulletPoint>
          <ThemedText style={[styles.text, { fontSize: fs(14) }]}>A set is </ThemedText>
          <ThemedText style={[styles.boldText, { fontSize: fs(14) }]}>3 or more cards</ThemedText>
          <ThemedText style={[styles.text, { fontSize: fs(14) }]}> of the same rank (e.g., three 7s, four Kings).</ThemedText>
        </BulletPoint>
        <BulletPoint>
          <ThemedText style={[styles.text, { fontSize: fs(14) }]}>You need at least </ThemedText>
          <ThemedText style={[styles.boldText, { fontSize: fs(14) }]}>2 natural (non-wild) cards</ThemedText>
          <ThemedText style={[styles.text, { fontSize: fs(14) }]}> in every set.</ThemedText>
        </BulletPoint>
        <BulletPoint>
          <ThemedText style={[styles.boldText, { fontSize: fs(14) }]}>2s are wild</ThemedText>
          <ThemedText style={[styles.text, { fontSize: fs(14) }]}> - they can substitute for any rank. Only one wild (2) per set.</ThemedText>
        </BulletPoint>
        <BulletPoint>
          <ThemedText style={[styles.boldText, { fontSize: fs(14) }]}>Jokers</ThemedText>
          <ThemedText style={[styles.text, { fontSize: fs(14) }]}> are not wild. They can only be used in a set of jokers.</ThemedText>
        </BulletPoint>
      </SectionCard>

      <SectionCard title="Picking Up the Pile" icon="download">
        <ThemedText style={[styles.text, { fontSize: fs(14) }]}>
          Instead of drawing from the deck, you can pick up the entire discard pile if you meet the requirements:
        </ThemedText>
        <View style={styles.spacer} />
        <ThemedText style={[styles.highlightText, { fontSize: fs(14) }]}>Normal card on top:</ThemedText>
        <BulletPoint>
          <ThemedText style={[styles.text, { fontSize: fs(14) }]}>You need </ThemedText>
          <ThemedText style={[styles.boldText, { fontSize: fs(14) }]}>2 cards matching</ThemedText>
          <ThemedText style={[styles.text, { fontSize: fs(14) }]}> the top card's rank, or 1 matching + 1 wild (2).</ThemedText>
        </BulletPoint>
        <View style={styles.spacer} />
        <ThemedText style={[styles.highlightText, { fontSize: fs(14) }]}>Wild card (2) on top:</ThemedText>
        <BulletPoint>
          <ThemedText style={[styles.text, { fontSize: fs(14) }]}>You need </ThemedText>
          <ThemedText style={[styles.boldText, { fontSize: fs(14) }]}>2 natural cards of the same rank</ThemedText>
          <ThemedText style={[styles.text, { fontSize: fs(14) }]}> (any rank). You cannot use another 2.</ThemedText>
        </BulletPoint>
        <View style={styles.spacer} />
        <ThemedText style={[styles.noteText, { fontSize: fs(13) }]}>
          You take the entire pile - every card in it!
        </ThemedText>
      </SectionCard>

      <SectionCard title="Special Cards" icon="star">
        <BulletPoint>
          <ThemedText style={[styles.boldText, { fontSize: fs(14) }]}>Queen of Spades</ThemedText>
          <ThemedText style={[styles.text, { fontSize: fs(14) }]}> - The most valuable card, worth </ThemedText>
          <ThemedText style={[styles.boldText, { fontSize: fs(14) }]}>100 points</ThemedText>
          <ThemedText style={[styles.text, { fontSize: fs(14) }]}>!</ThemedText>
        </BulletPoint>
        <BulletPoint>
          <ThemedText style={[styles.boldText, { fontSize: fs(14) }]}>2s (Wild cards)</ThemedText>
          <ThemedText style={[styles.text, { fontSize: fs(14) }]}> - Worth 20 points. Can substitute for any rank (one per set).</ThemedText>
        </BulletPoint>
        <BulletPoint>
          <ThemedText style={[styles.boldText, { fontSize: fs(14) }]}>Jokers</ThemedText>
          <ThemedText style={[styles.text, { fontSize: fs(14) }]}> - Worth 50 points. Not wild - they only form sets with other jokers.</ThemedText>
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
          <ThemedText style={[styles.text, { fontSize: fs(14) }]}>A round ends when a player </ThemedText>
          <ThemedText style={[styles.boldText, { fontSize: fs(14) }]}>discards their last card</ThemedText>
          <ThemedText style={[styles.text, { fontSize: fs(14) }]}> (goes out).</ThemedText>
        </BulletPoint>
        <BulletPoint>
          <ThemedText style={[styles.text, { fontSize: fs(14) }]}>You must declare "Last Card" when you're down to 1 card.</ThemedText>
        </BulletPoint>
      </SectionCard>

      <SectionCard title="Scoring" icon="bar-chart-2">
        <BulletPoint>
          <ThemedText style={[styles.boldText, { fontSize: fs(14) }]}>Sets you laid:</ThemedText>
          <ThemedText style={[styles.text, { fontSize: fs(14) }]}> You earn points for every card in your sets on the table.</ThemedText>
        </BulletPoint>
        <BulletPoint>
          <ThemedText style={[styles.boldText, { fontSize: fs(14) }]}>Cards in hand:</ThemedText>
          <ThemedText style={[styles.text, { fontSize: fs(14) }]}> You lose points for any cards still in your hand when the round ends.</ThemedText>
        </BulletPoint>
        <BulletPoint>
          <ThemedText style={[styles.boldText, { fontSize: fs(14) }]}>Round score =</ThemedText>
          <ThemedText style={[styles.text, { fontSize: fs(14) }]}> Set points - Hand penalty.</ThemedText>
        </BulletPoint>
      </SectionCard>

      <SectionCard title="Perfect Cut Bonus" icon="award">
        <ThemedText style={[styles.text, { fontSize: fs(14) }]}>
          When dealing, if the deck is cut perfectly, the dealer earns a </ThemedText>
        <ThemedText style={[styles.boldText, { fontSize: fs(14) }]}>100 point bonus</ThemedText>
        <ThemedText style={[styles.text, { fontSize: fs(14) }]}> for that round!</ThemedText>
      </SectionCard>

      <SectionCard title="Deck Runs Out" icon="alert-triangle">
        <ThemedText style={[styles.text, { fontSize: fs(14) }]}>
          If the draw deck runs out and the next player cannot pick up the pile, the round ends immediately.
        </ThemedText>
        <View style={styles.spacer} />
        <BulletPoint>
          <ThemedText style={[styles.boldText, { fontSize: fs(14) }]}>No winner:</ThemedText>
          <ThemedText style={[styles.text, { fontSize: fs(14) }]}> Since nobody went out, there is no winner for the round.</ThemedText>
        </BulletPoint>
        <BulletPoint>
          <ThemedText style={[styles.boldText, { fontSize: fs(14) }]}>All hand cards are penalties:</ThemedText>
          <ThemedText style={[styles.text, { fontSize: fs(14) }]}> Every player loses points for cards still in hand. Nobody is exempt.</ThemedText>
        </BulletPoint>
        <View style={styles.spacer} />
        <ThemedText style={[styles.noteText, { fontSize: fs(13) }]}>
          Tip: Keep an eye on the deck size! If it's running low, lay your sets quickly.
        </ThemedText>
      </SectionCard>

      <SectionCard title="Game Modes" icon="users">
        <ThemedText style={[styles.highlightText, { fontSize: fs(14) }]}>Solo Mode (2-6 players):</ThemedText>
        <BulletPoint>
          <ThemedText style={[styles.text, { fontSize: fs(14) }]}>Every player plays for themselves. First to </ThemedText>
          <ThemedText style={[styles.boldText, { fontSize: fs(14) }]}>1,000 points</ThemedText>
          <ThemedText style={[styles.text, { fontSize: fs(14) }]}> wins.</ThemedText>
        </BulletPoint>
        <View style={styles.spacer} />
        <ThemedText style={[styles.highlightText, { fontSize: fs(14) }]}>2v2 Team Mode (4 players):</ThemedText>
        <BulletPoint>
          <ThemedText style={[styles.text, { fontSize: fs(14) }]}>First team to </ThemedText>
          <ThemedText style={[styles.boldText, { fontSize: fs(14) }]}>1,500 points</ThemedText>
          <ThemedText style={[styles.text, { fontSize: fs(14) }]}> wins. You can add cards to your teammate's sets.</ThemedText>
        </BulletPoint>
      </SectionCard>
    </View>
  );
}

function TipsContent() {
  const { fs } = useFontSize();
  return (
    <View style={styles.section}>
      <SectionCard title="Reading the Screen" icon="monitor">
        <BulletPoint>
          <ThemedText style={[styles.boldText, { fontSize: fs(14) }]}>Player bar (top):</ThemedText>
          <ThemedText style={[styles.text, { fontSize: fs(14) }]}> Shows all players, their card count, and who is currently playing.</ThemedText>
        </BulletPoint>
        <BulletPoint>
          <ThemedText style={[styles.boldText, { fontSize: fs(14) }]}>Deck and Pile (center):</ThemedText>
          <ThemedText style={[styles.text, { fontSize: fs(14) }]}> Left is the draw deck, right is the discard pile.</ThemedText>
        </BulletPoint>
        <BulletPoint>
          <ThemedText style={[styles.boldText, { fontSize: fs(14) }]}>Your hand (bottom):</ThemedText>
          <ThemedText style={[styles.text, { fontSize: fs(14) }]}> Your cards appear at the bottom. Scroll to see all cards.</ThemedText>
        </BulletPoint>
        <BulletPoint>
          <ThemedText style={[styles.boldText, { fontSize: fs(14) }]}>Laid sets (above hand):</ThemedText>
          <ThemedText style={[styles.text, { fontSize: fs(14) }]}> Your sets and teammates' sets appear here.</ThemedText>
        </BulletPoint>
      </SectionCard>

      <SectionCard title="Visual Indicators" icon="eye">
        <BulletPoint>
          <ThemedText style={[styles.boldText, { fontSize: fs(14) }]}>Gold border:</ThemedText>
          <ThemedText style={[styles.text, { fontSize: fs(14) }]}> Indicates it's that player's turn.</ThemedText>
        </BulletPoint>
        <BulletPoint>
          <ThemedText style={[styles.boldText, { fontSize: fs(14) }]}>Raised card:</ThemedText>
          <ThemedText style={[styles.text, { fontSize: fs(14) }]}> Card is selected in your hand.</ThemedText>
        </BulletPoint>
        <BulletPoint>
          <ThemedText style={[styles.boldText, { fontSize: fs(14) }]}>Glowing cards:</ThemedText>
          <ThemedText style={[styles.text, { fontSize: fs(14) }]}> Newly drawn or picked up cards glow briefly.</ThemedText>
        </BulletPoint>
        <BulletPoint>
          <ThemedText style={[styles.boldText, { fontSize: fs(14) }]}>Team colors:</ThemedText>
          <ThemedText style={[styles.text, { fontSize: fs(14) }]}> In 2v2, green = your team, blue = opponents.</ThemedText>
        </BulletPoint>
      </SectionCard>

      <SectionCard title="Strategy" icon="target">
        <BulletPoint>
          <ThemedText style={[styles.boldText, { fontSize: fs(14) }]}>Protect the Queen of Spades:</ThemedText>
          <ThemedText style={[styles.text, { fontSize: fs(14) }]}> At 100 points, she's your biggest asset - and your biggest liability stuck in hand.</ThemedText>
        </BulletPoint>
        <BulletPoint>
          <ThemedText style={[styles.boldText, { fontSize: fs(14) }]}>Save your 2s wisely:</ThemedText>
          <ThemedText style={[styles.text, { fontSize: fs(14) }]}> Wild cards help complete hard-to-build sets, but they're 20 penalty points if caught in hand.</ThemedText>
        </BulletPoint>
        <BulletPoint>
          <ThemedText style={[styles.boldText, { fontSize: fs(14) }]}>Lay sets early:</ThemedText>
          <ThemedText style={[styles.text, { fontSize: fs(14) }]}> Secure your points before someone goes out!</ThemedText>
        </BulletPoint>
        <BulletPoint>
          <ThemedText style={[styles.boldText, { fontSize: fs(14) }]}>Discard high cards:</ThemedText>
          <ThemedText style={[styles.text, { fontSize: fs(14) }]}> Get rid of Aces, face cards, and jokers you can't use.</ThemedText>
        </BulletPoint>
        <BulletPoint>
          <ThemedText style={[styles.boldText, { fontSize: fs(14) }]}>Watch the pile:</ThemedText>
          <ThemedText style={[styles.text, { fontSize: fs(14) }]}> A big pile is tempting, but it also helps opponents if they grab it first.</ThemedText>
        </BulletPoint>
        <BulletPoint>
          <ThemedText style={[styles.boldText, { fontSize: fs(14) }]}>Team play:</ThemedText>
          <ThemedText style={[styles.text, { fontSize: fs(14) }]}> Add cards to your teammate's sets to boost your shared score!</ThemedText>
        </BulletPoint>
      </SectionCard>
    </View>
  );
}

function SectionCard({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  const { fs } = useFontSize();
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Feather name={icon as any} size={fs(18)} color={GameColors.gold} />
        <ThemedText style={[styles.cardTitle, { fontSize: fs(16) }]}>{title}</ThemedText>
      </View>
      <View style={styles.cardContent}>{children}</View>
    </View>
  );
}

function BulletPoint({ children, number }: { children: React.ReactNode; number?: number }) {
  const { fs } = useFontSize();
  const badgeSize = fs(20);
  return (
    <View style={styles.bulletPoint}>
      {number ? (
        <View style={[styles.numberBadge, { width: badgeSize, height: badgeSize, borderRadius: badgeSize / 2 }]}>
          <ThemedText style={[styles.numberText, { fontSize: fs(12) }]}>{number}</ThemedText>
        </View>
      ) : (
        <View style={styles.bullet} />
      )}
      <View style={styles.bulletContent}>{children}</View>
    </View>
  );
}

function ScoreRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  const { fs } = useFontSize();
  return (
    <View style={[styles.scoreRow, highlight ? styles.scoreRowHighlight : undefined]}>
      <ThemedText style={[styles.scoreLabel, { fontSize: fs(14) }, highlight ? styles.scoreLabelHighlight : undefined]}>{label}</ThemedText>
      <ThemedText style={[styles.scoreValue, { fontSize: highlight ? fs(15) : fs(14) }, highlight ? styles.scoreValueHighlight : undefined]}>{value}</ThemedText>
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
    fontWeight: "600",
  },
  cardContent: {
    gap: Spacing.xs,
  },
  text: {
    color: "rgba(255,255,255,0.85)",
    lineHeight: 20,
  },
  boldText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  highlightText: {
    color: GameColors.gold,
    fontWeight: "600",
    marginTop: Spacing.xs,
  },
  noteText: {
    color: "rgba(255,200,100,0.9)",
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
    backgroundColor: GameColors.gold,
    justifyContent: "center",
    alignItems: "center",
  },
  numberText: {
    color: "#000000",
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
  },
  scoreLabelHighlight: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  scoreValue: {
    color: GameColors.gold,
    fontWeight: "600",
  },
  scoreValueHighlight: {
    fontWeight: "700",
  },
});
