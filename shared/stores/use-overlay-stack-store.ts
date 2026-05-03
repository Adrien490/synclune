import { create } from "zustand";
import { devtools } from "zustand/middleware";

import type { OverlayStackStore } from "@/shared/types/store.types";

export const useOverlayStackStore = create<OverlayStackStore>()(
	devtools(
		(set) => ({
			count: 0,
			push: () => set((s) => ({ count: s.count + 1 }), false, "push"),
			pop: () => set((s) => ({ count: Math.max(0, s.count - 1) }), false, "pop"),
		}),
		{ name: "OverlayStackStore", enabled: process.env.NODE_ENV === "development" },
	),
);

export const useHasOverlay = () => useOverlayStackStore((s) => s.count > 0);
