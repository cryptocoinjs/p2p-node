import { createHash } from 'crypto';

export const dSha256: TdSha256 = (data) => {
    return createHash('sha256').update(createHash('sha256').update(data).digest()).digest();
};

export const messageChecksum: TmessageChecksum = (message) => {
    return Buffer.from(dSha256(message)).slice(0, 4);
};

export const debounce = (f: Function, ms: number) => {

    let timer: NodeJS.Timeout = null;

    const internal: CacelableFunction = function (...args: any[]) {
        const onComplete = () => {
            f.apply(this, args);
            timer = null;
        };

        if (timer) {
            clearTimeout(timer);
        }

        timer = setTimeout(onComplete, ms);
    };
    internal.cancel = () => clearTimeout(timer);
    return internal;
};

export const getNonce = (): number => {
    let num;
    while (!num) {
        num = Math.random() * Math.pow(2, 32);
    }
    return Math.floor(num);
};

export const hexToString: HexToString = (hexString) => {
    let str = '';
    for (let i = 0; i < hexString.length; i += 2) { 
        str += String.fromCharCode(parseInt(hexString[i] + hexString[i + 1], 16)) 
    }
    return str;
}