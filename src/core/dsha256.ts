import { createHash } from 'crypto';
import { TdSha256 } from 'interfaces';

export const dSha256: TdSha256 = (data) => {
    console.log(data);
    return createHash('sha256').update(createHash('sha256').update(data).digest()).digest();
}