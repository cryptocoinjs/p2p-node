import { createHash } from 'crypto';

export default function dSha256(data: string | Buffer | NodeJS.TypedArray | DataView): Buffer {
    console.log(data);
    return createHash('sha256').update(createHash('sha256').update(data).digest()).digest();
}