"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
	CommandDialog,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/shared/components/ui/command";
import { useDialog } from "@/shared/providers/dialog-store-provider";
import { navigationData } from "./navigation-config";

export function CommandPalette() {
	const { isOpen, open, close, toggle } = useDialog("command-palette");
	const router = useRouter();

	useEffect(() => {
		function handleKeyDown(e: KeyboardEvent) {
			if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
				e.preventDefault();
				toggle();
			}
		}

		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [toggle]);

	function handleSelect(url: string) {
		close();
		router.push(url);
	}

	return (
		<CommandDialog
			open={isOpen}
			onOpenChange={(v) => (v ? open() : close())}
			title="Recherche rapide"
			description="Naviguer vers une page d'administration"
		>
			<CommandInput placeholder="Rechercher une page..." />
			<CommandList>
				<CommandEmpty>Aucun résultat.</CommandEmpty>
				{navigationData.navGroups.map((group) => (
					<CommandGroup key={group.label} heading={group.label}>
						{group.items.map((item) => {
							const Icon = item.icon;

							return (
								<CommandItem
									key={item.id}
									value={`${item.title} ${group.label}`}
									onSelect={() => handleSelect(item.url)}
								>
									<Icon className="mr-2 h-4 w-4" aria-hidden="true" />
									{item.title}
								</CommandItem>
							);
						})}
					</CommandGroup>
				))}
			</CommandList>
		</CommandDialog>
	);
}
