import { ethereum, Address, BigDecimal, log } from "@graphprotocol/graph-ts";
import { Account, AccountMetrics } from "../../generated/schema";
import { Erc20FillRole, ONE_BI, ZERO_BD, ZERO_BI } from "../common/constants";

export function getOrCreateAccount(address: Address, event: ethereum.Event): Account {
    let account = Account.load(address);

    if (!account) {
        account = new Account(address);
        account.address = address;

        const metrics = new AccountMetrics(account.id);
        metrics.erc20FillSourceVolumeUsd = ZERO_BD;
        metrics.erc20FillFillerVolumeUsd = ZERO_BD;
        metrics.erc20FillDestinationVolumeUsd = ZERO_BD;

        metrics.erc20FillSourceCount = ZERO_BI;
        metrics.erc20FillFillerCount = ZERO_BI;
        metrics.erc20FillDestinationCount = ZERO_BI;
        metrics.save();

        account.metrics = metrics.id;
        account.save();
    }

    return account;
}

export function updateAccountMetricsForErc20Fill(
    address: Address,
    role: string, // Erc20FillRole (enums not supported)
    volumeUsd: BigDecimal,
    event: ethereum.Event
): void {
    const account = getOrCreateAccount(address, event);
    const metrics = AccountMetrics.load(account.id)!; // Guaranteed to exist

    if (Erc20FillRole.Source == role) {
        metrics.erc20FillSourceVolumeUsd = metrics.erc20FillSourceVolumeUsd.plus(volumeUsd);
        metrics.erc20FillSourceCount = metrics.erc20FillSourceCount.plus(ONE_BI);
    } else if (Erc20FillRole.Filler == role) {
        metrics.erc20FillFillerVolumeUsd = metrics.erc20FillFillerVolumeUsd.plus(volumeUsd);
        metrics.erc20FillFillerCount = metrics.erc20FillFillerCount.plus(ONE_BI);
    } else if (Erc20FillRole.Destination == role) {
        metrics.erc20FillDestinationVolumeUsd = metrics.erc20FillDestinationVolumeUsd.plus(volumeUsd);
        metrics.erc20FillDestinationCount = metrics.erc20FillDestinationCount.plus(ONE_BI);
    } else {
        log.error("updateAccountMetricsForErc20Fill: role not supported - {}", [role]);
    }

    metrics.save();
}
