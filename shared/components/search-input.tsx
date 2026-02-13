"use client"

import { useEffect, useId, useRef, useState, useTransition } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { Search, X } from "lucide-react"

import { useAppForm } from "@/shared/components/forms"
import { MiniDotsLoader } from "@/shared/components/loaders/mini-dots-loader"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Spinner } from "@/shared/components/ui/spinner"
import { cn } from "@/shared/utils/cn"

type SearchInputProps = {
	/** URL param name - manages URL state automatically */
	paramName: string
	/** Placeholder text */
	placeholder?: string
	/** Search mode: submit redirects to /produits, live updates param in place */
	mode?: "submit" | "live"
	/** Size variant: sm (44px) for toolbars, md (48px) for dialogs */
	size?: "sm" | "md"
	/** Debounce delay in ms for live mode */
	debounceMs?: number
	/** Show external pending state */
	isPending?: boolean
	/** Auto focus input on mount */
	autoFocus?: boolean
	/** Additional class for the container */
	className?: string
	/** Aria label for the input */
	ariaLabel?: string
	/** Callback before search navigation (for side effects like saving recent searches, closing dialogs) */
	onSubmit?: (term: string) => void
	/** Callback on Escape key (two-step: first clears input, then calls onEscape on second press) */
	onEscape?: () => void
	/** Prevent blur on mobile after live search (for dialog contexts where keyboard should stay open) */
	preventMobileBlur?: boolean
	/** Callback on every input value change (for live search debouncing in parent) */
	onValueChange?: (value: string) => void
	/** Number of search results for screen reader announcement (live mode) */
	resultCount?: number
}

const sizeStyles = {
	sm: {
		container: "h-11 rounded-md",
		input: "h-11 pl-10 pr-11 text-base sm:text-sm",
		iconLeft: "left-3",
		clearButton: "size-11",
		clearIcon: "size-4",
		submitButton: "size-11 rounded-md",
	},
	md: {
		container: "h-12 rounded-xl",
		input: "h-12 pl-12 pr-12 text-base",
		iconLeft: "left-4",
		clearButton: "size-12",
		clearIcon: "size-5",
		submitButton: "size-12 rounded-xl",
	},
}

/**
 * Self-sufficient search input component with automatic URL state management.
 *
 * Modes:
 * - Submit: shows button, redirects to /produits?{paramName}=xxx on submit
 * - Live: updates {paramName} URL param in place with debounce
 *
 * Optional `onSubmit` callback for side effects (e.g., save recent searches, close dialogs)
 */
