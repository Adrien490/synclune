import { STEP_COLORS } from "@/shared/constants/process-steps";

export interface ProcessStep {
	id: string;
	title: string;
	description: string;
	color: string;
	iconHoverClass: string;
	glowClass: string;
	intensity: { ring: string; shadow: string };
}

export const processSteps: ProcessStep[] = [
	{
		id: "idea",
		title: "D'abord, une idée",
		description:
			"Une couleur dans la rue, un motif sur un tissu, un rêve… Je laisse l'inspiration venir, sans forcer.",
		color: STEP_COLORS.secondary,
		iconHoverClass:
			"group-hover:[&_svg]:text-yellow-500 group-hover:[&_svg]:drop-shadow-[0_0_6px_rgba(234,179,8,0.5)]",
		glowClass: "group-hover:shadow-[0_0_25px_var(--color-glow-yellow)]",
		// Étape 1 volontairement plate : ring/shadow montent progressivement
		// d'une étape à l'autre (idée → finition) pour suggérer la matière qui prend
		// forme. Les chaînes vides sont filtrées par `cn()`.
		intensity: { ring: "", shadow: "" },
	},
	{
		id: "drawing",
		title: "Le choix du matériel",
		description: "Chaque élément est choisi avec soin dans mon atelier.",
		color: STEP_COLORS.primary,
		iconHoverClass: "group-hover:[&_svg]:rotate-[-15deg]",
		glowClass: "group-hover:shadow-[0_0_25px_var(--color-glow-pink)]",
		intensity: { ring: "ring-1 ring-secondary/10", shadow: "shadow-sm shadow-secondary/20" },
	},
	{
		id: "assembly",
		title: "La cuisson et l'assemblage",
		description:
			"Chaque bijou possède un processus de fabrication différent, donnant naissance à des pièces uniques.",
		color: STEP_COLORS.secondary,
		iconHoverClass: "group-hover:[&_svg]:translate-y-[-2px] group-hover:[&_svg]:rotate-[-8deg]",
		glowClass: "group-hover:shadow-[0_0_25px_var(--color-glow-lavender)]",
		intensity: { ring: "ring-1 ring-secondary/20", shadow: "shadow-md shadow-secondary/30" },
	},
	{
		id: "finishing",
		title: "La touche finale",
		description:
			"Je polis et vérifie chaque détail, puis je place le bijou dans une pochette, avec amour.",
		color: STEP_COLORS.primary,
		iconHoverClass: "group-hover:[&_svg]:scale-110",
		glowClass: "group-hover:shadow-[0_0_25px_var(--color-glow-mint)]",
		intensity: { ring: "ring-2 ring-secondary/30", shadow: "shadow-lg shadow-secondary/40" },
	},
];
