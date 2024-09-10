import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FiAlertCircle } from "react-icons/fi"

type FormFieldsProps = {
  apiKey: string
  contractAddress: string
  ownerAddress: string
  errors: Record<string, string>
  isLoading: boolean
  handleInputChange: (key: string, value: string) => void
}

export default function FormFields({
  apiKey,
  contractAddress,
  ownerAddress,
  errors,
  isLoading,
  handleInputChange
}: FormFieldsProps) {
  const fields = [
    { key: "apiKey", label: "OpenSea API Key", placeholder: "Insert your OpenSea API Key" },
    { key: "contractAddress", label: "Contract Address", placeholder: "Insert the contract address" },
    { key: "ownerAddress", label: "Owner Address", placeholder: "Insert the owner's address" }
  ]

  return (
    <>
      {fields.map(({ key, label, placeholder }) => (
        <div key={key} className="space-y-2">
          <Label htmlFor={key} className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            {label}
          </Label>
          <Input
            id={key}
            type="text"
            placeholder={placeholder}
            value={key === "apiKey" ? apiKey : key === "contractAddress" ? contractAddress : ownerAddress}
            onChange={(e) => handleInputChange(key, e.target.value)}
            className={`transition-all duration-300 ${
              errors[key]
                ? 'border-red-500 focus:ring-red-500'
                : 'border-neutral-300 dark:border-neutral-700 focus:ring-neutral-500 dark:focus:ring-neutral-400'
            }`}
            aria-invalid={!!errors[key]}
            aria-describedby={errors[key] ? `${key}-error` : undefined}
            disabled={isLoading}
            autoComplete="off"
          />
          {errors[key] && (
            <p id={`${key}-error`} className="text-sm text-red-500 flex items-center">
              <FiAlertCircle className="h-4 w-4 mr-2" aria-hidden="true" />
              {errors[key]}
            </p>
          )}
        </div>
      ))}
    </>
  )
}
