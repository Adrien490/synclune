// Tier 1 - Composant principal
export { MultiSelect } from "./multi-select";

// Tier 2 - Types
export type {
	AnimationConfig,
	MultiSelectGroup,
	MultiSelectOption,
	MultiSelectProps,
	MultiSelectRef,
	ResponsiveConfig,
	ResponsiveScreenConfig,
	ScreenSize,
} from "./types";

// Tier 3 - Constants (customisation avancee)
export {
	ARIA_CLEAR_DELAY,
	BADGE_ANIMATION_CLASSES,
	DEFAULT_RESPONSIVE_CONFIG,
	FOCUS_RING_DURATION,
	MULTI_SELECT_LABELS,
	multiSelectVariants,
	POPOVER_ANIMATION_CLASSES,
} from "./constants";

// Tier 4 - Utils (testing/usage avance)
export {
	arraysEqual,
	filterOptions,
	flattenOptions,
	getBadgeAnimationClass,
	getPopoverAnimationClass,
	getResponsiveSettings,
	getWidthConstraints,
	isGroupedOptions,
} from "./utils";
