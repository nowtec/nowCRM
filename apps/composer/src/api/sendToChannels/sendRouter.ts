import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { CommunicationChannel } from "@nowcrm/services";
import {
	settingCredentialsService,
	settingsService,
	unipileIdentitiesService,
} from "@nowcrm/services/server";
import express, { type Router } from "express";
import { TwitterApi } from "twitter-api-v2";
import { z } from "zod";
import { createApiResponse } from "@/api-docs/openAPIResponseBuilders";
import { CALLBACK_URL_TWITTER, env } from "@/common/utils/envConfig";
import { logger } from "@/server";
import { getLinkedInAccessToken } from "./channelFunctions/linkedIn/callback";
import { sendController } from "./sendController";
import { sendToChannelsSchema } from "./sendModel";

export const sendToChannelsRegistry = new OpenAPIRegistry();
export const sendToChannelsRouter: Router = express.Router();

export const userRegistry = new OpenAPIRegistry();
export const userRouter: Router = express.Router();

sendToChannelsRegistry.register("SendToChannelsSchema", sendToChannelsSchema);

sendToChannelsRegistry.registerPath({
	method: "post",
	path: "/send-to-channels",
	tags: ["Composer"],
	request: {
		body: {
			content: {
				"application/json": {
					schema: sendToChannelsSchema,
				},
			},
		},
	},
	responses: createApiResponse(z.null(), "Success", 200),
});

sendToChannelsRouter.post("/", (req, res, next) => {
	try {
		return sendController.sendToChannels(req, res, next);
	} catch (error) {
		console.log(error);
		res.status(400).send({ error: error });
	}
});

sendToChannelsRouter.get("/callback/linkedin", async (req, res, _next) => {
	const { state, code } = req.query;

	const settings = await settingsService.find(env.COMPOSER_STRAPI_API_TOKEN, {
		populate: "*",
	});
	if (!settings.success || !settings.data) {
		return;
	}

	const linkedin_credential = settings.data[0].setting_credentials.find(
		(item) =>
			item.name.toLowerCase() ===
			CommunicationChannel.LINKEDIN.toLocaleLowerCase(),
	);

	if (linkedin_credential) {
		const linkedinAnswer = await getLinkedInAccessToken(
			code as string,
			linkedin_credential.client_id,
			linkedin_credential.client_secret,
		);

		if (linkedinAnswer) {
			await settingCredentialsService.update(
				linkedin_credential.documentId,
				{
					access_token: linkedinAnswer.access_token,
					refresh_token: linkedinAnswer.refresh_token,
					credential_status: "disconnected",
					error_message: "Try to test connection so we know if channel is up",
				},
				env.COMPOSER_STRAPI_API_TOKEN,
			);
		}
	}
	res.redirect(env.COMPOSER_CRM_REDIRECT_HEALTH_CHECK);
});

sendToChannelsRouter.get("/callback/twitter", async (req, res, _next) => {
	const { state, code } = req.query;

	const settings = await settingsService.find(env.COMPOSER_STRAPI_API_TOKEN, {
		populate: "*",
	});
	if (!settings.success || !settings.data) {
		return;
	}

	const twitter_credential = settings.data[0].setting_credentials.find(
		(item) =>
			item.name.toLowerCase() === CommunicationChannel.TWITTER.toLowerCase(),
	);

	if (twitter_credential) {
		if (typeof code !== "string" || typeof state !== "string") {
			return;
		}

		const client = new TwitterApi({
			clientId: twitter_credential.client_id,
			clientSecret: twitter_credential.client_secret,
		});

		const token = await client.loginWithOAuth2({
			code,
			codeVerifier: twitter_credential.organization_urn, // used for code verifier cause field is ubside for twitter
			redirectUri: CALLBACK_URL_TWITTER,
		});

		await settingCredentialsService.update(
			twitter_credential.documentId,
			{
				access_token: token.accessToken,
				refresh_token: token.refreshToken,
				credential_status: "disconnected",
				error_message: "Run health check so we can check your credentials",
			},
			env.COMPOSER_STRAPI_API_TOKEN,
		);
	}
	res.redirect(env.COMPOSER_CRM_REDIRECT_HEALTH_CHECK);
});

sendToChannelsRouter.post("/callback/unipile", async (req, res, _next) => {
	logger.info(
		JSON.stringify({ message: "Unipile callback received", body: req.body }),
	);

	const { status, account_id, name } = req.body;

	if (
		typeof status !== "string" ||
		typeof name !== "string" ||
		typeof account_id !== "string"
	) {
		logger.error(
			JSON.stringify({
				message: "Unipile callback: invalid body types",
				body: req.body,
			}),
		);
		return;
	}

	try {
		const created = await unipileIdentitiesService.create(
			{
				name,
				unipile_status: status,
				account_id,
				publishedAt: new Date(),
			},
			env.COMPOSER_STRAPI_API_TOKEN,
		);

		logger.info(
			JSON.stringify({ message: "Unipile identity created", created }),
		);
	} catch (err) {
		logger.error(
			JSON.stringify({ message: "Error creating unipile identity", err }),
		);
	}

	res.redirect(env.COMPOSER_CRM_REDIRECT_HEALTH_CHECK);
});

sendToChannelsRouter.post(
	"/callback/status-unipile",
	async (req, res, _next) => {
		const { AccountStatus } = req.body;
		const account = await unipileIdentitiesService.find(
			env.COMPOSER_STRAPI_API_TOKEN,
			{
				filters: {
					account_id: { $eq: AccountStatus.account_id },
				},
			},
		);
		if (account.data && account.data?.length > 0) {
			await unipileIdentitiesService.update(
				account.data[0].documentId,
				{
					unipile_status: AccountStatus.message,
				},
				env.COMPOSER_STRAPI_API_TOKEN,
			);
		}
		res.status(200).send();
	},
);

sendToChannelsRouter.get("/get-callback-unipile", async (req, res, next) => {
	try {
		return sendController.getRefreshUrlUnipile(req, res, next);
	} catch (error) {
		console.log(error);
		res.status(400).send({ error: error });
	}
});

sendToChannelsRouter.get("/get-callback-twitter", async (req, res, next) => {
	try {
		return sendController.getRefreshUrlTwitter(req, res, next);
	} catch (error) {
		console.log(error);
		res.status(400).send({ error: error });
	}
});

sendToChannelsRouter.get("/get-callback-linkedin", async (req, res, next) => {
	try {
		return sendController.getRefreshUrlLinkedIn(req, res, next);
	} catch (error) {
		console.log(error);
		res.status(400).send({ error: error });
	}
});

sendToChannelsRouter.get("/health-check", async (req, res, next) => {
	try {
		return sendController.runHealthCheck(req, res, next);
	} catch (error) {
		console.log(error);
		res.status(400).send({ error: error });
	}
});
