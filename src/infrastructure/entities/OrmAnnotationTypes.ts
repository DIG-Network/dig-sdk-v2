import config from '../../config';

export function getBinaryType() {
    return config.DATABASE_TYPE === 'postgres' ? 'bytea' : 'blob';
}

export function getDateType() {
    return config.DATABASE_TYPE === 'postgres' ? 'timestamp with time zone' : 'datetime';
}

export function getCurrentDate(offsetMinutes: number = 0) {
    if (config.DATABASE_TYPE === 'postgres') {
        return offsetMinutes
            ? `CURRENT_TIMESTAMP + INTERVAL '${offsetMinutes} minutes'`
            : 'CURRENT_TIMESTAMP';
    } else {
        return offsetMinutes
            ? `DATETIME(CURRENT_TIMESTAMP, '+${offsetMinutes} minutes')`
            : 'CURRENT_TIMESTAMP';
    }
}
