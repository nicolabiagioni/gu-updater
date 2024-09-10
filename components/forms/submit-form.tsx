"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { NFTItem } from "@/lib/types"
import { FiLoader, FiTrash2 } from "react-icons/fi"
import FormFields from "./form-fields"
import useSubmitForm from "./use-submit-form"

export default function SubmitForm({
  onListUpdate,
  setIsProcessing
}: {
  onListUpdate: (newList: NFTItem[]) => void,
  setIsProcessing: (isProcessing: boolean) => void
}) {
  const {
    apiKey,
    contractAddress,
    ownerAddress,
    errors,
    isLoading,
    isSuccess,
    progress,
    handleInputChange,
    handleSubmit,
    resetForm
  } = useSubmitForm(onListUpdate, setIsProcessing)

  return (
    <Card className="w-full bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-semibold text-center">Settings</CardTitle>
        <CardDescription className="text-center text-neutral-500 dark:text-neutral-400">
          Enter your OpenSea API key and collection details
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        <form onSubmit={handleSubmit} className="space-y-4" aria-label="API Configuration Form">
          <FormFields
            apiKey={apiKey}
            contractAddress={contractAddress}
            ownerAddress={ownerAddress}
            errors={errors}
            isLoading={isLoading}
            handleInputChange={handleInputChange}
          />
          <div className="flex flex-col gap-2">
            <Button
              type="submit"
              className={`w-full transition-all duration-300 ${
                isLoading
                  ? 'bg-neutral-300 text-neutral-600 cursor-not-allowed'
                  : 'bg-black hover:bg-neutral-800 text-white dark:bg-white dark:hover:bg-neutral-200 dark:text-black'
              }`}
              disabled={isLoading}
            >
              {isLoading ? (
                <FiLoader className="mr-2 h-5 w-5 animate-spin" aria-hidden="true" />
              ) : null}
              {isLoading ? "Processing..." : isSuccess ? "Submit" : "Save Settings"}
            </Button>

            {isSuccess && (
              <Button
                type="button"
                onClick={resetForm}
                className="w-full bg-red-100 hover:bg-red-200 text-red-700 border border-red-300"
              >
                <FiTrash2 className="mr-2 h-5 w-5" />
                Reset
              </Button>
            )}
          </div>

          {isLoading && (
            <Progress value={progress} className="w-full mt-4" aria-label="Processing progress" />
          )}
        </form>
      </CardContent>
    </Card>
  )
}
