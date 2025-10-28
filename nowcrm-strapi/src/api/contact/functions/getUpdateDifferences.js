function getExtraFieldDifferences(arrBefore, arrAfter) {
    const differences = {}
  
    const append = [];
    const remove = [];
    const modified = [];
    for(element of arrAfter){
        if(typeof element === 'object'){
            const find = arrBefore.find(item => item.name === element.name && item.value === item.value );
            if(!find){
                append.push(element.name + ":" + element.value);
            }
            find_modif = arrBefore.find(item => item.name === element.name );
            if(find_modif && find_modif.value !== element.value){
                modified.push({
                    before: find_modif.name + ":" + find_modif.value,
                    after: element.name + ":" + element.value
                })
            }
        }
    }
    for(element of arrBefore){
        if(typeof element === 'object'){
            const find = arrAfter.find(item => item.name === element.name && item.value === item.value );
            if(!find){
                remove.push(element.name + ":" + element.value);
            }
        }
    }
    if(append.length) differences.append = append;
    if(remove.length) differences.remove = remove;
    if(modified.length) differences.modified = modified;
    return differences;
}

function areArraysEqual(arr1, arr2) {
    if (arr1.length !== arr2.length) {
        return false;
    }
    for (let i = 0; i < arr1.length; i++) {
        if (arr1[i] !== arr2[i]) {
            return false;
        }
    }
    return true;
}


async function getUpdateDifferences(params){

    try{
        const contact_id = params.data.id || params.where.id
        const contactBefore = await strapi.db.query('api::contact.contact').findOne({
            where: { id: contact_id },
            populate: true
        });
        const contactAfter = params.data;
        const differences = {};
        const keys = Object.keys(contactAfter);
        contactBefore.extra_fields = contactBefore.contact_extra_fields;
        for(const key of keys){
            if(key === 'updatedAt') continue;
            if( contactAfter[key] && typeof contactAfter[key] === "object") {
                if(('disconnect' in contactAfter[key] || 'connect' in contactAfter[key]) && (contactAfter[key].connect.length > 0 || contactAfter[key].disconnect.length)){
                    const remove =  contactAfter[key].disconnect.map(item => item.id).join();
                    const append =  contactAfter[key].connect.map(item => item.id).join();
                    if(remove || append){
                        differences[key] = {};
                        if(remove) differences[key].remove = remove;
                        if(append) differences[key].append = append;
                    }
                }
                if(Array.isArray(contactAfter[key])){
                    if(contactAfter[key].length > 0 && typeof contactAfter[key][0] == 'object') {
                        const extra_diff = getExtraFieldDifferences(contactBefore[key], contactAfter[key]);
                        if(Object.keys(extra_diff).length) differences[key] = extra_diff;
                     }
                    if(contactAfter[key].length > 0 && typeof contactAfter[key][0] == 'number') {
                        const beforeIds = contactBefore[key].map(item => item.id);
                        if(!areArraysEqual(beforeIds, contactAfter[key])){
                            differences[key] = {
                                before: beforeIds,
                                after: contactAfter[key]
                            }
                        }
                    }
                }
                continue;
            }
            if( key in  contactBefore && contactBefore[key] !== contactAfter[key]){
                if(typeof contactBefore[key] == 'object' && contactBefore[key]?.id ){
                    if(contactBefore[key].id != contactAfter[key]) {
                        differences[key] = {
                            before: contactBefore[key].id,
                            after: contactAfter[key]
                        }
                    } 
                    continue
                }
                differences[key] = {
                    before: contactBefore[key],
                    after: contactAfter[key]
                }
            }
        }
        return differences;

    } catch(error) {
        console.log("ERROR", error);
        return null;
    }
}


module.exports = {
    getUpdateDifferences
}