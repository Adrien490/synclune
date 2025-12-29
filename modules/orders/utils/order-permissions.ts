/**
 * @deprecated Importer depuis @/modules/orders/services/order-permissions.service
 */

export {
	getOrderPermissions,
	canRefundOrder,
	canUpdateOrderTracking,
	type OrderPermissions,
} from "../services/order-permissions.service";

export type { OrderStateInput } from "../services/order-permissions.service";
