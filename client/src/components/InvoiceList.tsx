
import { useState } from 'react';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Filter, FileText } from 'lucide-react';
import type { InvoiceWithDetails } from '../../../server/src/schema';

interface InvoiceListProps {
  invoices: InvoiceWithDetails[];
  onSelectInvoice: (invoice: InvoiceWithDetails) => void;
  selectedInvoice: InvoiceWithDetails | null;
  isLoading: boolean;
}

export function InvoiceList({ invoices, onSelectInvoice, selectedInvoice, isLoading }: InvoiceListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredInvoices = invoices.filter((invoice: InvoiceWithDetails) => {
    const matchesSearch = 
      invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.vendor.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800 border-green-200';
      case 'processed': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'overdue': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return '✓';
      case 'processed': return '⚡';
      case 'pending': return '⏳';
      case 'overdue': return '⚠️';
      default: return '📄';
    }
  };

  return (
    <div className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Invoices ({filteredInvoices.length})
        </CardTitle>
        
        {/* Filters */}
        <div className="flex gap-2 pt-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search invoices or vendors..."
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="processed">Processed</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent>
        <ScrollArea className="h-96">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="p-4 border rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-5 w-16" />
                  </div>
                  <Skeleton className="h-3 w-48 mb-2" />
                  <div className="flex justify-between">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">
                {searchTerm || statusFilter !== 'all' ? 'No invoices match your filters' : 'No invoices uploaded yet'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredInvoices.map((invoice: InvoiceWithDetails) => (
                <div
                  key={invoice.id}
                  className={`
                    p-4 border rounded-lg cursor-pointer transition-all hover:shadow-sm
                    ${selectedInvoice?.id === invoice.id 
                      ? 'border-blue-500 bg-blue-50 shadow-sm' 
                      : 'border-slate-200 hover:border-slate-300'
                    }
                  `}
                  onClick={() => onSelectInvoice(invoice)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {invoice.invoice_number}
                      </p>
                      <p className="text-sm text-slate-600">
                        {invoice.vendor.name}
                      </p>
                    </div>
                    <Badge className={getStatusColor(invoice.status)}>
                      {getStatusIcon(invoice.status)} {invoice.status}
                    </Badge>
                  </div>
                  
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">
                      {invoice.invoice_date.toLocaleDateString()}
                    </span>
                    <span className="font-semibold text-slate-900">
                      ${invoice.total_amount.toLocaleString()}
                    </span>
                  </div>
                  
                  {invoice.line_items.length > 0 && (
                    <p className="text-xs text-slate-400 mt-2">
                      {invoice.line_items.length} line item{invoice.line_items.length !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </div>
  );
}
