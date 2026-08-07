"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

import { useDialog } from "@/shared/providers/overlay-store-provider";

import { QUICK_SEARCH_DIALOG_ID } from "./constants";
import { QuickSearchKeyboardShortcut } from "./quick-search-keyboard-shortcut";
import type { QuickSearchCollection, QuickSearchColor, QuickSearchProductType } from "./constants";

const QuickSearchDialog = dynamic(
	() => import("./quick-search-dialog").then((mod) => ({ default: mod.QuickSearchDialog })),
	{
		ssr: false,
		loading: () => null,
	},
);

interface QuickSearchDialogLazyProps {
	recentSearches?: string[];
	collections: QuickSearchCollection[];
	productTypes: QuickSearchProductType[];
	colors?: QuickSearchColor[];
}

/**
 * Lazy gate for the heavy quick search dialog.
 *
 * The dialog chunk (motion/react + search logic + Embla, ~85-125 KiB) only
 * loads after the user opens the dialog once — via the navbar trigger or the
 * global ⌘K shortcut (mounted unconditionally as a tiny listener). Once
 * mounted, the dialog stays mounted to avoid re-fetching the chunk on close
 * and re-open within the same session.
 *
 * `hasBeenOpened` flips during render (no effect) once `isOpen` becomes true.
 * React docs: storing information from previous renders.
 * https://react.dev/reference/react/useState#storing-information-from-previous-renders
 */
export function QuickSearchDialogLazy(props: QuickSearchDialogLazyProps) {
	const isOpen = useDialog(QUICK_SEARCH_DIALOG_ID).isOpen;
	const [hasBeenOpened, setHasBeenOpened] = useState(false);

	if (isOpen && !hasBeenOpened) {
		setHasBeenOpened(true);
	}

	return (
		<>
			<QuickSearchKeyboardShortcut />
			{hasBeenOpened && <QuickSearchDialog {...props} />}
		</>
	);
}
