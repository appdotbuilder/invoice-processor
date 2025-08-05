
import { useState, useCallback } from 'react';
import { trpc } from '@/utils/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import type { InvoiceWithDetails, CreateInvoiceInput } from '../../../server/src/schema';

interface InvoiceUploadProps {
  onInvoiceProcessed: (invoice: InvoiceWithDetails) => void;
}

export function InvoiceUpload({ onInvoiceProcessed }: InvoiceUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState<CreateInvoiceInput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const resetState = useCallback(() => {
    setExtractedData(null);
    setError(null);
    setSuccess(null);
    setUploadProgress(0);
    setIsProcessing(false);
  }, []);

  const handleFileSelect = useCallback(async (file: File) => {
    resetState();
    
    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      setError('Please upload a PDF or image file (JPEG, PNG)');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }

    try {
      setIsProcessing(true);
      setUploadProgress(25);

      // Convert file to base64
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]); // Remove data:... prefix
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      setUploadProgress(50);

      // Upload file
      const uploadResult = await trpc.uploadInvoice.mutate({
        filename: file.name,
        content_type: file.type,
        file_data: base64Data
      });

      if (!uploadResult.success) {
        throw new Error('Failed to upload file');
      }

      setUploadProgress(75);

      // Process invoice extraction - fix the parameter structure
      const extractedData = await trpc.processInvoiceExtraction.mutate({
        filename: file.name,
        file_path: uploadResult.file_path
      });

      if (!extractedData) {
        setError('Could not extract invoice data. Please check the file and try again.');
        setIsProcessing(false);
        return;
      }

      setExtractedData(extractedData);
      setUploadProgress(100);
      setSuccess('Invoice data extracted successfully! Review and confirm below.');
    } catch (err) {
      console.error('Upload/processing error:', err);
      setError(err instanceof Error ? err.message : 'Failed to process invoice');
    } finally {
      setIsProcessing(false);
    }
  }, [resetState]);

  const handleConfirmExtraction = useCallback(async () => {
    if (!extractedData) return;

    try {
      setIsProcessing(true);
      const createdInvoice = await trpc.createInvoice.mutate(extractedData);
      
      // The createInvoice handler returns InvoiceWithDetails directly, so we can use it
      onInvoiceProcessed(createdInvoice);
      setSuccess('Invoice created successfully!');
      
      // Reset after a delay
      setTimeout(resetState, 2000);
    } catch (err) {
      console.error('Failed to create invoice:', err);
      setError(err instanceof Error ? err.message : 'Failed to create invoice');
    } finally {
      setIsProcessing(false);
    }
  }, [extractedData, onInvoiceProcessed, resetState]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  return (
    <div className="space-y-6 p-6">
      <CardHeader className="px-0 pt-0">
        <CardTitle className="flex items-center gap-2 text-xl">
          <Upload className="h-5 w-5" />
          Upload Invoice
        </CardTitle>
      </CardHeader>

      <CardContent className="px-0">
        {/* Upload Area */}
        <div
          className={`
            relative border-2 border-dashed rounded-lg p-8 text-center transition-colors
            ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-slate-400'}
            ${isProcessing ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
          `}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => document.getElementById('file-upload')?.click()}
        >
          <input
            id="file-upload"
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={handleFileInputChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={isProcessing}
          />
          
          <div className="space-y-4">
            {isProcessing ? (
              <Loader2 className="h-12 w-12 text-blue-500 mx-auto animate-spin" />
            ) : (
              <Upload className="h-12 w-12 text-slate-400 mx-auto" />
            )}
            
            <div>
              <p className="text-lg font-medium text-slate-900">
                {isProcessing ? 'Processing...' : 'Drop your invoice here'}
              </p>
              <p className="text-sm text-slate-500 mt-1">
                {isProcessing ? 'Please wait while we extract the data' : 'or click to browse files'}
              </p>
              <p className="text-xs text-slate-400 mt-2">
                Supports PDF, JPEG, PNG (max 10MB)
              </p>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        {isProcessing && uploadProgress > 0 && (
          <div className="space-y-2">
            <Progress value={uploadProgress} className="w-full" />
            <p className="text-sm text-slate-600 text-center">
              {uploadProgress < 50 ? 'Uploading...' : 
               uploadProgress < 75 ? 'Processing file...' : 
               uploadProgress < 100 ? 'Extracting data...' : 'Complete!'}
            </p>
          </div>
        )}

        {/* Alerts */}
        {error && (
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        {/* Extracted Data Preview */}
        {extractedData && (
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Extracted Invoice Data
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-600">Invoice Number</p>
                  <p className="text-slate-900">{extractedData.invoice_number}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600">Total Amount</p>
                  <p className="text-slate-900 font-semibold">${extractedData.total_amount.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600">Invoice Date</p>
                  <p className="text-slate-900">{extractedData.invoice_date.toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600">Vendor</p>
                  <p className="text-slate-900">{extractedData.vendor.name}</p>
                </div>
              </div>

              {extractedData.line_items.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-2">Line Items</p>
                  <div className="space-y-2">
                    {extractedData.line_items.map((item, index) => (
                      <div key={index} className="flex justify-between items-center p-2 bg-slate-50 rounded">
                        <div>
                          <p className="text-sm font-medium">{item.description}</p>
                          <p className="text-xs text-slate-500">Qty: {item.quantity} × ${item.unit_price}</p>
                        </div>
                        <p className="font-semibold">${item.total_price.toFixed(2)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <Button onClick={handleConfirmExtraction} disabled={isProcessing} className="flex-1">
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating Invoice...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Confirm & Create Invoice
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={resetState} disabled={isProcessing}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </div>
  );
}
