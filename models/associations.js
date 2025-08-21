const Parking = require('./Parking');
const Vehicle = require('./Vehicle');
const User = require('./User');

Parking.belongsTo(User, { foreignKey: 'id_partner', as: 'partner' });
Parking.hasMany(Vehicle, { as: 'vehicles', foreignKey: 'id_parking' });
Vehicle.belongsTo(Parking, { foreignKey: 'id_parking' });

Vehicle.belongsTo(User, { foreignKey: 'id_admin', as: 'admin' });
User.hasMany(Vehicle, { foreignKey: 'id_admin', as: 'vehicles' });