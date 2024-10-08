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
    return null;
  }

  return (
    <Card className="w-full bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Processed NFTs</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">Status</TableHead>
                  <TableHead>Token ID</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, index) => (
                  <TableRow key={`${item.identifier}-${index}`} className="hover:bg-neutral-50 dark:hover:bg-neutral-900">
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
          </div>
        ) : (
          <p className="text-neutral-600 dark:text-neutral-400 text-center mt-4">
            {isProcessing ? "Processing NFTs..." : "No NFTs processed yet."}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
