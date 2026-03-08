"use client";

import React, { createContext, useContext, useEffect, useState, type ReactNode } from "react";

interface RegionContextType {
  region: string;
  setRegion: (value: string) => void;
}

const RegionContext = createContext<RegionContextType | undefined>(undefined);

const DEFAULT_REGION = "India";
const STORAGE_KEY = "selectedRegion";

export function RegionProvider({ children }: { children: ReactNode }) {
  const [region, setRegionState] = useState(DEFAULT_REGION);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedRegion = localStorage.getItem(STORAGE_KEY);
      if (savedRegion && savedRegion.trim().length > 0) {
        setRegionState(savedRegion);
      }
    }
  }, []);

  const setRegion = (value: string) => {
    const normalized = value?.trim() || DEFAULT_REGION;
    setRegionState(normalized);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, normalized);
    }
  };

  return (
    <RegionContext.Provider value={{ region, setRegion }}>
      {children}
    </RegionContext.Provider>
  );
}

export function useRegion() {
  const context = useContext(RegionContext);
  if (!context) {
    throw new Error("useRegion must be used within a RegionProvider");
  }
  return context;
}
