const jwt = require('jsonwebtoken');

const generateJWT = (uid) => {

    return new Promise ((resolve, reject) => {

        const payload = { uid };
        jwt.sign( payload, process.env.JWT_KEY, {
            expiresIn: '6h',
        }, (err, token) => {
            if( err ){
                reject('No se pudo generar el JWT');
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
        console.log(error);
        return [false, null]
    }

}


module.exports = {
    generateJWT,
    checkJWT
}