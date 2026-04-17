import {
	Sidebar,
	SidebarContent,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuItem,
	SidebarSeparator,
} from "@/shared/components/ui/sidebar";
import { Skeleton } from "@/shared/components/ui/skeleton";

/**
 * Skeleton léger pour AdminSidebar pendant que requireAdminWithUser résout.
 * Matche la structure visuelle (logo + 3 groupes nav + footer user).
 */
export function AdminSidebarSkeleton() {
	return (
		<Sidebar variant="floating" disableMobileSheet>
			<SidebarHeader>
				<SidebarMenu>
					<SidebarMenuItem>
						<div className="flex h-12 items-center gap-2 px-2">
							<Skeleton shape="rounded" className="size-10 shrink-0" />
							<Skeleton shape="text" className="h-6 flex-1 group-data-[collapsible=icon]:hidden" />
						</div>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarHeader>
			<SidebarContent>
				{[0, 1, 2].map((group) => (
					<div key={group}>
						<div className="px-3 py-1">
							<Skeleton shape="text" className="h-3 w-20" />
						</div>
						<SidebarMenu className="gap-1">
							{Array.from({ length: 4 }).map((_, i) => (
								<SidebarMenuItem key={i}>
									<div className="flex h-8 items-center gap-2 rounded-md px-2">
										<Skeleton shape="rounded" className="size-4 shrink-0" />
										<Skeleton shape="text" className="h-4 w-3/5" />
									</div>
								</SidebarMenuItem>
							))}
						</SidebarMenu>
						{group < 2 && <SidebarSeparator className="my-2" />}
					</div>
				))}
			</SidebarContent>
		</Sidebar>
	);
}
