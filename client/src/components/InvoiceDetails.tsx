
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  FileText, 
  Building2, 
  Calendar, 
  DollarSign, 
  Mail, 
  Phone, 
  MapPin,
  Download,
  Edit,
  Trash2
} from 'lucide-react';
import type { InvoiceWithDetails } from '../../../server/src/schema';

interface InvoiceDetailsProps {
  invoice: InvoiceWithDetails | null;
}

export function InvoiceDetails({ invoice }: InvoiceDetailsProps) {
  if (!invoice) {
    return (
      <div className="h-full">
        <CardHeader>
          <CardTitle>Invoice Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">Select an invoice to view details</p>
          </div>
        </CardContent>
      </div>
    );
  }

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
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Invoice Details
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <ScrollArea className="h-96">
          <div className="space-y-6">
            {/* Invoice Header */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900">
                  {invoice.invoice_number}
                </h3>
                <Badge className={getStatusColor(invoice.status)}>
                  {getStatusIcon(invoice.status)} {invoice.status}
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-slate-400" />
                  <span className="text-slate-600">Invoice Date:</span>
                </div>
                <span className="text-slate-900">{invoice.invoice_date.toLocaleDateString()}</span>
                
                {invoice.due_date && (
                  <>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-slate-400" />
                      <span className="text-slate-600">Due Date:</span>
                    </div>
                    <span className="text-slate-900">{invoice.due_date.toLocaleDateString()}</span>
                  </>
                )}
                
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-slate-400" />
                  <span className="text-slate-600">Total Amount:</span>
                </div>
                <span className="text-slate-900 font-semibold">${invoice.total_amount.toLocaleString()}</span>
              </div>
            </div>

            <Separator />

            {/* Vendor Information */}
            <div className="space-y-3">
              <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Vendor Information
              </h4>
              
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium text-slate-900">{invoice.vendor.name}</span>
                </div>
                
                {invoice.vendor.address && (
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-slate-400 mt-0.5" />
                    <span className="text-slate-600">{invoice.vendor.address}</span>
                  </div>
                )}
                
                {invoice.vendor.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-slate-400" />
                    <span className="text-slate-600">{invoice.vendor.email}</span>
                  </div>
                )}
                
                {invoice.vendor.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-slate-400" />
                    <span className="text-slate-600">{invoice.vendor.phone}</span>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Line Items */}
            <div className="space-y-3">
              <h4 className="font-semibold text-slate-900">
                Line Items ({invoice.line_items.length})
              </h4>
              
              <div className="space-y-2">
                {invoice.line_items.map((item, index) => (
                  <div key={item.id || index} className="p-3 bg-slate-50 rounded-lg">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-medium text-slate-900 text-sm">
                        {item.description}
                      </span>
                      <span className="font-semibold text-slate-900">
                        ${item.total_price.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>Qty: {item.quantity}</span>
                      <span>Unit: ${item.unit_price.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Metadata */}
            <div className="space-y-2 text-xs text-slate-500">
              <div className="flex justify-between">
                <span>Created:</span>
                <span>{invoice.created_at.toLocaleDateString()} {invoice.created_at.toLocaleTimeString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Updated:</span>
                <span>{invoice.updated_at.toLocaleDateString()} {invoice.updated_at.toLocaleTimeString()}</span>
              </div>
              {invoice.original_filename && (
                <div className="flex justify-between">
                  <span>Original File:</span>
                  <span>{invoice.original_filename}</span>
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </div>
  );
}
