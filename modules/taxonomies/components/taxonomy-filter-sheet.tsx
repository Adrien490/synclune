"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, useTransition, type ComponentProps } from "react";

import { FilterSheetWrapper } from "@/shared/components/filter-sheet-wrapper";
import { useAppForm } from "@/shared/components/forms";
import { RadioFilterItem } from "@/shared/components/forms/radio-filter-item";

import type { TaxonomyConfig } from "../types/taxonomy.types";

/**
 * Feuille de filtres des listes de taxonomies.
 *
 * Les trois modules en avaient chacun leur version ; ce générique les réunit :
 *   - passe unique sur `searchParams` (couleurs) plutôt que deux ;
 *   - `RadioFilterItem` partagé (types de bijoux), seul à respecter la cible
 *     tactile de 44 px, au lieu d'un `RadioGroup` inline ;
 *   - purge de `cursor`/`direction` à l'application ET à la réinitialisation
 *     (types de bijoux) — sans elle, filtrer depuis la page 2 conservait un
 *     curseur périmé et renvoyait une tranche incohérente ;
 *   - `preventDefault` + `stopPropagation` au submit (types de bijoux), pour
 *     que le formulaire de filtre ne remonte pas au formulaire parent.
 *
 * Les groupes rendus viennent de `config.filters` — voir la ⚠️ de
 * `TaxonomyFilterDefinition` : une définition n'existe que si une page parse
 * son paramètre. Aucun appelant ne monte cette feuille pour une taxonomie sans
 * filtre, mais le garde ci-dessous rend le contrat lisible sur place.
 */

type FilterFormData = Record<string, string>;

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

	// Passe unique sur searchParams : on extrait les valeurs du formulaire ET on
	// compte les filtres actifs (toute clé préfixée `filter_`).
	const { initialValues, activeFiltersCount } = ((): {
		initialValues: FilterFormData;
		activeFiltersCount: number;
	} => {
		const values: FilterFormData = Object.fromEntries(
			config.filters.map((filter) => [filter.param, neutralValue(filter.options)]),
		);
		let count = 0;
		searchParams.forEach((value, key) => {
			if (!key.startsWith("filter_")) return;
			count += 1;
			const param = key.slice("filter_".length);
			const filter = config.filters.find((candidate) => candidate.param === param);
			// Une valeur d'URL hors options (lien périmé, saisie manuelle) laisse le
			// groupe sur sa valeur neutre plutôt que de le rendre sans sélection.
			if (filter && filter.options.some((option) => option.value === value)) {
				values[param] = value;
			}
		});
		return { initialValues: values, activeFiltersCount: count };
	})();

	const pushFilters = (values: FilterFormData) => {
		const params = new URLSearchParams(searchParams.toString());

		for (const filter of config.filters) {
			params.delete(`filter_${filter.param}`);
			const value = values[filter.param];
			if (value && value !== neutralValue(filter.options)) {
				params.set(`filter_${filter.param}`, value);
			}
		}

		// La pagination est curseur : changer de filtre invalide le curseur courant.
		// (`page` n'existe pas dans ce modèle — l'ancien `params.set("page", "1")`
		// écrivait un paramètre d'URL mort.)
		// @regression taxonomy-filter-sheet-url-sync-2026-08-19
		params.delete("cursor");
		params.delete("direction");

		startTransition(() => {
			router.push(`?${params.toString()}`, { scroll: false });
		});
	};

	const form = useAppForm({
		defaultValues: initialValues,
		onSubmit: async ({ value }: { value: FilterFormData }) => pushFilters(value),
	});

	// ⚠️ Le formulaire ne réagit PAS aux changements d'URL venus d'ailleurs — un
	// badge retiré, un « Tout effacer », un retour arrière. `defaultValues` n'est
	// lu qu'au premier montage, et la feuille reste montée en permanence : sans
	// cette resynchronisation à l'ouverture, elle rouvrait sur la sélection
	// précédente en contredisant l'URL et les badges.
	// @regression taxonomy-filter-sheet-url-sync-2026-08-19
	const handleOpenChangeWithSync = (next: boolean) => {
		if (next) form.reset(initialValues);
		handleOpenChange(next);
	};

	const clearAllFilters = () => {
		const cleared: FilterFormData = Object.fromEntries(
			config.filters.map((filter) => [filter.param, neutralValue(filter.options)]),
		);
		form.reset(cleared);
		pushFilters(cleared);
	};

	return (
		<FilterSheetWrapper
			open={isOpen}
			onOpenChange={handleOpenChangeWithSync}
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
				{config.filters.map((filter) => (
					<form.Field key={filter.param} name={filter.param}>
						{(field) => (
							<fieldset className="space-y-1">
								<legend className="text-foreground mb-2 text-sm font-medium">
									{filter.legend}
								</legend>
								{filter.options.map(({ value, label }) => (
									<RadioFilterItem
										key={value}
										id={`${filter.param}-${value}`}
										name={filter.param}
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
				))}
			</form>
		</FilterSheetWrapper>
	);
}

/** `options[0]` est la valeur neutre par contrat (cf. `TaxonomyFilterOption`). */
function neutralValue(options: ReadonlyArray<{ value: string }>): string {
	return options[0]?.value ?? "all";
}

export function TaxonomyFilterSheet(props: ComponentProps<typeof TaxonomyFilterSheetInner>) {
	if (props.config.filters.length === 0) return null;

	return (
		<Suspense fallback={null}>
			<TaxonomyFilterSheetInner {...props} />
		</Suspense>
	);
}
