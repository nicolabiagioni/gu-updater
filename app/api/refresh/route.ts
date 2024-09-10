import { NextRequest } from 'next/server';
import { setTimeout } from 'timers/promises';

const API_DELAY = 250;
const REFRESH_DELAY = 15000;
const BATCH_SIZE = 50;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

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
};

type ErrorMessage = {
  type: 'error';
  message: string;
};

type Message = ProgressMessage | CompleteMessage | ErrorMessage;

async function fetchWithRetry(url: string, options: RequestInit, retries = MAX_RETRIES): Promise<Response> {
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response;
  } catch (error) {
    if (retries > 0) {
      await setTimeout(RETRY_DELAY);
      return fetchWithRetry(url, options, retries - 1);
    }
    throw error;
  }
}

async function fetchNFTsByContract(apiKey: string, chain: string, contractAddress: string, ownerAddress: string, cursor: string | null = null) {
  const url = `https://api.opensea.io/api/v2/chain/${chain}/account/${ownerAddress}/nfts?limit=50${cursor ? `&cursor=${cursor}` : ''}`;
  const response = await fetchWithRetry(url, {
    headers: {
      'X-API-KEY': apiKey,
      'Accept': 'application/json'
    }
  });
  const data = await response.json();

  // Filter NFTs to only include those from the specified contract
  const filteredNFTs = (data.nfts as OpenSeaNFT[]).filter((nft) => nft.contract === contractAddress);

  return {
    nfts: filteredNFTs,
    next: data.next
  };
}

async function refreshNFT(apiKey: string, chain: string, contractAddress: string, tokenId: string) {
  const url = `https://api.opensea.io/api/v2/chain/${chain}/contract/${contractAddress}/nfts/${tokenId}/refresh`;
  const response = await fetchWithRetry(url, {
    method: 'POST',
    headers: {
      'X-API-KEY': apiKey,
      'Accept': 'application/json'
    }
  });
  const data = await response.json();
  return data;
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

      do {
        const result = await fetchNFTsByContract(apiKey, chain, contractAddress, ownerAddress, cursor);
        allNFTs = allNFTs.concat(result.nfts);
        cursor = result.next;
        totalNFTs = allNFTs.length;

        await sendMessage({ type: 'fetchProgress', totalNFTs, processedNFTs } as ProgressMessage);

        if (cursor) {
          await setTimeout(API_DELAY);
        }
      } while (cursor);

      const refreshPromises = allNFTs.map(async (nft, index) => {
        await setTimeout(index * (REFRESH_DELAY / BATCH_SIZE));
        try {
          await refreshNFT(apiKey, chain, contractAddress, nft.identifier);
          return { success: true, identifier: nft.identifier };
        } catch (error) {
          return { success: false, identifier: nft.identifier, error };
        }
      });

      for await (const result of refreshPromises) {
        processedNFTs++;
        await sendMessage({ type: 'refreshProgress', totalNFTs, processedNFTs, lastProcessed: result } as ProgressMessage);
      }

      await sendMessage({ type: 'complete', totalNFTs, processedNFTs } as CompleteMessage);
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
