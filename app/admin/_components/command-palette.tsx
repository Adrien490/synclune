"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
	CommandDialog,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/shared/components/ui/command";
import { navigationData } from "./navigation-config";

export function CommandPalette() {
	const [open, setOpen] = useState(false);
	const router = useRouter();

	useEffect(() => {
		function handleKeyDown(e: KeyboardEvent) {
			if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
				e.preventDefault();
				setOpen((prev) => !prev);
			}
		}

		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, []);

	function handleSelect(url: string) {
		setOpen(false);
		router.push(url);
	}

	return (
		<CommandDialog
			open={open}
			onOpenChange={setOpen}
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
