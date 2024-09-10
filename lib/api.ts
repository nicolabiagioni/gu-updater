import { toast } from "@/hooks/use-toast";
import { NFTItem } from "@/lib/types";

interface StreamedData {
  type: 'fetchProgress' | 'refreshProgress' | 'complete' | 'error';
  totalNFTs?: number;
  processedNFTs?: number;
  lastProcessed?: {
    identifier: string;
    success: boolean;
  };
  message?: string;
}

type SubmitFormDataParams = {
  apiKey: string
  contractAddress: string
  ownerAddress: string
  setProgress: (progress: number) => void
  onListUpdate: (newList: NFTItem[]) => void
  setIsSuccess: (isSuccess: boolean) => void
  setIsProcessing: (isProcessing: boolean) => void
}

export async function submitFormData({
  apiKey,
  contractAddress,
  ownerAddress,
  setProgress,
  onListUpdate,
  setIsSuccess,
  setIsProcessing
}: SubmitFormDataParams) {
  const response = await fetch('/api/refresh', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      apiKey,
      contractAddress,
      chain: "ethereum",
      ownerAddress,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Response status:', response.status);
    console.error('Response text:', errorText);
    throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
  }

  const reader = response.body?.getReader()
  if (!reader) {
    throw new Error('Response body is not readable')
  }

  const processedNFTs: NFTItem[] = []
  const totalNFTs = 0
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    let newlineIndex;
    while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, newlineIndex);
      buffer = buffer.slice(newlineIndex + 1);
      if (line.trim()) {
        try {
          const data = JSON.parse(line);
          handleStreamedData(data, setProgress, onListUpdate, setIsSuccess, setIsProcessing, processedNFTs, totalNFTs);
        } catch (error) {
          console.error('Error parsing JSON:', error, 'Line:', line);
        }
      }
    }
  }

  // Handle any remaining data in the buffer
  if (buffer.trim()) {
    try {
      const data = JSON.parse(buffer);
      handleStreamedData(data, setProgress, onListUpdate, setIsSuccess, setIsProcessing, processedNFTs, totalNFTs);
    } catch (error) {
      console.error('Error parsing JSON:', error, 'Remaining buffer:', buffer);
    }
  }
}

function handleStreamedData(
  data: StreamedData,
  setProgress: (progress: number) => void,
  onListUpdate: (newList: NFTItem[]) => void,
  setIsSuccess: (isSuccess: boolean) => void,
  setIsProcessing: (isProcessing: boolean) => void,
  processedNFTs: NFTItem[],
  totalNFTs: number
) {
  switch (data.type) {
    case 'fetchProgress':
      if (data.totalNFTs !== undefined) {
        totalNFTs = data.totalNFTs
      }
      if (data.processedNFTs !== undefined && totalNFTs > 0) {
        setProgress((data.processedNFTs / totalNFTs) * 50)
      }
      break
    case 'refreshProgress':
      if (data.lastProcessed) {
        const newItem: NFTItem = {
          identifier: data.lastProcessed.identifier,
          success: data.lastProcessed.success,
          message: data.lastProcessed.success ? "Updated" : "Failed"
        }
        processedNFTs.push(newItem)
        onListUpdate([...processedNFTs])
      }
      if (data.processedNFTs !== undefined && totalNFTs > 0) {
        setProgress(50 + (data.processedNFTs / totalNFTs) * 50)
      }
      break
    case 'complete':
      setIsSuccess(true)
      toast({
        title: "Update Complete",
        description: `Successfully processed ${data.processedNFTs ?? 0} out of ${data.totalNFTs ?? 0} NFTs.`,
        duration: 5000,
      })
      setIsProcessing(false)
      break
    case 'error':
      throw new Error(data.message ?? 'Unknown error occurred')
  }
}
