const axios = require('axios');

const sendPost = async (data) => {
    try {
        const response = await axios.post('http://localhost:3001/mail/send', {
            recipients: data.recipient,
            subject: data.subject,
            html: data.html,
        }, {
            headers: {
                'Content-Type': 'application/json'
            }
        });

        return response.data;
    } catch (error) {
        console.error('Error en la petición:', error.response?.data || error.message);
        throw error;
    }
};

module.exports = {
    sendPost
}