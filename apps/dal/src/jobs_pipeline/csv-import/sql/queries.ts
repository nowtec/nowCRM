// src/lib/sql/queries.ts
export const SQL = {
	SELECT_BASIC_TYPE_ID: `
      SELECT id
      FROM subscription_types
      WHERE name = $1
      LIMIT 1
    ` as const,

	REACTIVATE_SUBSCRIPTIONS: `
      UPDATE subscriptions s
      SET
        active = TRUE,
        subscribed_at = NOW(),
        unsubscribed_at = NULL,
        published_at = NOW()
      FROM subscriptions_contact_lnk scl
      JOIN subscriptions_channel_lnk schl
        ON schl.subscription_id = scl.subscription_id
      WHERE
        s.id = scl.subscription_id
        AND scl.contact_id = ANY($1)
        AND schl.channel_id = $2
        AND s.active = FALSE
    ` as const,

	SELECT_EXISTING_CONTACT_IDS: `
      SELECT scl.contact_id
      FROM subscriptions_contact_lnk scl
      JOIN subscriptions_channel_lnk schl
        ON schl.subscription_id = scl.subscription_id
      WHERE
        scl.contact_id = ANY($1)
        AND schl.channel_id = $2
    ` as const,

	INSERT_SUBSCRIPTION: `
      INSERT INTO subscriptions (active, subscribed_at, published_at)
      VALUES (TRUE, NOW(), NOW())
      RETURNING id
    ` as const,

	LINK_TO_CONTACT: `
      INSERT INTO subscriptions_contact_lnk (subscription_id, contact_id)
      VALUES ($1, $2)
    ` as const,

	LINK_TO_CHANNEL: `
      INSERT INTO subscriptions_channel_lnk (subscription_id, channel_id)
      VALUES ($1, $2)
    ` as const,

	LINK_TO_TYPE: `
      INSERT INTO subscriptions_subscription_type_lnk (subscription_id, subscription_type_id)
      VALUES ($1, $2)
    ` as const,

	INSERT_UNSUBSCRIBE_EVENT: `
    INSERT INTO events
      (action, status, source, destination, external_id, title, payload, created_at, published_at)
    VALUES
      ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
    RETURNING id
  ` as const,

	LINK_EVENT_TO_CONTACT: `
    INSERT INTO events_contact_lnk (event_id, contact_id)
    VALUES ($1, $2)
  ` as const,

	LINK_EVENT_TO_CHANNEL: `
    INSERT INTO events_channel_lnk (event_id, channel_id)
    VALUES ($1, $2)
  ` as const,

	DEACTIVATE_SUBSCRIPTIONS: `
      UPDATE subscriptions s
      SET
        active = FALSE,
        unsubscribed_at = NOW()
      FROM subscriptions_contact_lnk scl
      JOIN subscriptions_channel_lnk schl
        ON schl.subscription_id = scl.subscription_id
      WHERE
        s.id = scl.subscription_id
        AND scl.contact_id = ANY($1)
        AND schl.channel_id = $2
        AND s.active = TRUE
    ` as const,
} as const;
