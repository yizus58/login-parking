-- Crear tipo ENUM
CREATE TYPE public.enum_vehicles_status AS ENUM ('IN', 'OUT');

-- Crear tabla users
CREATE TABLE public.users (
                              id SERIAL PRIMARY KEY,
                              username VARCHAR(255) NOT NULL UNIQUE,
                              password VARCHAR(255) NOT NULL,
                              email VARCHAR(255) NOT NULL UNIQUE,
                              role VARCHAR(255) DEFAULT 'SOCIO' NOT NULL
);

-- Crear tabla parkings
CREATE TABLE public.parkings (
                                 id SERIAL PRIMARY KEY,
                                 name VARCHAR(255) NOT NULL,
                                 address VARCHAR(255) NOT NULL,
                                 capacity INTEGER NOT NULL,
                                 cost_per_hour DOUBLE PRECISION NOT NULL,
                                 id_partner INTEGER NOT NULL REFERENCES public.users(id) ON UPDATE CASCADE
);

-- Crear tabla vehicles
CREATE TABLE public.vehicles (
                                 id SERIAL PRIMARY KEY,
                                 plate_number VARCHAR(255) NOT NULL,
                                 model_vehicle VARCHAR(255) NOT NULL,
                                 entry_time TIMESTAMP WITH TIME ZONE NOT NULL,
                                 exit_time TIMESTAMP WITH TIME ZONE,
                                 id_parking INTEGER NOT NULL REFERENCES public.parkings(id) ON UPDATE CASCADE ON DELETE CASCADE,
                                 id_admin INTEGER NOT NULL REFERENCES public.users(id),
                                 cost_per_hour DOUBLE PRECISION NOT NULL,
                                 status public.enum_vehicles_status DEFAULT 'IN' NOT NULL
);

-- Insertar datos de prueba en users
INSERT INTO public.users (username, password, email, role) VALUES ('admin', '$2b$10$6Zdzi5RZVtceC/tB7k5L0Ov4rN0OsRmyBZrFun5.nSeVxmgj6/DAi', 'admin@mail.com', 'ADMIN'), ('jesus', '$2b$10$mFr8lwb4rlKGZ0lgvAZXX.97qseAVEeSU6eNTdTLeBrF7UnEtZ2cS', 'jedacan58@gmail.com', 'SOCIO'), ('jdoe', '$2b$10$mFr8lwb4rlKGZ0lgvAZXX.97qseAVEeSU6eNTdTLeBrF7UnEtZ2cS', 'jdoe@mail.com', 'SOCIO');

-- Insertar datos de prueba en parkings
INSERT INTO public.parkings (name, address, capacity, cost_per_hour, id_partner) VALUES ('parqueadero El bicho', 'av 5 #36-23', 100, 25000, 2), ('parqueadero Messi', 'av 5 #36-23', 200, 25000, 3), ('parqueadero El bicho', 'av 5 #36-23', 200, 25000, 2);

-- Insertar datos de prueba en vehicles
INSERT INTO public.vehicles (plate_number, model_vehicle, entry_time, exit_time, id_parking, id_admin, cost_per_hour, status) VALUES ('POS-111', 'Mitsubishi Carisma', '2025-08-14 04:37:56.292-05', '2025-08-14 09:46:47.533-05', 1, 2, 25000, 'OUT'), ('POS-000', 'Mitsubishi Carisma', '2025-08-14 04:33:43.341-05', '2025-08-14 10:07:36.807-05', 1, 2, 25000, 'OUT'), ('POS-222', 'Mitsubishi Carisma', '2025-08-14 09:39:48.651-05', '2025-08-14 10:40:58.512-05', 1, 2, 25000, 'OUT'), ('POS-555', 'Mitsubishi Carisma', '2025-08-14 09:44:25.685-05', '2025-08-14 10:45:50.977-05', 1, 2, 25000, 'OUT'), ('POS-333', 'Mitsubishi Carisma', '2025-08-14 09:41:32.898-05', '2025-08-14 10:07:36.807-05', 1, 2, 25000, 'OUT'), ('POS-444', 'Mitsubishi Carisma', '2025-08-14 09:43:22.529-05', '2025-08-14 10:07:36.807-05', 1, 2, 25000, 'OUT'), ('POS-333', 'Mitsubishi Carisma', '2025-08-15 09:41:32.898-05', NULL, 2, 3, 25000, 'IN'), ('POS-444', 'Mitsubishi Carisma', '2025-08-15 09:43:22.529-05', NULL, 2, 3, 25000, 'IN'), ('POS-111', 'Mitsubishi Carisma', '2025-08-15 04:37:56.292-05', '2025-08-15 09:46:47.533-05', 2, 3, 25000, 'OUT'), ('POS-000', 'Mitsubishi Carisma', '2025-08-15 04:33:43.341-05', '2025-08-15 10:07:36.807-05', 2, 3, 25000, 'OUT'), ('POS-222', 'Mitsubishi Carisma', '2025-08-15 09:39:48.651-05', '2025-08-15 10:40:58.512-05', 2, 3, 25000, 'OUT'), ('POS-555', 'Mitsubishi Carisma', '2025-08-15 09:44:25.685-05', '2025-08-15 10:45:50.977-05', 2, 3, 25000, 'OUT');