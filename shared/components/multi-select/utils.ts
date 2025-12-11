import {
	BADGE_ANIMATION_CLASSES,
	DEFAULT_NON_RESPONSIVE_SETTINGS,
	DEFAULT_RESPONSIVE_CONFIG,
	POPOVER_ANIMATION_CLASSES,
} from "./constants";
import type {
	AnimationConfig,
	MultiSelectGroup,
	MultiSelectOption,
	ResponsiveConfig,
	ResponsiveSettings,
	ScreenSize,
} from "./types";

/**
 * Compare deux tableaux pour l'egalite (independant de l'ordre)
 */
export function arraysEqual(a: string[], b: string[]): boolean {
	if (a.length !== b.length) return false;
	const sortedA = [...a].sort();
	const sortedB = [...b].sort();
	return sortedA.every((val, index) => val === sortedB[index]);
}

/**
 * Type guard pour verifier si les options sont groupees
 */
export function isGroupedOptions(
	opts: MultiSelectOption[] | MultiSelectGroup[]
): opts is MultiSelectGroup[] {
	return opts.length > 0 && "heading" in opts[0];
}

/**
 * Obtenir la classe d'animation pour les badges
 */
export function getBadgeAnimationClass(config?: AnimationConfig): string {
	if (!config?.badgeAnimation) return "";
	return BADGE_ANIMATION_CLASSES[config.badgeAnimation] || "";
}

/**
 * Obtenir la classe d'animation pour le popover
 */
export function getPopoverAnimationClass(config?: AnimationConfig): string {
	if (!config?.popoverAnimation) return "";
	return POPOVER_ANIMATION_CLASSES[config.popoverAnimation] || "";
}

/**
 * Calculer les settings responsive selon la taille d'ecran
 */
export function getResponsiveSettings(
	responsive: boolean | ResponsiveConfig | undefined,
	screenSize: ScreenSize,
	maxCount: number
): ResponsiveSettings {
	if (!responsive) {
		return {
			...DEFAULT_NON_RESPONSIVE_SETTINGS,
			maxCount,
		};
	}

	if (responsive === true) {
		const currentSettings = DEFAULT_RESPONSIVE_CONFIG[screenSize];
		return {
			maxCount: currentSettings?.maxCount ?? maxCount,
			hideIcons: currentSettings?.hideIcons ?? false,
			compactMode: currentSettings?.compactMode ?? false,
		};
	}

	const currentSettings = responsive[screenSize];
	return {
		maxCount: currentSettings?.maxCount ?? maxCount,
		hideIcons: currentSettings?.hideIcons ?? false,
		compactMode: currentSettings?.compactMode ?? false,
	};
}

/**
 * Extraire toutes les options (aplaties si groupees)
 */
export function flattenOptions(
	options: MultiSelectOption[] | MultiSelectGroup[],
	deduplicateOptions: boolean
): MultiSelectOption[] {
	if (options.length === 0) return [];

	let allOpts: MultiSelectOption[];
	if (isGroupedOptions(options)) {
		allOpts = options.flatMap((group) => group.options);
	} else {
		allOpts = options;
	}

	if (!deduplicateOptions) return allOpts;

	const valueSet = new Set<string>();
	return allOpts.filter((option) => {
		if (valueSet.has(option.value)) return false;
		valueSet.add(option.value);
		return true;
	});
}

/**
 * Filtrer les options selon la recherche
 */
export function filterOptions(
	options: MultiSelectOption[] | MultiSelectGroup[],
	searchValue: string,
	searchable: boolean
): MultiSelectOption[] | MultiSelectGroup[] {
	if (!searchable || !searchValue) return options;
	if (options.length === 0) return [];

	const lowerSearch = searchValue.toLowerCase();

	if (isGroupedOptions(options)) {
		return options
			.map((group) => ({
				...group,
				options: group.options.filter(
					(option) =>
						option.label.toLowerCase().includes(lowerSearch) ||
						option.value.toLowerCase().includes(lowerSearch)
				),
			}))
			.filter((group) => group.options.length > 0);
	}

	return options.filter(
		(option) =>
			option.label.toLowerCase().includes(lowerSearch) ||
			option.value.toLowerCase().includes(lowerSearch)
	);
}

/**
 * Calculer les contraintes de largeur
 */
export function getWidthConstraints(
	screenSize: ScreenSize,
	minWidth?: string,
	maxWidth?: string,
	autoSize?: boolean
): { minWidth: string; maxWidth: string; width: string } {
	const defaultMinWidth = screenSize === "mobile" ? "0px" : "200px";
	const effectiveMinWidth = minWidth || defaultMinWidth;
	const effectiveMaxWidth = maxWidth || "100%";

	return {
		minWidth: effectiveMinWidth,
		maxWidth: effectiveMaxWidth,
		width: autoSize ? "auto" : "100%",
	};
}
