const apiKey = '3426c85de621463fbaafa27e34de0d62';
const contractAddress = '0x39509d8e1dd96cc8bad301ea65c75c7deb52374c';
const chain = 'ethereum';
const ownerAddress = '0x22cbde853A50Db5a036E5D62B1c82490465557c0';

const API_DELAY = 250;
const REFRESH_DELAY = 15000;
const BATCH_SIZE = 50;

async function fetchNFTsByOwner(cursor = null) {
  const url = `https://api.opensea.io/v2/chain/${chain}/account/${ownerAddress}/nfts?contract_address=${contractAddress}&limit=50${cursor ? `&cursor=${cursor}` : ''}`;

  console.log(`Fetching NFTs with URL: ${url}`);

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
  console.log(`API response:`, data);
  return data;
}

async function getAllNFTsForOwner() {
  let allNFTs = [];
  let cursor = null;

  do {
    const result = await fetchNFTsByOwner(cursor);
    allNFTs = allNFTs.concat(result.nfts);
    cursor = result.next;

    console.log(`Fetched ${result.nfts.length} NFTs. Total: ${allNFTs.length}`);

    if (cursor) {
      await new Promise(resolve => setTimeout(resolve, API_DELAY));
    }
  } while (cursor && allNFTs.length < 1600);

  console.log(`Total NFTs fetched: ${allNFTs.length}`);
  return allNFTs;
}

async function refreshNFT(tokenId) {
  const url = `https://api.opensea.io/api/v2/chain/${chain}/contract/${contractAddress}/nfts/${tokenId}/refresh`;

  console.log(`Refreshing NFT: Chain=${chain}, Contract=${contractAddress}, TokenID=${tokenId}`);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'X-API-KEY': apiKey,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error refreshing token ${tokenId}. Status: ${response.status}, Response: ${errorText}`);
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }

    const result = await response.json();
    console.log(`Successfully refreshed token ${tokenId}:`, result);
    return result;
  } catch (error) {
    console.error(`Failed to refresh token ${tokenId}:`, error);
    throw error;
  }
}

async function refreshNFTBatch(nfts) {
  const results = await Promise.all(
    nfts.map(async (nft) => {
      try {
        const result = await refreshNFT(nft.identifier);
        console.log(`Refreshed metadata for token ID: ${nft.identifier}`);
        return { tokenId: nft.identifier, success: true, result };
      } catch (error) {
        console.error(`Error refreshing token ${nft.identifier}:`, error.message);
        return { tokenId: nft.identifier, success: false, error: error.message };
      }
    })
  );

  console.log(`Batch refresh complete. Waiting ${REFRESH_DELAY}ms before next batch.`);
  await new Promise(resolve => setTimeout(resolve, REFRESH_DELAY));
  return results;
}

async function fetchAndRefreshNFTs() {
  try {
    console.log(`Fetching NFTs for address: ${ownerAddress}`);
    const nfts = await getAllNFTsForOwner();
    console.log(`Found ${nfts.length} NFTs. Starting refresh process...`);

    const batches = [];
    for (let i = 0; i < nfts.length; i += BATCH_SIZE) {
      batches.push(nfts.slice(i, i + BATCH_SIZE));
    }

    let results = [];
    for (const [index, batch] of batches.entries()) {
      console.log(`Processing batch ${index + 1} of ${batches.length}`);
      const batchResults = await refreshNFTBatch(batch);
      results = results.concat(batchResults);
    }

    console.log('All NFTs have been processed for refresh.');
    console.log('Summary:');
    console.log(`Total NFTs: ${nfts.length}`);
    console.log(`Successful refreshes: ${results.filter(r => r.success).length}`);
    console.log(`Failed refreshes: ${results.filter(r => !r.success).length}`);

    // Log failed refreshes
    const failedRefreshes = results.filter(r => !r.success);
    if (failedRefreshes.length > 0) {
      console.log('Failed refreshes:');
      failedRefreshes.forEach(r => console.log(`Token ID: ${r.tokenId}, Error: ${r.error}`));
    }
  } catch (error) {
    console.error('Error in fetch and refresh process:', error);
  }
}

fetchAndRefreshNFTs();
