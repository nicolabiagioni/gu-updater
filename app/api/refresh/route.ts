import { NextRequest } from 'next/server';
import { setTimeout } from 'timers/promises';

const API_DELAY = 250;
const REFRESH_DELAY = 15000;
const BATCH_SIZE = 50;

interface OpenSeaNFT {
  identifier: string;
  contract: string;
  // Add other properties as needed
}

type NFT = OpenSeaNFT;

type ProgressMessage = {
  type: 'fetchProgress' | 'refreshProgress';
  totalNFTs: number;
  processedNFTs: number;
  lastProcessed?: {
    success: boolean;
    identifier: string;
    error?: unknown;
  };
};

type CompleteMessage = {
  type: 'complete';
  totalNFTs: number;
  processedNFTs: number;
  successfulRefreshes: number;
  failedRefreshes: number;
};

type ErrorMessage = {
  type: 'error';
  message: string;
};

type Message = ProgressMessage | CompleteMessage | ErrorMessage;

async function fetchNFTsByOwner(apiKey: string, chain: string, contractAddress: string, ownerAddress: string, cursor: string | null = null) {
  const url = `https://api.opensea.io/v2/chain/${chain}/account/${ownerAddress}/nfts?limit=50${cursor ? `&cursor=${cursor}` : ''}`;

  const response = await fetch(url, {
    headers: {
      'X-API-KEY': apiKey,
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();

  // Filter NFTs by the specified contract address
  const filteredNFTs = data.nfts.filter((nft: OpenSeaNFT) =>
    nft.contract.toLowerCase() === contractAddress.toLowerCase()
  );

  return {
    nfts: filteredNFTs,
    next: data.next
  };
}

async function refreshNFT(apiKey: string, chain: string, contractAddress: string, tokenId: string) {
  const url = `https://api.opensea.io/api/v2/chain/${chain}/contract/${contractAddress}/nfts/${tokenId}/refresh`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'X-API-KEY': apiKey,
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
  }

  return await response.json();
}

export async function POST(request: NextRequest) {
  const { apiKey, contractAddress, chain, ownerAddress } = await request.json();

  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  const sendMessage = async (message: Message) => {
    await writer.write(encoder.encode(JSON.stringify(message) + '\n'));
  };

  async function start() {
    let writerClosed = false;

    try {
      let allNFTs: NFT[] = [];
      let cursor: string | null = null;
      let totalNFTs = 0;
      let processedNFTs = 0;
      let successfulRefreshes = 0;
      let failedRefreshes = 0;

      do {
        const result = await fetchNFTsByOwner(apiKey, chain, contractAddress, ownerAddress, cursor);
        allNFTs = allNFTs.concat(result.nfts);
        cursor = result.next;
        totalNFTs = allNFTs.length;

        await sendMessage({ type: 'fetchProgress', totalNFTs, processedNFTs } as ProgressMessage);

        if (cursor && allNFTs.length < 1600) {
          await setTimeout(API_DELAY);
        } else {
          break; // Exit the loop if we've reached 1600 NFTs or there's no more cursor
        }
      } while (cursor);

      // Process NFTs in batches
      for (let i = 0; i < allNFTs.length; i += BATCH_SIZE) {
        const batch = allNFTs.slice(i, i + BATCH_SIZE);

        for (const nft of batch) {
          try {
            await refreshNFT(apiKey, chain, contractAddress, nft.identifier);
            processedNFTs++;
            successfulRefreshes++;
            await sendMessage({
              type: 'refreshProgress',
              totalNFTs,
              processedNFTs,
              lastProcessed: { success: true, identifier: nft.identifier }
            } as ProgressMessage);
          } catch (error) {
            processedNFTs++;
            failedRefreshes++;
            await sendMessage({
              type: 'refreshProgress',
              totalNFTs,
              processedNFTs,
              lastProcessed: { success: false, identifier: nft.identifier, error }
            } as ProgressMessage);
          }
        }

        if (i + BATCH_SIZE < allNFTs.length) {
          await setTimeout(REFRESH_DELAY);
        }
      }

      await sendMessage({
        type: 'complete',
        totalNFTs,
        processedNFTs,
        successfulRefreshes,
        failedRefreshes
      } as CompleteMessage);
    } catch (error) {
      await sendMessage({ type: 'error', message: error instanceof Error ? error.message : 'An unknown error occurred' } as ErrorMessage);
    } finally {
      if (!writerClosed) {
        writerClosed = true;
        await writer.close().catch(() => {});
      }
    }
  }

  start();

  return new Response(stream.readable, {
    headers: { 'Content-Type': 'application/json' },
  });
}
