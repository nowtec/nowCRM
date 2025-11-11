import type { Metadata } from "next";
import type { Session } from "next-auth";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import DataTable from "@/components/dataTable/dataTable";
import ErrorMessage from "@/components/ErrorMessage";
import { subscriptionsService } from "@nowcrm/services/server";
import { DocumentId } from "@nowcrm/services";
import { columns } from "./components/columns/subscriptionColumns";
import createListDialog from "./components/createDialog";
import ContactsSubscriptionsMassActions from "./components/massActions/massActions";

export const metadata: Metadata = {
	title: "Contact subscriptions",
};

export default async function Page(props: { params: Promise<{ id: DocumentId }> }) {
	const t = await getTranslations();
	const params = await props.params;
	// Fetch data from the contactService
	const session = await auth();

	const response = await subscriptionsService.find(session?.jwt, {
		populate: "*",
		sort: ["documentId:desc"],
		filters: { contact: { documentId: { $eq: params.id } } },
	});

	if (!response.success || !response.data || !response.meta) {
		return <ErrorMessage response={response} />;
	}
	const { meta } = response;

	return (
		<DataTable
			data={response.data}
			columns={columns}
			table_name="contact_subscriptions"
			table_title={t("Contacts.subscriptions.table_title")}
			mass_actions={ContactsSubscriptionsMassActions}
			pagination={meta.pagination}
			session={session as Session}
			createDialog={createListDialog}
			hiddenSearch={true}
			hiddenExport={true}
		/>
	);
}
