
import { useState, useEffect, useCallback } from 'react';
import { trpc } from '@/utils/trpc';
import { InvoiceUpload } from '@/components/InvoiceUpload';
import { InvoiceList } from '@/components/InvoiceList';
import { InvoiceDetails } from '@/components/InvoiceDetails';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Upload, List, TrendingUp } from 'lucide-react';
import type { InvoiceWithDetails } from '../../server/src/schema';

function App() {
  const [invoices, setInvoices] = useState<InvoiceWithDetails[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceWithDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    processed: 0,
    paid: 0,
    overdue: 0,
    totalAmount: 0
  });

  const loadInvoices = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await trpc.getInvoices.query({});
      setInvoices(result);
      
      // Calculate stats
      const newStats = result.reduce((acc, invoice) => {
        acc.total += 1;
        acc[invoice.status] = (acc[invoice.status] || 0) + 1;
        acc.totalAmount += invoice.total_amount;
        return acc;
      }, {
        total: 0,
        pending: 0,
        processed: 0,
        paid: 0,
        overdue: 0,
        totalAmount: 0
      });
      setStats(newStats);
    } catch (error) {
      console.error('Failed to load invoices:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  const handleInvoiceProcessed = useCallback((newInvoice: InvoiceWithDetails) => {
    setInvoices((prev: InvoiceWithDetails[]) => [newInvoice, ...prev]);
    setStats(prevStats => ({
      ...prevStats,
      total: prevStats.total + 1,
      [newInvoice.status]: (prevStats[newInvoice.status] || 0) + 1,
      totalAmount: prevStats.totalAmount + newInvoice.total_amount
    }));
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'processed': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto p-6 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-600 rounded-lg">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900">Invoice Processing</h1>
          </div>
          <p className="text-slate-600">Upload, process, and manage your invoices with AI-powered data extraction</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <Card className="p-4 border-0 shadow-sm bg-white/70 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Total Invoices</p>
                <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
              </div>
              <FileText className="h-8 w-8 text-slate-400" />
            </div>
          </Card>

          <Card className="p-4 border-0 shadow-sm bg-white/70 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
              <Badge className={getStatusColor('pending')}>Pending</Badge>
            </div>
          </Card>

          <Card className="p-4 border-0 shadow-sm bg-white/70 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Processed</p>
                <p className="text-2xl font-bold text-blue-600">{stats.processed}</p>
              </div>
              <Badge className={getStatusColor('processed')}>Processed</Badge>
            </div>
          </Card>

          <Card className="p-4 border-0 shadow-sm bg-white/70 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Paid</p>
                <p className="text-2xl font-bold text-green-600">{stats.paid}</p>
              </div>
              <Badge className={getStatusColor('paid')}>Paid</Badge>
            </div>
          </Card>

          <Card className="p-4 border-0 shadow-sm bg-white/70 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Total Value</p>
                <p className="text-2xl font-bold text-slate-900">${stats.totalAmount.toLocaleString()}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-slate-400" />
            </div>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="upload" className="w-full">
          <TabsList className="grid w-full grid-cols-2 lg:w-96 mb-6 bg-white/70 backdrop-blur-sm">
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Upload Invoice
            </TabsTrigger>
            <TabsTrigger value="invoices" className="flex items-center gap-2">
              <List className="h-4 w-4" />
              All Invoices
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-6">
            <Card className="border-0 shadow-sm bg-white/70 backdrop-blur-sm">
              <InvoiceUpload onInvoiceProcessed={handleInvoiceProcessed} />
            </Card>
          </TabsContent>

          <TabsContent value="invoices" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <Card className="border-0 shadow-sm bg-white/70 backdrop-blur-sm">
                  <InvoiceList 
                    invoices={invoices} 
                    onSelectInvoice={setSelectedInvoice}
                    selectedInvoice={selectedInvoice}
                    isLoading={isLoading}
                  />
                </Card>
              </div>
              
              <div className="lg:col-span-1">
                <Card className="border-0 shadow-sm bg-white/70 backdrop-blur-sm sticky top-6">
                  <InvoiceDetails invoice={selectedInvoice} />
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default App;
