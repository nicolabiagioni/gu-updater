"use client"

import SubmitForm from '@/components/forms/submit-form'
import Footer from '@/components/layout/footer'
import Header from '@/components/layout/header'
import { List } from '@/components/layout/list'
import { useState } from 'react'

type NFTItem = { identifier: string; success: boolean; message: string }

export default function Home() {
  const [processedNFTs, setProcessedNFTs] = useState<NFTItem[]>([])
  const [isProcessing, setIsProcessing] = useState(false)

  const handleListUpdate = (newList: NFTItem[]) => {
    setProcessedNFTs(newList)
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow flex flex-col lg:flex-row gap-8 p-4 sm:p-8 lg:p-12">
        <div className="w-full lg:w-1/3 xl:w-1/4">
          <h1 className="sr-only">Genuine Updater API Configuration</h1>
          <SubmitForm onListUpdate={handleListUpdate} setIsProcessing={setIsProcessing} />
        </div>
        <div className="w-full lg:w-2/3 xl:w-3/4">
          <List items={processedNFTs} isProcessing={isProcessing} />
        </div>
      </main>
      <Footer />
    </div>
  );
}
