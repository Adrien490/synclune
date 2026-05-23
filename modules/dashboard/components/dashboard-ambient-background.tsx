import { DecorativeHalo } from "@/shared/components/animations/decorative-halo";

export function DashboardAmbientBackground() {
	return (
		<div
			aria-hidden="true"
			className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[50vh] overflow-hidden"
		>
			<DecorativeHalo
				variant="rose"
				blur="xl"
				opacity="light"
				animate="float"
				className="-top-24 -left-24 hidden size-72 md:block"
			/>
			<DecorativeHalo
				variant="gold"
				blur="xl"
				opacity="light"
				animate="float"
				animationDelay={2.5}
				className="-top-16 right-8 hidden size-56 md:block"
			/>
			<DecorativeHalo
				variant="rose"
				blur="xl"
				opacity="light"
				animate="float"
				className="-top-8 -right-8 size-40 md:hidden"
			/>
		</div>
	);
}
