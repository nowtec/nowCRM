const axios = require('axios');
module.exports = async function sendCSVReport(receiver, text) {
    const auth_username = process.env.N8N_WEBHOOK_BASIC_AUTH_USERNAME
    const auth_password = process.env.N8N_WEBHOOK_BASIC_AUTH_PASSWORD
    const webhookUrl    = process.env.N8N_CSV_NOTIFY_WEBHOOK
    var options = {
        method: 'POST',
        url: webhookUrl,
        headers: { },
        auth: {
          username: auth_username, 
          password: auth_password 
        },
        data: {
            receiver: receiver,
            text: text
        }
      };
      try{
          const { data, status } = await axios.request(options);
          if ('message' in data){
              data.success = true;
          }
          return data;
      } catch( error ){
          return {
              success: false,
              error: error
          }
      }
}