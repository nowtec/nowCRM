module.exports = {
    routes: [
        {
            method: 'POST',
            path: '/documents/create-ln-navigator',
            handler: 'document.createLNNavigator',
        },
        {
            method: 'POST',
            path: '/documents/create-ln-certificate',
            handler: 'document.createLNCertificate',
        }
    ]
}