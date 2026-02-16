import * as pdfjsLib from 'pdfjs-dist'

// Use a specific version for the worker to match the library
// Using a CDN avoids needing complex Vite configuration for the worker file
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`

/**
 * Extracts text from a PDF file.
 * @param file The PDF file object from a file input
 * @returns A promise that resolves to the extracted text
 */
export const extractTextFromPDF = async (file: File): Promise<string> => {
  try {
    const arrayBuffer = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

    let fullText = ''

    // Iterate over all pages
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const textContent = await page.getTextContent()

      // Combine text items, adding spaces between items
      const pageText = textContent.items
        .map((item: unknown) => (item as { str: string }).str || '')
        .join(' ')

      fullText += pageText + '\n\n'
    }

    return fullText.trim()
  } catch (error) {
    console.error('Error parsing PDF:', error)
    throw new Error('Failed to extract text from PDF. Please ensure it is a valid PDF file.')
  }
}
