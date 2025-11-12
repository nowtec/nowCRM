export const seedData = {
    channels: [
      { name: "Email", publishedAt: Date.now(), editor_text_type: 'html', file_upload_type: "all", removeHtml: false, max_content_lenght: 50000 },
      { name: "SMS", publishedAt: Date.now(), editor_text_type: 'text', file_upload_type: "none", removeHtml: true, max_content_lenght: 70 },
      { name: "WhatsApp", publishedAt: Date.now(), editor_text_type: 'text', file_upload_type: "image", removeHtml: true, max_content_lenght: 300 },
      { name: "Twitter", publishedAt: Date.now(), editor_text_type: 'text', file_upload_type: "image", removeHtml: true, max_content_lenght: 280 },
      { name: "Telegram", publishedAt: Date.now(), editor_text_type: 'text', file_upload_type: "image", removeHtml: true, max_content_lenght: 50000 },
      { name: "LinkedIn", publishedAt: Date.now(), editor_text_type: 'text', file_upload_type: "image", removeHtml: true, max_content_lenght: 3000 },
      { name: "Linkedin_Invitations", publishedAt: Date.now(), editor_text_type: 'text', file_upload_type: "none", removeHtml: true, max_content_lenght: 300 },
      { name: "Blog", publishedAt: Date.now(), editor_text_type: 'text', file_upload_type: "all", removeHtml: true, max_content_lenght: 50000 }
    ],
    contact_interest: [
      { name: "AI and LLMs", publishedAt: Date.now() },
      { name: "Automations, n8n, make", publishedAt: Date.now() },
      { name: "Data, Business Intelligence", publishedAt: Date.now() },
      { name: "General Tech Support", publishedAt: Date.now() },
      { name: "nowCDP", publishedAt: Date.now() },
      { name: "nowCRM", publishedAt: Date.now() }
    ],
    text_block: [
      { name: "Welcome Message", text: "Welcome to our organization! We are glad to have you on board.", publishedAt: Date.now() },
      { name: "Donation Info", text: "Your contribution helps us make a real difference. Thank you for supporting our mission.", publishedAt: Date.now() },
      { name: "Privacy Notice", text: "We respect your privacy. Your data is stored securely and not shared with third parties.", publishedAt: Date.now() }
    ],
    task: [
      { name: "Call Markus Keller", description: "Follow up on community health initiative progress.", action: "Call", status: "planned", due_date: new Date().toISOString(), publishedAt: Date.now() },
      { name: "Email Claire Morel", description: "Send educational materials for upcoming school program.", action: "Email", status: "in progress", due_date: new Date().toISOString(), publishedAt: Date.now() },
      { name: "Meet Giovani Chiccolini", description: "Discuss collaboration on human rights campaign.", action: "Meeting", status: "done", due_date: new Date().toISOString(), publishedAt: Date.now() },
      { name: "Check donation reports", description: "Review last month’s donor activity summary.", action: "Review", status: "expired", due_date: new Date().toISOString(), publishedAt: Date.now() }
    ],
    action: [
      { entity: "contact", action_type: 1, value: "step_1_completed", external_id: "ext_001", source: "Website", contact: 1, payload: { step: "signup", status: "completed" }, effort: "medium", partnership: "none", publishedAt: Date.now() },
      { entity: "journey", action_type: 2, value: "final_step", external_id: "ext_002", source: "Referral", contact: 2, payload: { journey: "education_campaign", result: "success" }, effort: "high", partnership: "partner_org", publishedAt: Date.now() },
      { entity: "contact", action_type: 1, value: "profile_updated", external_id: "ext_003", source: "App", contact: 3, payload: { section: "personal_info", updated: true }, effort: "low", partnership: "none", publishedAt: Date.now() },
      { entity: "journey", action_type: 2, value: "donation_made", external_id: "ext_004", source: "Newsletter", contact: 4, payload: { amount: 100, currency: "CHF" }, effort: "medium", partnership: "donor_network", publishedAt: Date.now() },
      { entity: "contact", action_type: 1, value: "event_registered", external_id: "ext_005", source: "Event", contact: 5, payload: { event_name: "Tech for Good 2025", status: "registered" }, effort: "medium", partnership: "local_chapter", publishedAt: Date.now() }
    ],
    tag: [
      { name: "Urgent", color: "#FF0000", publishedAt: Date.now() },
      { name: "Follow Up", color: "#FFA500", publishedAt: Date.now() },
      { name: "Important", color: "#FFD700", publishedAt: Date.now() },
      { name: "Internal", color: "#008000", publishedAt: Date.now() },
      { name: "External", color: "#0000FF", publishedAt: Date.now() },
      { name: "Completed", color: "#808080", publishedAt: Date.now() }
    ],
    source: [
      { name: "Website", publishedAt: Date.now() },
      { name: "Social Media", publishedAt: Date.now() },
      { name: "Referral", publishedAt: Date.now() },
      { name: "Newsletter", publishedAt: Date.now() },
      { name: "Event", publishedAt: Date.now() },
      { name: "Advertisement", publishedAt: Date.now() }
    ],
    media_type: [
      { name: "Newspaper", publishedAt: Date.now() },
      { name: "Radio", publishedAt: Date.now() },
      { name: "Tv", publishedAt: Date.now() }
    ],
    frequency: [
      { name: "Daily", publishedAt: Date.now() },
      { name: "Weekly", publishedAt: Date.now() },
      { name: "Monthly", publishedAt: Date.now() }
    ],
    department: [
      { name: "Sport", publishedAt: Date.now() },
      { name: "Politics", publishedAt: Date.now() },
      { name: "Beauty", publishedAt: Date.now() },
      { name: "Buisiness", publishedAt: Date.now() },
      { name: "Meteo", publishedAt: Date.now() },
      { name: "Tecnology", publishedAt: Date.now() }
    ],
    keyword: [
      { name: "Zurich", publishedAt: Date.now() },
      { name: "Human right", publishedAt: Date.now() },
      { name: "Climante", publishedAt: Date.now() },
      { name: "Camping", publishedAt: Date.now() },
      { name: "Food", publishedAt: Date.now() },
      { name: "Relax", publishedAt: Date.now() },
      { name: "Footbal", publishedAt: Date.now() }
    ],
    rank: [
      { name: "Class A", publishedAt: Date.now() },
      { name: "Class B", publishedAt: Date.now() },
      { name: "Class C", publishedAt: Date.now() }
    ],
    contact: [
      {
        email: "temporary1@email.com",
        function: "Volunteer",
        plz: "3004",
        language: "en",
        locale: "en",
        address_line1: "31 Green Street, Berlin",
        first_name: "John",
        last_name: "Deer",
        gender: "male",
        phone: "+4915112345678",
        mobile_phone: "+4917123456789",
        canton: "BE",
        country: "Germany",
        priority: "p3",
        status: "new",
        description: "Interested in environmental causes.",
        linkedin_url: "https://linkedin.com/in/johndeer",
        facebook_url: "https://facebook.com/john.deer",
        twitter_url: "https://twitter.com/johndeer",
        website_url: "https://johnvolunteers.org",
        address_line2: "Apt 5B",
        location: "Berlin",
        zip: 3004,
        last_access: new Date().toISOString(),
        account_created_at: new Date().toISOString(),
        birth_date: "1985-07-01",
        publishedAt: Date.now()
      },
      {
        email: "temporary2@email.com",
        function: "Campaigner",
        plz: "5006",
        language: "en",
        locale: "en",
        address_line1: "8 Via del Lagusel, Vittorio Veneto",
        first_name: "Giovani",
        last_name: "Chiccolini",
        gender: "male",
        phone: "+390438123456",
        mobile_phone: "+393498765432",
        canton: "TV",
        country: "Italy",
        priority: "p2",
        status: "contacted",
        description: "Leads regional campaigns on human rights.",
        linkedin_url: "https://linkedin.com/in/giovanichiccolini",
        facebook_url: "https://facebook.com/giovani.chiccolini",
        twitter_url: "https://twitter.com/giovanichic",
        website_url: "https://chiccoliniactivism.it",
        address_line2: "",
        location: "Vittorio Veneto",
        zip: 5006,
        last_access: new Date().toISOString(),
        account_created_at: new Date().toISOString(),
        birth_date: "1990-04-12",
        publishedAt: Date.now()
      },
      {
        email: "temporary3@email.com",
        function: "Teacher",
        plz: "1010",
        language: "fr",
        locale: "fr",
        address_line1: "12 Rue de l'École, Lausanne",
        first_name: "Claire",
        last_name: "Morel",
        gender: "female",
        phone: "+41211234567",
        mobile_phone: "+41765432109",
        canton: "VD",
        country: "Switzerland",
        priority: "p4",
        status: "registered",
        description: "Primary school teacher supporting education initiatives.",
        linkedin_url: "https://linkedin.com/in/clairemorel",
        facebook_url: "",
        twitter_url: "",
        website_url: "",
        address_line2: "Room 204",
        location: "Lausanne",
        zip: 1010,
        last_access: new Date().toISOString(),
        account_created_at: new Date().toISOString(),
        birth_date: "1980-11-23",
        publishedAt: Date.now()
      },
      {
        email: "temporary4@email.com",
        function: "Doctor",
        plz: "8050",
        language: "de",
        locale: "de",
        address_line1: "22 Bahnhofstrasse, Zürich",
        first_name: "Markus",
        last_name: "Keller",
        gender: "male",
        phone: "+41448765432",
        mobile_phone: "+41791234567",
        canton: "ZH",
        country: "Switzerland",
        priority: "p1",
        status: "negotiating",
        description: "Supports community health initiatives.",
        linkedin_url: "https://linkedin.com/in/markuskeller",
        facebook_url: "",
        twitter_url: "",
        website_url: "",
        address_line2: "",
        location: "Zürich",
        zip: 8050,
        last_access: new Date().toISOString(),
        account_created_at: new Date().toISOString(),
        birth_date: "1975-02-14",
        publishedAt: Date.now()
      },
      {
        email: "temporary5@email.com",
        function: "Developer",
        plz: "4051",
        language: "en",
        locale: "en",
        address_line1: "45 Coding Lane, Basel",
        first_name: "Anna",
        last_name: "Schneider",
        gender: "female",
        phone: "+41612345678",
        mobile_phone: "+41789876543",
        canton: "BS",
        country: "Switzerland",
        priority: "p5",
        status: "backfill",
        description: "Helps build software tools for NGO work.",
        linkedin_url: "https://linkedin.com/in/annaschneider",
        facebook_url: "",
        twitter_url: "https://twitter.com/annasch_dev",
        website_url: "https://annaschneider.dev",
        address_line2: "Tech Hub 3A",
        location: "Basel",
        zip: 4051,
        last_access: new Date().toISOString(),
        account_created_at: new Date().toISOString(),
        birth_date: "1992-09-09",
        publishedAt: Date.now()
      }
    ],
    contact_type: [
      { name: "Contact", desciption: "An unqualified contact.", publishedAt: Date.now() },
      { name: "Lead", desciption: "A potential contact who has shown interest but not yet made a purchase.", publishedAt: Date.now() },
      { name: "Customer", desciption: "Contact has completed a purchase or deal.", publishedAt: Date.now() },
      { name: "Unsubscribed", desciption: "Contact has opted out of communications.", publishedAt: Date.now() },
      { name: "Bounced", desciption: "Email address is invalid or undeliverable.", publishedAt: Date.now() },
      { name: "Inactive User ", desciption: "Email is no longer current or in use.", publishedAt: Date.now() },
      { name: "Past Customer", desciption: "Previously a customer, but no longer active.", publishedAt: Date.now() },
      { name: "Partner", desciption: "Not a client, but associated with your business.", publishedAt: Date.now() },
      { name: "Vendor", desciption: "Not a client, but associated with your business.", publishedAt: Date.now() },
      { name: "Supporter", desciption: "Not a client, but associated with your business.", publishedAt: Date.now() },
      { name: "Volunteer", desciption: "Not a client, but associated with your business.", publishedAt: Date.now() },
      { name: "Donor", desciption: "Not a client, but associated with your business.", publishedAt: Date.now() }
    ],
    organization_type: [
      { name: "Einzelfirma", publishedAt: Date.now() },
      { name: "GmbH", publishedAt: Date.now() },
      { name: "AG", publishedAt: Date.now() },
      { name: "Verein", publishedAt: Date.now() },
      { name: "Stiftung", publishedAt: Date.now() },
      { name: "Genossenschaft", publishedAt: Date.now() }
    ],
    subsctiption_type: [
      { name: "Basic", publishedAt: Date.now() }
    ],
    setting: [
      { linkedin_access_token: "", subscription: "verify", publishedAt: Date.now() }
    ],
    action_types: [
      { name: "step_reached", publishedAt: Date.now() },
      { name: "journey_finished", publishedAt: Date.now() }
    ],
    contact_document: [
        { name: "ID Card", contact: 1, publishedAt: Date.now() },
        { name: "Donation Receipt", contact: 2, publishedAt: Date.now() },
        { name: "Membership Proof", contact: 3, publishedAt: Date.now() }
      ],
    contact_note: [
      { name: "First Call", text: [{ type: "paragraph", children: [{ type: "text", text: "Contacted about new project." }] }], contact: 1 },
      { name: "Follow-up", text: [{ type: "paragraph", children: [{ type: "text", text: "Requested more information via email." }] }], contact: 2 },
      { name: "Meeting Scheduled", text: [{ type: "paragraph", children: [{ type: "text", text: "Set meeting for next week." }] }], contact: 3 }
    ],
    donation_subscription: [
        { amount: 25.00, contact: 1, payment_method: "credit_card", currency: "CHF", payment_provider: "Stripe", interval: "monthly", subscription_token: "sub_001", raw_data: "{}", publishedAt: Date.now() },
        { amount: 50.00, contact: 2, payment_method: "paypal", currency: "CHF", payment_provider: "PayPal", interval: "yearly", subscription_token: "sub_002", raw_data: "{}", publishedAt: Date.now() },
        { amount: 10.00, contact: 3, payment_method: "bank_transfer", currency: "CHF", payment_provider: "Manual", interval: "monthly", subscription_token: "sub_003", raw_data: "{}", publishedAt: Date.now() }
      ],
    donation_transaction: [
        { amount: 25.00, contact: 1, user_agent: "Mozilla/5.0", campaign: 1, card_holder_name: "John Doe", payment_method: "credit_card", payment_provider: "Stripe", user_ip: "192.168.1.1", currency: "CHF", epp_transaction_id: "txn_001", purpose: "Donation", raw_data: "{}", publishedAt: Date.now() },
        { amount: 50.00, contact: 2, user_agent: "Mozilla/5.0", campaign: 1, card_holder_name: "Jane Smith", payment_method: "paypal", payment_provider: "PayPal", user_ip: "192.168.1.2", currency: "CHF", epp_transaction_id: "txn_002", purpose: "Donation", raw_data: "{}", publishedAt: Date.now() },
        { amount: 10.00, contact: 3, user_agent: "Mozilla/5.0", campaign: 1, card_holder_name: "Tom Brown", payment_method: "bank_transfer", payment_provider: "Manual", user_ip: "192.168.1.3", currency: "CHF", epp_transaction_id: "txn_003", purpose: "Donation", raw_data: "{}", publishedAt: Date.now() }
      ],
    event: [
        { action: "email_sent", source: "crm", contact: 1, payload: "{}", external_id: "evt_001", event_status: "processed", destination: "email", title: "Welcome Email", publishedAt: Date.now() },
        { action: "form_submitted", source: "web", contact: 2, payload: "{}", external_id: "evt_002", event_status: "processed", destination: "backend", title: "Donation Form", publishedAt: Date.now() },
        { action: "survey_completed", source: "mobile", contact: 3, payload: "{}", external_id: "evt_003", event_status: "processed", destination: "api", title: "Satisfaction Survey", publishedAt: Date.now() }
      ],
    form: [
        { name: "Donation Form", description: "Main donation entry form", active: true, slug: "donation-form", submit_text: "Donate", brand_color: "#0088cc", keep_contact: true, publishedAt: Date.now() },
        { name: "Feedback Form", description: "Collects general feedback", active: true, slug: "feedback-form", submit_text: "Send", brand_color: "#00aa77", keep_contact: false, publishedAt: Date.now() },
        { name: "Volunteer Form", description: "Form for volunteer signups", active: true, slug: "volunteer-form", submit_text: "Apply", brand_color: "#ffaa00", keep_contact: true, publishedAt: Date.now() }
      ],
    form_item: [
        { name: "Email", form: 1, type: "email", label: "Email Address", required: true, hidden: false, rank: 1, publishedAt: Date.now() },
        { name: "Message", form: 2, type: "text_area", label: "Your Message", required: false, hidden: false, rank: 2, publishedAt: Date.now() },
        { name: "Full Name", form: 3, type: "text", label: "Full Name", required: true, hidden: false, rank: 1, publishedAt: Date.now() }
      ],
    identity: [
        { name: "Anonymous", publishedAt: Date.now() },
        { name: "Logged In", publishedAt: Date.now() },
        { name: "Verified", publishedAt: Date.now() }
      ],
    organization: [
        { name: "Green Future GmbH", email: "info@greenfuture.ch", address_line1: "Bahnhofstrasse 10", zip: "8001", country: "Switzerland", city: "Zürich", phone: "+41441234567", publishedAt: Date.now() },
        { name: "Helping Hands Verein", email: "support@helpinghands.ch", address_line1: "Marktgasse 12", zip: "3011", country: "Switzerland", city: "Bern", phone: "+41313211212", publishedAt: Date.now() },
        { name: "Blue Ocean AG", email: "contact@blueocean.ch", address_line1: "Seestrasse 44", zip: "6006", country: "Switzerland", city: "Luzern", phone: "+41414141414", publishedAt: Date.now() }
      ],
    survey: [
        { name: "Post Donation Feedback", form_id: "form_001", contact: 1, publishedAt: Date.now() },
        { name: "Website Experience", form_id: "form_002", contact: 2, publishedAt: Date.now() },
        { name: "Volunteer Experience", form_id: "form_003", contact: 3, publishedAt: Date.now() }
      ],
    survey_item: [
        { question: "How satisfied are you?", answer: "Very satisfied", survey: 1, publishedAt: Date.now() },
        { question: "Was the website easy to use?", answer: "Yes", survey: 2, publishedAt: Date.now() },
        { question: "Would you volunteer again?", answer: "Absolutely", survey: 3, publishedAt: Date.now() }
      ],
    list: [
        { name: "Newsletter Subscribers", publishedAt: Date.now() },
        { name: "Donors", publishedAt: Date.now() },
        { name: "Volunteers", publishedAt: Date.now() }
      ],    
    action_score_item: [
      { name: "Engagement Score", action: 1, value: 85.5, publishedAt: Date.now() },
      { name: "Completion Score", action: 2, value: 92.3, publishedAt: Date.now() },
      { name: "Profile Update Score", action: 3, value: 74.8, publishedAt: Date.now() },
      { name: "Donation Score", action: 4, value: 98.0, publishedAt: Date.now() },
      { name: "Event Participation Score", action: 5, value: 88.6, publishedAt: Date.now() }
    ],
    contact_title: [
      { name: "Ms", publishedAt: new Date().toISOString() },
      { name: "Mr", publishedAt: new Date().toISOString() },
      { name: "Dr", publishedAt: new Date().toISOString() },
      { name: "Mme", publishedAt: new Date().toISOString() },
      { name: "M.", publishedAt: new Date().toISOString() },
      { name: "Dr", publishedAt: new Date().toISOString() },
      { name: "Sig.ra", publishedAt: new Date().toISOString() },
      { name: "Sig.", publishedAt: new Date().toISOString() },
      { name: "Dott.", publishedAt: new Date().toISOString() },
      { name: "Frau", publishedAt: new Date().toISOString() },
      { name: "Herr", publishedAt: new Date().toISOString() },
      { name: "Dr", publishedAt: new Date().toISOString() }
    ],
    contact_salutation: [
      { name: "Dear Ms", publishedAt: new Date().toISOString() },
      { name: "Dear Mr", publishedAt: new Date().toISOString() },
      { name: "Dear Dr", publishedAt: new Date().toISOString() },
      { name: "Chère Mme", publishedAt: new Date().toISOString() },
      { name: "Cher M.", publishedAt: new Date().toISOString() },
      { name: "Cher Dr", publishedAt: new Date().toISOString() },
      { name: "Gentile Sig.ra", publishedAt: new Date().toISOString() },
      { name: "Gentile Sig.", publishedAt: new Date().toISOString() },
      { name: "Gentile Dott.", publishedAt: new Date().toISOString() },
      { name: "Sehr geehrte Frau", publishedAt: new Date().toISOString() },
      { name: "Sehr geehrter Herr", publishedAt: new Date().toISOString() },
      { name: "Sehr geehrter Dr", publishedAt: new Date().toISOString() }
    ]
  };
  