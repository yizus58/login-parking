'use strict';

/**
 * - One open stay per plate: a partial unique index makes two concurrent entries of the same
 *   plate impossible (the API checked it, but two requests could race).
 * - Deleting a user no longer deletes its parkings (and their history) silently.
 * - Capacity, cost and role are checked by the database for new rows (NOT VALID keeps
 *   existing rows as they are).
 * - Indexes for the lookups and date ranges used by the API and the daily report.
 */
const DROP_FKS_ON = (table, column) => `
    DO $$
    DECLARE c record;
    BEGIN
        FOR c IN
            SELECT con.conname
            FROM pg_constraint con
            JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = ANY (con.conkey)
            WHERE con.contype = 'f' AND con.conrelid = '${table}'::regclass AND att.attname = '${column}'
        LOOP
            EXECUTE format('ALTER TABLE ${table} DROP CONSTRAINT %I', c.conname);
        END LOOP;
    END $$;`;

module.exports = {
    name: '20260101000100-integrity-and-indexes',
    async up({ context: queryInterface }) {
        const [[{ duplicates }]] = await queryInterface.sequelize.query(`
            SELECT count(*)::int AS duplicates FROM (
                SELECT plate_number FROM vehicles WHERE status = 'IN' GROUP BY plate_number HAVING count(*) > 1
            ) d`);
        if (duplicates > 0) {
            throw new Error(
                `${duplicates} plate(s) are registered as inside (status IN) more than once. ` +
                    'Register the exit of the duplicated stays before running this migration.',
            );
        }

        await queryInterface.sequelize.query(`
            ${DROP_FKS_ON('parkings', 'id_partner')}
            ${DROP_FKS_ON('vehicles', 'id_parking')}
            ${DROP_FKS_ON('vehicles', 'id_admin')}

            ALTER TABLE parkings ADD CONSTRAINT parkings_id_partner_fkey
                FOREIGN KEY (id_partner) REFERENCES users(id) ON UPDATE CASCADE ON DELETE RESTRICT;
            ALTER TABLE vehicles ADD CONSTRAINT vehicles_id_parking_fkey
                FOREIGN KEY (id_parking) REFERENCES parkings(id) ON UPDATE CASCADE ON DELETE CASCADE;
            ALTER TABLE vehicles ADD CONSTRAINT vehicles_id_admin_fkey
                FOREIGN KEY (id_admin) REFERENCES users(id) ON UPDATE CASCADE ON DELETE RESTRICT;

            ALTER TABLE parkings ADD CONSTRAINT parkings_capacity_positive CHECK (capacity > 0) NOT VALID;
            ALTER TABLE parkings ADD CONSTRAINT parkings_cost_positive CHECK (cost_per_hour > 0) NOT VALID;
            ALTER TABLE users ADD CONSTRAINT users_role_valid CHECK (role IN ('ADMIN', 'SOCIO')) NOT VALID;

            CREATE UNIQUE INDEX IF NOT EXISTS vehicles_one_open_stay_per_plate
                ON vehicles (plate_number) WHERE status = 'IN';
            CREATE INDEX IF NOT EXISTS vehicles_id_parking_status_idx ON vehicles (id_parking, status);
            CREATE INDEX IF NOT EXISTS vehicles_exit_time_idx ON vehicles (exit_time);
            CREATE INDEX IF NOT EXISTS vehicles_entry_time_idx ON vehicles (entry_time);
            CREATE INDEX IF NOT EXISTS vehicles_plate_number_idx ON vehicles (plate_number);
            CREATE INDEX IF NOT EXISTS parkings_id_partner_idx ON parkings (id_partner);
        `);
    },
    async down({ context: queryInterface }) {
        await queryInterface.sequelize.query(`
            DROP INDEX IF EXISTS vehicles_one_open_stay_per_plate, vehicles_id_parking_status_idx,
                vehicles_exit_time_idx, vehicles_entry_time_idx, vehicles_plate_number_idx, parkings_id_partner_idx;
            ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_valid;
            ALTER TABLE parkings DROP CONSTRAINT IF EXISTS parkings_cost_positive;
            ALTER TABLE parkings DROP CONSTRAINT IF EXISTS parkings_capacity_positive;

            ALTER TABLE vehicles DROP CONSTRAINT IF EXISTS vehicles_id_admin_fkey,
                ADD CONSTRAINT vehicles_id_admin_fkey FOREIGN KEY (id_admin) REFERENCES users(id) ON UPDATE CASCADE;
            ALTER TABLE parkings DROP CONSTRAINT IF EXISTS parkings_id_partner_fkey,
                ADD CONSTRAINT parkings_id_partner_fkey FOREIGN KEY (id_partner) REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE;
        `);
    },
};
