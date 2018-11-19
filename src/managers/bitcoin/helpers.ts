import { Int } from '../../protocol-types/bitcoin';

export const getNonce = (): number => {
    let num;
    while (!num) {
        num = Math.random() * Math.pow(2, 32)
    }
    return Math.floor(num)
}