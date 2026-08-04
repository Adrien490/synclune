"use client";

import {
	useEffect,
	useEffectEvent,
	useId,
	useImperativeHandle,
	useRef,
	useState,
	useTransition,
	Suspense,
	type ComponentProps,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, m } from "motion/react";
import { MagnifyingGlassIcon, XIcon } from "@phosphor-icons/react/ssr";

import { MOTION_CONFIG } from "@/shared/components/animations/motion.config";
import { mediaBelow } from "@/shared/constants/breakpoints";
import { TEXT_LIMITS } from "@/shared/constants/validation-limits";
import { useAppForm } from "@/shared/components/forms";
import { MiniDotsLoader } from "@/shared/components/loaders/mini-dots-loader";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { cn } from "@/shared/utils/cn";

export interface SearchInputHandle {
	setValue: (value: string) => void;
	/**
	 * Rend le focus au champ. Utilisé par la recherche rapide en mode idle : les
	 * flèches y déplacent le focus DOM réel sur un item, et taper un caractère
	 * doit ramener la saisie dans le champ.
	 */
	focus: () => void;
	/**
	 * Vide le champ (même chemin que le bouton × et que la 1ʳᵉ pression
	 * d'Escape : notifie `onLiveSearch`/`onValueChange` et rend le focus).
	 * Utilisé par le quick search dans `onEscapeKeyDown` : Radix écoute Escape
	 * sur `document` en capture, donc le « deux temps » doit être arbitré par
	 * le dialog, pas par le handler bulle du champ.
	 */
	clear: () => void;
}

type SearchInputProps = {
	/** URL param name - synced live with debounce */
	paramName: string;
	/** Placeholder text */
	placeholder?: string;
	/** Size variant: sm (44px) for toolbars, md (48px) for dialogs */
	size?: "sm" | "md";
	/** Debounce delay in ms */
	debounceMs?: number;
	/** Show external pending state */
	isPending?: boolean;
	/** Auto focus input on mount */
	autoFocus?: boolean;
	/** Additional class for the container */
	className?: string;
	/** Accessible name for the input (falls back to the placeholder) */
	"aria-label"?: string;
	/** Callback on Enter (e.g. navigate to a full results page) */
	onSubmit?: (term: string) => void;
	/** Callback on Escape key (two-step: first clears input, then calls onEscape on second press) */
	onEscape?: () => void;
	/** Prevent blur on mobile after live search (for dialog contexts where keyboard should stay open) */
	preventMobileBlur?: boolean;
	/** Callback on every input value change (for live search debouncing in parent) */
	onValueChange?: (value: string) => void;
	/** Call this instead of updating the URL param */
	onLiveSearch?: (value: string) => void;
	/** ID of the currently active descendant (for combobox pattern) */
	"aria-activedescendant"?: string;
	/** Whether the associated listbox/popup is expanded (enables combobox role) */
	"aria-expanded"?: boolean;
	/** ID of the element controlled by this input (for aria-controls) */
	"aria-controls"?: string;
	/**
	 * Description supplémentaire. **Composée** avec la live region interne
	 * (« Recherche en cours… ») au lieu de la remplacer : l'écraser rendrait le
	 * champ muet pendant la recherche.
	 */
	"aria-describedby"?: string;
	/** Additional keydown handler on the input (composed with internal handler) */
	onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;
	/** Imperative handle ref */
	ref?: React.Ref<SearchInputHandle>;
};

const sizeStyles = {
	sm: {
		container: "h-11 rounded-md",
		input: "h-11 pl-10 pr-11 text-base sm:text-sm",
		iconLeft: "left-3",
		clearButton: "size-11",
		clearIcon: "size-4",
	},
	md: {
		container: "h-12 rounded-xl",
		input: "h-12 pl-12 pr-12 text-base",
		iconLeft: "left-4",
		clearButton: "size-12",
		clearIcon: "size-5",
	},
};

/**
 * Self-sufficient live search input with automatic URL state management.
 *
 * Updates the `{paramName}` URL param in place with a debounce. When
 * `onLiveSearch` is provided, calls it instead of touching the URL (dialog
 * contexts). Optional `onSubmit` callback fires on Enter.
 */
