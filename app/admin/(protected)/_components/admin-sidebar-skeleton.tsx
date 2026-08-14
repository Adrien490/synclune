import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuItem,
	SidebarSeparator,
} from "@/shared/components/ui/sidebar";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { navigationData } from "./navigation-config";

/**
 * Skeleton léger pour AdminSidebar pendant que la garde admin résout.
 * Matche la structure visuelle (logo + N groupes nav réels + footer user).
 * Compte des items dérivé de `navigationData` pour rester en parité automatique.
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
				{navigationData.navGroups.map((group, index) => {
					const isLastGroup = index === navigationData.navGroups.length - 1;
					return (
						<div key={group.label}>
							<div className="flex h-8 items-center px-3">
								<Skeleton shape="text" className="h-3 w-20" />
							</div>
							<SidebarMenu className="gap-1">
								{group.items.map((item) => (
									<SidebarMenuItem key={item.id}>
										<div className="flex h-9 items-center gap-2 rounded-md px-2">
											<Skeleton shape="rounded" className="size-5 shrink-0" />
											<Skeleton shape="text" className="h-4 w-3/5" />
										</div>
									</SidebarMenuItem>
								))}
							</SidebarMenu>
							{!isLastGroup && (
								<SidebarSeparator className="my-2 group-data-[collapsible=icon]:my-3" />
							)}
						</div>
					);
				})}
			</SidebarContent>
			<SidebarFooter>
				<SidebarMenu>
					<SidebarMenuItem>
						<div className="flex h-12 items-center gap-2 px-2">
							<Skeleton shape="rounded" className="size-8 shrink-0" />
							<div className="grid flex-1 gap-1 group-data-[collapsible=icon]:hidden">
								<Skeleton shape="text" className="h-4 w-3/5" />
								<Skeleton shape="text" className="h-3 w-4/5" />
							</div>
							<Skeleton
								shape="rounded"
								className="size-4 shrink-0 group-data-[collapsible=icon]:hidden"
							/>
						</div>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarFooter>
		</Sidebar>
	);
}
