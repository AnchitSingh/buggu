import { useState, useEffect, useRef } from 'react';
import { processFiles, createPreviewURL, revokePreviewURL } from './utils/pdfProcessor';
import { extractJSONFromImages } from './utils/chromeAI';
import { getAIStatus } from './utils/aiAvailability';

function App() {
  const [step, setStep] = useState('home');
  const [modalStep, setModalStep] = useState(1); // 1: upload, 2: schema
  const [files, setFiles] = useState([]);
  const [processedImages, setProcessedImages] = useState([]);
  const [schemaPrompt, setSchemaPrompt] = useState('');
  const [jsonOutput, setJsonOutput] = useState(null);
  const [error, setError] = useState(null);
  const [aiStatus, setAiStatus] = useState({ loading: true, available: false, state: 'checking' });
  
  // Use ref to track if check is in progress (survives StrictMode double-invoke)
  const checkInProgressRef = useRef(false);
  const isMountedRef = useRef(true);

  // Helper function to check AI with retries
  const checkAIWithRetry = async (maxAttempts = 3) => {
    // Prevent concurrent checks (important for StrictMode)
    if (checkInProgressRef.current) {
      console.log('AI check already in progress, skipping...');
      return;
    }
    
    checkInProgressRef.current = true;
    
    if (isMountedRef.current) {
      setAiStatus({ loading: true, available: false, state: 'checking' });
    }
    
    let attempts = 0;
    
    while (attempts < maxAttempts && isMountedRef.current) {
      attempts++;
      
      try {
        const status = await getAIStatus();
        
        if (!isMountedRef.current) break;
        
        console.log(`AI check attempt ${attempts}/${maxAttempts}:`, status);
        
        // If ready or downloadable, consider it available
        if (status.state === 'ready' || status.state === 'downloadable') {
          setAiStatus({
            loading: false,
            available: true,
            error: null,
            state: status.state
          });
          checkInProgressRef.current = false;
          return;
        }
        
        // If downloading, retry after delay (except on last attempt)
        if (status.state === 'downloading' && attempts < maxAttempts) {
          console.log(`AI is downloading, retrying in 1s...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }
        
        // If unavailable on first attempt, retry once more
        if (status.state === 'unavailable' && attempts < maxAttempts) {
          console.log(`AI unavailable, retrying in 1s...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }
        
        // Final attempt or non-retryable state
        if (isMountedRef.current) {
          setAiStatus({
            loading: false,
            available: false,
            error: status.error || null,
            state: status.state
          });
        }
        checkInProgressRef.current = false;
        return;
        
      } catch (error) {
        console.error(`AI check attempt ${attempts}/${maxAttempts} error:`, error);
        
        if (attempts >= maxAttempts) {
          if (isMountedRef.current) {
            setAiStatus({
              loading: false,
              available: false,
              error: error.message,
              state: 'error'
            });
          }
          checkInProgressRef.current = false;
          return;
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    checkInProgressRef.current = false;
  };

  // Check AI availability on mount
  useEffect(() => {
    isMountedRef.current = true;
    checkAIWithRetry();
    
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const handleProcess = async () => {
    setStep('loading');
    setError(null);
    
    try {
      const imageBlobs = processedImages.map(img => img.blob);
      const result = await extractJSONFromImages({ imageBlobs, schemaPrompt });
      setJsonOutput(result);
      setStep('results');
    } catch (err) {
      console.error('Processing error:', err);
      setError(err.message || 'Failed to extract data');
      setStep('home');
      setModalStep(2); // Go back to schema step
      setTimeout(() => setStep('modal'), 100);
    }
  };

  const handleReset = () => {
    setStep('home');
    setModalStep(1);
    setFiles([]);
    setProcessedImages([]);
    setSchemaPrompt('');
    setJsonOutput(null);
    setError(null);
  };

  return (
    <div className="antialiased bg-gradient-to-br from-slate-50 via-white to-amber-50/30 text-slate-900 min-h-screen overflow-x-hidden">
      {/* Background Effects */}
      <BackgroundEffects />
      
      {/* AI Status Warning */}
      {aiStatus?.state === 'unsupported' && (
        <div className="fixed top-0 left-0 right-0 bg-red-500 text-white px-4 py-3 text-center text-sm font-medium z-50 shadow-lg">
          ⚠️ Chrome Built-in AI not available. Please use Chrome 127+ with AI features enabled.
        </div>
      )}
      
      {step === 'home' && (
        <HomePage 
          onStart={() => setStep('modal')} 
          aiStatus={aiStatus} 
          checkAIWithRetry={checkAIWithRetry}
          checkInProgressRef={checkInProgressRef}
        />
      )}
      
      {step === 'modal' && (
        <ConversionModal
          modalStep={modalStep}
          setModalStep={setModalStep}
          files={files}
          setFiles={setFiles}
          processedImages={processedImages}
          setProcessedImages={setProcessedImages}
          schemaPrompt={schemaPrompt}
          setSchemaPrompt={setSchemaPrompt}
          error={error}
          onProcess={handleProcess}
          onClose={handleReset}
        />
      )}
      
      {step === 'loading' && (
        <LoadingScreen imageCount={processedImages.length} />
      )}
      
      {step === 'results' && (
        <ResultsPage 
          jsonOutput={jsonOutput}
          onReset={handleReset}
        />
      )}
    </div>
  );
}

// ===== Background Effects =====
const BackgroundEffects = () => (
  <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
    <div className="absolute top-1/4 -left-48 w-96 h-96 bg-gradient-to-br from-amber-300/20 to-orange-300/20 rounded-full blur-3xl animate-pulse-slow" />
    <div className="absolute bottom-1/4 -right-48 w-96 h-96 bg-gradient-to-br from-orange-300/20 to-amber-300/20 rounded-full blur-3xl animate-pulse-slow animation-delay-2000" />
    <div className="absolute top-3/4 left-1/2 w-72 h-72 bg-gradient-to-br from-amber-200/10 to-orange-200/10 rounded-full blur-3xl animate-pulse-slow animation-delay-4000" />
  </div>
);

// ===== Home Page =====
function HomePage({ onStart, aiStatus, checkAIWithRetry, checkInProgressRef }) {
  return (
    <main className="relative z-10 min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto text-center">
        {/* Header */}
        <div className="mb-12 animate-fade-in">
          {/* Badge */}
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-gradient-to-r from-amber-100 to-orange-100 text-amber-800 text-sm font-medium mb-6 border border-amber-200/50">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
            </svg>
           Buggu: Privacy First Document Extractor
          </div>

          {/* Title */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-display font-bold tracking-tight leading-tight mb-6">
            <span className="text-slate-800">Turn documents into</span>
            <span className="bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 bg-clip-text text-transparent">
              {" "}structured data
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-xl sm:text-2xl text-slate-600 leading-relaxed mb-12 max-w-3xl mx-auto">
            Extract JSON from images and PDFs with custom schemas.
            <span className="font-medium text-slate-700"> Private, fast, and completely on-device</span> using Chrome AI.
          </p>

          {/* CTA Button */}
          <div className="mb-8">
            {aiStatus.loading ? (
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                  <svg className="w-8 h-8 text-amber-600 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
                <p className="text-slate-600">Checking AI availability...</p>
              </div>
            ) : aiStatus.available ? (
              <div className="flex flex-col items-center">
                <button 
                  onClick={onStart}
                  className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white bg-gradient-to-r from-amber-600 to-orange-600 rounded-2xl shadow-xl shadow-amber-600/25 hover:shadow-amber-600/40 hover:scale-105 transform transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2"
                >
                  <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Convert to JSON
                  <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6"/>
                  </svg>
                </button>
                
              </div>
            ) : (
              <div className="text-center">
                <button 
                  disabled
                  className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white bg-slate-400 rounded-2xl cursor-not-allowed opacity-50"
                >
                  Convert to JSON
                </button>
                <p className="text-red-600 text-sm mt-3 font-medium">
                  {aiStatus.state === 'unsupported' 
                    ? 'Chrome AI is not available in your browser. Please use Chrome 127+ with AI features enabled.' 
                    : aiStatus.state === 'unavailable'
                      ? 'Chrome AI is not available in your browser. Please use Chrome 127+ with AI features enabled.'
                      : aiStatus.state === 'downloading'
                        ? 'Chrome AI model is downloading. Please wait and try again.' 
                        : 'Error checking AI availability. Please try again.'}
                </p>
                
                {/* Add refresh button for retrying AI status check */}
                {(aiStatus.state === 'error' || aiStatus.state === 'unavailable') && (
                  <button 
                    onClick={checkAIWithRetry}
                    disabled={checkInProgressRef.current}
                    className="mt-3 px-4 py-2 text-sm font-medium text-amber-600 bg-amber-100 rounded-lg hover:bg-amber-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {aiStatus.loading ? 'Checking...' : 'Try Again'}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Trust Indicators */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-slate-500">
            <div className="flex items-center">
              <svg className="w-4 h-4 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"/>
              </svg>
              100% Private & On-Device
            </div>
            <div className="flex items-center">
              <svg className="w-4 h-4 mr-2 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z"/>
              </svg>
              No Server Costs
            </div>
            <div className="flex items-center">
              <svg className="w-4 h-4 mr-2 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
                <path d="M3 12v3c0 1.657 3.134 3 7 3s7-1.343 7-3v-3c0 1.657-3.134 3-7 3s-7-1.343-7-3z"/>
                <path d="M3 7v3c0 1.657 3.134 3 7 3s7-1.343 7-3V7c0 1.657-3.134 3-7 3S3 8.657 3 7z"/>
                <path d="M17 5c0 1.657-3.134 3-7 3S3 6.657 3 5s3.134-3 7-3 7 1.343 7 3z"/>
              </svg>
              Custom Schemas
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

// ===== Conversion Modal =====
function ConversionModal({ 
  modalStep, 
  setModalStep, 
  files, 
  setFiles, 
  processedImages, 
  setProcessedImages,
  schemaPrompt,
  setSchemaPrompt,
  error,
  onProcess, 
  onClose 
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden animate-scale-in">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 px-6 py-4 border-b border-amber-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-amber-600 to-orange-600 rounded-xl flex items-center justify-center text-white font-bold">
                {modalStep}
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800">
                  {modalStep === 1 ? 'Upload Files' : 'Define Schema'}
                </h2>
                <p className="text-sm text-slate-500">
                  {modalStep === 1 ? 'Step 1 of 2' : 'Step 2 of 2'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg hover:bg-amber-100 flex items-center justify-center transition-colors"
            >
              <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {modalStep === 1 ? (
            <UploadStep
              files={files}
              setFiles={setFiles}
              processedImages={processedImages}
              setProcessedImages={setProcessedImages}
            />
          ) : (
            <SchemaStep
              schemaPrompt={schemaPrompt}
              setSchemaPrompt={setSchemaPrompt}
              processedImages={processedImages}
              error={error}
            />
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={() => modalStep === 1 ? onClose() : setModalStep(1)}
            className="px-6 py-2.5 rounded-xl text-slate-700 hover:bg-slate-200 font-medium transition-colors"
          >
            {modalStep === 1 ? 'Cancel' : '← Back'}
          </button>
          
          {modalStep === 1 ? (
            <button
              onClick={() => setModalStep(2)}
              disabled={processedImages.length === 0}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold hover:shadow-lg hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              Next: Define Schema →
            </button>
          ) : (
            <button
              onClick={onProcess}
              disabled={!schemaPrompt.trim()}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold hover:shadow-lg hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Process Files
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ===== Upload Step =====
function UploadStep({ files, setFiles, processedImages, setProcessedImages }) {
  const [loading, setLoading] = useState(false);
  const [previewUrls, setPreviewUrls] = useState([]);
  
  const handleFileUpload = async (e) => {
    const uploadedFiles = Array.from(e.target.files);
    setFiles(uploadedFiles);
    setLoading(true);
    
    try {
      const processed = await processFiles(uploadedFiles);
      setProcessedImages(processed);
      const urls = processed.map(img => createPreviewURL(img.blob));
      setPreviewUrls(urls);
    } catch (error) {
      alert('Error processing files: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      previewUrls.forEach(url => revokePreviewURL(url));
    };
  }, [previewUrls]);

  return (
    <div className="space-y-6">
      {/* Upload Zone */}
      <div className="relative">
        <input 
          type="file" 
          accept="image/*,application/pdf"
          multiple
          onChange={handleFileUpload}
          id="file-input"
          className="hidden"
        />
        <label 
          htmlFor="file-input" 
          className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-amber-300 rounded-2xl cursor-pointer bg-gradient-to-br from-amber-50/50 to-orange-50/50 hover:from-amber-50 hover:to-orange-50 transition-all duration-300 group"
        >
          {loading ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-amber-600 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <p className="text-slate-600 font-medium">Processing files...</p>
            </div>
          ) : (
            <>
              <svg className="w-16 h-16 text-amber-500 mb-4 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-lg font-semibold text-slate-700 mb-1">Click to upload files</p>
              <p className="text-sm text-slate-500">Images (PNG, JPG) or PDF (max 3 pages)</p>
            </>
          )}
        </label>
      </div>

      {/* Preview Grid */}
      {processedImages.length > 0 && (
        <div className="space-y-4 animate-fade-in-up">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="font-semibold text-slate-800">
                {processedImages.length} page{processedImages.length !== 1 ? 's' : ''} ready
              </p>
            </div>
            <button
              onClick={() => {
                setFiles([]);
                setProcessedImages([]);
                setPreviewUrls([]);
              }}
              className="text-sm text-red-600 hover:text-red-700 font-medium"
            >
              Clear all
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {processedImages.map((img, i) => (
              <div key={i} className="group relative bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 border border-slate-200">
                <div className="aspect-[3/4] overflow-hidden bg-slate-100">
                  <img 
                    src={previewUrls[i]} 
                    alt={img.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="p-2 bg-slate-50">
                  <p className="text-xs text-slate-600 truncate">{img.name}</p>
                </div>
                <div className="absolute top-2 right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ===== Schema Step =====
function SchemaStep({ schemaPrompt, setSchemaPrompt, processedImages, error }) {
  const [showPreview, setShowPreview] = useState(false);
  const [previewUrls, setPreviewUrls] = useState([]);
  
  useEffect(() => {
    const urls = processedImages.map(img => createPreviewURL(img.blob));
    setPreviewUrls(urls);
    return () => urls.forEach(url => revokePreviewURL(url));
  }, [processedImages]);
  
  const examples = [
    {
      title: "Invoice",
      prompt: "Extract invoice number, date, vendor name, line items with descriptions and prices, subtotal, tax, and total amount"
    },
    {
      title: "Receipt",
      prompt: "Extract receipt items with names, quantities, and prices; also get the store name, date, and total"
    },
    {
      title: "Document",
      prompt: "Extract all text content and organize it by sections with headings"
    }
  ];
  
  return (
    <div className="space-y-6">
      {/* Preview Toggle */}
      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="font-medium text-slate-700">{processedImages.length} uploaded pages</span>
        </div>
        <button
          onClick={() => setShowPreview(!showPreview)}
          className="px-4 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 transition-colors text-sm font-medium text-slate-700"
        >
          {showPreview ? 'Hide Preview' : 'Show Preview'}
        </button>
      </div>

      {/* Preview Grid */}
      {showPreview && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 p-4 bg-slate-50 rounded-xl animate-fade-in">
          {processedImages.map((img, i) => (
            <div key={i} className="aspect-[3/4] rounded-lg overflow-hidden bg-white shadow-sm border border-slate-200">
              <img 
                src={previewUrls[i]} 
                alt={img.name}
                className="w-full h-full object-cover"
              />
            </div>
          ))}
        </div>
      )}

      {/* Schema Input */}
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-2">
          Describe what data you want to extract:
        </label>
        <textarea
          placeholder="Example: Extract invoice number, date, items with prices, and total amount"
          value={schemaPrompt}
          onChange={(e) => setSchemaPrompt(e.target.value)}
          rows={6}
          className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-amber-400 focus:ring-4 focus:ring-amber-100 transition-all outline-none resize-none font-mono text-sm"
        />
        <p className="mt-2 text-xs text-slate-500">
          💡 Tip: Be specific about the fields and format you want
        </p>
      </div>

      {/* Examples */}
      <div>
        <p className="text-sm font-semibold text-slate-700 mb-3">Quick templates:</p>
        <div className="grid gap-3">
          {examples.map((ex, i) => (
            <button
              key={i}
              onClick={() => setSchemaPrompt(ex.prompt)}
              className="text-left p-4 rounded-xl bg-white border-2 border-slate-200 hover:border-amber-300 hover:bg-amber-50/50 transition-all group"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <p className="font-semibold text-slate-800 mb-1 group-hover:text-amber-700 transition-colors">
                    {ex.title}
                  </p>
                  <p className="text-sm text-slate-600 line-clamp-2">{ex.prompt}</p>
                </div>
                <svg className="w-5 h-5 text-amber-600 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-50 border-2 border-red-200 rounded-xl flex items-start gap-3 animate-shake">
          <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="font-semibold text-red-800">Processing Error</p>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ===== Loading Screen =====
function LoadingScreen({ imageCount }) {
  return (
    <div className="relative z-10 min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-md animate-fade-in">
        {/* Spinner */}
        <div className="relative inline-flex items-center justify-center mb-8">
          <div className="absolute inset-0 bg-gradient-to-r from-amber-200/20 to-orange-200/20 rounded-full blur-2xl animate-pulse-slow"></div>
          <div className="relative bg-white rounded-full w-32 h-32 shadow-2xl flex items-center justify-center border border-amber-100/50">
            <svg className="w-16 h-16 text-amber-600 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
        </div>

        {/* Text */}
        <h2 className="text-3xl font-bold text-slate-800 mb-3">
          Processing {imageCount} page{imageCount !== 1 ? 's' : ''}...
        </h2>
        <p className="text-lg text-slate-600 mb-2">Using Chrome's on-device AI</p>
        
        {/* Privacy Badge */}
        <div className="inline-flex items-center px-4 py-2 rounded-full bg-green-50 border border-green-200 text-green-800 text-sm font-medium mt-4">
          <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"/>
          </svg>
          Your data never leaves your browser
        </div>

        {/* Loading Dots */}
        <div className="flex items-center justify-center gap-2 mt-8">
          <div className="w-3 h-3 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
          <div className="w-3 h-3 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          <div className="w-3 h-3 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
        </div>
      </div>
    </div>
  );
}

// ===== Results Page =====
function ResultsPage({ jsonOutput, onReset }) {
  const [copied, setCopied] = useState(false);
  
  const copyToClipboard = () => {
    navigator.clipboard.writeText(JSON.stringify(jsonOutput, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  const downloadJSON = () => {
    const blob = new Blob([JSON.stringify(jsonOutput, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `extracted-data-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="relative z-10 min-h-screen px-4 sm:px-6 lg:px-8 py-12">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-green-100 to-emerald-100 rounded-2xl mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-4xl font-bold text-slate-800 mb-2">
            Extraction Complete!
          </h2>
          <p className="text-lg text-slate-600">Your structured data is ready</p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-4 mb-8 animate-fade-in-up">
          <button
            onClick={copyToClipboard}
            className="px-6 py-3 rounded-xl bg-white border-2 border-slate-200 hover:border-amber-300 hover:bg-amber-50 text-slate-700 font-semibold transition-all duration-200 hover:shadow-lg flex items-center gap-2"
          >
            {copied ? (
              <>
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                Copied!
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy JSON
              </>
            )}
          </button>

          <button
            onClick={downloadJSON}
            className="px-6 py-3 rounded-xl bg-white border-2 border-slate-200 hover:border-amber-300 hover:bg-amber-50 text-slate-700 font-semibold transition-all duration-200 hover:shadow-lg flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download
          </button>

          <button
            onClick={onReset}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold hover:shadow-lg hover:scale-105 transition-all duration-200 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Convert Another
          </button>
        </div>

        {/* JSON Viewer */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/50 overflow-hidden animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex gap-2">
                <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                <div className="w-3 h-3 bg-green-400 rounded-full"></div>
              </div>
              <span className="text-slate-300 text-sm font-mono">extracted-data.json</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="px-3 py-1 rounded-lg bg-slate-700 text-slate-300 text-xs font-medium">
                JSON
              </div>
            </div>
          </div>
          <div className="p-6 bg-slate-900 overflow-x-auto max-h-[600px] overflow-y-auto">
            <pre className="text-sm font-mono text-slate-100 leading-relaxed">
              {JSON.stringify(jsonOutput, null, 2)}
            </pre>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-white/50 text-center">
            <div className="text-2xl font-bold text-amber-600 mb-1">
              {JSON.stringify(jsonOutput).length}
            </div>
            <div className="text-sm text-slate-600">Characters</div>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-white/50 text-center">
            <div className="text-2xl font-bold text-orange-600 mb-1">
              {Object.keys(jsonOutput || {}).length}
            </div>
            <div className="text-sm text-slate-600">Top-level Fields</div>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-white/50 text-center">
            <div className="text-2xl font-bold text-green-600 mb-1">100%</div>
            <div className="text-sm text-slate-600">On-Device</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;