export function SearchInput({
	paramName,
	placeholder = "Rechercher...",
	mode = "submit",
	size = "md",
	debounceMs = 300,
	isPending: externalPending = false,
	autoFocus = false,
	className,
	ariaLabel,
	onSubmit,
	onEscape,
	onValueChange,
	preventMobileBlur = false,
	resultCount,
}: SearchInputProps) {
	const inputRef = useRef<HTMLInputElement>(null)
	const [internalPending, startTransition] = useTransition()
	const [maxLengthFlash, setMaxLengthFlash] = useState(false)
	const shouldReduceMotion = useReducedMotion()
	const statusId = useId()
	const styles = sizeStyles[size]

	const searchParams = useSearchParams()
	const router = useRouter()

	const initialValue = mode === "live" ? searchParams.get(paramName) || "" : ""
	const isPending = externalPending || internalPending

	const form = useAppForm({
		defaultValues: { search: initialValue },
	})

	// Sync URL → form (live mode only)
	// Uses a ref guard to avoid resetting the input during typing (before debounce fires)
	const lastSyncedUrl = useRef(initialValue)
	const urlValue = mode === "live" ? searchParams.get(paramName) || "" : ""

	useEffect(() => {
		if (mode !== "live") return
		if (urlValue !== lastSyncedUrl.current) {
			lastSyncedUrl.current = urlValue
			form.setFieldValue("search", urlValue)
			onValueChange?.(urlValue)
		}
	}, [urlValue, form, mode, onValueChange])

	const handleSearch = (searchValue: string) => {
		const trimmed = searchValue.trim()

		if (mode === "submit") {
			// Submit mode: redirect to /produits with search param
			if (!trimmed) return

			onSubmit?.(trimmed)

			startTransition(() => {
				// Preserve existing URL params (filters, sort, etc.)
				const newSearchParams = new URLSearchParams(searchParams.toString())
				newSearchParams.set(paramName, trimmed)
				// Reset pagination
				newSearchParams.delete("cursor")
				newSearchParams.delete("direction")
				router.push(`/produits?${newSearchParams.toString()}`)
			})
		} else {
			// Live mode: update URL param in place
			const currentQs = searchParams.get(paramName) || ""
			if (trimmed === currentQs.trim()) return

			const newSearchParams = new URLSearchParams(searchParams.toString())

			if (trimmed) {
				newSearchParams.set(paramName, trimmed)
			} else {
				newSearchParams.delete(paramName)
			}

			// Reset pagination
			newSearchParams.delete("cursor")
			newSearchParams.delete("direction")

			startTransition(() => {
				router.replace(`?${newSearchParams.toString()}`, { scroll: false })
			})

			// Close keyboard on mobile (skip in dialog contexts)
			if (!preventMobileBlur && typeof window !== "undefined" && window.innerWidth < 768) {
				inputRef.current?.blur()
			}
		}
	}

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault()
		if (mode === "submit") {
			handleSearch(form.getFieldValue("search"))
		} else if (onSubmit) {
			// Live mode: let consumers handle Enter (e.g. navigate to full results page)
			onSubmit(form.getFieldValue("search"))
		}
	}

	const handleClear = () => {
		form.setFieldValue("search", "")
		onValueChange?.("")
		// In live mode, also clear the URL param and reset sync guard
		if (mode === "live") {
			lastSyncedUrl.current = ""
			handleSearch("")
		}
		inputRef.current?.focus()
	}

	const handleKeyDown = (e: React.KeyboardEvent, currentValue: string) => {
		if (e.key === "Escape") {
			e.preventDefault()
			if (currentValue) {
				// First Escape: clear input, don't close dialog
				e.stopPropagation()
				handleClear()
			} else if (onEscape) {
				// Second Escape (empty input): close dialog
				onEscape()
			}
			// If no content and no onEscape, let event propagate
		}

		// Flash border when maxLength reached
		if (
			currentValue.length >= 200 &&
			e.key.length === 1 &&
			!e.ctrlKey &&
			!e.metaKey
		) {
			setMaxLengthFlash(true)
			setTimeout(() => setMaxLengthFlash(false), 150)
		}
	}

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
					"bg-background border border-input",
					"hover:border-muted-foreground/40",
					"focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30",
					"transition-all duration-200",
					isPending && "border-ring/50",
					maxLengthFlash && "ring-2 ring-destructive/50",
					styles.container
				)}
			>
				<div
					className={cn(
						"absolute inset-y-0 flex items-center text-muted-foreground pointer-events-none",
						styles.iconLeft
					)}
				>
					<AnimatePresence mode="wait">
						{isPending && mode === "live" ? (
							<motion.span
								key="loader"
								className="flex items-center"
								initial={shouldReduceMotion ? false : { opacity: 0 }}
								animate={{ opacity: 1 }}
								exit={shouldReduceMotion ? undefined : { opacity: 0 }}
								transition={{ duration: shouldReduceMotion ? 0 : 0.15 }}
							>
								<MiniDotsLoader size="sm" color="primary" />
							</motion.span>
						) : (
							<motion.span
								key="search"
								initial={shouldReduceMotion ? false : { opacity: 0 }}
								animate={{ opacity: 1 }}
								exit={shouldReduceMotion ? undefined : { opacity: 0 }}
								transition={{ duration: shouldReduceMotion ? 0 : 0.15 }}
							>
								<Search className="size-4" />
							</motion.span>
						)}
					</AnimatePresence>
				</div>

				<form.AppField
					name="search"
					validators={
						mode === "live"
							? {
									onChangeAsync: async ({ value }) => {
										handleSearch(value)
										return undefined
									},
									onChangeAsyncDebounceMs: debounceMs,
								}
							: undefined
					}
				>
					{(field) => (
						<>
							<Input
								ref={inputRef}
								autoComplete="off"
								autoFocus={autoFocus}
								type="search"
								inputMode="search"
								enterKeyHint="search"
								maxLength={200}
								value={field.state.value}
								onChange={(e) => {
									field.handleChange(e.target.value)
									onValueChange?.(e.target.value)
								}}
								onKeyDown={(e) => handleKeyDown(e, field.state.value)}
								className={cn(
									"border-none shadow-none focus-visible:ring-0",
									"bg-transparent",
									"placeholder:text-muted-foreground/50",
									"transition-all duration-150",
									"[&::-webkit-search-cancel-button]:appearance-none",
									styles.input
								)}
								placeholder={placeholder}
								aria-label={ariaLabel || placeholder}
								aria-busy={isPending}
								aria-describedby={statusId}
							/>

							<AnimatePresence mode="wait">
								{field.state.value && (
									<motion.div
										initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.8 }}
										animate={{ opacity: 1, scale: 1 }}
										exit={shouldReduceMotion ? undefined : { opacity: 0, scale: 0.8 }}
										transition={{ duration: shouldReduceMotion ? 0 : 0.15 }}
										className="absolute right-0"
									>
										<Button
											type="button"
											variant="ghost"
											size="icon"
											onClick={handleClear}
											className={cn(
												"text-muted-foreground hover:text-foreground active:scale-95 transition-all",
												styles.clearButton
											)}
											aria-label="Effacer la recherche"
										>
											<X className={styles.clearIcon} />
										</Button>
									</motion.div>
								)}
							</AnimatePresence>
						</>
					)}
				</form.AppField>
			</div>

			{/* Submit button */}
			{mode === "submit" ? (
				<form.Subscribe
					selector={(state) => state.values.search}
					children={(search) => (
						<Button
							type="submit"
							disabled={!search?.trim() || isPending}
							className={cn("shrink-0", styles.submitButton)}
							aria-label="Rechercher"
						>
							{isPending ? (
								<Spinner className="size-4" />
							) : (
								<Search className="size-4" />
							)}
						</Button>
					)}
				/>
			) : (
				/* Bouton submit sr-only pour accessibilité clavier en mode live */
				<button type="submit" className="sr-only">
					Rechercher
				</button>
			)}

			{/* Live region for screen readers */}
			<span
				id={statusId}
				role="status"
				aria-live="polite"
				className="sr-only"
			>
				{isPending
					? "Recherche en cours..."
					: resultCount !== undefined
						? resultCount === 0
							? "Aucun resultat"
							: `${resultCount} resultat${resultCount > 1 ? "s" : ""}`
						: ""}
			</span>
		</form>
	)
}
