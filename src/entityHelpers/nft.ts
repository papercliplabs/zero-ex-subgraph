import { Address, BigInt, Bytes, ethereum, log } from "@graphprotocol/graph-ts";
import { Nft } from "../../generated/schema";
import { getOrCreateNftCollection } from "./nftCollection";
import { NftCollectionType } from "../common/constants";
import { Erc721 as Erc721Contract } from "../../generated/ZeroExProxy/Erc721";
import { Erc1155 as Erc1155Contract } from "../../generated/ZeroExProxy/Erc1155";
import { getOrCreateProtocol } from "./protocol";

// collectionType is NftCollectionType
export function getOrCreateNft(
    collectionAddress: Address,
    collectionType: string,
    tokenId: BigInt,
    event: ethereum.Event
): Nft {
    const id = collectionAddress.concat(Bytes.fromByteArray(Bytes.fromBigInt(tokenId)));
    let nft = Nft.load(id);

    if (!nft) {
        nft = new Nft(id);

        nft._protocol = getOrCreateProtocol(event).id;

        const collection = getOrCreateNftCollection(collectionAddress, collectionType, event);

        nft.collection = collection.id;
        nft.tokenId = tokenId;

        if (NftCollectionType.Erc721 == collectionType) {
            const erc721Contract = Erc721Contract.bind(collectionAddress);
            const tryTokenUri = erc721Contract.try_tokenURI(tokenId);
            nft.tokenUri = tryTokenUri.reverted ? null : tryTokenUri.value;
        } else if (NftCollectionType.Erc1155 == collectionType) {
            const erc1155Contract = Erc1155Contract.bind(collectionAddress);
            const tryTokenUri = erc1155Contract.try_uri(tokenId);
            nft.tokenUri = tryTokenUri.reverted ? null : tryTokenUri.value;
        } else {
            log.error("getOrCreateNft: unsupported collectionType - {}", [collectionType]);
        }

        nft.save();
    }

    return nft;
}
