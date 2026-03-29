"use client";

import { useState } from "react";

/**
 * Manages mutually exclusive drawer open/close state for toolbar bottom bars.
 * Only one drawer can be open at a time.
 */
export function useToolbarDrawer<T extends string>() {
	const [openDrawer, setOpenDrawer] = useState<T | null>(null);

	return {
		openDrawer,
		open: (name: T) => setOpenDrawer(name),
		close: () => setOpenDrawer(null),
		isOpen: (name: T) => openDrawer === name,
		onOpenChange: (name: T) => (open: boolean) => setOpenDrawer(open ? name : null),
	};
}
