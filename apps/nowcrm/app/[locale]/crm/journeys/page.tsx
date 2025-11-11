import type { Metadata } from "next";
import type { Session } from "next-auth";
import { auth } from "@/auth";
import DataTable from "@/components/dataTable/dataTable";
import ErrorMessage from "@/components/ErrorMessage";
import { journeysService } from "@nowcrm/services/server";
import { PaginationParams } from "@nowcrm/services";
import { columns } from "./components/columns/journeysColumns";
import createListDialog from "./components/createDialog";
import MassActionsLists from "./components/massActions/massActions";

export const metadata: Metadata = {
	title: "Journeys",
};

export default async function Page(props: {
	searchParams: Promise<PaginationParams>;
}) {
	const searchParams = await props.searchParams;
	const {
		page = 1,
		pageSize = 10,
		search = "",
		sortBy = "updatedAt",
		sortOrder = "desc",
	} = searchParams;

	// Fetch data from the contactService
	const session = await auth();

	const response = await journeysService.find(session?.jwt, {
		populate: "*",
		sort: [`${sortBy}:${sortOrder}` as any],
		pagination: {
			page,
			pageSize,
		},
		filters: {
			$or: [{ name: { $containsi: search } }],
		},
	});

	if (!response.success || !response.data || !response.meta) {
		return <ErrorMessage response={response} />;
	}
	const { meta } = response;

	return (
		<div className="container">
			<DataTable
				data={response.data}
				columns={columns}
				table_name="journeys"
				table_title="Journeys"
				mass_actions={MassActionsLists}
				pagination={meta.pagination}
				session={session as Session}
				createDialog={createListDialog}
				sorting={{ sortBy, sortOrder }}
			/>
		</div>
	);
}
