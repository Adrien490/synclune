import { CursorPaginationSkeleton } from "@/shared/components/cursor-pagination/cursor-pagination-skeleton";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/shared/components/ui/table";
import { cn } from "@/shared/utils/cn";
import type { ReactNode } from "react";

type CellType =
	| { type: "checkbox" }
	| { type: "text"; width: string }
	| { type: "badge"; width: string }
	| { type: "image"; size?: number }
	| { type: "avatar"; size?: number }
	| { type: "actions" }
	| { type: "custom"; render: () => ReactNode };

interface ColumnConfig {
	width?: string;
	hiddenBelow?: "sm" | "md" | "lg" | "xl" | "2xl";
	align?: "left" | "center" | "right";
	headerWidth?: string;
	cell: CellType;
}

interface DataTableSkeletonProps {
	columns: ColumnConfig[];
	rows?: number;
	pagination?: "cursor" | "offset" | "none";
	tableFixed?: boolean;
}

const hiddenClasses: Record<string, string> = {
	sm: "hidden sm:table-cell",
	md: "hidden md:table-cell",
	lg: "hidden lg:table-cell",
	xl: "hidden xl:table-cell",
	"2xl": "hidden 2xl:table-cell",
};

const alignClasses: Record<string, string> = {
	left: "",
	center: "text-center",
	right: "text-right",
};

function renderCell(cell: CellType): ReactNode {
	switch (cell.type) {
		case "checkbox":
			return <Skeleton className="h-4 w-4" />;
		case "text":
			return <Skeleton className={cn("h-4", cell.width)} />;
		case "badge":
			return <Skeleton className={cn("h-6 rounded-full", cell.width)} />;
		case "image": {
			const size = cell.size ?? 20;
			return (
				<Skeleton
					className="rounded-md"
					style={{ height: size * 4, width: size * 4 }}
				/>
			);
		}
		case "avatar": {
			const size = cell.size ?? 10;
			return (
				<Skeleton
					className="rounded-full"
					style={{ height: size * 4, width: size * 4 }}
				/>
			);
		}
		case "actions":
			return <Skeleton className="h-8 w-8 ml-auto" />;
		case "custom":
			return cell.render();
	}
}

export function DataTableSkeleton({
	columns,
	rows = 10,
	pagination = "offset",
	tableFixed = true,
}: DataTableSkeletonProps) {
	return (
		<Card>
			<CardContent>
				<div className="overflow-x-auto">
					<Table className={cn("min-w-full", tableFixed && "table-fixed")}>
						<TableHeader>
							<TableRow>
								{columns.map((col, i) => (
									<TableHead
										key={i}
										className={cn(
											col.width && `w-[${col.width}]`,
											col.hiddenBelow && hiddenClasses[col.hiddenBelow],
											col.align && alignClasses[col.align]
										)}
										style={col.width ? { width: col.width } : undefined}
									>
										<Skeleton
											className={cn(
												"h-4",
												col.headerWidth ?? "w-12",
												col.align === "center" && "mx-auto",
												col.align === "right" && "ml-auto"
											)}
										/>
									</TableHead>
								))}
							</TableRow>
						</TableHeader>
						<TableBody>
							{Array.from({ length: rows }).map((_, rowIndex) => (
								<TableRow key={rowIndex}>
									{columns.map((col, colIndex) => (
										<TableCell
											key={colIndex}
											className={cn(
												col.hiddenBelow && hiddenClasses[col.hiddenBelow],
												col.align && alignClasses[col.align],
												col.cell.type === "image" && "py-3"
											)}
										>
											{renderCell(col.cell)}
										</TableCell>
									))}
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>

				{pagination === "cursor" && (
					<div className="mt-4">
						<CursorPaginationSkeleton />
					</div>
				)}
				{pagination === "offset" && (
					<div className="mt-4 flex items-center justify-between">
						<Skeleton className="h-4 w-32" />
						<div className="flex gap-2">
							<Skeleton className="h-8 w-24" />
							<Skeleton className="h-8 w-24" />
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
