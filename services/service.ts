import axios from 'axios';

export async function refreshNFTs(apiKey: string, contractAddress: string, chain: string, ownerAddress: string) {
  try {
    const response = await axios.post('/api/route', {
      apiKey,
      contractAddress,
      chain,
      ownerAddress
    });
    return response.data;
  } catch (error) {
    throw error;
  }
}
