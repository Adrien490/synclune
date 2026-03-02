"use client";

import { Search } from "lucide-react";
import { useEffect, useEffectEvent } from "react";

import { useDialog } from "@/shared/providers/dialog-store-provider";
import { Button } from "@/shared/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/components/ui/tooltip";
import { cn } from "@/shared/utils/cn";
import { QUICK_SEARCH_DIALOG_ID } from "./constants";

interface QuickSearchTriggerProps {
	className?: string;
}

/**
 * Trigger button for the quick search dialog.
 * Also registers a global Cmd+K / Ctrl+K keyboard shortcut.
 */
export function QuickSearchTrigger({ className }: QuickSearchTriggerProps) {
	const { open, isOpen } = useDialog(QUICK_SEARCH_DIALOG_ID);

	const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
		if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
			event.preventDefault();
			open();
		}
	});

	useEffect(() => {
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, []);

	const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.userAgent);

	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<Button
					variant="ghost"
					size="icon"
					onClick={() => open()}
					className={cn("size-11 transition-all duration-300 ease-out", className)}
					aria-label="Ouvrir la recherche rapide"
					aria-expanded={isOpen}
					aria-haspopup="dialog"
				>
					<Search className="size-5" />
				</Button>
			</TooltipTrigger>
			<TooltipContent>
				<span className="flex items-center gap-1.5">
					Rechercher
					<kbd className="text-muted-foreground/60 hidden rounded border px-1 py-0.5 text-xs md:inline-block">
						{isMac ? "⌘" : "Ctrl+"}K
					</kbd>
				</span>
			</TooltipContent>
		</Tooltip>
	);
}