function SearchInputInner({
	paramName,
	placeholder = "Rechercher…",
	size = "md",
	debounceMs = 300,
	isPending: externalPending = false,
	autoFocus = false,
	className,
	"aria-label": ariaLabel,
	onSubmit,
	onEscape,
	onValueChange,
	preventMobileBlur = false,
	onLiveSearch,
	"aria-activedescendant": activeDescendantId,
	"aria-expanded": ariaExpanded,
	"aria-controls": ariaControls,
	"aria-describedby": ariaDescribedBy,
	onKeyDown: externalKeyDown,
	ref,
}: SearchInputProps) {
	const inputRef = useRef<HTMLInputElement>(null);
	const [internalPending, startTransition] = useTransition();
	const [maxLengthFlash, setMaxLengthFlash] = useState(false);
	const flashTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
	const statusId = useId();
	const styles = sizeStyles[size];

	const searchParams = useSearchParams();
	const router = useRouter();

	const initialValue = searchParams.get(paramName) ?? "";
	const isPending = externalPending || internalPending;

	const form = useAppForm({
		defaultValues: { search: initialValue },
	});

	// Sync URL → form
	// Uses a ref guard to avoid resetting the input during typing (before debounce fires)
	const lastSyncedUrl = useRef(initialValue);
	const urlValue = searchParams.get(paramName) ?? "";

	// Effect Event: reads form and onValueChange without re-triggering the sync effect
	const onUrlSync = useEffectEvent((newUrlValue: string) => {
		lastSyncedUrl.current = newUrlValue;
		form.setFieldValue("search", newUrlValue);
		onValueChange?.(newUrlValue);
	});

	useEffect(() => {
		if (urlValue === lastSyncedUrl.current) return;
		// Ne JAMAIS réécrire le champ pendant que l'utilisateur y tape.
		//
		// `router.replace` part dans un `startTransition`, donc son atterrissage est
		// différé : une URL PÉRIMÉE (« abc » alors que l'utilisateur en est déjà à
		// « abcd ») arrive après coup et, comparée au seul `lastSyncedUrl`, passe
		// pour un changement externe → le champ était réécrit et les caractères
		// tapés entre-temps perdus. Revendiquer la valeur dans `handleSearch` ne
		// suffit pas : l'écho périmé diffère aussi de la dernière revendication.
		//
		// Le focus est le discriminant fiable : la frappe a lieu champ focus, les
		// navigations externes (bouton retour, badge de filtre, lien « effacer »)
		// ont lieu champ non focus. Limite assumée : un retour navigateur déclenché
		// pendant que le champ a le focus ne resynchronise pas — cas marginal, sans
		// perte de données, contre une perte de frappe systématique sur connexion
		// lente. Audit recherche 2026-07-26.
		if (inputRef.current && document.activeElement === inputRef.current) return;
		onUrlSync(urlValue);
	}, [urlValue]);

	// Clear the maxLength flash timer on unmount
	useEffect(() => {
		return () => {
			if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
		};
	}, []);

	const handleSearch = (searchValue: string) => {
		const trimmed = searchValue.trim();

		if (onLiveSearch) {
			// Callback mode: bypass URL
			onLiveSearch(trimmed);
			return;
		}

		// Update the URL param in place
		const currentQs = searchParams.get(paramName) ?? "";
		if (trimmed === currentQs.trim()) return;

		const newSearchParams = new URLSearchParams(searchParams.toString());

		if (trimmed) {
			newSearchParams.set(paramName, trimmed);
		} else {
			newSearchParams.delete(paramName);
		}

		// Reset pagination
		newSearchParams.delete("cursor");
		newSearchParams.delete("direction");

		// Revendiquer la valeur AVANT la transition (et non dedans). `router.replace`
		// est différé : sans ceci, `lastSyncedUrl` n'était jamais mis à jour quand le
		// composant écrivait lui-même l'URL, seulement dans `onUrlSync`/`handleClear`.
		// Séquence perdante : taper « abc » → debounce → replace différé ; l'utilisateur
		// tape « d » ; la transition atterrit, `urlValue`("abc") ≠ `lastSyncedUrl`("")
		// → l'effet de sync réécrivait le champ à « abc » et le « d » disparaissait.
		// Un changement d'URL EXTERNE (bouton retour, badge de filtre) diffère toujours
		// du ref, donc les syncs légitimes restent intactes.
		// Audit recherche 2026-07-26.
		lastSyncedUrl.current = trimmed;

		startTransition(() => {
			router.replace(`?${newSearchParams.toString()}`, { scroll: false });
		});

		// Close keyboard on mobile (skip in dialog contexts).
		// `matchMedia` et non `innerWidth` : ce dernier inclut la scrollbar, donc le
		// clavier logiciel restait ouvert sur la bande 768-783px où le layout est
		// encore mobile (audit responsive 2026-07-26, P2).
		if (
			!preventMobileBlur &&
			typeof window !== "undefined" &&
			typeof window.matchMedia === "function" &&
			window.matchMedia(mediaBelow("md")).matches
		) {
			inputRef.current?.blur();
		}
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		// Let consumers handle Enter (e.g. navigate to a full results page)
		onSubmit?.(form.getFieldValue("search"));
	};

	const handleClear = () => {
		form.setFieldValue("search", "");
		onValueChange?.("");
		lastSyncedUrl.current = "";
		if (onLiveSearch) {
			onLiveSearch("");
		} else {
			handleSearch("");
		}
		inputRef.current?.focus();
	};

	// Déclaré APRÈS `handleClear` (référencé par `clear`) — la règle
	// react-hooks/immutability refuse la référence avant déclaration.
	useImperativeHandle(ref, () => ({
		setValue: (value: string) => {
			form.setFieldValue("search", value);
			onValueChange?.(value);
		},
		focus: () => inputRef.current?.focus(),
		clear: handleClear,
	}));

	const handleKeyDown = (e: React.KeyboardEvent, currentValue: string) => {
		if (e.key === "Escape") {
			e.preventDefault();
			if (currentValue) {
				// First Escape: clear input, don't close dialog
				e.stopPropagation();
				handleClear();
			} else if (onEscape) {
				// Second Escape (empty input): close dialog
				onEscape();
			}
			// If no content and no onEscape, let event propagate
		}

		// Flash border when maxLength reached
		if (
			currentValue.length >= TEXT_LIMITS.SEARCH.max &&
			e.key.length === 1 &&
			!e.ctrlKey &&
			!e.metaKey
		) {
			if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
			setMaxLengthFlash(true);
			flashTimerRef.current = setTimeout(() => setMaxLengthFlash(false), 150);
		}
	};

	// Pas de <MotionConfig reducedMotion="user"> local : le MotionProvider racine
	// (app/layout.tsx) applique déjà exactement ce réglage à tout le body.
	return (
		<form
			role="search"
			onSubmit={handleSubmit}
			className={cn("flex gap-2", className)}
			data-pending={isPending ? "" : undefined}
		>
			<div
				className={cn(
					"relative flex flex-1 items-center overflow-hidden",
					"bg-background border-input border",
					"hover:border-muted-foreground/40",
					// Focus ring aligné au SSOT `focus-ring` (app/globals.css) —
					// `focus-within` car le conteneur n'est pas focusable, l'<input> l'est.
					"focus-within:border-ring focus-within:ring-ring focus-within:ring-[3px]",
					"transition-[border-color,box-shadow] duration-200",
					isPending && "border-ring/50",
					maxLengthFlash && "ring-destructive/50 ring-2",
					styles.container,
				)}
			>
				<div
					className={cn(
						"text-muted-foreground pointer-events-none absolute inset-y-0 flex items-center",
						styles.iconLeft,
					)}
				>
					<AnimatePresence mode="wait">
						{isPending ? (
							<m.span
								key="loader"
								// `aria-hidden` retire tout le sous-arbre de l'arbre d'accessibilité,
								// dont le `role="status"` interne de `MiniDotsLoader` : sans ça, DEUX
								// live regions parlaient à chaque frappe (le loader + la région
								// sr-only « Recherche en cours… » ci-dessous), et
								// `searchForm.locator('[role="status"]')` était ambigu côté E2E.
								// Le loader est purement visuel ici — l'annonce est portée par la
								// région sr-only, seule SSOT.
								aria-hidden="true"
								className="flex items-center"
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								exit={{ opacity: 0 }}
								transition={{ duration: MOTION_CONFIG.duration.fast }}
							>
								<MiniDotsLoader size="sm" color="primary" />
							</m.span>
						) : (
							<m.span
								key="search"
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								exit={{ opacity: 0 }}
								transition={{ duration: MOTION_CONFIG.duration.fast }}
							>
								<MagnifyingGlassIcon className="size-4" aria-hidden="true" />
							</m.span>
						)}
					</AnimatePresence>
				</div>

				<form.AppField
					name="search"
					validators={{
						onChangeAsync: async ({ value }) => {
							handleSearch(value);
							return undefined;
						},
						onChangeAsyncDebounceMs: debounceMs,
					}}
				>
					{(field) => (
						<>
							<Input
								ref={inputRef}
								autoComplete="off"
								autoCorrect="off"
								autoCapitalize="off"
								spellCheck={false}
								// eslint-disable-next-line jsx-a11y/no-autofocus
								autoFocus={autoFocus}
								role={ariaExpanded !== undefined ? "combobox" : undefined}
								aria-expanded={ariaExpanded}
								aria-controls={ariaControls}
								aria-activedescendant={activeDescendantId}
								type="search"
								inputMode="search"
								enterKeyHint="search"
								maxLength={TEXT_LIMITS.SEARCH.max}
								value={field.state.value}
								onChange={(e) => {
									field.handleChange(e.target.value);
									onValueChange?.(e.target.value);
								}}
								onKeyDown={(e) => {
									handleKeyDown(e, field.state.value);
									externalKeyDown?.(e);
								}}
								className={cn(
									"border-none shadow-none focus-visible:ring-0",
									"bg-transparent",
									"placeholder:text-muted-foreground/70",
									"transition-[color,background-color] duration-150",
									"[&::-webkit-search-cancel-button]:appearance-none",
									styles.input,
								)}
								placeholder={placeholder}
								aria-label={ariaLabel ?? placeholder}
								aria-busy={isPending}
								aria-describedby={[statusId, ariaDescribedBy].filter(Boolean).join(" ")}
							/>

							<AnimatePresence mode="wait">
								{field.state.value && (
									<m.div
										initial={{ opacity: 0, scale: 0.8 }}
										animate={{ opacity: 1, scale: 1 }}
										exit={{ opacity: 0, scale: 0.8 }}
										transition={{ duration: MOTION_CONFIG.duration.fast }}
										className="absolute right-0"
									>
										<Button
											type="button"
											variant="ghost"
											size="icon"
											onClick={handleClear}
											className={cn(
												"text-muted-foreground hover:text-foreground transition-[transform,color] duration-150 active:scale-95",
												styles.clearButton,
											)}
											aria-label="Effacer la recherche"
										>
											<XIcon className={styles.clearIcon} aria-hidden="true" />
										</Button>
									</m.div>
								)}
							</AnimatePresence>
						</>
					)}
				</form.AppField>
			</div>

			{/* Bouton submit sr-only pour l'accessibilité clavier (Enter géré nativement) */}
			<button type="submit" className="sr-only">
				Rechercher
			</button>

			{/* Live region for screen readers */}
			<span id={statusId} role="status" aria-live="polite" className="sr-only">
				{isPending ? "Recherche en cours…" : ""}
			</span>
		</form>
	);
}

function SearchInputSkeleton({
	size = "md",
	className,
}: {
	size?: "sm" | "md";
	className?: string;
}) {
	return (
		<div
			aria-hidden="true"
			className={cn(
				"bg-muted/40 w-full",
				size === "md" ? "h-12 rounded-xl" : "h-11 rounded-md",
				className,
			)}
		/>
	);
}

export function SearchInput(props: ComponentProps<typeof SearchInputInner>) {
	return (
		<Suspense fallback={<SearchInputSkeleton size={props.size} className={props.className} />}>
			<SearchInputInner {...props} />
		</Suspense>
	);
}
