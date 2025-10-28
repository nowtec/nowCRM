async function insertExtraFields(extraFields){
    const extraQueries = [];
    for(const extraItem of extraFields){
        if( !extraItem.value ) continue;
        const date = new Date().toISOString();
        const query = `
        WITH inserted_extra_field AS (
            INSERT INTO contact_extra_fields (name, value, created_at, updated_at, published_at, created_by_id, updated_by_id)
            SELECT '${extraItem.name}', '${extraItem.value}', '${date}', '${date}', '${date}', '1', '1' 
            RETURNING id
        )
        INSERT INTO contact_extra_fields_contact_links(contact_extra_field_id, contact_id)
        SELECT id, (SELECT id from contacts where email = '${extraItem.email}' limit 1) as contact_id
        FROM inserted_extra_field
        ON CONFLICT DO NOTHING;
        `
        extraQueries.push(query);
    }
    if(extraQueries.length){
        const extraFieldsNames = [...new Set(extraFields.map(element => `'${element.name}'`))];
        const query_delete = `WITH deleted_links AS (
            DELETE FROM contact_extra_fields_contact_links WHERE contact_extra_field_id IN (  SELECT id FROM contact_extra_fields WHERE name in (${extraFieldsNames.join()}))
            RETURNING contact_extra_fields_contact_links.contact_extra_field_id
        )
        DELETE FROM contact_extra_fields WHERE id IN (SELECT contact_extra_field_id FROM deleted_links);`;
        extraQueries.unshift(query_delete)
        await strapi.db.connection.raw(extraQueries.join('\n'))//.then().catch(error => {console.log(error);})
    }
}

async function insertOrganization(slice, contactRelations) {
    const orgQueries = [];
    for(const contact of slice){ // colect queries for call once
        if(!contactRelations[contact.email] || !contactRelations[contact.email].organization) continue;
        const date = new Date().toISOString();
        const query = `WITH inserted_organization AS (
            INSERT INTO organizations (name, created_at, updated_at, published_at, created_by_id, updated_by_id)
            SELECT '${contactRelations[contact.email].organization}', '${date}', '${date}', '${date}', '1', '1' 
            WHERE NOT EXISTS ( SELECT 1 FROM organizations WHERE name = '${contactRelations[contact.email].organization}' )
            RETURNING id
        ),
        upsert_organization AS (
            UPDATE organizations
            SET name = '${contactRelations[contact.email].organization}', updated_at = NOW()
            WHERE name = '${contactRelations[contact.email].organization}'
            RETURNING id
        )
        INSERT INTO contacts_organization_links (contact_id, organization_id)
        VALUES ((SELECT id FROM contacts where email ='${contact.email}' limit 1), COALESCE((SELECT id FROM upsert_organization), (SELECT id FROM inserted_organization)))
        ON CONFLICT (contact_id, organization_id) DO UPDATE
        SET contact_id = EXCLUDED.contact_id, organization_id = EXCLUDED.organization_id;
        `
        orgQueries.push(query);
    }
    if(orgQueries.length){
        await strapi.db.connection.raw(orgQueries.join('\n'));
    } 
}

async function insertDepartment(slice, contactRelations) {

    const depQueries = [];
    //-- colect queries for call once
    for(const contact of slice){

        if(!contactRelations[contact.email] || !contactRelations[contact.email].department) continue;
        const date = new Date().toISOString();
        const query = `WITH inserted_department AS (
            INSERT INTO departments (name, created_at, updated_at, published_at, created_by_id, updated_by_id)
            SELECT '${contactRelations[contact.email].department}', '${date}', '${date}', '${date}', '1', '1' 
            WHERE NOT EXISTS ( SELECT 1 FROM departments WHERE name = '${contactRelations[contact.email].department}' )
            RETURNING id
        ),
        upsert_department AS (
            UPDATE departments
            SET name = '${contactRelations[contact.email].department}', updated_at = NOW()
            WHERE name = '${contactRelations[contact.email].department}'
            RETURNING id
        )
        INSERT INTO contacts_department_links (contact_id, department_id)
        VALUES ((SELECT id FROM contacts where email ='${contact.email}' limit 1), COALESCE((SELECT id FROM upsert_department), (SELECT id FROM inserted_department)))
        ON CONFLICT (contact_id, department_id) DO UPDATE
        SET contact_id = EXCLUDED.contact_id, department_id = EXCLUDED.department_id;
        `
        depQueries.push(query);
    }
    
    if(depQueries.length){
        await strapi.db.connection.raw(depQueries.join('\n'));
    } 
}

