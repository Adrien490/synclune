import { formatEuro } from "@/shared/utils/format-euro";
import { Link, Section, Text } from "@react-email/components";
import { LEGAL_URLS } from "@/shared/constants/legal-urls";
import { EMAIL_CLASSES, EMAIL_COLORS, EMAIL_STYLES, REFUND_REASON_LABELS } from "./email-colors";
import { EmailCard } from "./_components/email-card";
import { EmailCTA } from "./_components/email-cta";
import { EmailHeading } from "./_components/email-heading";
import { EmailLayout } from "./_components/email-layout";

interface RefundRejectedEmailProps {
	orderNumber: string;
	customerName: string;
	refundAmount: number;
	reason?: string;
	orderDetailsUrl: string;
}

export const RefundRejectedEmail = ({
	orderNumber,
	customerName,
	refundAmount,
	reason,
	orderDetailsUrl,
}: RefundRejectedEmailProps) => {
	const reasonLabel = reason ? (REFUND_REASON_LABELS[reason] ?? reason) : null;

	return (
		<EmailLayout preview={`Demande de remboursement de ${formatEuro(refundAmount)} refusée`}>
			<Section style={{ marginBottom: "24px" }}>
				<EmailHeading level="h1">Demande de remboursement refusée</EmailHeading>
				<Text
					className={EMAIL_CLASSES.text.body}
					style={{ ...EMAIL_STYLES.text.body, marginTop: "12px" }}
				>
					Bonjour {customerName}, nous avons examiné votre demande de remboursement de{" "}
					{formatEuro(refundAmount)} pour la commande <strong>{orderNumber}</strong> et celle-ci n'a
					malheureusement pas pu être acceptée.
				</Text>
			</Section>

			{reasonLabel && (
				<Section style={{ marginBottom: "24px" }}>
					<EmailCard>
						<Text
							className={EMAIL_CLASSES.text.secondary}
							style={{ ...EMAIL_STYLES.text.small, marginBottom: "4px" }}
						>
							Motif
						</Text>
						<Text
							className={EMAIL_CLASSES.text.body}
							style={{
								margin: 0,
								fontSize: "14px",
								color: EMAIL_COLORS.text.primary,
							}}
						>
							{reasonLabel}
						</Text>
					</EmailCard>
				</Section>
			)}

			<Section style={{ marginBottom: "24px" }}>
				<Text className={EMAIL_CLASSES.text.body} style={EMAIL_STYLES.text.body}>
					Si vous avez des questions ou souhaitez contester cette décision, n'hésitez pas à nous
					contacter. Notre équipe est à votre disposition pour vous accompagner.
				</Text>
			</Section>

			<EmailCTA href={LEGAL_URLS.CONTACT} marginBottom="12px">
				Nous contacter
			</EmailCTA>
			<Section style={{ marginBottom: "32px", textAlign: "center" }}>
				<Link href={orderDetailsUrl} style={{ ...EMAIL_STYLES.link, textDecoration: "underline" }}>
					Voir ma commande
				</Link>
			</Section>
		</EmailLayout>
	);
};

RefundRejectedEmail.PreviewProps = {
	orderNumber: "CMD-2024-ABCD1234",
	customerName: "Marie",
	refundAmount: 8990,
	reason: "CUSTOMER_REQUEST",
	orderDetailsUrl: "https://synclune.fr/compte/commandes/CMD-2024-ABCD1234",
} as RefundRejectedEmailProps;

export default RefundRejectedEmail;
