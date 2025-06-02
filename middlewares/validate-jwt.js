const jwt = require('jsonwebtoken');

const validateJWT = (req, res, next) => {

    let token = req.header('Authorization');

    if ( !token ) {
        return res.status(401).json({
            ok:false,
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
        return res.status(401).json({
            ok:false,
            msg:'Token no valido'
        });
    }


}

module.exports = {
    validateJWT
}