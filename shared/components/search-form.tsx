"use client";

import { useAppForm } from "@/shared/components/tanstack-form";
import { MiniDotsLoader } from "@/shared/components/loaders/mini-dots-loader";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { cn } from "@/shared/utils/cn";
import { Search, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useTransition } from "react";

interface SearchFormProps {
	paramName: string; // Le nom du paramètre de recherche à gérer
	className?: string;
	placeholder?: string;
	ariaLabel?: string;
	debounceMs?: number;
}

export function SearchForm({
	paramName,
	className,
	placeholder,
	ariaLabel,
	debounceMs = 300,
}: SearchFormProps) {
	const searchParams = useSearchParams();
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const inputRef = useRef<HTMLInputElement>(null);

	// Récupérer la valeur actuelle du paramètre de recherche
	const currentSearchValue = searchParams.get(paramName) || "";

	// Fonction pour mettre à jour les paramètres d'URL
	const updateSearchParams = (value: string) => {
		const newSearchParams = new URLSearchParams(searchParams.toString());
		if (value.trim()) {
			newSearchParams.set(paramName, value.trim());
		} else {
			newSearchParams.delete(paramName);
		}

		// IMPORTANT: Réinitialiser la pagination lors d'une recherche
		// Supprimer le cursor pour revenir au début des résultats
		newSearchParams.delete("cursor");
		newSearchParams.delete("direction");

		startTransition(() => {
			router.replace(`?${newSearchParams.toString()}`, { scroll: false });
		});
	};

	// Créer le formulaire avec TanStack Form
	const form = useAppForm({
		defaultValues: {
			search: currentSearchValue,
		},
	});

	return (
		<form
			role="search"
			onSubmit={(e) => {
				e.preventDefault();
			}}
			className={cn(
				"relative flex w-full items-center h-[44px]",
				"group rounded-md overflow-hidden",
				"bg-background border border-input",
				"hover:border-muted-foreground/25",
				"focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20",
				"transition-all duration-200 ease-in-out",
				isPending && "opacity-90",
				className
			)}
			data-pending={isPending ? "" : undefined}
		>
			<div className="absolute left-3 flex items-center text-muted-foreground pointer-events-none">
				{isPending ? (
					<MiniDotsLoader
						size="sm"
						color="primary"
						className="group-hover:text-foreground/70 group-focus-within:text-primary transition-colors duration-150"
					/>
				) : (
					<Search className="h-4 w-4 group-hover:text-foreground/70 group-focus-within:text-primary transition-colors duration-150" />
				)}
			</div>

			{/* Champ de recherche avec TanStack Form et debounce natif */}
			<form.AppField
				name="search"
				validators={{
					onChangeAsync: async ({ value }) => {
						// Utiliser le validator async avec debounce pour mettre à jour l'URL
						updateSearchParams(value);
						return undefined; // Pas d'erreur de validation
					},
					onChangeAsyncDebounceMs: debounceMs,
				}}
			>
				{(field) => (
					<>
						<Input
							ref={inputRef}
							autoComplete="off"
							autoFocus={false}
							type="search"
							value={field.state.value}
							onChange={(e) => field.handleChange(e.target.value)}
							className={cn(
								"pl-10 pr-10",
								"h-[44px]",
								"text-base sm:text-sm",
								"border-none shadow-none focus-visible:ring-0",
								"bg-transparent",
								"placeholder:text-muted-foreground/50",
								"transition-all duration-150",
								"[&::-webkit-search-cancel-button]:appearance-none"
							)}
							placeholder={placeholder || "Rechercher..."}
							aria-label={ariaLabel || placeholder || "Rechercher"}
							aria-describedby="search-status"
						/>

						{field.state.value && (
							<Button
								type="button"
								variant="ghost"
								size="icon"
								onClick={() => {
									field.handleChange("");
									updateSearchParams("");
									inputRef.current?.focus();
								}}
								className={cn(
									"absolute right-1 size-8",
									"text-muted-foreground hover:text-foreground",
									"active:scale-95 transition-all"
								)}
								aria-label="Effacer la recherche"
							>
								<X className="size-4" />
							</Button>
						)}
					</>
				)}
			</form.AppField>

			{/* Live region pour les lecteurs d'écran */}
			<span
				id="search-status"
				role="status"
				aria-live="polite"
				className="sr-only"
			>
				{isPending ? "Recherche en cours..." : ""}
			</span>
		</form>
	);
}
