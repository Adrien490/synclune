"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, useTransition, type ComponentProps } from "react";

import { FilterSheetWrapper } from "@/shared/components/filter-sheet-wrapper";
import { useAppForm } from "@/shared/components/forms";
import { RadioFilterItem } from "@/shared/components/forms/radio-filter-item";

import { agree } from "../config/taxonomy.config";
import type { TaxonomyConfig } from "../types/taxonomy.types";

/**
 * Feuille de filtres des listes de taxonomies.
 *
 * Les trois modules en avaient chacun leur version, chacune avec ses qualités
 * propres — ce générique les réunit :
 *   - passe unique sur `searchParams` (couleurs) plutôt que deux ;
 *   - `RadioFilterItem` partagé (types de bijoux), seul à respecter la cible
 *     tactile de 44 px, au lieu d'un `RadioGroup` inline ;
 *   - purge de `cursor`/`direction` à l'application ET à la réinitialisation
 *     (types de bijoux) — sans elle, filtrer depuis la page 2 conservait un
 *     curseur périmé et renvoyait une tranche incohérente ;
 *   - `preventDefault` + `stopPropagation` au submit (types de bijoux), pour
 *     que le formulaire de filtre ne remonte pas au formulaire parent.
 *
 * Le seul filtre est le statut actif — c'est tout ce que porte une table
 * d'étiquettes.
 */

interface FilterFormData {
	active: string;
}

interface TaxonomyFilterSheetProps {
	config: TaxonomyConfig;
	className?: string;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	hideTrigger?: boolean;
	/** `id` DOM du contenu de la feuille (appairé à `aria-controls`). */
	id?: string;
}

function TaxonomyFilterSheetInner({
	config,
	className,
	open: controlledOpen,
	onOpenChange: controlledOnOpenChange,
	hideTrigger,
	id,
}: TaxonomyFilterSheetProps) {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [isPending, startTransition] = useTransition();

	const [internalOpen, setInternalOpen] = useState(false);
	const isOpen = controlledOpen ?? internalOpen;
	const handleOpenChange = controlledOnOpenChange ?? setInternalOpen;

	// Passe unique sur searchParams : on extrait la valeur du formulaire ET on
	// compte les filtres actifs (toute clé préfixée `filter_`).
	const { initialValues, activeFiltersCount } = ((): {
		initialValues: FilterFormData;
		activeFiltersCount: number;
	} => {
		let active = "all";
		let count = 0;
		searchParams.forEach((value, key) => {
			if (key === "filter_isActive") {
				active = value === "true" ? "active" : "inactive";
			}
			if (key.startsWith("filter_")) count += 1;
		});
		return { initialValues: { active }, activeFiltersCount: count };
	})();

	const pushFilters = (active: string) => {
		const params = new URLSearchParams(searchParams.toString());
		params.delete("filter_isActive");
		// La pagination est curseur : changer de filtre invalide le curseur courant.
		// (`page` n'existe pas dans ce modèle — l'ancien `params.set("page", "1")`
		// écrivait un paramètre d'URL mort.)
		params.delete("cursor");
		params.delete("direction");

		if (active !== "all") {
			params.set("filter_isActive", active === "active" ? "true" : "false");
		}

		startTransition(() => {
			router.push(`?${params.toString()}`, { scroll: false });
		});
	};

	const form = useAppForm({
		defaultValues: initialValues,
		onSubmit: async ({ value }: { value: FilterFormData }) => pushFilters(value.active),
	});

	const clearAllFilters = () => {
		form.reset({ active: "all" });
		pushFilters("all");
	};

	// Copie retenue : celle des types de bijoux, la plus explicite sur la
	// sémantique du filtre (« Actif uniquement » plutôt qu'un « Actifs »
	// ambigu). Accordée en genre via le registre.
	const statusOptions = [
		{ value: "all", label: "Tous" },
		{ value: "active", label: `${agree(config, "Actif")} uniquement` },
		{ value: "inactive", label: `${agree(config, "Inactif")} uniquement` },
	];

	return (
		<FilterSheetWrapper
			open={isOpen}
			onOpenChange={handleOpenChange}
			hideTrigger={hideTrigger}
			id={id}
			activeFiltersCount={activeFiltersCount}
			hasActiveFilters={activeFiltersCount > 0}
			onClearAll={clearAllFilters}
			onApply={() => void form.handleSubmit()}
			isPending={isPending}
			triggerClassName={className}
		>
			<form
				onSubmit={(e) => {
					e.preventDefault();
					e.stopPropagation();
					void form.handleSubmit();
				}}
				className="space-y-6"
			>
				<form.Field name="active">
					{(field) => (
						<fieldset className="space-y-1">
							<legend className="text-foreground mb-2 text-sm font-medium">Statut actif</legend>
							{statusOptions.map(({ value, label }) => (
								<RadioFilterItem
									key={value}
									id={`active-${value}`}
									name="active"
									value={value}
									checked={field.state.value === value}
									onCheckedChange={(checked) => {
										if (checked) field.handleChange(value);
									}}
								>
									{label}
								</RadioFilterItem>
							))}
						</fieldset>
					)}
				</form.Field>
			</form>
		</FilterSheetWrapper>
	);
}

export function TaxonomyFilterSheet(props: ComponentProps<typeof TaxonomyFilterSheetInner>) {
	return (
		<Suspense fallback={null}>
			<TaxonomyFilterSheetInner {...props} />
		</Suspense>
	);
}
