import { toast } from "@/hooks/use-toast"
import { submitFormData } from '@/lib/api'
import { loadFromLocalStorage, saveToLocalStorage } from '@/lib/localStorage'
import { NFTItem } from "@/lib/types"
import { validateForm } from '@/lib/validators'
import { useEffect, useState } from 'react'

export default function useSubmitForm(
  onListUpdate: (newList: NFTItem[]) => void,
  setIsProcessing: (isProcessing: boolean) => void
) {
  const [apiKey, setApiKey] = useState("")
  const [contractAddress, setContractAddress] = useState("")
  const [ownerAddress, setOwnerAddress] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    // Load saved data from localStorage when component mounts
    const savedApiKey = loadFromLocalStorage('apiKey')
    const savedContractAddress = loadFromLocalStorage('contractAddress')
    const savedOwnerAddress = loadFromLocalStorage('ownerAddress')

    if (savedApiKey) setApiKey(savedApiKey)
    if (savedContractAddress) setContractAddress(savedContractAddress)
    if (savedOwnerAddress) setOwnerAddress(savedOwnerAddress)
  }, [])

  const handleInputChange = (key: string, value: string) => {
    if (key === "apiKey") setApiKey(value)
    else if (key === "contractAddress") setContractAddress(value)
    else if (key === "ownerAddress") setOwnerAddress(value)

    saveToLocalStorage(key, value)
  }

  const resetForm = () => {
    setIsSuccess(false)
    setProgress(0)
    onListUpdate([])
    setApiKey("")
    setContractAddress("")
    setOwnerAddress("")
    localStorage.removeItem('apiKey')
    localStorage.removeItem('contractAddress')
    localStorage.removeItem('ownerAddress')
  }

  const handleNewSubmission = () => {
    setIsSuccess(false)
    setProgress(0)
    onListUpdate([])
    handleSubmit()
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const formErrors = validateForm(apiKey, contractAddress, ownerAddress)
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors)
      return
    }

    setIsLoading(true)
    setIsSuccess(false)
    setProgress(0)
    onListUpdate([])
    setIsProcessing(true)

    try {
      await submitFormData({
        apiKey,
        contractAddress,
        ownerAddress,
        setProgress,
        onListUpdate,
        setIsSuccess: (isSuccess) => {
          setIsSuccess(isSuccess)
          if (isSuccess) {
            toast({
              title: "Settings Saved",
              description: "Your configuration has been saved. Click 'Start Refresh' to begin the process.",
              duration: 5000,
            })
          }
        },
        setIsProcessing
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An unexpected error occurred.",
        variant: "destructive",
        duration: 5000,
      })
    } finally {
      setIsLoading(false)
      setIsProcessing(false)
    }
  }

  return {
    apiKey,
    contractAddress,
    ownerAddress,
    errors,
    isLoading,
    isSuccess,
    progress,
    handleInputChange,
    handleSubmit,
    handleNewSubmission,
    resetForm
  }
}
