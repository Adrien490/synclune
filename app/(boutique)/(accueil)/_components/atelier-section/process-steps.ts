import { STEP_COLORS } from "@/shared/constants/process-steps";
import { CheckCircle, Hammer, Lightbulb, Pencil, type LucideIcon } from "lucide-react";

export interface ProcessStep {
	id: string;
	title: string;
	description: string;
	icon: LucideIcon;
	color: string;
	iconHoverClass: string;
	glowClass: string;
	intensity: { ring: string; shadow: string };
}

export const processSteps: ProcessStep[] = [
	{
		id: "idea",
		title: "D'abord, une idée",
		icon: Lightbulb,
		description:
			"L'idée naît souvent de mon quotidien : une couleur aperçue dans la rue, un motif sur un tissu, ou même un rêve ! J'essaye de ne pas me forcer, mais plutôt de laisser l'inspiration venir d'elle-même.",
		color: STEP_COLORS.secondary,
		iconHoverClass:
			"group-hover:[&_svg]:text-yellow-500 group-hover:[&_svg]:drop-shadow-[0_0_6px_rgba(234,179,8,0.5)]",
		glowClass: "group-hover:shadow-[0_0_25px_var(--color-glow-yellow)]",
		intensity: { ring: "", shadow: "" },
	},
	{
		id: "drawing",
		title: "Le dessin et la peinture",
		icon: Pencil,
		description:
			"Je dessine mes motifs sur du plastique fou, puis je passe à la peinture acrylique. C'est l'étape la plus minutieuse : chaque trait compte, chaque couleur est choisie avec soin.",
		color: STEP_COLORS.primary,
		iconHoverClass: "group-hover:[&_svg]:rotate-[-15deg]",
		glowClass: "group-hover:shadow-[0_0_25px_var(--color-glow-pink)]",
		intensity: { ring: "ring-1 ring-secondary/10", shadow: "shadow-sm shadow-secondary/20" },
	},
	{
		id: "assembly",
		title: "La cuisson et l'assemblage",
		icon: Hammer,
		description:
			"Cuisson au four (le plastique rétrécit de 7 fois !), vernissage pour protéger les couleurs, puis montage sur les supports. Parfois le résultat surprend, mais ça fait partie du charme artisanal !",
		color: STEP_COLORS.secondary,
		iconHoverClass: "group-hover:[&_svg]:translate-y-[-2px] group-hover:[&_svg]:rotate-[-8deg]",
		glowClass: "group-hover:shadow-[0_0_25px_var(--color-glow-lavender)]",
		intensity: { ring: "ring-1 ring-secondary/20", shadow: "shadow-md shadow-secondary/30" },
	},
	{
		id: "finishing",
		title: "La touche finale",
		icon: CheckCircle,
		description:
			"Je polis, je vérifie chaque détail, j'assemble les perles... Bon, je suis un peu perfectionniste ! Puis emballage avec amour dans sa jolie pochette.",
		color: STEP_COLORS.primary,
		iconHoverClass: "group-hover:[&_svg]:scale-110",
		glowClass: "group-hover:shadow-[0_0_25px_var(--color-glow-mint)]",
		intensity: { ring: "ring-2 ring-secondary/30", shadow: "shadow-lg shadow-secondary/40" },
	},
];
