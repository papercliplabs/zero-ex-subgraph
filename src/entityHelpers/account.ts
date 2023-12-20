import { ethereum, Address } from "@graphprotocol/graph-ts";
import { Account } from "../../generated/schema";

export function getOrCreateAccount(address: Address, event: ethereum.Event): Account {
    let account = Account.load(address);

    if (!account) {
        account = new Account(address);
        account.address = address;
        account.save();
    }

    return account;
}
