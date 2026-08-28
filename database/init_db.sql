-- File nay chi tu chay 1 LAN DUY NHAT khi Docker tao volume Postgres moi (volume con rong).
-- Neu can sua schema sau nay: sua file nay + chay "docker-compose down -v && docker-compose up -d"
-- (mat het du lieu cu, chi lam vay trong giai doan dev, chua co du lieu that).

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto; -- de dung gen_random_uuid()

CREATE TABLE owner (
    owner_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name   VARCHAR(150) NOT NULL,
    phone       VARCHAR(20),
    role        VARCHAR(30) NOT NULL DEFAULT 'farmer',
    created_at  TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE farm (
    farm_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id          UUID NOT NULL REFERENCES owner(owner_id),
    name              VARCHAR(150) NOT NULL,
    address           VARCHAR(255),
    boundary_geojson  GEOMETRY(Polygon, 4326),
    created_at        TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE season (
    season_id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id                 UUID NOT NULL REFERENCES farm(farm_id),
    crop_name               VARCHAR(100) NOT NULL,
    variety                 VARCHAR(100),
    planting_date           DATE,
    expected_harvest_date   DATE,
    status                  VARCHAR(30) NOT NULL DEFAULT 'growing',
    created_at              TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE farming_log (
    log_id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    season_id          UUID NOT NULL REFERENCES season(season_id),
    created_by         UUID REFERENCES owner(owner_id),
    log_date           TIMESTAMP NOT NULL DEFAULT now(),
    activity_type      VARCHAR(50),
    note               TEXT,
    photo_url          VARCHAR(255),
    voice_transcript   TEXT,
    gps_point          GEOMETRY(Point, 4326)
);

CREATE TABLE batch (
    batch_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    season_id      UUID NOT NULL REFERENCES season(season_id),
    batch_code     VARCHAR(50) UNIQUE NOT NULL,
    harvest_date   DATE,
    quantity       NUMERIC(10,2),
    unit           VARCHAR(20) DEFAULT 'kg',
    status         VARCHAR(30) NOT NULL DEFAULT 'harvested',
    created_at     TIMESTAMP NOT NULL DEFAULT now()
);
