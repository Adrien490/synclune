import { Link, Section, Text } from "react-email";
import type { ShippingAddress } from "@/modules/emails/types/email.types";
import { EMAIL_CLASSES, EMAIL_COLORS, EMAIL_STYLES } from "./email-colors";
import { EmailCard } from "./_components/email-card";
import { EmailCTA } from "./_components/email-cta";
import { EmailHeading } from "./_components/email-heading";
import { EmailLayout } from "./_components/email-layout";
import { TrackingInfo } from "./_components/tracking-info";
import { formatCountryName } from "@/shared/constants/countries";

interface ShippingConfirmationEmailProps {
	orderNumber: string;
	customerName: string;
	trackingNumber: string;
	trackingUrl: string | null;
	/**
	 * Lien vers la commande (`buildOrderTrackingUrl`). Deux rôles :
	 * - repli CTA quand le transporteur n'expose pas d'URL de suivi (`autre`) —
	 *   sans lui, l'email était un cul-de-sac ;
	 * - lien secondaire durable dans le cas nominal — depuis le retrait de
	 *   l'espace client (2026-07-31), cette URL tokenisée est la seule clé du
	 *   client vers sa commande.
	 */
	orderTrackingUrl?: string | null;
	carrierLabel: string;
	estimatedDelivery?: string | null;
	shippingAddress: ShippingAddress;
}

export const ShippingConfirmationEmail = ({
	orderNumber,
	customerName,
	trackingNumber,
	trackingUrl,
	orderTrackingUrl,
	carrierLabel,
	estimatedDelivery,
	shippingAddress,
}: ShippingConfirmationEmailProps) => {
	return (
		<EmailLayout preview={`Commande ${orderNumber} expédiée`}>
			<Section style={{ marginBottom: "24px" }}>
				<EmailHeading level="h1">Commande expédiée</EmailHeading>
				<Text
					className={EMAIL_CLASSES.text.body}
					style={{ ...EMAIL_STYLES.text.body, marginTop: "12px" }}
				>
					Bonjour {customerName}, votre commande {orderNumber} est en route.
				</Text>
			</Section>

			<Section style={{ marginBottom: "24px" }}>
				<TrackingInfo
					carrierLabel={carrierLabel}
					trackingNumber={trackingNumber}
					estimatedDelivery={estimatedDelivery}
				/>
			</Section>

			<Section style={{ marginBottom: "24px" }}>
				<EmailHeading level="h3" style={{ marginBottom: "8px" }}>
					Adresse de livraison
				</EmailHeading>
				<EmailCard>
					{shippingAddress.name && (
						<Text
							className={EMAIL_CLASSES.text.body}
							style={{ ...EMAIL_STYLES.text.body, margin: 0 }}
						>
							{shippingAddress.name}
						</Text>
					)}
					<Text
						className={EMAIL_CLASSES.text.secondary}
						style={{ ...EMAIL_STYLES.text.small, marginTop: "4px" }}
					>
						{shippingAddress.line1}
						{shippingAddress.line2 && `, ${shippingAddress.line2}`}
					</Text>
					<Text className={EMAIL_CLASSES.text.secondary} style={EMAIL_STYLES.text.small}>
						{shippingAddress.postalCode} {shippingAddress.city},{" "}
						{formatCountryName(shippingAddress.country)}
					</Text>
				</EmailCard>
			</Section>

			{/* Libellé honnête : sans URL transporteur, le lien mène à la commande,
			    pas au suivi du colis. */}
			{trackingUrl ? (
				<EmailCTA href={trackingUrl}>Suivre mon colis</EmailCTA>
			) : (
				orderTrackingUrl && <EmailCTA href={orderTrackingUrl}>Voir ma commande</EmailCTA>
			)}

			{/* Lien durable vers la commande, présent AUSSI dans le cas nominal :
			    depuis le retrait de l'espace client (2026-07-31), l'URL tokenisée
			    /suivi-commande est la seule clé du client vers sa commande, et cet
			    email est souvent le dernier qu'il reçoit. En repli (bloc ci-dessus),
			    le CTA la porte déjà — pas de doublon. */}
			{trackingUrl && orderTrackingUrl && (
				<Section style={{ marginTop: "12px", textAlign: "center" }}>
					<Link
						href={orderTrackingUrl}
						style={{
							color: EMAIL_COLORS.text.secondary,
							textDecoration: "underline",
							fontSize: "14px",
						}}
					>
						Voir ma commande
					</Link>
				</Section>
			)}
		</EmailLayout>
	);
};

ShippingConfirmationEmail.PreviewProps = {
	orderNumber: "n° 12",
	customerName: "Marie",
	trackingNumber: "8N00234567890",
	trackingUrl: "https://www.laposte.fr/outils/suivre-vos-envois?code=8N00234567890",
	orderTrackingUrl:
		"https://synclune.fr/suivi-commande?commande=k3x9m2p8q1r5s7t0&token=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
	carrierLabel: "Colissimo",
	estimatedDelivery: "12 juin 2026",
	shippingAddress: {
		name: "Marie Dupont",
		line1: "12 Rue de la Paix",
		line2: "Appartement 4B",
		postalCode: "75002",
		city: "Paris",
		country: "FR",
	},
} as ShippingConfirmationEmailProps;

export default ShippingConfirmationEmail;
