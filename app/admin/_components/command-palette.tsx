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
	CommandSeparator,
} from "@/shared/components/ui/command";
import { useDialog } from "@/shared/providers/dialog-store-provider";
import { navigationData } from "./navigation-config";
import { Plus, Layers, Ticket, CircleHelp, Megaphone } from "lucide-react";

const QUICK_ACTIONS = [
	{
		id: "new-product",
		title: "Nouveau produit",
		url: "/admin/catalogue/produits/nouveau",
		icon: Plus,
	},
	{
		id: "new-collection",
		title: "Nouvelle collection",
		url: "/admin/catalogue/collections/nouveau",
		icon: Layers,
	},
	{
		id: "new-discount",
		title: "Nouveau code promo",
		url: "/admin/marketing/discounts",
		icon: Ticket,
	},
	{
		id: "new-announcement",
		title: "Nouvelle annonce",
		url: "/admin/contenu/annonces",
		icon: Megaphone,
	},
	{
		id: "new-faq",
		title: "Nouvelle question FAQ",
		url: "/admin/contenu/faq",
		icon: CircleHelp,
	},
] as const;

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
			description="Naviguer ou creer rapidement"
		>
			<CommandInput placeholder="Rechercher une page ou une action..." />
			<CommandList>
				<CommandEmpty>Aucun resultat.</CommandEmpty>

				<CommandGroup heading="Actions rapides">
					{QUICK_ACTIONS.map((action) => {
						const Icon = action.icon;
						return (
							<CommandItem
								key={action.id}
								value={`${action.title} action creer nouveau`}
								onSelect={() => handleSelect(action.url)}
							>
								<Icon className="mr-2 h-4 w-4" aria-hidden="true" />
								{action.title}
							</CommandItem>
						);
					})}
				</CommandGroup>

				<CommandSeparator />

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
