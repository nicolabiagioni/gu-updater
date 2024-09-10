"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { NFTItem } from "@/lib/types"
import { FiLoader, FiRefreshCw, FiTrash2 } from "react-icons/fi"
import FormFields from "./form-fields"
import SuccessAlert from "./success-alert"
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
    handleNewSubmission,
    resetForm
  } = useSubmitForm(onListUpdate, setIsProcessing)

  return (
    <Card className="w-full bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-semibold text-center">API Configuration</CardTitle>
        <CardDescription className="text-center text-neutral-500 dark:text-neutral-400">
          Enter your OpenSea API key and blockchain details
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
              type={isSuccess ? "button" : "submit"}
              className={`w-full transition-all duration-300 ${
                isLoading
                  ? 'bg-neutral-300 text-neutral-600 cursor-not-allowed'
                  : 'bg-black hover:bg-neutral-800 text-white dark:bg-white dark:hover:bg-neutral-200 dark:text-black'
              }`}
              disabled={isLoading}
              onClick={isSuccess ? handleNewSubmission : undefined}
            >
              {isLoading ? (
                <FiLoader className="mr-2 h-5 w-5 animate-spin" aria-hidden="true" />
              ) : isSuccess ? (
                <FiRefreshCw className="mr-2 h-5 w-5" aria-hidden="true" />
              ) : null}
              {isLoading ? "Processing..." : isSuccess ? "New Submission" : "Submit"}
            </Button>

            {isSuccess && (
              <Button
                type="button"
                onClick={resetForm}
                className="w-full bg-red-100 hover:bg-red-200 text-red-700 border border-red-300"
              >
                <FiTrash2 className="mr-2 h-5 w-5" />
                Reset Form
              </Button>
            )}
          </div>

          {isLoading && (
            <Progress value={progress} className="w-full mt-4" aria-label="Processing progress" />
          )}
        </form>
      </CardContent>
      <CardFooter className="flex flex-col items-start w-full">
        {isSuccess && <SuccessAlert />}
      </CardFooter>
    </Card>
  )
}