async function insertContactChannels(slice, contactRelations) {
    const queries = [];
    const table = 'contacts_contact_channels_links'
    const namespace = 'contact_channels';
    for(const contact of slice) { // colect queries for call once
        if(!contactRelations[contact.email] || !contactRelations[contact.email][namespace].length) continue;
        for(const id of contactRelations[contact.email][namespace]) {

            const query = `
            INSERT INTO ${table} (contact_id, contact_channel_id)
            VALUES ((SELECT id FROM contacts where email ='${contact.email}' limit 1), '${id}')
            ON CONFLICT (contact_id, contact_channel_id) DO UPDATE
            SET contact_id = EXCLUDED.contact_id, contact_channel_id = EXCLUDED.contact_channel_id;
            `
            queries.push(query);
        }
    }
    if(queries.length){
        await strapi.db.connection.raw(queries.join('\n'));
    } 
}

async function insertContactInterests(slice, contactRelations) {
    const queries = [];
    const table = 'contacts_contact_interests_links'
    const namespace = 'contact_interests';
    for(const contact of slice) { // colect queries for call once
        if(!contactRelations[contact.email] || !contactRelations[contact.email][namespace].length) continue;
        for(const id of contactRelations[contact.email][namespace]){
            const query = `
              INSERT INTO ${table} (contact_id, contact_interest_id)
              VALUES ((SELECT id FROM contacts where email ='${contact.email}' limit 1), '${id}')
              ON CONFLICT (contact_id, contact_interest_id) DO UPDATE
              SET contact_id = EXCLUDED.contact_id, contact_interest_id = EXCLUDED.contact_interest_id;
              `
              queries.push(query);

        }
    }
    if(queries.length){
        await strapi.db.connection.raw(queries.join('\n'))
    } 
}

/**
 * 
 * @param {object} strapi - the main strapi object
 * @param {Array} slice - part of contacts (500 items max)
 * @param {number} subscription_type - subscription type - Basic
 * @param {number} subscription_channel - subscription channel - Emails
 */
async function upsertSubscriptions(strapi, slice, subscription_channel){
    const emails = slice.map(item => item.email);
    const contacts = await strapi.db.query('api::contact.contact').findMany({
        where: {
            email: {
                $in: emails
            }
        }
    });
    if(contacts){
        for(const contact of contacts){
            await strapi.db.query("api::subscription.subscription").delete({
                where: {
                    contact: contact.id,
                    channel: subscription_channel
                }
            });
            await strapi.db.query("api::subscription.subscription").create({
                data: {
                    contact: contact.id,
                    channel: subscription_channel,
                    active: true,
                    publishedAt: new Date().getTime()
                }
            });
        }
    }
}


/**
 * 
 * @param {object} strapi - the main strapi object
 * @param {Array} slice - part of contacts (500 items max)
 * @param {Array} organizationSlice - part of organizations to insert
 * @param {Array} departmentSlice - part of departments to insert
 * @param {Array} channelsSlice - part of departments to insert
 * @param {Array} interestsSlice - part of departments to insert
 * @param {Array} contactExtraFields  - contact extra fields
 * @param {Object} contactRelations - contact relation data
 * @param {Array} allowedFields - allowed field to insert/update in contact
 */
