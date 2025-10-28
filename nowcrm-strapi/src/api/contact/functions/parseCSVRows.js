// Aliases for contact-related fields
const contactFieldMappings = {
    phone: ['tel', 'telephone', 'phone_num', 'telephone_number', 'telefon', 'telephon', 'mobile', 'phone_number', 'contact_phone', 'home_phone', 'personal_phone'],
    mobile_phone: ['cellulare', 'mobiltelefon', 'm_phone', 'cell', 'mobile_num', 'handy', 'mobile', 'cell_phone', 'mobile_contact'],
    zip: ['plz','postal_code', 'p_code', 'postal', 'zip_code','cap', 'cap_code', 'pin_code', 'pin', 'eircode', 'postalcode', 'post_code', 'zipcode'],
    address_line_1: ['street', 'street_name', 'address', 'adress', 'address_1', 'adresse', 'anschrift', 'address_line1', 'addr1', 'primary_address', 'address_first'],
    address_line_2: ['address_2', 'address_line2', 'addr2', 'secondary_address', 'address_second'],
    first_name: ['name', 'f_name', 'contact_name', 'nickname', 'pseudonim', 'alias', 'middle_name', 'diminuitive', 'vorname', 'given_name', 'fname', 'first'],
    last_name: ['l_name', 'surname', 'familienname', 'nachname', 'family_name', 'lastname', 'lname', 'second_name', 'last'],
    location: ['city', 'land', 'staat', 'paese', 'province', 'region', 'territory', 'area', 'locality', 'place'],
    contact_channels: ['channels', 'channel', 'communication_channels', 'comm_channels', 'contact_modes', 'comm_modes'],
    contact_interests: ['interest', 'interests', 'hobbies', 'likes', 'preferences', 'topics_of_interest', 'focus_areas'],
    function: ['job', 'role', 'position', 'title', 'occupation', 'job_role', 'designation', 'job_title'],
    organization: ['organization_name', 'company', 'employer', 'firm', 'business', 'workplace', 'company_name'],
    department: ['division', 'unit', 'section', 'department_name', 'team', 'dept'],
    birth_date: ['dob', 'date_of_birth', 'birth', 'birthday', 'bdate', 'birthdate'],
    last_access: ['previous_access', 'last_login', 'access_time', 'last_access_time', 'login_time', 'last_seen'],
    gender: ['sex', 'gender_identity', 'gen', 'gender_type'],
    description: ['note', 'notes', 'desc', 'comments', 'remarks', 'additional_info', 'bio', 'biography'],
    language: ['lang','spoken_language', 'preferred_language', 'primary_language', 'lang_pref'],
    linkedin_url: ['linkedin', 'linkedin_profile', 'linkedin_profile_url'],
    facebook_url: ['facebook', 'facebook_profile', 'facebook_profile_url'],
    twitter_url: ['twitter', 'twitter_handle', 'twitter_profile', 'twitter_profile_url'],
    url: ['website', 'org_website', 'web_url', 'site', 'company_website', 'webpage', 'corporate_website']
};

// Aliases for organization-related fields
const organizationFieldMappings = {
    name: ['org_name', 'organization_name', 'company_name', 'business_name', 'corporation_name', 'enterprise_name', 'entity_name'],
    email: ['org_email', 'organization_email', 'company_email', 'business_email', 'contact_email'],
    zip: ['postal_code', 'p_code', 'postal', 'zip_code', 'zipcode', 'post_code', 'postalcode'],
    address_line1: ['street', 'address', 'adresse', 'addr1', 'primary_address', 'business_address', 'org_address', 'organization_address'],
    contact_person: ['responsible_person', 'manager', 'primary_contact', 'contact_person_name', 'contact'],
    url: ['website', 'org_website', 'web_url', 'site', 'company_website', 'webpage', 'corporate_website'],
    location: ['city', 'region', 'area', 'place', 'territory', 'business_location'],
    country:['nation', 'state', 'land','realm'],
    twitter_url: ['twitter', 'twitter_handle', 'twitter_link', 'organization_twitter'],
    facebook_url: ['facebook', 'facebook_page', 'facebook_link', 'organization_facebook'],
    linkedin_url: ['linkedin', 'linkedin_profile', 'linkedin_link', 'organization_linkedin'],
    phone: ['org_phone', 'organization_phone', 'company_phone', 'business_phone', 'contact_number', 'corporate_phone'],
    description: ['note', 'notes', 'desc', 'company_description', 'business_description', 'additional_info'],
    tag: ['tags', 'social_tag', 'organization_tag', 'business_tag', 'category', 'labels'],
    language: ['lang', 'org_language', 'preferred_language', 'business_language', 'communication_language']
};

