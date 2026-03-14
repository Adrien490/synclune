"use client";

import type { LucideIcon } from "lucide-react";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export interface BottomBarAction {
	id: string;
	label: string;
	icon: LucideIcon;
	onClick?: () => void;
	href?: string;
}

interface BottomBarContextValue {
	actions: BottomBarAction[];
	setActions: (actions: BottomBarAction[]) => void;
}

const BottomBarContext = createContext<BottomBarContextValue | null>(null);

export function AdminBottomBarProvider({ children }: { children: ReactNode }) {
	const [actions, setActions] = useState<BottomBarAction[]>([]);

	return (
		<BottomBarContext.Provider value={{ actions, setActions }}>
			{children}
		</BottomBarContext.Provider>
	);
}

/**
 * Register contextual bottom bar actions for the current page.
 * Clears on unmount. Default actions are shown when no page registers custom ones.
 */
export function useSetBottomBarActions(actions: BottomBarAction[]) {
	const ctx = useContext(BottomBarContext);

	useEffect(() => {
		if (!ctx) return;
		ctx.setActions(actions);
		return () => ctx.setActions([]);
	}, []); // eslint-disable-line react-hooks/exhaustive-deps
}

export function useBottomBarActions(): BottomBarAction[] {
	const ctx = useContext(BottomBarContext);
	return ctx?.actions ?? [];
}
