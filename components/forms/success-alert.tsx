import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { FiCheckCircle } from "react-icons/fi"

export default function SuccessAlert() {
  return (
    <Alert variant="default" className="mt-4 w-full bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-800">
      <div className="flex items-center mb-2">
        <FiCheckCircle className="h-5 w-5 text-green-700 dark:text-green-300 mr-2 flex-shrink-0" aria-hidden="true" />
        <AlertTitle className="text-green-800 dark:text-green-200 text-lg font-semibold">
          Success
        </AlertTitle>
      </div>
      <AlertDescription className="text-green-600 dark:text-green-400 text-sm">
        Settings saved. Ready to start the refresh process.
      </AlertDescription>
    </Alert>
  )
}
