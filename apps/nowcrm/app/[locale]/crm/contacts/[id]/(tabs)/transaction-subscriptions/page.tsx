import type { Metadata } from "next";
import type { Session } from "next-auth";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import DataTable from "@/components/dataTable/dataTable";
import ErrorMessage from "@/components/ErrorMessage";
import { columns } from "./components/columns/donationSubscriptionColumns";
import createListDialog from "./components/createDialog";
import DonationSubscriptionsMassActions from "./components/massActions/massActions";
import { DocumentId, PaginationParams } from "@nowcrm/services";
import { donationSubscriptionsService } from "@nowcrm/services/server";

export const metadata: Metadata = {
	title: "Contact donation subscriptions",
};
export default async function Page(props: {
	searchParams: Promise<PaginationParams>;
	params: Promise<{ id: DocumentId }>;
}) {
	const t = await getTranslations();
	const params = await props.params;
	const searchParams = await props.searchParams;
	const {
		page = 1,
		pageSize = 10,
		search = "",
		sortBy = "id",
		sortOrder = "desc",
	} = searchParams;
	// Fetch data from the contactService
	const session = await auth();

	const response = await donationSubscriptionsService.find(session?.jwt, {
		sort: [`${sortBy}:${sortOrder}` as any],
		pagination: {
			page,
			pageSize,
		},
		filters: {
			$or: [
				{ payment_method: { $containsi: search } },
				{ payment_provider: { $containsi: search } },
			],
			contact: { documentId: { $eq: params.id } },
		},
	});

	if (!response.success || !response.data || !response.meta) {
		return <ErrorMessage response={response} />;
	}
	const { meta } = response;

	return (
		<DataTable
			data={response.data}
			columns={columns}
			table_name="transaction_subscriptions"
			table_title={t("Contacts.transactionSubscription.table_title")}
			mass_actions={DonationSubscriptionsMassActions}
			pagination={meta.pagination}
			session={session as Session}
			createDialog={createListDialog}
			sorting={{ sortBy, sortOrder }}
		/>
	);
}
