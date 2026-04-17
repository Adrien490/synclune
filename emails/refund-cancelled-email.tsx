import { formatEuro } from "@/shared/utils/format-euro";
import { Button, Link, Section, Text } from "@react-email/components";
import { EMAIL_COLORS, EMAIL_STYLES } from "./email-colors";
import { EmailLayout } from "./_components/email-layout";

interface RefundCancelledEmailProps {
	orderNumber: string;
	customerName: string;
	refundAmount: number;
	orderDetailsUrl: string;
}

export const RefundCancelledEmail = ({
	orderNumber,
	customerName,
	refundAmount,
	orderDetailsUrl,
}: RefundCancelledEmailProps) => {
	return (
		<EmailLayout preview={`Demande de remboursement de ${formatEuro(refundAmount)} annulée`}>
			<Section style={{ marginBottom: "24px" }}>
				<Text style={EMAIL_STYLES.heading.h2}>Demande de remboursement annulée</Text>
				<Text style={{ ...EMAIL_STYLES.text.body, marginTop: "12px" }}>
					Bonjour {customerName}, votre demande de remboursement de{" "}
					<strong>{formatEuro(refundAmount)}</strong> concernant la commande{" "}
					<strong>{orderNumber}</strong> a été annulée par notre équipe.
				</Text>
			</Section>

			<Section style={{ marginBottom: "24px" }}>
				<Section style={EMAIL_STYLES.section.card}>
					<Text
						style={{
							margin: 0,
							fontSize: "14px",
							color: EMAIL_COLORS.text.primary,
						}}
					>
						Aucun prélèvement ni remboursement n'a été effectué. Votre commande reste dans son état
						actuel.
					</Text>
				</Section>
			</Section>

			<Section style={{ marginBottom: "24px" }}>
				<Text style={EMAIL_STYLES.text.body}>
					Si cette annulation ne correspond pas à votre demande, ou si vous souhaitez initier une
					nouvelle demande de remboursement, n'hésitez pas à nous contacter.
				</Text>
			</Section>

			<Section style={{ marginBottom: "12px", textAlign: "center" }}>
				<Button href="https://synclune.fr/contact" style={EMAIL_STYLES.button.primary}>
					Nous contacter
				</Button>
			</Section>
			<Section style={{ marginBottom: "32px", textAlign: "center" }}>
				<Link href={orderDetailsUrl} style={{ ...EMAIL_STYLES.link, textDecoration: "underline" }}>
					Voir ma commande
				</Link>
			</Section>
		</EmailLayout>
	);
};

RefundCancelledEmail.PreviewProps = {
	orderNumber: "CMD-2024-ABCD1234",
	customerName: "Marie",
	refundAmount: 8990,
	orderDetailsUrl: "https://synclune.fr/compte/commandes/CMD-2024-ABCD1234",
} as RefundCancelledEmailProps;

export default RefundCancelledEmail;
