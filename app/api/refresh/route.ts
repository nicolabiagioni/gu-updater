import { NextRequest } from 'next/server';
import { setTimeout } from 'timers/promises';

const API_DELAY = 250; // ms between API calls
const BATCH_SIZE = 50; // Number of NFTs to fetch in a batch
const MAX_RETRIES = 5; // Maximum number of retries for rate limiting errors
const MAX_NFTS = 10000; // Maximum number of NFTs to fetch

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

async function fetchWithRetry(url: string, options: RequestInit, retries = MAX_RETRIES): Promise<Response> {
  try {
    const response = await fetch(url, options);
    if (response.status === 429 && retries > 0) {
      const retryAfter = parseInt(response.headers.get('Retry-After') || '60', 10);
      console.log(`Rate limited. Retrying after ${retryAfter} seconds. Retries left: ${retries}`);
      await setTimeout(retryAfter * 1000);
      return fetchWithRetry(url, options, retries - 1);
    }
    return response;
  } catch (error) {
    if (retries > 0) {
      console.log(`Error occurred. Retrying. Retries left: ${retries}`);
      await setTimeout(API_DELAY);
      return fetchWithRetry(url, options, retries - 1);
    }
    throw error;
  }
}

async function fetchNFTsByContract(apiKey: string, chain: string, contractAddress: string, ownerAddress: string, cursor: string | null = null) {
  const url = `https://api.opensea.io/api/v2/chain/${chain}/account/${ownerAddress}/nfts?limit=${BATCH_SIZE}${cursor ? `&cursor=${cursor}` : ''}&contract_address=${contractAddress}`;

  console.log(`Fetching NFTs with URL: ${url}`);

  const response = await fetchWithRetry(url, {
    headers: {
      'X-API-KEY': apiKey,
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
  }

  const data = await response.json();

  // Filter NFTs to ensure they belong to the specified contract
  const filteredNFTs = data.nfts.filter((nft: OpenSeaNFT) =>
    nft.contract.toLowerCase() === contractAddress.toLowerCase()
  );

  console.log(`Fetched ${data.nfts.length} NFTs, filtered to ${filteredNFTs.length}, next cursor: ${data.next}`);

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
      let previousCursor: string | null = null;

      do {
        try {
          const result = await fetchNFTsByContract(apiKey, chain, contractAddress, ownerAddress, cursor);
          allNFTs = allNFTs.concat(result.nfts);
          previousCursor = cursor;
          cursor = result.next;
          totalNFTs = allNFTs.length;

          console.log(`Fetched batch. Total NFTs: ${totalNFTs}, Cursor: ${cursor}`);

          await sendMessage({ type: 'fetchProgress', totalNFTs, processedNFTs } as ProgressMessage);

          if (cursor && cursor !== previousCursor && totalNFTs < MAX_NFTS && result.nfts.length > 0) {
            await setTimeout(API_DELAY);
          } else {
            console.log(`Stopping fetch. Cursor: ${cursor}, Total NFTs: ${totalNFTs}`);
            break;
          }
        } catch (error) {
          console.error('Error fetching NFTs:', error);
          await sendMessage({ type: 'error', message: error instanceof Error ? error.message : 'An unknown error occurred while fetching NFTs' } as ErrorMessage);
          break;
        }
      } while (cursor && cursor !== previousCursor && totalNFTs < MAX_NFTS);

      console.log(`Fetch complete. Total NFTs: ${totalNFTs}`);

      // Process NFTs
      for (const nft of allNFTs) {
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
          console.error(`Error refreshing NFT ${nft.identifier}:`, error);
          await sendMessage({
            type: 'refreshProgress',
            totalNFTs,
            processedNFTs,
            lastProcessed: { success: false, identifier: nft.identifier, error: error instanceof Error ? error.message : String(error) }
          } as ProgressMessage);
        }
        await setTimeout(API_DELAY);
      }

      console.log(`Refresh complete. Processed: ${processedNFTs}, Successful: ${successfulRefreshes}, Failed: ${failedRefreshes}`);

      await sendMessage({
        type: 'complete',
        totalNFTs,
        processedNFTs,
        successfulRefreshes,
        failedRefreshes
      } as CompleteMessage);
    } catch (error) {
      console.error('Error in start function:', error);
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
