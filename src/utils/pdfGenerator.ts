interface PDFOptions {
  filename?: string;
}

/**
 * Keep PDF generation simple: use the browser's native print dialog.
 * Users can pick "Save as PDF" there.
 */
export const generatePDF = async (elementId: string, options: PDFOptions = {}): Promise<void> => {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`Element with id '${elementId}' not found`);
  }

  const originalTitle = document.title;
  const nextTitle = options.filename?.replace(/\.pdf$/i, '').trim();

  if (nextTitle) {
    document.title = nextTitle;
  }

  window.print();

  if (nextTitle) {
    setTimeout(() => {
      document.title = originalTitle;
    }, 0);
  }
};
