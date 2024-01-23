import { ethereum, Address, BigDecimal, log, Bytes } from "@graphprotocol/graph-ts";
import { Account, AccountData, DailyAccountData, WeeklyAccountData } from "../../generated/schema";
import {
    EXCLUDE_HISTORICAL_DATA,
    Erc20FillRole,
    ONE_BI,
    SECONDS_PER_DAY,
    SECONDS_PER_HOUR,
    SECONDS_PER_WEEK,
    ZERO_BD,
    ZERO_BI,
} from "../common/constants";
import { getOrCreateProtocol } from "./protocol";
import { copyEntity } from "../common/utils";

export function getOrCreateAccount(address: Address, event: ethereum.Event): Account {
    let account = Account.load(address);

    if (!account) {
        account = new Account(address);

        account._protocol = getOrCreateProtocol(event).id;
        account.address = address;

        const data = new AccountData(account.id);
        data.account = account.id;
        data.erc20FillSourceVolumeUsd = ZERO_BD;
        data.erc20FillFillerVolumeUsd = ZERO_BD;
        data.erc20FillDestinationVolumeUsd = ZERO_BD;

        data.erc20FillSourceCount = ZERO_BI;
        data.erc20FillFillerCount = ZERO_BI;
        data.erc20FillDestinationCount = ZERO_BI;

        data.nftFillMakerCount = ZERO_BI;
        data.nftFillTakerCount = ZERO_BI;
        data.nftFillErc20VolumePaidUsd = ZERO_BD;

        data.save();

        account.data = data.id;
        account.lastUpdatedBlock = ZERO_BI;

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

    // Create snapshots
    createAccountSnapshotsIfNecessary(account, data, event);

    data.save();

    account.lastUpdatedBlock = event.block.number;
    account.save();
}

export function updateAccountDataForNftFill(
    address: Address,
    maker: boolean,
    erc20VolumePaidUsd: BigDecimal,
    event: ethereum.Event
): void {
    const account = getOrCreateAccount(address, event);
    const data = AccountData.load(account.id)!; // Guaranteed to exist

    if (maker) {
        data.nftFillErc20VolumePaidUsd = data.nftFillErc20VolumePaidUsd.plus(erc20VolumePaidUsd);
        data.nftFillMakerCount = data.nftFillMakerCount.plus(ONE_BI);
    } else {
        // taker
        data.nftFillErc20VolumePaidUsd = data.nftFillErc20VolumePaidUsd.plus(erc20VolumePaidUsd);
        data.nftFillTakerCount = data.nftFillTakerCount.plus(ONE_BI);
    }

    // Create snapshots
    createAccountSnapshotsIfNecessary(account, data, event);

    data.save();

    account.lastUpdatedBlock = event.block.number;
    account.save();
}

function createAccountSnapshotsIfNecessary(account: Account, data: AccountData, event: ethereum.Event): void {
    if (EXCLUDE_HISTORICAL_DATA) {
        return;
    }

    const hour = event.block.timestamp.div(SECONDS_PER_HOUR);
    const day = event.block.timestamp.div(SECONDS_PER_DAY);
    const week = event.block.timestamp.div(SECONDS_PER_WEEK);

    const hourlyId = account.id.concat(Bytes.fromByteArray(Bytes.fromBigInt(hour)));
    const dailyId = account.id.concat(Bytes.fromByteArray(Bytes.fromBigInt(day)));
    const weeklyId = account.id.concat(Bytes.fromByteArray(Bytes.fromBigInt(week)));

    let dailyData = DailyAccountData.load(dailyId);
    let weeklyData = WeeklyAccountData.load(weeklyId);

    if (!dailyData || !weeklyData) {
        const dataId = hourlyId;
        const dataSnapshot = copyEntity(data, new AccountData(dataId));
        dataSnapshot.save();

        if (!dailyData) {
            dailyData = new DailyAccountData(dailyId);
            dailyData.day = day;
            dailyData.timestamp = event.block.timestamp;
            dailyData.account = account.id;
            dailyData.data = dataSnapshot.id;
            dailyData.save();
        }

        if (!weeklyData) {
            weeklyData = new WeeklyAccountData(weeklyId);
            weeklyData.week = week;
            weeklyData.timestamp = event.block.timestamp;
            weeklyData.account = account.id;
            weeklyData.data = dataSnapshot.id;
            weeklyData.save();
        }
    }
}
