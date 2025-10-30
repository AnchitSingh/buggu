// src/utils/pdfProcessor.js

import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker with static path
// The worker will be automatically available after npm install
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

const MAX_PAGES = 3;

/**
 * Process uploaded files (images or PDFs) into image blobs
 * @param {FileList|File[]} files - The uploaded files
 * @returns {Promise<Array>} - Array of { blob: Blob, type: 'image'|'pdf', name: string, pageNum?: number }
 */
export async function processFiles(files) {
  const filesArray = Array.isArray(files) ? files : Array.from(files);
  const results = [];
  
  for (const file of filesArray) {
    if (file.type.startsWith('image/')) {
      // Direct image file - no processing needed
      results.push({
        blob: file,
        type: 'image',
        name: file.name
      });
      
    } else if (file.type === 'application/pdf') {
      // Convert PDF pages to images
      try {
        const pdfImages = await convertPdfToImages(file);
        results.push(...pdfImages);
      } catch (error) {
        console.error(`Failed to process PDF "${file.name}":`, error);
        throw new Error(`PDF processing failed: ${error.message}`);
      }
    } else {
      console.warn(`Unsupported file type: ${file.type} for file "${file.name}"`);
    }
  }
  
  // Enforce max page limit
  if (results.length > MAX_PAGES) {
    console.warn(`File count (${results.length}) exceeds limit. Using first ${MAX_PAGES} pages.`);
    return results.slice(0, MAX_PAGES);
  }
  
  return results;
}

/**
 * Convert PDF to array of image blobs (one per page)
 * @param {File} pdfFile - PDF file
 * @returns {Promise<Array>} - Array of processed page objects
 */
async function convertPdfToImages(pdfFile) {
  // Read PDF file as ArrayBuffer
  const arrayBuffer = await pdfFile.arrayBuffer();
  
  // Load PDF document
  const loadingTask = pdfjsLib.getDocument({ 
    data: arrayBuffer,
    // Disable font loading to speed up rendering
    disableFontFace: false,
    // Enable text content for better extraction quality
    enableXfa: true
  });
  
  const pdf = await loadingTask.promise;
  const numPages = Math.min(pdf.numPages, MAX_PAGES);
  const images = [];
  
  console.log(`📄 Processing PDF: ${numPages} page(s) from "${pdfFile.name}"`);
  
  // Process each page sequentially
  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    try {
      const page = await pdf.getPage(pageNum);
      
      // Get viewport at 2x scale for better quality
      const viewport = page.getViewport({ scale: 2.0 });
      
      // Create canvas element
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d', { 
        alpha: false  // Opaque canvas for smaller file size
      });
      
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      
      // Render PDF page to canvas
      const renderContext = {
        canvasContext: context,
        viewport: viewport,
        // Optional: set background color
        background: 'white'
      };
      
      await page.render(renderContext).promise;
      
      // Convert canvas to blob
      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob(
          (result) => {
            if (result) {
              resolve(result);
            } else {
              reject(new Error('Canvas to blob conversion failed'));
            }
          },
          'image/png',
          0.95  // Quality (0.0 - 1.0)
        );
      });
      
      images.push({
        blob,
        type: 'pdf',
        pageNum,
        name: `${pdfFile.name} - Page ${pageNum}`,
        dimensions: {
          width: viewport.width,
          height: viewport.height
        }
      });
      
      // Clean up
      page.cleanup();
      
    } catch (error) {
      console.error(`Error processing page ${pageNum}:`, error);
      throw new Error(`Failed to render page ${pageNum}: ${error.message}`);
    }
  }
  
  console.log(`✅ Converted ${images.length} PDF page(s) to images`);
  return images;
}

/**
 * Convert blob to base64 data URL (if needed for preview)
 * Note: Chrome Prompt API accepts Blob directly, so this is optional
 * @param {Blob} blob - Image blob
 * @returns {Promise<string>} - Data URL string
 */
export function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Failed to read blob as data URL'));
    reader.readAsDataURL(blob);
  });
}

/**
 * Get preview URL for displaying images in UI
 * @param {Blob} blob - Image blob
 * @returns {string} - Object URL
 */
export function createPreviewURL(blob) {
  return URL.createObjectURL(blob);
}

/**
 * Revoke preview URL to free memory
 * @param {string} url - Object URL to revoke
 */
export function revokePreviewURL(url) {
  URL.revokeObjectURL(url);
}

/**
 * Validate file before processing
 * @param {File} file
 * @returns {Object} - { valid: boolean, error?: string }
 */
export function validateFile(file) {
  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
  const ALLOWED_TYPES = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'application/pdf'
  ];
  
  if (!file) {
    return { valid: false, error: 'No file provided' };
  }
  
  if (file.size > MAX_FILE_SIZE) {
    return { 
      valid: false, 
      error: `File too large (${(file.size / 1024 / 1024).toFixed(2)}MB). Max: 50MB` 
    };
  }
  
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { 
      valid: false, 
      error: `Unsupported file type: ${file.type}` 
    };
  }
  
  return { valid: true };
}

export default {
  processFiles,
  blobToDataURL,
  createPreviewURL,
  revokePreviewURL,
  validateFile
};
