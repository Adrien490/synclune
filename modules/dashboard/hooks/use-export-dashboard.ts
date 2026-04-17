"use client";

import { useActionWithToast } from "@/shared/hooks/use-action-with-toast";
import { exportDashboardReport } from "@/modules/dashboard/actions/export-dashboard-report";
import type {
	ExportDashboardFormat,
	ExportDashboardInput,
} from "@/modules/dashboard/schemas/export-dashboard.schema";
import type { DashboardPeriod } from "@/modules/dashboard/constants/period.constants";
import type { DashboardExportPayload } from "@/modules/dashboard/services/export-builder.service";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";

interface UseExportDashboardOptions {
	onSuccess?: (payload: DashboardExportPayload) => void;
}

function isExportPayload(value: unknown): value is DashboardExportPayload {
	if (!value || typeof value !== "object") return false;
	const v = value as Record<string, unknown>;
	return (
		typeof v.filename === "string" &&
		typeof v.mimeType === "string" &&
		typeof v.content === "string"
	);
}

export function triggerDashboardDownload(payload: DashboardExportPayload): void {
	const blob = new Blob([payload.content], { type: payload.mimeType });
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = payload.filename;
	document.body.appendChild(link);
	link.click();
	link.remove();
	URL.revokeObjectURL(url);
}

export function useExportDashboard(options?: UseExportDashboardOptions) {
	const { action, isPending, state } = useActionWithToast(exportDashboardReport, {
		onSuccess: (result: ActionState) => {
			if (result.status !== ActionStatus.SUCCESS) return;
			if (!isExportPayload(result.data)) return;
			triggerDashboardDownload(result.data);
			options?.onSuccess?.(result.data);
		},
	});

	const exportReport = (input: ExportDashboardInput) => {
		const formData = new FormData();
		formData.append("period", input.period);
		formData.append("format", input.format);
		action(formData);
	};

	return { exportReport, isPending, state };
}

export type { DashboardPeriod, ExportDashboardFormat };
