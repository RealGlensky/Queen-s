import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const LARGE_FONT_KEY = "@queens/largeFontEnabled";
const SCALE_FACTOR = 1.35;

interface FontSizeContextType {
  largeFontEnabled: boolean;
  toggleLargeFont: (value: boolean) => void;
  fs: (base: number) => number;
  scale: number;
}

const FontSizeContext = createContext<FontSizeContextType>({
  largeFontEnabled: false,
  toggleLargeFont: () => {},
  fs: (base) => base,
  scale: 1,
});

export function FontSizeProvider({ children }: { children: React.ReactNode }) {
  const [largeFontEnabled, setLargeFontEnabled] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(LARGE_FONT_KEY)
      .then((value) => {
        if (value !== null) {
          setLargeFontEnabled(value === "true");
        }
      })
      .catch((err) => console.error("[FontSizeContext] Failed to load preference:", err));
  }, []);

  const toggleLargeFont = async (value: boolean) => {
    setLargeFontEnabled(value);
    try {
      await AsyncStorage.setItem(LARGE_FONT_KEY, String(value));
    } catch (err) {
      console.error("[FontSizeContext] Failed to persist preference:", err);
    }
  };

  const scale = largeFontEnabled ? SCALE_FACTOR : 1;
  const fs = (base: number) => largeFontEnabled ? Math.round(base * SCALE_FACTOR) : base;

  return (
    <FontSizeContext.Provider value={{ largeFontEnabled, toggleLargeFont, fs, scale }}>
      {children}
    </FontSizeContext.Provider>
  );
}

export function useFontSize() {
  return useContext(FontSizeContext);
}
