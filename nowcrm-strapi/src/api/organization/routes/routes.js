module.exports = {
    routes: [
        {
            method: 'POST',
            path: '/organizations/duplicate',
            handler: 'organization.duplicate',
        }
    ]
}