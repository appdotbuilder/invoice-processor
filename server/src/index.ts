
import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';

// Import schemas
import { 
  createInvoiceInputSchema,
  updateInvoiceInputSchema,
  getInvoicesQuerySchema,
  getInvoiceByIdInputSchema,
  uploadInvoiceInputSchema
} from './schema';

// Import handlers
import { createInvoice } from './handlers/create_invoice';
import { getInvoices } from './handlers/get_invoices';
import { getInvoiceById } from './handlers/get_invoice_by_id';
import { updateInvoice } from './handlers/update_invoice';
import { uploadInvoice } from './handlers/upload_invoice';
import { deleteInvoice } from './handlers/delete_invoice';
import { getVendors } from './handlers/get_vendors';
import { processInvoiceExtraction } from './handlers/process_invoice_extraction';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Invoice management
  createInvoice: publicProcedure
    .input(createInvoiceInputSchema)
    .mutation(({ input }) => createInvoice(input)),

  getInvoices: publicProcedure
    .input(getInvoicesQuerySchema)
    .query(({ input }) => getInvoices(input)),

  getInvoiceById: publicProcedure
    .input(getInvoiceByIdInputSchema)
    .query(({ input }) => getInvoiceById(input)),

  updateInvoice: publicProcedure
    .input(updateInvoiceInputSchema)
    .mutation(({ input }) => updateInvoice(input)),

  deleteInvoice: publicProcedure
    .input(getInvoiceByIdInputSchema)
    .mutation(({ input }) => deleteInvoice(input)),

  // File upload and processing
  uploadInvoice: publicProcedure
    .input(uploadInvoiceInputSchema)
    .mutation(({ input }) => uploadInvoice(input)),

  processInvoiceExtraction: publicProcedure
    .input(uploadInvoiceInputSchema.pick({ filename: true }).extend({ file_path: uploadInvoiceInputSchema.shape.filename }))
    .mutation(({ input }) => processInvoiceExtraction(input.file_path)),

  // Vendor management
  getVendors: publicProcedure
    .query(() => getVendors()),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();
