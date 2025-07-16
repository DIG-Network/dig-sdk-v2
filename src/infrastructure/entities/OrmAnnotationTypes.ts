import config from '../../config';

export function getBinaryType() {
    console.log(`Using binary type for database: ${config.DATABASE_TYPE}`);
    return config.DATABASE_TYPE === 'postgres' ? 'bytea' : 'blob';
}
