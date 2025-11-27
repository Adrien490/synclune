import Image from "next/image";
import Link from "next/link";
import * as React from "react";

import {
	Sidebar,
	SidebarContent,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@/shared/components/ui/sidebar";
import { cn } from "@/shared/utils/cn";
import { dancingScript } from "@/shared/styles/fonts";
import { NavMain } from "./nav-main";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
	return (
		<Sidebar variant="floating" {...props}>
			<SidebarHeader>
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton size="lg" asChild>
							<Link href="/admin">
								<div className="relative flex aspect-square items-center justify-center rounded-lg overflow-hidden size-8 bg-sidebar-primary text-sidebar-primary-foreground">
									<Image
										src="https://x1ain1wpub.ufs.sh/f/nyHesfTydKuS7ITGCqR4OX2w0CSRulvbQWiftspFAahYELrj"
										alt="Logo Synclune"
										fill
										className="object-cover"
										sizes="32px"
									/>
								</div>
								<div className="flex flex-col gap-0.5 leading-none">
									<span
										className={cn(
											dancingScript.className,
											"font-medium text-xl"
										)}
									>
										Synclune
									</span>
								</div>
							</Link>
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarHeader>
			<SidebarContent>
				<NavMain />
			</SidebarContent>
		</Sidebar>
	);
}
