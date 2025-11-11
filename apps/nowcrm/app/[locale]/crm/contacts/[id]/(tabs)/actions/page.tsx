import type { Metadata } from "next";
import type { Session } from "next-auth";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import DataTable from "@/components/dataTable/dataTable";
import ErrorMessage from "@/components/ErrorMessage";

import { columns } from "./components/columns/actionsColumns";
import ActionsMassActions from "./components/massActions/massActions";
import { PaginationParams } from "@nowcrm/services";
import { actionsService } from "@nowcrm/services/server";

export const metadata: Metadata = {
	title: "Contact actions",
};

export default async function Page(props: {
	searchParams: Promise<PaginationParams>;
	params: Promise<{ id: number }>;
}) {
	const t = await getTranslations("Contacts.topBar");
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
	const response = await actionsService.find(session?.jwt, {
		sort: [`${sortBy}:${sortOrder}` as any],
		populate: "*",
		pagination: {
			page,
			pageSize,
		},
		filters: {
			$or: [
				{ action_type: { $containsi: search } as any },
				{ entity: { $containsi: search } },
				{ payload: { $containsi: search } },
			],
			contact: { id: { $eq: params.id } },
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
			table_name="actions"
			table_title={t("actions")}
			mass_actions={ActionsMassActions}
			pagination={meta.pagination}
			session={session as Session}
			hiddenCreate={true}
			sorting={{ sortBy, sortOrder }}
		/>
	);
}
