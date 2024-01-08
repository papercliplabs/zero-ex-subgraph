import { ethereum, Address, BigDecimal, log } from "@graphprotocol/graph-ts";
import { Account, AccountData } from "../../generated/schema";
import { Erc20FillRole, ONE_BI, ZERO_BD, ZERO_BI } from "../common/constants";
import { getOrCreateProtocol } from "./protocol";

export function getOrCreateAccount(address: Address, event: ethereum.Event): Account {
    let account = Account.load(address);

    if (!account) {
        account = new Account(address);

        account._protocol = getOrCreateProtocol(event).id;
        account.address = address;

        const data = new AccountData(account.id);
        data.erc20FillSourceVolumeUsd = ZERO_BD;
        data.erc20FillFillerVolumeUsd = ZERO_BD;
        data.erc20FillDestinationVolumeUsd = ZERO_BD;

        data.erc20FillSourceCount = ZERO_BI;
        data.erc20FillFillerCount = ZERO_BI;
        data.erc20FillDestinationCount = ZERO_BI;
        data.save();

        account.data = data.id;
        account.save();
    }

    return account;
}

export function updateAccountDataForErc20Fill(
    address: Address,
    role: string, // Erc20FillRole (enums not supported)
    volumeUsd: BigDecimal,
    event: ethereum.Event
): void {
    const account = getOrCreateAccount(address, event);
    const data = AccountData.load(account.id)!; // Guaranteed to exist

    if (Erc20FillRole.Source == role) {
        data.erc20FillSourceVolumeUsd = data.erc20FillSourceVolumeUsd.plus(volumeUsd);
        data.erc20FillSourceCount = data.erc20FillSourceCount.plus(ONE_BI);
    } else if (Erc20FillRole.Filler == role) {
        data.erc20FillFillerVolumeUsd = data.erc20FillFillerVolumeUsd.plus(volumeUsd);
        data.erc20FillFillerCount = data.erc20FillFillerCount.plus(ONE_BI);
    } else if (Erc20FillRole.Destination == role) {
        data.erc20FillDestinationVolumeUsd = data.erc20FillDestinationVolumeUsd.plus(volumeUsd);
        data.erc20FillDestinationCount = data.erc20FillDestinationCount.plus(ONE_BI);
    } else {
        log.error("updateAccountDataForErc20Fill: role not supported - {}", [role]);
    }

    data.save();
}
