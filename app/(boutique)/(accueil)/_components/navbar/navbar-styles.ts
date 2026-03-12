import { cn } from "@/shared/utils/cn";

/** Shared base classes for icon buttons in the navbar (desktop + mobile trigger) */
export const iconButtonClassName = cn(
	"relative items-center justify-center size-11 rounded-xl group",
	"text-muted-foreground hover:bg-accent hover:text-accent-foreground",
	"transition-[transform,color,background-color] duration-300 ease-out",
	"motion-safe:hover:scale-105 motion-safe:active:scale-95",
	"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
);
