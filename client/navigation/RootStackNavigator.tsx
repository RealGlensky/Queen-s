import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { HeaderTitle } from "@/components/HeaderTitle";

import HomeScreen from "@/screens/HomeScreen";
import LobbyScreen from "@/screens/LobbyScreen";
import WaitingRoomScreen from "@/screens/WaitingRoomScreen";
import GameScreen from "@/screens/GameScreen";
import ScoreScreen from "@/screens/ScoreScreen";
import RulesScreen from "@/screens/RulesScreen";
import SettingsScreen from "@/screens/SettingsScreen";

export type RootStackParamList = {
  Home: undefined;
  Lobby: undefined;
  WaitingRoom: {
    isHost: boolean;
    displayName: string;
    gameMode?: "solo" | "2v2";
    maxPlayers?: number;
    pointThreshold?: number;
    roomCode?: string;
  };
  Game: {
    roomCode: string;
  };
  Score: {
    roomCode: string;
  };
  Rules: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootStackNavigator() {
  const screenOptions = useScreenOptions();
  const opaqueScreenOptions = useScreenOptions({ transparent: false });

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="Lobby"
        component={LobbyScreen}
        options={{
          headerTitle: "New Game",
        }}
      />
      <Stack.Screen
        name="WaitingRoom"
        component={WaitingRoomScreen}
        options={{
          headerTitle: "Waiting Room",
          headerBackVisible: false,
        }}
      />
      <Stack.Screen
        name="Game"
        component={GameScreen}
        options={{
          headerShown: false,
          gestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="Score"
        component={ScoreScreen}
        options={{
          headerTitle: "Results",
          headerBackVisible: false,
          gestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="Rules"
        component={RulesScreen}
        options={{
          headerTitle: "How to Play",
        }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          headerTitle: "Settings",
        }}
      />
    </Stack.Navigator>
  );
}
