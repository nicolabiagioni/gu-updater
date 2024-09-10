export function validateForm(apiKey: string, contractAddress: string, ownerAddress: string) {
  const errors: Record<string, string> = {}
  if (!apiKey.trim()) errors.apiKey = "OpenSea API Key is required"
  if (!contractAddress.trim()) errors.contractAddress = "Contract Address is required"
  if (!ownerAddress.trim()) errors.ownerAddress = "Owner Address is required"
  return errors
}
