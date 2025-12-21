"use client"

import { useRef, useTransition } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { AnimatePresence, motion } from "framer-motion"
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
}

const sizeStyles = {
	sm: {
		container: "h-11 rounded-md",
		input: "h-11 pl-10 pr-10 text-base sm:text-sm",
		iconLeft: "left-3",
		clearButton: "size-9",
		clearIcon: "size-4",
		submitButton: "size-11 rounded-md",
	},
	md: {
		container: "h-12 rounded-xl",
		input: "h-12 pl-12 pr-12 text-base",
		iconLeft: "left-4",
		clearButton: "size-10",
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
}: SearchInputProps) {
	const inputRef = useRef<HTMLInputElement>(null)
	const [internalPending, startTransition] = useTransition()
	const styles = sizeStyles[size]

	const searchParams = useSearchParams()
	const router = useRouter()

	const initialValue = mode === "live" ? searchParams.get(paramName) || "" : ""
	const isPending = externalPending || internalPending

	const form = useAppForm({
		defaultValues: { search: initialValue },
	})

	const handleSearch = (searchValue: string) => {
		const trimmed = searchValue.trim()

		if (mode === "submit") {
			// Submit mode: redirect to /produits with search param
			if (!trimmed) return

			onSubmit?.(trimmed)

			startTransition(() => {
				router.push(`/produits?${paramName}=${encodeURIComponent(trimmed)}`)
			})
		} else {
			// Live mode: update URL param in place
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

			// Close keyboard on mobile
			if (typeof window !== "undefined" && window.innerWidth < 768) {
				inputRef.current?.blur()
			}
		}
	}

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault()
		if (mode === "submit") {
			handleSearch(form.getFieldValue("search"))
		}
	}

	const handleClear = () => {
		form.setFieldValue("search", "")
		// In live mode, also clear the URL param
		if (mode === "live") {
			handleSearch("")
		}
		inputRef.current?.focus()
	}

	const handleKeyDown = (e: React.KeyboardEvent, currentValue: string) => {
		if (e.key === "Escape") {
			e.preventDefault()
			if (currentValue) {
				handleClear()
			}
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
					"hover:border-muted-foreground/25",
					"focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/30",
					"transition-all duration-200",
					isPending && "opacity-70",
					styles.container
				)}
			>
				<div
					className={cn(
						"absolute flex items-center text-muted-foreground pointer-events-none",
						styles.iconLeft
					)}
				>
					{isPending && mode === "live" ? (
						<MiniDotsLoader
							size="sm"
							color="primary"
							className="group-hover:text-foreground/70 group-focus-within:text-primary transition-colors duration-150"
						/>
					) : (
						<Search className="h-4 w-4 group-hover:text-foreground/70 group-focus-within:text-primary transition-colors duration-150" />
					)}
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
								value={field.state.value}
								onChange={(e) => field.handleChange(e.target.value)}
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
								aria-describedby="search-status"
							/>

							<AnimatePresence mode="wait">
								{field.state.value && (
									<motion.div
										initial={{ opacity: 0, scale: 0.8 }}
										animate={{ opacity: 1, scale: 1 }}
										exit={{ opacity: 0, scale: 0.8 }}
										transition={{ duration: 0.15 }}
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

			{/* Submit button (only in submit mode) */}
			{mode === "submit" && (
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
			)}

			{/* Live region for screen readers */}
			<span
				id="search-status"
				role="status"
				aria-live="polite"
				className="sr-only"
			>
				{isPending ? "Recherche en cours..." : ""}
			</span>
		</form>
	)
}
