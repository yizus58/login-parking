const jwt = require('jsonwebtoken');
const logger = require("../utils/logger");

const generateJWT = (uid) => {

    return new Promise ((resolve, reject) => {

        const payload = { uid };
        jwt.sign( payload, process.env.JWT_KEY, {
            expiresIn: '6h',
        }, (err, token) => {
            if( err ){
                reject(new Error ('No se pudo generar el JWT'));
            }else {
                resolve( token )
            }
        })
    })
}

const checkJWT = (token = '') => {

    try {
        const { uid } = jwt.verify( token, process.env.JWT_KEY);
        return [ true, uid ];

    } catch (error) {
        logger.error(error);
        return [false, null]
    }

}


module.exports = {
    generateJWT,
    checkJWT
}