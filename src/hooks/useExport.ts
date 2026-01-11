import { useCallback } from 'react';
import { toast } from 'sonner';

export function useExport() {
  const handlePrint = useCallback((elementId: string, title: string) => {
    const element = document.getElementById(elementId);
    if (!element) {
      toast.error('Export element not found');
      return;
    }

    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Pop-up blocked. Please allow pop-ups for printing.');
      return;
    }

    // Copy the content and styles
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              line-height: 1.5;
              color: #111827;
              background: white;
            }
            .print-document {
              padding: 40px;
              max-width: 8.5in;
              margin: 0 auto;
            }
            h1, h2, h3, h4 {
              color: #111827;
              margin-bottom: 0.5rem;
            }
            h1 { font-size: 1.875rem; font-weight: 700; }
            h2 { font-size: 1.25rem; font-weight: 600; }
            h3 { font-size: 1.125rem; font-weight: 600; }
            p { color: #374151; }
            table { width: 100%; border-collapse: collapse; }
            th, td { padding: 0.5rem; text-align: left; }
            th { font-weight: 600; }
            .border-b { border-bottom: 1px solid #e5e7eb; }
            .border-b-2 { border-bottom: 2px solid #111827; }
            .font-mono { font-family: 'JetBrains Mono', monospace; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .text-gray-500 { color: #6b7280; }
            .text-gray-600 { color: #4b5563; }
            .text-gray-700 { color: #374151; }
            .text-gray-900 { color: #111827; }
            .text-green-600 { color: #059669; }
            .text-yellow-600 { color: #d97706; }
            .text-red-600 { color: #dc2626; }
            .bg-gray-50 { background-color: #f9fafb; }
            .bg-yellow-100 { background-color: #fef3c7; }
            .bg-red-100 { background-color: #fee2e2; }
            .bg-blue-100 { background-color: #dbeafe; }
            .rounded { border-radius: 0.25rem; }
            .rounded-lg { border-radius: 0.5rem; }
            .border { border: 1px solid #e5e7eb; }
            .border-2 { border: 2px solid #d1d5db; }
            .p-3 { padding: 0.75rem; }
            .p-4 { padding: 1rem; }
            .px-2 { padding-left: 0.5rem; padding-right: 0.5rem; }
            .px-3 { padding-left: 0.75rem; padding-right: 0.75rem; }
            .py-1 { padding-top: 0.25rem; padding-bottom: 0.25rem; }
            .py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
            .pb-2 { padding-bottom: 0.5rem; }
            .pb-6 { padding-bottom: 1.5rem; }
            .pt-6 { padding-top: 1.5rem; }
            .mt-1 { margin-top: 0.25rem; }
            .mt-2 { margin-top: 0.5rem; }
            .mt-4 { margin-top: 1rem; }
            .mt-12 { margin-top: 3rem; }
            .mb-2 { margin-bottom: 0.5rem; }
            .mb-4 { margin-bottom: 1rem; }
            .mb-8 { margin-bottom: 2rem; }
            .gap-3 { gap: 0.75rem; }
            .gap-4 { gap: 1rem; }
            .gap-8 { gap: 2rem; }
            .space-y-1 > * + * { margin-top: 0.25rem; }
            .space-y-3 > * + * { margin-top: 0.75rem; }
            .space-y-8 > * + * { margin-top: 2rem; }
            .grid { display: grid; }
            .grid-cols-2 { grid-template-columns: repeat(2, 1fr); }
            .grid-cols-4 { grid-template-columns: repeat(4, 1fr); }
            .flex { display: flex; }
            .flex-1 { flex: 1; }
            .items-start { align-items: flex-start; }
            .items-center { align-items: center; }
            .justify-between { justify-content: space-between; }
            .text-xs { font-size: 0.75rem; }
            .text-sm { font-size: 0.875rem; }
            .text-xl { font-size: 1.25rem; }
            .text-4xl { font-size: 2.25rem; }
            .font-medium { font-weight: 500; }
            .font-semibold { font-weight: 600; }
            .font-bold { font-weight: 700; }
            .uppercase { text-transform: uppercase; }
            .tracking-wide { letter-spacing: 0.025em; }
            .whitespace-pre-wrap { white-space: pre-wrap; }
            .leading-relaxed { line-height: 1.625; }
            .list-disc { list-style-type: disc; }
            .list-inside { list-style-position: inside; }
            .inline-block { display: inline-block; }
            .rotate-\\[-45deg\\] { transform: rotate(-45deg); }
            .fixed { position: fixed; }
            .inset-0 { top: 0; right: 0; bottom: 0; left: 0; }
            .z-10 { z-index: 10; }
            .z-20 { z-index: 20; }
            .relative { position: relative; }
            .pointer-events-none { pointer-events: none; }
            .select-none { user-select: none; }
            .opacity-50 { opacity: 0.5; }
            @media print {
              body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
              .print-document { padding: 0.5in; }
            }
          </style>
        </head>
        <body>
          ${element.outerHTML}
        </body>
      </html>
    `);

    printWindow.document.close();
    
    // Wait for content to load then print
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
      }, 250);
    };

    toast.success(`Opening print dialog for ${title}`);
  }, []);

  return { handlePrint };
}
