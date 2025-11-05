// actions/deleteContactAction.ts
"use server";
import { auth } from "@/auth";
import { env } from "@/lib/config/envConfig";
import { API_ROUTES_COMPOSER} from "@nowcrm/services";
import { handleError, StandardResponse } from "@nowcrm/services/server";
export async function sendCompositionByFilters(
    filters: Record<string, any>,
    compositionId: number,
    channelNames: string[],
    subject: string,
    from: string,
    interval: number,
): Promise<StandardResponse<any>> {



	const session = await auth();
	if (!session) {
		return {
			data: null,
			status: 403,
			success: false,
		};
	}

	try {
        const payload = {
            composition_id: compositionId,
            entity: "contacts",
            searchMask: filters,
            type: "contact",
            channels: channelNames.map((c) => c.toLowerCase()),
            subject,
            from,
            interval,
        };

        const res = await fetch(
            `${env.CRM_COMPOSER_API_URL}${API_ROUTES_COMPOSER.SEND_TO_CHANNELS}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            },
        );

        const raw = await res.text();
        if (!res.ok) {
            return {
                data: null,
                status: res.status,
                success: false,
                errorMessage: `Server returned ${res.status}: ${raw}`,
            };
        }

        const contentType = res.headers.get("content-type") || "";
        if (!contentType.includes("application/json")) {
            return {
                data: null,
                status: res.status,
                success: false,
                errorMessage: `Unexpected content-type: ${contentType}, body: ${raw}`,
            };
        }

        const data = JSON.parse(raw);
        return { data, status: res.status, success: true };
	} catch (error) {
		return handleError(error);
	}
}
