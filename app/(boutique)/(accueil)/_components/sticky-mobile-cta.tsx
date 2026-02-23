"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Button } from "@/shared/components/ui/button";
import { MOTION_CONFIG } from "@/shared/components/animations/motion.config";
import Link from "next/link";

/**
 * Fixed "Découvrir la boutique" button at the bottom of the screen on mobile.
 *
 * - Shows only after scrolling past #hero-section
 * - Hides when #newsletter-section is visible (CTA already inline)
 * - Glass effect background with safe-area padding
 * - md:hidden — desktop has hero CTA always visible
 */
export function StickyMobileCta() {
	const [isVisible, setIsVisible] = useState(false);
	const prefersReducedMotion = useReducedMotion();

	useEffect(() => {
		let observer: IntersectionObserver | null = null;
		let heroInView = true;
		let newsletterInView = false;

		function updateVisibility() {
			setIsVisible((prev) => {
				const next = !heroInView && !newsletterInView;
				return prev === next ? prev : next;
			});
		}

		function setupObserver() {
			const hero = document.getElementById("hero-section");
			if (!hero) return false;

			const newsletter = document.querySelector(
				"[data-section='newsletter']",
			);

			const targets = [hero];
			if (newsletter) targets.push(newsletter as HTMLElement);

			observer = new IntersectionObserver(
				(entries) => {
					for (const entry of entries) {
						if (entry.target === hero) {
							heroInView = entry.isIntersecting;
						} else if (entry.target === newsletter) {
							newsletterInView = entry.isIntersecting;
						}
					}
					updateVisibility();
				},
				{ threshold: 0 },
			);

			for (const target of targets) {
				observer.observe(target);
			}

			// Also observe newsletter if it appears later (Suspense/defer)
			if (!newsletter) {
				const mutationObserver = new MutationObserver(() => {
					const el = document.querySelector(
						"[data-section='newsletter']",
					);
					if (el && observer) {
						observer.observe(el);
						mutationObserver.disconnect();
					}
				});
				mutationObserver.observe(document.body, {
					childList: true,
					subtree: true,
				});
				// Clean up mutation observer with the main cleanup
				const originalDisconnect = observer.disconnect.bind(observer);
				observer.disconnect = () => {
					mutationObserver.disconnect();
					originalDisconnect();
				};
			}

			return true;
		}

		// Retry if hero not yet in DOM (Suspense fallback)
		if (!setupObserver()) {
			const mutationObserver = new MutationObserver(() => {
				if (setupObserver()) {
					mutationObserver.disconnect();
				}
			});
			mutationObserver.observe(document.body, {
				childList: true,
				subtree: true,
			});

			return () => {
				mutationObserver.disconnect();
				observer?.disconnect();
			};
		}

		return () => {
			observer?.disconnect();
		};
	}, []);

	const slideVariants = {
		hidden: prefersReducedMotion
			? { opacity: 0 }
			: { opacity: 0, y: "100%" },
		visible: prefersReducedMotion
			? { opacity: 1 }
			: { opacity: 1, y: 0 },
		exit: prefersReducedMotion
			? { opacity: 0 }
			: { opacity: 0, y: "100%" },
	};

	return (
		<>
			<div aria-live="polite" className="sr-only">
				{isVisible ? "Bouton découvrir la boutique disponible" : ""}
			</div>
			<AnimatePresence>
				{isVisible && (
					<motion.div
						role="region"
						aria-label="Accès rapide à la boutique"
						variants={slideVariants}
						initial="hidden"
						animate="visible"
						exit="exit"
						transition={MOTION_CONFIG.spring.bar}
						className="fixed bottom-0 inset-x-0 z-40 md:hidden bg-background/90 backdrop-blur-md border-t border-border shadow-[0_-4px_16px_0_oklch(0_0_0/0.08)] pb-[env(safe-area-inset-bottom)]"
					>
						<div className="px-4 py-3">
							<Button
								asChild
								size="lg"
								className="w-full font-semibold shadow-lg"
							>
								<Link href="/produits">
									Découvrir la boutique
								</Link>
							</Button>
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</>
	);
}
