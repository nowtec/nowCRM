export default {
  routes: [
    {
      method: 'POST',
      path: '/token-verify',
      handler: 'token-verify.verify',
      config: {
        auth: false, // Public route, we'll handle auth manually
      },
    },
  ],
};
