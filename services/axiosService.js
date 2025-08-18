const axios = require('axios');

const Post = async (http, data, headers) => {
    try {
        const response = await axios.post(http, data, {
            headers: headers
        });

        return response.data;
    } catch (error) {
        console.error('Error en la petición:', error.response?.data || error.message);
        throw error;
    }
};

module.exports = {
    Post
}