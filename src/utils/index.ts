import { createHash } from 'crypto';

export const dSha256: TdSha256 = (data) => {
    return createHash('sha256').update(createHash('sha256').update(data).digest()).digest();
};