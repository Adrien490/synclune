"use client";

interface CheckoutSectionProps {
	title: string;
	children: React.ReactNode;
}

/**
 * Section wrapper for checkout form sections.
 * Provides consistent heading and spacing.
 */
export function CheckoutSection({ title, children }: CheckoutSectionProps) {
	return (
		<section className="scroll-mt-24 scroll-mb-32 space-y-5 md:scroll-mt-28 lg:scroll-mb-0">
			<h2 className="font-display text-lg font-medium tracking-wide sm:text-xl">{title}</h2>
			{children}
		</section>
	);
}