async function processCSV(strapi, slice, organizationSlice, departmentSlice, contactChannelsSlice, contactInterestsSlice, contactExtraFields, contactRelations, allowedFields, subscription_channel,importType) {
  
    const emails = slice.map(element => `'${element.email}'`);
    const emailsString = emails.join();

    if (importType === 'contacts') {
        const querySelect = `SELECT id, email FROM contacts where email IN (${emailsString}) ORDER BY id`; //query for verifying if contacts already exist
        const response = await strapi.db.connection.raw(querySelect);
        const contactIds = [];
        const rows = response.rows;
        const updateQueue = [];

        
        //--- update contacts that already exist ---
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const updateData = slice.find(element => element.email === row.email);
            let updateQuery = "UPDATE contacts SET ";
            for (const key in updateData) {
                updateQuery += `${key} = '${updateData[key]}',`;
            }
            updateQuery = updateQuery.substring(0, updateQuery.length - 1);
            updateQuery += ' WHERE id =' + row.id + ';';
            contactIds.push(row.id);
            updateQueue.push(updateQuery);
        }
        if(updateQueue.length){
            await strapi.db.connection.raw(updateQueue.join('\n'));
        }
        
        //--- collect contacts to insert ---
        const insertItems = [];
        for (let i = 0; i < slice.length; i++) {
            const element = slice[i];
            if (!rows.some(e => e.email === element.email)) {
                insertItems.push(element);
            }
        }

        //--- parse contacts to insert ---
        if (insertItems.length > 0) {
            const values = [];
            for (let i = 0; i < insertItems.length; i++) {
                const element = insertItems[i];
                const elementValues = Object.keys(element).map(key => {
                if (key === 'zip' && (!element[key] || element[key] === 'null')) {
                return "NULL";
                } else {
                return `'${element[key]}'`;
                }
            });
                const elementString = elementValues.join(',');
                values.push(`(${elementString})`);
            }
            
            let insertQuery = "INSERT INTO contacts (" + allowedFields.join() +", created_at, updated_at, published_at, created_by_id, updated_by_id, locale) ";
            insertQuery += 'VALUES ' + values.join(', ') + ' RETURNING id;';
            
            const insertResponse = await strapi.db.connection.raw(insertQuery);
            insertResponse.rows.forEach(row => {
                contactIds.push(row.id);
            });
        }

        //--- process extra fields ----
       const extraFields = [];
    slice.forEach(element => {
        const extraItems = contactExtraFields.filter(el => element.email === el.email)
        for(const e_item of extraItems){
            extraFields.push(e_item);
        }
    });

    if( extraFields.length ){
        console.log('--- insert extra fields ---')
        await insertExtraFields(extraFields);
    }

    if( organizationSlice.length ){
        console.log('--- insert organization ---')
        await insertOrganization(slice, contactRelations)
    }

    if( departmentSlice.length ){
        console.log('--- insert department ---')
        await insertDepartment(slice, contactRelations);
    }

    if( contactChannelsSlice.length ) {
        console.log('--- insert channels ---')
        await insertContactChannels(slice, contactRelations)
    }

    if( contactInterestsSlice.length ) {
        console.log('--- insert interests ---')
        await insertContactInterests(slice, contactRelations)
    }

    if(subscription_channel){
        console.log('--- insert subscription ---')
        await upsertSubscriptions(strapi, slice, subscription_channel);
    }
    let organizationIds = []
    return {contactIds , organizationIds }

    } else if (importType === 'organizations') {
        // Extract organization names from the input slice
        const organizationNames = slice.map(element => element.name);
        const organizationNamesString = organizationNames.map(name => `'${name}'`).join(', ');
    
        // Fetch existing organizations from the database
        const existingOrganizations = await fetchExistingOrganizations(strapi, organizationNames);
    
        const existingOrgNames = existingOrganizations.map(org => org.name);
        const organizationIds = existingOrganizations.map(org => org.id);
    
        // Process existing and new organizations
        const { updatedOrganizations, newOrganizations } = await processOrganizationData(strapi, slice, existingOrganizations, existingOrgNames);
    
        // Process contacts for all organizations
        const contactIds = await processOrganizationContacts(strapi, [...updatedOrganizations, ...newOrganizations]);
    
        console.log('Organizations:', organizationIds);
        console.log('Contacts:', contactIds);
    
        return { contactIds, organizationIds: [...organizationIds, ...newOrganizations.map(org => org.id)] };
    }
    
    // Function to fetch existing organizations from the database
    async function fetchExistingOrganizations(strapi, organizationNames) {
        return await strapi.db.query('api::organization.organization').findMany({
            where: {
                name: {
                    $in: organizationNames
                }
            }
        });
    }
    
    // Function to process organization data (update existing and create new)
    async function processOrganizationData(strapi, slice, existingOrganizations, existingOrgNames) {
        const updatedOrganizations = await updateExistingOrganizations(strapi, slice, existingOrganizations);
        const newOrganizations = await createNewOrganizations(strapi, slice, existingOrgNames);
        return { updatedOrganizations, newOrganizations };
    }
    
    // Function to update existing organizations
    async function updateExistingOrganizations(strapi, slice, existingOrganizations) {
        const updatedOrganizations = [];
        for (const org of existingOrganizations) {
            const updateData = slice.find(element => element.name === org.name);
            if (updateData) {
                processContactPerson(updateData);
                const updatedOrg = await strapi.db.query('api::organization.organization').update({
                    where: { id: org.id },
                    data: { ...updateData }
                });
                updatedOrganizations.push(updatedOrg);
            }
        }
        return updatedOrganizations;
    }
    
    // Function to create new organizations
    async function createNewOrganizations(strapi, slice, existingOrgNames) {
        const newOrganizations = [];
        const insertItems = slice.filter(element => !existingOrgNames.includes(element.name));
        for (const element of insertItems) {
            processContactPerson(element);
            const newOrg = await strapi.db.query('api::organization.organization').create({
                data: {
                    ...element,
                    created_by_id: 1,
                    updated_by_id: 1,
                    publishedAt: new Date().toISOString(),
                    locale: 'en'
                }
            });
            newOrganizations.push(newOrg);
        }
        return newOrganizations;
    }
    
    // Function to process contact person information
    function processContactPerson(data) {
        if (data.contact_person) {
            if (data.contact_person.includes('@')) {
                data.email = data.contact_person;
            } else {
                const [firstName, ...lastName] = data.contact_person.split(' ');
                data.first_name = firstName;
                data.last_name = lastName.join(' ');
            }
        }
    }
    
    // Function to process contacts for organizations
    async function processOrganizationContacts(strapi, organizations) {
        const contactIds = [];
        for (const org of organizations) {
            const contacts = await strapi.db.query('api::contact.contact').findMany({
                where: { organization: org.id }
            });
    
            if (!contacts.length) {
                const newContact = await createOrganizationContact(strapi, org);
                contactIds.push(newContact.id);
            } else {
                const existingContact = contacts.find(contact => contact.email === org.email || contact.email === org.contact_person);
                if (existingContact) {
                    const updatedContact = await updateOrganizationContact(strapi, org, existingContact.id);
                    contactIds.push(updatedContact.id);
                } else {
                    const newContact = await createOrganizationContact(strapi, org);
                    contactIds.push(newContact.id);
                }
            }
        }
        return contactIds;
    }
    
    // Function to create a new contact for an organization
    async function createOrganizationContact(strapi, org) {
        return await strapi.db.query('api::contact.contact').create({
            data: {
                email: org.email || org.contact_person,
                first_name: org.first_name || org.name,
                last_name: org.last_name || '',
                phone: org.phone,
                address_line1: org.address_line1,
                location: org.location,
                plz: org.zip,
                country: org.country,
                organization: org.id,
                description: org.description,
                created_by: 1,
                updated_by: 1,
                locale: 'en',
                publishedAt: new Date().toISOString(),
            }
        });
    }
    
    // Function to update an existing contact for an organization
    async function updateOrganizationContact(strapi, org, contactId) {
        return await strapi.db.query('api::contact.contact').update({
            where: { id: contactId },
            data: {
                email: org.email || org.contact_person,
                first_name: org.first_name || org.name,
                last_name: org.last_name || '',
                phone: org.phone,
                address_line1: org.address_line1,
                location: org.location,
                plz: org.zip,
                country: org.country,
                organization: org.id,
                description: org.description,
                updated_by: 1,
                publishedAt: new Date().toISOString(),
            }
        });
    }
}
module.exports = {
    processCSV,
    upsertSubscriptions
}