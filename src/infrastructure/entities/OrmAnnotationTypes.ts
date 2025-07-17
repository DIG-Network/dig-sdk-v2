import config from '../../config';

export function getBinaryType() {
    return config.DATABASE_TYPE === 'postgres' ? 'bytea' : 'blob';
}

export function getDateType() {
    return config.DATABASE_TYPE === 'postgres' ? 'timestamp with time zone' : 'datetime';
}
