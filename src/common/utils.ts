import { Address, BigDecimal, BigInt, Bytes, Entity, Value, ethereum, log } from "@graphprotocol/graph-ts";
import { getErc20TransfersForTransaction, getOrCreateTransaction } from "../entityHelpers/transaction";
import { Erc20Token, Erc20Transfer, _ActiveUser } from "../../generated/schema";
import { ZERO_BD } from "./constants";

export function findMatchingErc20Transfer(
    tokenAddress: Address,
    amount: BigInt,
    from: Address | null,
    to: Address | null,
    event: ethereum.Event
): Erc20Transfer | null {
    const transaction = getOrCreateTransaction(event);
    const transfers = getErc20TransfersForTransaction(transaction);

    let foundTransfer: Erc20Transfer | null = null;
    for (let i = 0; i < transfers.length; i++) {
        const transfer = transfers[i];

        // Must be right token
        if (transfer.token.notEqual(tokenAddress)) {
            continue;
        }

        // From or to was specified and didn't match
        if ((from && transfer.from.notEqual(from)) || (to && transfer.to.notEqual(to))) {
            continue;
        }

        // Delta must be lower than current best match
        const delta = transfer.amount.minus(amount).abs();
        if (foundTransfer && delta.gt(foundTransfer.amount.minus(amount).abs())) {
            continue;
        }

        foundTransfer = transfer;
    }

    // if (!foundTransfer) {
    //     log.warning("Didn't find matching erc20 transfer: hash={}, token={}, amount={}, from={}, to={}", [
    //         event.transaction.hash.toHexString(),
    //         tokenAddress.toHexString(),
    //         amount.toString(),
    //         from ? from.toHexString() : "NULL",
    //         to ? to.toHexString() : "NULL",
    //     ]);
    // }
    return foundTransfer;
}

/**
 * Divides a value by a given exponent of base 10 (10^exponent), and formats it as a BigDecimal
 * @param value value to be divided
 * @param exponent exponent to apply
 * @returns value / (10^exponent)
 */
export function formatUnits(value: BigInt, exponent: u32): BigDecimal {
    const powerTerm = BigInt.fromU32(10)
        .pow(u8(exponent))
        .toBigDecimal();
    return value.toBigDecimal().div(powerTerm);
}

/**
 * Multiply value by a given exponent of base 10 (10^exponent), and formats it as a BigInt
 * @param value value to be multiplied
 * @param exponent exponent to apply
 * @returns value * 10^exponent
 */
export function parseUnits(value: BigDecimal, exponent: u32): BigInt {
    const powerTerm = BigInt.fromU32(10)
        .pow(u8(exponent))
        .toBigDecimal();
    return BigInt.fromString(
        value
            .times(powerTerm)
            .truncate(0)
            .toString()
    );
}

export function bigDecimalSafeDiv(num: BigDecimal, den: BigDecimal): BigDecimal {
    if (den.equals(ZERO_BD)) {
        return ZERO_BD;
    } else {
        return num.div(den);
    }
}

export function bigIntMin(a: BigInt, b: BigInt): BigInt {
    return a.lt(b) ? a : b;
}

export function bigIntMax(a: BigInt, b: BigInt): BigInt {
    return a.gt(b) ? a : b;
}

/**
 * Helper to determine is a user is unique for a given qualifier period
 * @param address address of the user
 * @param uniqueUserUsageId UniqueUserUsageId
 * @returns true if the address is unique given the qualifier
 */
export function isUniqueUser(address: Address, uniqueUserUsageId: Bytes): boolean {
    const id = address.concat(uniqueUserUsageId);

    let activeUser = _ActiveUser.load(id);

    if (!activeUser) {
        activeUser = new _ActiveUser(id);
        activeUser.save();
        return true;
    } else {
        return false;
    }
}

export function copyEntity<T extends Entity>(from: T, to: T): T {
    const entries = from.entries;
    for (let i = 0; i < entries.length; ++i) {
        // Only set if it isn't already (preserves ID, and any other attributes set)
        if (to.get(entries[i].key) == null) {
            log.warning("COPY ENTITY, key: {}, from: {}", [entries[i].key, entries[i].value.data.toString()]);
            to.set(entries[i].key, entries[i].value);
        }
    }

    return to;
}
