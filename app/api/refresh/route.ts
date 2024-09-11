import { ethers } from 'ethers';
import { NextRequest } from 'next/server';
import { Chain, OpenSeaSDK } from 'opensea-js';
import { sleep } from '../../utils/sleep'; // Create this utility function

const BATCH_SIZE = 100;
const CONCURRENT_REQUESTS = 4;
const RATE_LIMIT_DELAY = 250; // 250ms delay between batches (4 requests per second)

// Define a type for the NFT object
interface NFT {
  contract: string;
  identifier: string;
  // Add other properties as needed
}

// Define a type for the refresh result
type RefreshResult =
  | { success: true; identifier: string }
  | { success: false; identifier: string; error: string }
  | { retry: true; identifier: string };

// Define the message types
type ProgressMessage = {
  type: 'fetchProgress' | 'refreshProgress';
  totalNFTs: number;
  processedNFTs: number;
  lastProcessed?: { success: boolean; identifier: string; error?: string };
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

export async function POST(request: NextRequest) {
  const { apiKey, contractAddress, ownerAddress } = await request.json();

  const provider = new ethers.JsonRpcProvider(`https://mainnet.infura.io/v3/${process.env.INFURA_PROJECT_ID}`);
  const openseaSDK = new OpenSeaSDK(provider, {
    chain: Chain.Mainnet,
    apiKey: apiKey
  });

  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  const sendMessage = async (message: Message) => {
    await writer.write(encoder.encode(JSON.stringify(message) + '\n'));
  };

  async function start() {
    try {
      let processedNFTs = 0;
      let successfulRefreshes = 0;
      let failedRefreshes = 0;
      let cursor: string | undefined = undefined;
      let totalNFTs = 0;
      let filteredNFTs: NFT[] = [];

      do {
        const assets = await openseaSDK.api.getNFTsByAccount(
          ownerAddress,
          BATCH_SIZE,
          cursor,
          openseaSDK.chain
        );

        // Filter NFTs by contract address
        const contractNFTs = assets.nfts.filter((nft: NFT) => nft.contract === contractAddress);
        filteredNFTs = [...filteredNFTs, ...contractNFTs];

        totalNFTs = filteredNFTs.length;
        await sendMessage({ type: 'fetchProgress', totalNFTs, processedNFTs });

        cursor = assets.next;
      } while (cursor);

      // Process filtered NFTs
      for (let i = 0; i < filteredNFTs.length; i += CONCURRENT_REQUESTS) {
        const batch = filteredNFTs.slice(i, i + CONCURRENT_REQUESTS);
        const refreshPromises = batch.map(async (nft): Promise<RefreshResult> => {
          try {
            await openseaSDK.api.refreshNFTMetadata(contractAddress, nft.identifier);
            successfulRefreshes++;
            return { success: true, identifier: nft.identifier };
          } catch (error) {
            failedRefreshes++;
            let errorMessage = 'Unknown error';
            if (error instanceof Error) {
              errorMessage = error.message;
              if (errorMessage.includes('not found for contract')) {
                errorMessage = `NFT not found. It may have been transferred or burned.`;
              } else if (errorMessage.includes('Request was throttled')) {
                errorMessage = `Rate limit exceeded. Retrying after delay.`;
                await sleep(RATE_LIMIT_DELAY * 5); // Longer delay for rate limit errors
                return { retry: true, identifier: nft.identifier };
              }
            }
            return { success: false, identifier: nft.identifier, error: errorMessage };
          }
        });

        const results = await Promise.all(refreshPromises);

        for (const result of results) {
          if ('retry' in result) {
            i--; // Retry this NFT in the next batch
            continue;
          }
          processedNFTs++;
          await sendMessage({
            type: 'refreshProgress',
            totalNFTs,
            processedNFTs,
            lastProcessed: result
          });
        }

        await sleep(RATE_LIMIT_DELAY);
      }

      await sendMessage({
        type: 'complete',
        totalNFTs,
        processedNFTs,
        successfulRefreshes,
        failedRefreshes
      });
    } catch (error) {
      console.error('Error in start function:', error);
      await sendMessage({
        type: 'error',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    } finally {
      await writer.close().catch(() => {});
    }
  }

  start();

  return new Response(stream.readable, {
    headers: { 'Content-Type': 'application/json' },
  });
}
