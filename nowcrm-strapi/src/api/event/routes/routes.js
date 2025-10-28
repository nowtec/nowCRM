module.exports = {
    routes: [
        {
            method: 'GET',
            path: '/chart/get-event',
            handler: 'event.getEventChartData',
        },
        {
            method: 'POST',
            path: '/chart/get-composition-channel-data',
            handler: 'event.getCompositionChannelData',
        },
        {
            method: 'POST',
            path: '/events/track',
            handler: 'event.trackEvent',
        }
    ]
}