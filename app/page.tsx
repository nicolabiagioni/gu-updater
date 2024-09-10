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
      <main className="flex-grow p-4 sm:p-8 lg:p-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4">
            <SubmitForm onListUpdate={handleListUpdate} setIsProcessing={setIsProcessing} />
          </div>
          <div className="lg:col-span-8">
            <List items={processedNFTs} isProcessing={isProcessing} />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
