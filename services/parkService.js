const parkRepository = require('../repositories/parkRepository');

const createPark = async (data, user) => {

    if (user.role !== 'ADMIN') {
        throw new Error('Solo el ADMIN puede crear parqueaderos');
    }

    const park = await parkRepository.create(data);
    return park;
};

module.exports = {
    createPark,
};