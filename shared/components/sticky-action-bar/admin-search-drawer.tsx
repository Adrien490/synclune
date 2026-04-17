"use client";

import { Search, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import type { FormEvent } from "react";

import { Button } from "@/shared/components/ui/button";
import {
	Drawer,
	DrawerBody,
	DrawerContent,
	DrawerHeader,
	DrawerTitle,
} from "@/shared/components/ui/drawer";

interface AdminSearchDrawerProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** Visible placeholder (domain-specific). */
	placeholder: string;
	/** Accessible label for the input. */
	ariaLabel: string;
}

/**
 * Drawer partagé utilisé par toutes les `StickyActionBar` admin pour la
 * saisie de recherche mobile. Remplace 12 copies quasi identiques dans les
 * ex-*-bottom-bar admin.
 */
export function AdminSearchDrawer({
	open,
	onOpenChange,
	placeholder,
	ariaLabel,
}: AdminSearchDrawerProps) {
	const searchParams = useSearchParams();
	const router = useRouter();

	const currentValue = searchParams.get("search") ?? "";
	const hasActiveSearch = searchParams.has("search") && currentValue !== "";

	const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		const formData = new FormData(e.currentTarget);
		const search = (formData.get("search") as string | null)?.trim();

		const params = new URLSearchParams(searchParams);
		params.delete("cursor");
		params.delete("direction");

		if (search) {
			params.set("search", search);
		} else {
			params.delete("search");
		}

		router.push(`?${params.toString()}`, { scroll: false });
		onOpenChange(false);
	};

	const handleClear = () => {
		const params = new URLSearchParams(searchParams);
		params.delete("search");
		params.delete("cursor");
		params.delete("direction");
		router.push(`?${params.toString()}`, { scroll: false });
		onOpenChange(false);
	};

	return (
		<Drawer open={open} onOpenChange={onOpenChange}>
			<DrawerContent>
				<DrawerHeader>
					<DrawerTitle>Rechercher</DrawerTitle>
				</DrawerHeader>
				<DrawerBody>
					<form onSubmit={handleSubmit} className="flex flex-col gap-4">
						<div className="relative">
							<Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
							<input
								name="search"
								type="search"
								inputMode="search"
								enterKeyHint="search"
								// eslint-disable-next-line jsx-a11y/no-autofocus -- Drawer context: user explicitly opened search
								autoFocus
								defaultValue={currentValue}
								placeholder={placeholder}
								aria-label={ariaLabel}
								className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-11 w-full rounded-lg border py-2 pr-10 pl-10 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
							/>
							{hasActiveSearch && (
								<button
									type="button"
									onClick={handleClear}
									className="absolute top-1/2 right-3 -translate-y-1/2"
									aria-label="Effacer la recherche"
								>
									<X className="text-muted-foreground size-4" />
								</button>
							)}
						</div>
						<Button type="submit" className="w-full">
							Rechercher
						</Button>
					</form>
				</DrawerBody>
			</DrawerContent>
		</Drawer>
	);
}
