"use server";
import type { Contact } from "@nowcrm/services";
import { contactsService } from "@nowcrm/services/server";
import { auth } from "@/auth";

// Define all acceptable sort strings explicitly (type-safe)
const SORT_OPTIONS = [
	"createdAt:asc",
	"createdAt:desc",
	"updatedAt:asc",
	"updatedAt:desc",
	"first_name:asc",
	"first_name:desc",
	"last_name:asc",
	"last_name:desc",
] as const;

// Narrow type to acceptable string literals
type SortOption = (typeof SORT_OPTIONS)[number];

// Randomly pick one from allowed values
function getRandomSort(): SortOption {
	const index = Math.floor(Math.random() * SORT_OPTIONS.length);
	return SORT_OPTIONS[index];
}

/**
 * Fetches a randomly sorted chunk of contacts and returns one random contact from that list.
 */
export async function findRandomContact(): Promise<Contact | null> {
	const randomSort = getRandomSort();
	const session = await auth();
	if (!session) {
		return null;
	}
	const response = await contactsService.find(session?.jwt, {
		populate: {
			subscriptions: { populate: ["channel"] },
			contact_interests: "*",
		},
		sort: [randomSort],
		pagination: {
			page: 1,
			pageSize: 100,
		},
	});

	if (!Array.isArray(response.data) || response.data.length === 0) {
		console.warn("No contacts found.");
		return null;
	}

	const randomIndex = Math.floor(Math.random() * response.data.length);
	const contact = response.data[randomIndex];
	return contact;
}
