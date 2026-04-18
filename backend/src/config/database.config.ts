import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const databaseConfig = (): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
  database: process.env.POSTGRES_DB || 'pfis_db',
  username: process.env.POSTGRES_USER || 'pfis',
  password: process.env.POSTGRES_PASSWORD || 'pfis_secret_2026',
  autoLoadEntities: true,
  synchronize: true, // auto-create tables (safe for demo/production)
  logging: process.env.NODE_ENV === 'development',
  ssl: process.env.POSTGRES_HOST?.includes('railway')
    ? { rejectUnauthorized: false }
    : false,
});
