import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScanLine, Printer, Package, QrCode, Loader2 } from 'lucide-react';
import QRStickerSheet from '../components/inventory/QRStickerSheet';
import QRStockScanner from '../components/inventory/QRStockScanner.jsx';


export default function QRInventory() {
  const [activeTab, setActiveTab] = useState('scan');

  const { data: inventory = [], isLoading, refetch } = useQuery({
    queryKey: ['inventory-for-qr'],
    queryFn: () => base44.entities.Inventory.filter({ department: 'prodhan_com_e_commerce' }, '-updated_date', 2000),
    staleTime: 2 * 60 * 1000,
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-red-600 mx-auto" />
          <p className="text-slate-500">Loading inventory...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <span>Dashboard</span>
        <span>/</span>
        <span className="text-slate-900 font-medium">QR Code & Scanning</span>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
              <QrCode className="w-5 h-5 text-red-600" />
            </div>
            QR Code & Scanning
          </h1>
          <p className="text-sm text-slate-500 mt-1">Scan products, manage stock, and print QR stickers</p>
        </div>
        <Badge className="bg-slate-100 text-slate-700 text-sm px-3 py-1">
          {inventory.length} Products
        </Badge>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 h-14 p-1 bg-slate-100 rounded-xl">
          <TabsTrigger
            value="scan"
            className="gap-2 h-12 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm font-medium"
          >
            <ScanLine className="w-4 h-4" />
            <span>Scan & Stock</span>
          </TabsTrigger>
          <TabsTrigger
            value="print"
            className="gap-2 h-12 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm font-medium"
          >
            <Printer className="w-4 h-4" />
            <span>Print QR Stickers</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="scan" className="mt-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-5">
              <QRStockScanner
                inventory={inventory}
                currentUser={currentUser}
                onStockUpdated={refetch}
              />
            </CardContent>
          </Card>

          {/* Quick Guide */}
          <Card className="mt-4 bg-gradient-to-r from-slate-50 to-white border-slate-200">
            <CardContent className="p-5">
              <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                <Package className="w-4 h-4 text-red-600" />
                Quick Guide — Phone Camera Scanning
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="space-y-1">
                  <p className="font-semibold text-blue-700">🔍 Quick Lookup</p>
                  <p className="text-slate-600">Scan any product to instantly see stock level, price, and details. No stock changes.</p>
                </div>
                <div className="space-y-1">
                  <p className="font-semibold text-green-700">📦 Stock IN</p>
                  <p className="text-slate-600">Receiving goods? Select Stock IN, scan the product, enter qty → stock increases automatically.</p>
                </div>
                <div className="space-y-1">
                  <p className="font-semibold text-red-700">🚚 Stock OUT</p>
                  <p className="text-slate-600">Packing orders? Select Stock OUT, scan the product, enter qty → stock decreases automatically.</p>
                </div>
              </div>
              <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
                <p className="text-xs text-amber-800">
                  <strong>💡 Pro Tip:</strong> For fastest scanning, use "Manual / USB Scanner" mode with a Bluetooth barcode scanner (৳2,500-5,000). 
                  The scanner types the code and presses Enter automatically — scan dozens of items per minute!
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="print" className="mt-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-5">
              <QRStickerSheet inventory={inventory} />
            </CardContent>
          </Card>

          <Card className="mt-4 bg-gradient-to-r from-slate-50 to-white border-slate-200">
            <CardContent className="p-5">
              <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                <Printer className="w-4 h-4 text-red-600" />
                Sticker Printing Guide
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-600">
                <div>
                  <p className="font-semibold text-slate-800 mb-1">🏷️ Label Sizes</p>
                  <ul className="space-y-1 list-disc list-inside">
                    <li><strong>A4 30-per-page:</strong> Standard Avery-style labels</li>
                    <li><strong>A4 24-per-page:</strong> Slightly larger labels</li>
                    <li><strong>A4 12-per-page:</strong> Large labels with more detail</li>
                    <li><strong>Thermal 50×30mm:</strong> For thermal printers (Xprinter, Brother)</li>
                  </ul>
                </div>
                <div>
                  <p className="font-semibold text-slate-800 mb-1">🖨️ How to Print</p>
                  <ol className="space-y-1 list-decimal list-inside">
                    <li>Select products to print</li>
                    <li>Choose label size matching your sticker sheets</li>
                    <li>Set copies per product (e.g., 2 for backup)</li>
                    <li>Click Print → Print dialog opens</li>
                    <li>Attach stickers to products</li>
                  </ol>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}