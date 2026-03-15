import { LogoAnimated } from "@/shared/components/logo-animated";
import { fraunces } from "@/shared/styles/fonts";
import { cn } from "@/shared/utils/cn";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { AuthFadeIn } from "./auth-fade-in";

interface AuthPageLayoutProps {
	children: ReactNode;
	backHref: string;
	backLabel: string;
	title: string;
	description?: string;
	icon?: ReactNode;
}

export function AuthPageLayout({
	children,
	backHref,
	backLabel,
	title,
	description,
	icon,
}: AuthPageLayoutProps) {
	return (
		<div className="relative">
			{/* Back link */}
			<div className="absolute top-4 left-4 z-20 sm:top-6 sm:left-6">
				<Link
					href={backHref}
					className="text-muted-foreground hover:text-foreground group -ml-2 inline-flex min-h-11 min-w-11 items-center gap-2 pl-2 text-sm transition-colors duration-200"
				>
					<ArrowLeft
						size={16}
						className="transition-transform duration-200 group-hover:-translate-x-1"
						aria-hidden="true"
					/>
					<span className="font-medium">{backLabel}</span>
				</Link>
			</div>

			{/* Logo */}
			<div className="absolute top-4 right-4 z-20 sm:top-6 sm:right-6">
				<LogoAnimated size={44} preload href="/" />
			</div>

			{/* Main content */}
			<div className="relative z-10 flex min-h-screen justify-center px-4 pt-16 pb-8 sm:pt-20 sm:pb-12">
				<div className="my-auto w-full max-w-md space-y-8">
					{/* Header */}
					<AuthFadeIn>
						<div className="space-y-7 text-center">
							{icon && <div className="flex justify-center">{icon}</div>}
							<div className="space-y-3">
								<h1
									className={cn(
										"text-foreground text-2xl font-medium sm:text-3xl lg:text-4xl",
										fraunces.className,
									)}
								>
									{title}
								</h1>
								{description && <p className="text-muted-foreground">{description}</p>}
							</div>
						</div>
					</AuthFadeIn>

					{/* Content */}
					<AuthFadeIn delay={0.1}>{children}</AuthFadeIn>
				</div>
			</div>
		</div>
	);
}
