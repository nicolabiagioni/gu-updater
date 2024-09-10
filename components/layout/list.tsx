import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CheckCircle2, XCircle } from "lucide-react"

type ListItem = {
  identifier: string
  success: boolean
  message: string
}

type ListProps = {
  items: ListItem[]
  isProcessing: boolean
}

export function List({ items, isProcessing }: ListProps) {
  if (items.length === 0 && !isProcessing) {
    return null; // Don't render anything if there are no items and not processing
  }

  return (
    <Card className="w-full bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Processed NFTs</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24 text-neutral-600 dark:text-neutral-400">Status</TableHead>
                <TableHead className="text-neutral-600 dark:text-neutral-400">Token ID</TableHead>
                <TableHead className="text-neutral-600 dark:text-neutral-400">Message</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item, index) => (
                <TableRow key={`${item.identifier}-${index}`}>
                  <TableCell>
                    {item.success ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" aria-label="Success" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" aria-label="Failure" />
                    )}
                  </TableCell>
                  <TableCell className="font-mono">{item.identifier}</TableCell>
                  <TableCell>{item.message}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-neutral-600 dark:text-neutral-400 text-center mt-4">
            No NFTs processed yet.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
