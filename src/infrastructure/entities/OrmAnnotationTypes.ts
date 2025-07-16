import config from '../../config';

export function getBinaryType() {
    return config.DATABASE_TYPE === 'postgres' ? 'bytea' : 'blob';
}
