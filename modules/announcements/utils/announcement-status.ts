import type { AnnouncementStatus } from "../types/announcement.types";

/** Status labels for admin UI */
export const ANNOUNCEMENT_STATUS_LABELS: Record<AnnouncementStatus, string> = {
	active: "Active",
	scheduled: "Programmée",
	expired: "Expirée",
	inactive: "Inactive",
};

/** Status badge colors for admin UI */
export const ANNOUNCEMENT_STATUS_COLORS: Record<AnnouncementStatus, string> = {
	active: "bg-green-100 text-green-800",
	scheduled: "bg-blue-100 text-blue-800",
	expired: "bg-gray-100 text-gray-500",
	inactive: "bg-amber-100 text-amber-800",
};
