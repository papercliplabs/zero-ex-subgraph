import { BigDecimal, Bytes, dataSource, ethereum } from "@graphprotocol/graph-ts";
import { DailyProtocolData, Protocol, ProtocolData, WeeklyProtocolData, _ActiveUser } from "../../generated/schema";
import {
    EXCLUDE_HISTORICAL_DATA,
    ONE_BI,
    SECONDS_PER_BLOCK,
    SECONDS_PER_DAY,
    SECONDS_PER_HOUR,
    SECONDS_PER_WEEK,
    UniqueUserUsageId,
    ZERO_BD,
    ZERO_BI,
} from "../common/constants";
import { copyEntity, isUniqueUser } from "../common/utils";

const PROTOCOL_ID = Bytes.fromHexString("0x00");

export function getOrCreateProtocol(event: ethereum.Event): Protocol {
    let protocol = Protocol.load(PROTOCOL_ID);

    if (!protocol) {
        protocol = new Protocol(PROTOCOL_ID);

        const data = new ProtocolData(protocol.id);

        data.erc20FillVolumeUsd = ZERO_BD;
        data.erc20FillCount = ZERO_BI;

        data.nftFillErc20VolumeUsd = ZERO_BD;
        data.nftFillCount = ZERO_BI;

        data.uniqueUserCount = ZERO_BI;

        data.save();

        protocol.data = data.id;

        protocol.save();
    }

    return protocol;
}

export function updateProtocolDataForErc20Fill(fillAmountUsd: BigDecimal, event: ethereum.Event): void {
    const protocol = getOrCreateProtocol(event);
    const data = ProtocolData.load(protocol.id)!; // Guaranteed to exist

    data.erc20FillVolumeUsd = data.erc20FillVolumeUsd.plus(fillAmountUsd);

    data.erc20FillCount = data.erc20FillCount.plus(ONE_BI);

    if (isUniqueUser(event.transaction.from, UniqueUserUsageId.Protocol)) {
        data.uniqueUserCount = data.uniqueUserCount.plus(ONE_BI);
    }

    data.save();

    createProtocolDataSnapshotsIfNecessary(data, event);
}

export function updateProtocolDataForNftFill(fillAmountUsd: BigDecimal, event: ethereum.Event): void {
    const protocol = getOrCreateProtocol(event);
    const data = ProtocolData.load(protocol.id)!; // Guaranteed to exist

    data.nftFillErc20VolumeUsd = data.nftFillErc20VolumeUsd.plus(fillAmountUsd);
    data.nftFillCount = data.nftFillCount.plus(ONE_BI);

    if (isUniqueUser(event.transaction.from, UniqueUserUsageId.Protocol)) {
        data.uniqueUserCount = data.uniqueUserCount.plus(ONE_BI);
    }

    data.save();

    createProtocolDataSnapshotsIfNecessary(data, event);
}

function createProtocolDataSnapshotsIfNecessary(data: ProtocolData, event: ethereum.Event): void {
    if (EXCLUDE_HISTORICAL_DATA) {
        return;
    }

    const hour = event.block.timestamp.div(SECONDS_PER_HOUR);
    const day = event.block.timestamp.div(SECONDS_PER_DAY);
    const week = event.block.timestamp.div(SECONDS_PER_WEEK);

    const hourlyId = data.id.concat(Bytes.fromByteArray(Bytes.fromBigInt(hour)));
    const dailyId = data.id.concat(Bytes.fromByteArray(Bytes.fromBigInt(day)));
    const weeklyId = data.id.concat(Bytes.fromByteArray(Bytes.fromBigInt(week)));

    let dailyData = DailyProtocolData.load(dailyId);
    let weeklyData = WeeklyProtocolData.load(weeklyId);

    if (!dailyData || !weeklyData) {
        const dataId = hourlyId;
        const dataSnapshot = copyEntity(data, new ProtocolData(dataId));
        dataSnapshot.save();

        if (!dailyData) {
            dailyData = new DailyProtocolData(dailyId);
            dailyData.day = day;
            dailyData.timestamp = event.block.timestamp;
            dailyData.protocol = getOrCreateProtocol(event).id;
            dailyData.data = dataSnapshot.id;
            dailyData.save();
        }

        if (!weeklyData) {
            weeklyData = new WeeklyProtocolData(weeklyId);
            weeklyData.week = week;
            weeklyData.timestamp = event.block.timestamp;
            weeklyData.protocol = getOrCreateProtocol(event).id;
            weeklyData.data = dataSnapshot.id;
            weeklyData.save();
        }
    }
}