// Function to map fields based on the provided mappings
function parseRelatedCSVFields(data, importType = 'contacts') {
    const mappings = importType === 'contacts' ? contactFieldMappings : organizationFieldMappings;

    const mapData = (data, fieldMappings) => {
        for (const key in data) {
            for (const [targetKey, aliases] of Object.entries(fieldMappings)) {
                if (aliases.includes(key)) {
                    data[targetKey] = data[key];
                    delete data[key];
                    break;
                }
            }
        }
    };

    if (importType === 'contacts' || importType === 'organizations') {
        mapData(data, mappings);

        // Handle special case for 'fullname' field in contacts
        if (importType === 'contacts' && data.fullname && (!data.first_name || !data.last_name)) {
            const [name, surname] = data.fullname.split(' ');
            data.first_name = name;
            data.last_name = surname;
            delete data.fullname;
        }
    }

    return data;
}


function convertKeys(data){
    //--- key lowercase/underscore ---
    for(const key in data){
        const nkey = key.toLowerCase().replace(' ', '_');
        if(nkey !== key){
            data[nkey] = data[key];
            delete data[key];
        }
    }
    return data
}

function escapeString(data){
    //---- dubblicate single quote (mysql escape string) ---
    for(const key in data){
        if(typeof data[key] !== "string") continue;
        data[key] = data[key].replace(/'/g, "''");
    }
    return data;
}

function orderFields(data, allowedFields){
    //--- key order ---
    const copy = {}
    allowedFields.forEach((key) => {
        if (data.hasOwnProperty(key)) {
            copy[key] = data[key];
        } else {
            copy[key] = '';
        }
    });
    return copy;
}


function addMetaFields(data){
    if(data.zip) data['zip'] = parseInt(data['zip']) || '';
    let date  = new Date().toISOString();
    if( !data.status ) data.status = 'new'
    data.created_at = date
    data.updated_at = date
    data.published_at = date;
    if (!data.last_access){ data.last_access = date;}
    data.created_by_id = 1;
    data.updated_by_id = 1;
    data.locale = 'en';
    return data;
}

async function getContactInterests(strapi){
    const entities = await strapi.db.query('api::contact-interest.contact-interest').findMany();
    return entities.map(item => ({
        [item.name.toLowerCase()]: item.id
    }));
}

async function getSubscriptionChannel(strapi){
    const entry = await strapi.db.query('api::channel.channel').findOne({
        where: {
            name: 'Email'
        }
    });
    if(!entry){
        const channel  = await strapi.db.query('api::channel.channel').create({
            data: {
                name: 'Email',
            }
        });
        return (channel) ? channel.id : null;
    }
    return entry.id
}

function findRelationKeys(value, object){
    const values = value.split(/;|\|/);
    const output = [];
    const interestKeys = values.map(item => item.toLowerCase());
    interestKeys.forEach(element => {

        const findItem = object.find(item => (element in item) );
        if(findItem) output.push(findItem[element]);

    })
    return output;
}

function checkForIdentifier(data){
    if(
        data.email ||
        ( data.phone || data.mobile_phone ) ||
        ( data.address_line1 && data.zip )

    ) return true;
    return false;
}

module.exports = {
    parseRelatedCSVFields,
    convertKeys,
    escapeString,
    orderFields,
    addMetaFields,
    getContactInterests,
    findRelationKeys,
    getSubscriptionChannel,
    checkForIdentifier
}