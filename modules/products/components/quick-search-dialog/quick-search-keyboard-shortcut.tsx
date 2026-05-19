"use client";

import { useEffect } from "react";

import { useDialog } from "@/shared/providers/dialog-store-provider";

import { QUICK_SEARCH_DIALOG_ID } from "./constants";

/**
 * Lightweight listener for the global ⌘K / Ctrl+K shortcut.
 *
 * Lives outside the heavy `QuickSearchDialog` so the dialog chunk
 * (motion/react + search logic, ~85-125 KiB) stays unloaded until the
 * user actually requests the search. Sets `isOpen=true` in the store
 * which then triggers the lazy mount of the dialog itself.
 */
export function QuickSearchKeyboardShortcut() {
	const { isOpen, open, close } = useDialog(QUICK_SEARCH_DIALOG_ID);

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key === "k") {
				e.preventDefault();
				if (isOpen) {
					close();
				} else {
					open();
				}
			}
		};
		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, open, close]);

	return null;
}
