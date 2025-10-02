#!/bin/bash
set -e

echo "Installing PostgreSQL extensions..."

# Install required packages for PostGIS and TimescaleDB
apt-get update
apt-get install -y --no-install-recommends \
    postgresql-15-postgis-3 \
    postgresql-15-postgis-3-scripts \
    postgis \
    wget \
    ca-certificates \
    lsb-release

# Install TimescaleDB
echo "deb https://packagecloud.io/timescale/timescaledb/debian/ $(lsb_release -c -s) main" > /etc/apt/sources.list.d/timescaledb.list
wget --quiet -O - https://packagecloud.io/timescale/timescaledb/gpgkey | apt-key add -
apt-get update
apt-get install -y timescaledb-2-postgresql-15

# Configure PostgreSQL for TimescaleDB
echo "shared_preload_libraries = 'timescaledb'" >> $PGDATA/postgresql.conf

echo "Extensions installed successfully!"