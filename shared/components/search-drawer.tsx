"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Search, X } from "lucide-react";

import { useAppForm } from "@/shared/components/forms";
import { MiniDotsLoader } from "@/shared/components/loaders/mini-dots-loader";
import { Button } from "@/shared/components/ui/button";
import {
	Drawer,
	DrawerBody,
	DrawerContent,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle,
} from "@/shared/components/ui/drawer";
import { Input } from "@/shared/components/ui/input";
import { cn } from "@/shared/utils/cn";

interface SearchDrawerProps {
	/** Controlled open state */
	open: boolean;
	/** Callback when open state changes */
	onOpenChange: (open: boolean) => void;
	/** URL parameter name for search */
	paramName?: string;
	/** Placeholder text for input */
	placeholder?: string;
	/** Auto-close drawer after search submission */
	autoCloseOnSubmit?: boolean;
	/** Debounce delay in milliseconds */
	debounceMs?: number;
}

/**
 * Search drawer for mobile devices.
 * Opens from bottom with autofocus on input.
 * Updates URL params with debounced search.
 */
export function SearchDrawer({
	open,
	onOpenChange,
	paramName = "search",
	placeholder = "Rechercher...",
	autoCloseOnSubmit = true,
	debounceMs = 300,
}: SearchDrawerProps) {
	const searchParams = useSearchParams();
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const inputRef = useRef<HTMLInputElement>(null);

	// Get current search value from URL
	const currentSearchValue = searchParams.get(paramName) || "";

	// Create form with TanStack Form
	const form = useAppForm({
		defaultValues: {
			search: currentSearchValue,
		},
	});

	// Update URL with search params
	const updateSearchParams = (value: string, closeOverlay = false) => {
		const newSearchParams = new URLSearchParams(searchParams.toString());
		if (value.trim()) {
			newSearchParams.set(paramName, value.trim());
		} else {
			newSearchParams.delete(paramName);
		}

		// Reset pagination when searching
		newSearchParams.delete("cursor");
		newSearchParams.delete("direction");

		startTransition(() => {
			router.replace(`?${newSearchParams.toString()}`, { scroll: false });
		});

		if (closeOverlay && autoCloseOnSubmit) {
			onOpenChange(false);
		}
	};

	// Clear search
	const clearSearch = () => {
		form.setFieldValue("search", "");
		updateSearchParams("");
		inputRef.current?.focus();
	};

	// Handle form submission (Enter key)
	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		const value = form.getFieldValue("search");
		updateSearchParams(value, true);
	};

	// Focus input when overlay opens
	useEffect(() => {
		if (open) {
			const timer = setTimeout(() => {
				inputRef.current?.focus();
			}, 100);
			return () => clearTimeout(timer);
		}
	}, [open]);

	// Sync form value with URL when overlay opens
	useEffect(() => {
		if (open) {
			form.setFieldValue("search", currentSearchValue);
		}
	}, [open, currentSearchValue, form]);

	return (
		<Drawer open={open} onOpenChange={onOpenChange}>
			<DrawerContent>
				<DrawerHeader>
					<DrawerTitle>Rechercher</DrawerTitle>
				</DrawerHeader>

				<DrawerBody className="flex flex-col">
					<form role="search" onSubmit={handleSubmit} className="flex flex-col gap-4">
						<div
							className={cn(
								"relative flex w-full items-center h-12",
								"rounded-lg overflow-hidden",
								"bg-muted/50 border border-input",
								"focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/30",
								"transition-all duration-200",
								isPending && "opacity-70"
							)}
						>
							<div className="absolute left-4 flex items-center text-muted-foreground pointer-events-none">
								{isPending ? (
									<MiniDotsLoader size="sm" color="primary" />
								) : (
									<Search className="h-5 w-5" />
								)}
							</div>

							<form.AppField
								name="search"
								validators={{
									onChangeAsync: async ({ value }) => {
										updateSearchParams(value);
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
											type="search"
											inputMode="search"
											enterKeyHint="search"
											value={field.state.value}
											onChange={(e) => field.handleChange(e.target.value)}
											onKeyDown={(e) => {
												if (e.key === "Escape") {
													e.preventDefault();
													if (field.state.value) {
														clearSearch();
													} else {
														onOpenChange(false);
													}
												}
											}}
											className={cn(
												"pl-12 pr-12",
												"h-12",
												"text-base",
												"border-none shadow-none focus-visible:ring-0",
												"bg-transparent",
												"placeholder:text-muted-foreground/60",
												"[&::-webkit-search-cancel-button]:appearance-none"
											)}
											placeholder={placeholder}
											aria-label={placeholder}
										/>

										<AnimatePresence mode="wait">
											{field.state.value && (
												<motion.div
													initial={{ opacity: 0, scale: 0.8 }}
													animate={{ opacity: 1, scale: 1 }}
													exit={{ opacity: 0, scale: 0.8 }}
													transition={{ duration: 0.15 }}
													className="absolute right-1"
												>
													<Button
														type="button"
														variant="ghost"
														size="icon"
														onClick={clearSearch}
														className="size-11 text-muted-foreground hover:text-foreground"
														aria-label="Effacer la recherche"
													>
														<X className="size-5" />
													</Button>
												</motion.div>
											)}
										</AnimatePresence>
									</>
								)}
							</form.AppField>
						</div>

						{/* Live region for screen readers */}
						<span role="status" aria-live="polite" className="sr-only">
							{isPending ? "Recherche en cours..." : ""}
						</span>
					</form>
				</DrawerBody>

				<DrawerFooter>
					<Button
						type="submit"
						disabled={isPending}
						className="w-full h-12"
						onClick={handleSubmit}
					>
						{isPending ? "Recherche..." : "Rechercher"}
					</Button>
				</DrawerFooter>
			</DrawerContent>
		</Drawer>
	);
}

interface SearchDrawerTriggerProps {
	/** Placeholder text passed to SearchDrawer */
	placeholder?: string;
	/** Additional classes for the trigger button */
	className?: string;
	/** URL parameter name for search */
	paramName?: string;
}

/**
 * Autonomous trigger component with built-in SearchDrawer.
 * Use this in PageHeader actions for mobile search.
 *
 * @example
 * ```tsx
 * <PageHeader
 *   title="Produits"
 *   action={
 *     <SearchDrawerTrigger
 *       placeholder="Rechercher des bijoux..."
 *       className="md:hidden"
 *     />
 *   }
 * />
 * ```
 */
export function SearchDrawerTrigger({
	placeholder = "Rechercher...",
	className,
	paramName = "search",
}: SearchDrawerTriggerProps) {
	const [open, setOpen] = useState(false);

	return (
		<>
			<Button
				variant="ghost"
				size="icon"
				onClick={() => setOpen(true)}
				className={cn("size-11", className)}
				aria-label="Rechercher"
			>
				<Search className="size-5" />
			</Button>
			<SearchDrawer
				open={open}
				onOpenChange={setOpen}
				placeholder={placeholder}
				paramName={paramName}
			/>
		</>
	);
}
