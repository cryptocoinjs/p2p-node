import { Int, Str } from '../../../protocol-types/bitcoin';
import { hexToString } from '../../../utils';

type InventoryDataMessage = {
    type: number,
    hash: string,
}

const order = ['count', 'inventory'];
const inventoryOrder = ['type', 'hash'];

function template(data: InventoryDataMessage[], Message: DIMessage) {
    const message = new Message(inventoryOrder);
    let inventoriesLength = 0;
    const inventories = data.map((inventor: InventoryDataMessage) => {
        const invBuffer = message.make(inventoryTemplate(inventor));
        inventoriesLength += invBuffer.length;
        return invBuffer;
    });
    const inventory = Buffer.concat(inventories, inventoriesLength);
    return {
        count: Int.makeVarUint(data.length),
        inventory,
    };
}

function inventoryTemplate(data: InventoryDataMessage) {
    return {
        type: Int.makeUint32(data.type),
        hash: Str.makeStr32(hexToString(data.hash))
    };
}

export function makeBy(Message: DIMessage, data: InventoryDataMessage[]) {
    const message = new Message(order);
    return message.make(template(data, Message));
}