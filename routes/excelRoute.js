const { Router } = require('express');
const {validateJWT} = require("../middlewares/validate-jwt");
const {getAllParkings} = require("../controllers/parking");

router.get("/reportes/vehiculos.xlsx", async (req, res, next) => {
    try {

        const buffer = await generarExcelUnaHoja(datos);
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", 'attachment; filename="vehiculos_por_usuario.xlsx"');
        res.send(Buffer.from(buffer));
    } catch (err) {
        next(err);
    }
});
router.get('/', validateJWT, getAllParkings);

module.exports = router;