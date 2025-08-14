const jwt = require('jsonwebtoken');
const logger = require("../utils/logger");

const validateJWT = (req, res, next) => {

    let token = req.header('Authorization');

    if ( !token ) {
        return res.status(401).json({
            result:false,
            msg:'No hay token en la peticion'
        });
    }

    if (token.startsWith('Bearer ')) {
        token = token.slice(7).trim();
    }

    try {

        const { uid } = jwt.verify( token, process.env.JWT_KEY);

        req.uid = uid;

        next();

    } catch (error) {
        logger.error(error);
        return res.status(401).json({
            result:false,
            msg:'Token no valido'
        });

    }


}

module.exports = {
    validateJWT
}