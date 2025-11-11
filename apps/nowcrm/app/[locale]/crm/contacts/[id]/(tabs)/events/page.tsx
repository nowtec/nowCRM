import type { Metadata } from "next";
import type { Session } from "next-auth";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import DataTable from "@/components/dataTable/dataTable";
import ErrorMessage from "@/components/ErrorMessage";

import { columns } from "./components/columns/eventColumns";
import EventsMassActions from "./components/massActions/massActions";
import { DocumentId, PaginationParams } from "@nowcrm/services";
import { eventsService } from "@nowcrm/services/server";

export const metadata: Metadata = {
	title: "Communication History",
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

	const response = await eventsService.find(session?.jwt, {
		sort: [`${sortBy}:${sortOrder}` as any],
		pagination: {
			page,
			pageSize,
		},
		filters: {
			$or: [
				{ title: { $containsi: search } },
				{ action: { $containsi: search } },
				{ payload: { $containsi: search } },
			],
			contact: { documentId: { $eq: params.id } },
		},
		populate: {
			composition_item: {
				populate: ["composition", "channel"],
			},
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
			table_name={t("Contacts.events.table_title")}
			table_title={t("Contacts.events.table_title")}
			mass_actions={EventsMassActions}
			pagination={meta.pagination}
			session={session as Session}
			hiddenCreate={true}
			sorting={{ sortBy, sortOrder }}
		/>
	);
}
