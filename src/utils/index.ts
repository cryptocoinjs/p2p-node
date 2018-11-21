import { createHash } from 'crypto';

export const dSha256 = (data: string | Buffer | NodeJS.TypedArray | DataView): Buffer => {
    return createHash('sha256').update(createHash('sha256').update(data).digest()).digest();
};

export const messageChecksum = (message: Buffer): Buffer => {
    return Buffer.from(dSha256(message)).slice(0, 4);
};

export const debounce = (f: Function, ms: number) => {

    let timer: NodeJS.Timeout = null;

    const internal: CancelableFunction = function (...args: any[]) {
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

export const hexToString = (hexString: string): string => {
    let str = '';
    for (let i = 0; i < hexString.length; i += 2) {
        const firstNumber = hexString[i];
        const secondNumber = hexString[i + 1];
        if (firstNumber != '0' || secondNumber != '0') {
            str += String.fromCharCode(parseInt(firstNumber + secondNumber, 16));
        }
    }
    return str;
};