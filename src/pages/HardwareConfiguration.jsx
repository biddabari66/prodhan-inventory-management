import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Bluetooth, Fingerprint, Printer, RefreshCw, CheckCircle2, AlertTriangle, Settings, HelpCircle, Download } from 'lucide-react';
import { toast } from 'sonner';
import PageHeader from '@/components/common/PageHeader';
import { withPermission } from '@/components/common/PermissionGuard';

function HardwareConfiguration() {
  const [isScanning, setIsScanning] = useState(false);
  const [bluetoothDevice, setBluetoothDevice] = useState(null);
  
  // Dummy connect function for Bluetooth Printer
  const connectBluetoothPrinter = async () => {
    setIsScanning(true);
    try {
      if (!navigator.bluetooth) {
        throw new Error("Web Bluetooth API is not available in your browser.");
      }
      
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb'] // generic serial port
      });
      
      setBluetoothDevice(device);
      toast.success(`Connected to ${device.name || 'Unknown Device'}`);
      
      // Listen for disconnect
      device.addEventListener('gattserverdisconnected', () => {
        setBluetoothDevice(null);
        toast.error("Bluetooth printer disconnected");
      });
      
    } catch (error) {
      console.error(error);
      toast.error(`Bluetooth Error: ${error.message}`);
    } finally {
      setIsScanning(false);
    }
  };

  const testPrint = () => {
    if (!bluetoothDevice) {
      toast.error("No printer connected!");
      return;
    }
    toast.success("Sending test page to printer...");
    // Actual ESC/POS integration would go here.
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="max-w-6xl mx-auto p-4 md:p-6 lg:p-8 space-y-6">
        
        <PageHeader
          icon={Settings}
          title="Hardware Configuration"
          subtitle="Set up your Bluetooth Thermal Printers and Biometric Attendance devices."
          breadcrumb="Dashboard / Settings / Hardware"
        />

        <Tabs defaultValue="bluetooth" className="space-y-6">
          <TabsList className="bg-white border shadow-sm p-1 rounded-xl h-12 w-full justify-start overflow-x-auto">
            <TabsTrigger value="bluetooth" className="h-10 rounded-lg gap-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
              <Bluetooth className="w-4 h-4" /> Bluetooth Printers
            </TabsTrigger>
            <TabsTrigger value="biometric" className="h-10 rounded-lg gap-2 data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700">
              <Fingerprint className="w-4 h-4" /> Biometric Devices
            </TabsTrigger>
          </TabsList>

          {/* Bluetooth Settings */}
          <TabsContent value="bluetooth" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              <div className="lg:col-span-2 space-y-6">
                <Card className="border-0 shadow-sm bg-white dark:bg-slate-900">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Printer className="w-5 h-5 text-blue-600" />
                      Thermal Printer Connection
                    </CardTitle>
                    <CardDescription>Pair a Bluetooth receipt printer for fast invoice generation.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    
                    <div className={`p-6 rounded-xl border-2 flex flex-col items-center justify-center text-center space-y-4 transition-colors ${bluetoothDevice ? 'border-green-200 bg-green-50' : 'border-dashed border-slate-200 bg-slate-50'}`}>
                      {bluetoothDevice ? (
                        <>
                          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                            <CheckCircle2 className="w-8 h-8 text-green-600" />
                          </div>
                          <div>
                            <h3 className="font-bold text-lg text-green-900">{bluetoothDevice.name || 'Thermal Printer'}</h3>
                            <p className="text-sm text-green-700">Connected and ready to print</p>
                          </div>
                          <div className="flex gap-3 mt-4">
                            <Button onClick={testPrint} variant="outline" className="border-green-300 text-green-700 hover:bg-green-100">
                              Print Test Page
                            </Button>
                            <Button onClick={() => setBluetoothDevice(null)} variant="ghost" className="text-slate-500 hover:text-red-600">
                              Disconnect
                            </Button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
                            <Bluetooth className="w-8 h-8 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="font-bold text-lg text-slate-800">No Printer Connected</h3>
                            <p className="text-sm text-slate-500">Ensure your printer is turned on and discoverable.</p>
                          </div>
                          <Button 
                            onClick={connectBluetoothPrinter} 
                            disabled={isScanning}
                            className="bg-blue-600 hover:bg-blue-700 mt-2"
                          >
                            {isScanning ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Bluetooth className="w-4 h-4 mr-2" />}
                            {isScanning ? 'Scanning...' : 'Pair New Printer'}
                          </Button>
                        </>
                      )}
                    </div>

                    {!navigator.bluetooth && (
                      <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Browser Unsupported</AlertTitle>
                        <AlertDescription>
                          Your current browser does not support the Web Bluetooth API. Please use Chrome, Edge, or an Android browser.
                        </AlertDescription>
                      </Alert>
                    )}

                  </CardContent>
                </Card>
              </div>

              {/* Guide sidebar */}
              <div className="space-y-6">
                <Card className="border-0 shadow-sm bg-slate-50 border-blue-100">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <HelpCircle className="w-4 h-4 text-slate-500" /> Setup Guide
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-slate-600 space-y-4">
                    <ol className="list-decimal pl-4 space-y-2">
                      <li>Turn on your Bluetooth thermal printer.</li>
                      <li>Click "Pair New Printer".</li>
                      <li>Select your printer from the browser's popup dialog.</li>
                      <li>Wait for the connection to establish.</li>
                      <li>Click "Print Test Page" to verify.</li>
                    </ol>
                    <div className="p-3 bg-white rounded-lg border text-xs">
                      <strong>Supported Models:</strong>
                      <p className="text-slate-500 mt-1">Generic ESC/POS 58mm & 80mm Bluetooth printers.</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Biometric Settings */}
          <TabsContent value="biometric" className="space-y-6">
            <Card className="border-0 shadow-sm bg-white dark:bg-slate-900">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Fingerprint className="w-5 h-5 text-emerald-600" />
                  ZKTeco / Biometric Device Integration
                </CardTitle>
                <CardDescription>Connect physical attendance machines to the ERP.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Alert className="bg-emerald-50 border-emerald-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <AlertTitle className="text-emerald-800">Local Service Required</AlertTitle>
                  <AlertDescription className="text-emerald-700">
                    To connect to ZKTeco devices, you need to run the local proxy service on the network where the device is located.
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-6 rounded-xl border border-slate-200 bg-slate-50 space-y-4">
                    <h3 className="font-bold">Step 1: Download Proxy Client</h3>
                    <p className="text-sm text-slate-600">Download the local agent and run it on a PC connected to the same LAN as your fingerprint device.</p>
                    <Button variant="outline" className="w-full">
                      <Download className="w-4 h-4 mr-2" /> Download Windows Service
                    </Button>
                  </div>
                  
                  <div className="p-6 rounded-xl border border-slate-200 bg-slate-50 space-y-4">
                    <h3 className="font-bold">Step 2: Device Configuration</h3>
                    <p className="text-sm text-slate-600">Enter the IP Address of your biometric device below.</p>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-500">Device IP Address</label>
                      <div className="flex gap-2">
                        <input type="text" className="flex-1 rounded-md border-slate-300 border px-3 py-2 text-sm" placeholder="192.168.1.201" />
                        <Button className="bg-emerald-600 hover:bg-emerald-700">Connect</Button>
                      </div>
                    </div>
                  </div>
                </div>

              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

      </div>
    </div>
  );
}

export default withPermission(HardwareConfiguration, 'integrations', 'can_view');
