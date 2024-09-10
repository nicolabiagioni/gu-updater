import { toast } from "@/hooks/use-toast"
import { NFTItem } from "@/lib/types"

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
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  const reader = response.body?.getReader()
  if (!reader) {
    throw new Error('Response body is not readable')
  }

  let processedNFTs: NFTItem[] = []
  let totalNFTs = 0

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    const messages = new TextDecoder().decode(value).split('\n').filter(Boolean)

    for (const message of messages) {
      const data = JSON.parse(message)

      switch (data.type) {
        case 'fetchProgress':
          totalNFTs = data.totalNFTs
          setProgress((data.processedNFTs / totalNFTs) * 50)
          break
        case 'refreshProgress':
          if (data.lastProcessed) {
            const newItem: NFTItem = {
              identifier: data.lastProcessed.identifier,
              success: data.lastProcessed.success,
              message: data.lastProcessed.success ? "Successfully processed" : "Failed to process"
            }
            processedNFTs = [...processedNFTs, newItem]
            onListUpdate(processedNFTs)
          }
          setProgress(50 + (data.processedNFTs / totalNFTs) * 50)
          break
        case 'complete':
          setIsSuccess(true)
          toast({
            title: "Refresh Complete",
            description: `Successfully processed ${data.processedNFTs} out of ${data.totalNFTs} NFTs.`,
            duration: 5000,
          })
          setIsProcessing(false)
          break
        case 'error':
          throw new Error(data.message)
      }
    }
  }
}
