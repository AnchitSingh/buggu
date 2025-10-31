// src/utils/chromeAI.js
import { sanitizeJSON as utilsSanitizeJSON, repairJSON } from './jsonUtils';

let session = null;
let modelParams = null;

function getLanguageModel() {
    if (globalThis.LanguageModel) return globalThis.LanguageModel;
    if (typeof chrome !== 'undefined' && chrome?.aiOriginTrial?.languageModel) {
        return chrome.aiOriginTrial.languageModel;
    }
    return null;
}

async function checkAvailability() {
    try {
        const LM = getLanguageModel();
        if (!LM) {
            console.warn('LanguageModel API not found');
            return { available: false, status: 'no-api', detail: null };
        }

        // Check if the API is accessible before calling availability
        if (typeof LM.availability !== 'function') {
            console.error('LanguageModel.availability is not a function');
            return {
                available: false,
                status: 'error',
                detail: null,
                error: 'LanguageModel.availability is not a function'
            };
        }

        // Call availability with timeout to prevent hanging
        const availabilityPromise = LM.availability();
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Availability check timeout')), 5000)
        );
        
        const availability = await Promise.race([availabilityPromise, timeoutPromise]);
        
        console.log('AI availability status:', availability);
        
        return {
            available: availability !== 'unavailable',
            status: availability,
            detail: null
        };
    } catch (error) {
        console.error('Availability check error:', error);
        return {
            available: false,
            status: 'error',
            detail: null,
            error: error?.message || 'Availability check failed'
        };
    }
}

async function createSessionIfNeeded() {
   if (session) return session;

    const LM = getLanguageModel();
    if (!LM) throw new Error('Prompt API not available');

    const availability = await LM.availability();
    if (availability === 'unavailable') {
        throw new Error('Model unavailable on this device/configuration');
    }

    if (!modelParams) {
        modelParams = await LM.params();
    }
  
    try {
        session = await LM.create({
            initialPrompts: [
                {
                    role: 'system',
                    content:
                        `You are a precision data extraction assistant. Your job is to:
                        1. Analyze document images (invoices, receipts, forms, tables, etc.)
                        2. Extract structured information exactly as it appears
                        3. Return ONLY valid JSON - no markdown, no explanations, no code fences
                        4. Preserve numerical accuracy, dates, and formatting
                        5. For tables: maintain row/column structure in JSON arrays
                        6. If information is unclear, use null values`,
                },
            ],
            // Specify both text and image support
            expectedInputs: [
                { type: "text", languages: ["en"] },
                { type: "image" }
            ],
            expectedOutputs: [
                { type: "text", languages: ["en"] }  // Explicitly specify output language
            ],
            monitor(m) {
                m.addEventListener('downloadprogress', (e) => {
                    console.log(`Model download: ${Math.round(e.loaded * 100)}%`);
                });
            }
        });
        
        console.log('✅ Chrome AI session created successfully');
        return session;
        
    } catch (error) {
        console.error('Failed to create AI session:', error);
        throw new Error(`Session creation failed: ${error.message}`);
    }
}

/**
 * NON-STREAMING version using prompt() with message array
 */
export async function extractJSONFromImages({ imageBlobs, schemaPrompt }) {
    const s = await createSessionIfNeeded();
    
    if (!imageBlobs || imageBlobs.length === 0) {
        throw new Error('No images provided for extraction');
    }
    
    console.log(`🔄 Processing ${imageBlobs.length} image(s)...`);
    
    const userMessage = {
        role: 'user',
        content: [
            {
                type: 'text',
                value: `Extract structured data from the provided document image(s).

USER REQUEST:
"${schemaPrompt}"

EXTRACTION RULES:
- Analyze ALL visual elements: text, numbers, tables, forms, layouts, handwriting
- Extract data matching the user's request precisely
- For multiple images: combine data logically (e.g., multi-page documents)
- Return ONLY valid JSON (no markdown fences, no comments)
- Use null for missing/unclear fields
- Preserve exact values (numbers, dates, currency symbols)
- For tables: use arrays of objects with consistent keys

JSON OUTPUT:`
            },
            ...imageBlobs.map(blob => ({
                type: 'image',
                value: blob
            }))
        ]
    };
    
    try {
        // prompt() accepts array of messages with multimodal content
        const rawResult = await s.prompt([userMessage]);
        console.log('Raw AI response:', rawResult);
        
        // Layered approach to handle JSON parsing
        let parsedData;
        
        try {
            // First attempt: Direct parsing of sanitized JSON
            const jsonString = utilsSanitizeJSON(rawResult);
            parsedData = JSON.parse(jsonString);
        } catch (parseError) {
            console.warn('First JSON parsing attempt failed:', parseError.message);
            
            try {
                // Second attempt: Try to repair the JSON
                const jsonString = utilsSanitizeJSON(rawResult);
                parsedData = repairJSON(jsonString);
            } catch (repairError) {
                console.warn('JSON repair attempt failed:', repairError.message);
                
                // Third attempt: If repair fails, try a manual repair prompt to the AI
                console.log('Attempting AI-based JSON repair...');
                
                const repairPrompt = `The following output was not valid JSON. Please fix it and return valid JSON only:

Original output:
${rawResult}

Return corrected JSON only, with no additional text or formatting:`;

                const repairedResult = await s.prompt([{ 
                    role: 'user', 
                    content: repairPrompt 
                }]);
                
                // Try to parse the repaired result
                const repairedJsonString = utilsSanitizeJSON(repairedResult);
                parsedData = JSON.parse(repairedJsonString);
                
                console.log('✅ JSON repair successful');
            }
        }
        
        console.log('✅ Extraction successful');
        
        // Reset the session after successful extraction to prevent stale session issues
        await resetSession();
        
        return parsedData;
        
    } catch (error) {
        console.error('Extraction error:', error);
        
        if (error instanceof SyntaxError) {
            // If all JSON repair attempts fail, reset session and throw a user-friendly error
            await resetSession();
            throw new Error(`AI returned invalid JSON that couldn't be repaired. Try simplifying your schema request.`);
        }
        
        if (error.name === 'NotSupportedError') {
            await resetSession();
            throw new Error('Multimodal image input not supported. Ensure Chrome Canary 128+ with image support enabled.');
        }
        
        if (error.name === 'QuotaExceededError') {
            await resetSession();
            throw new Error(`Image(s) too large for model. Try reducing image count or resolution.`);
        }
        
        // Reset the session in case of error to ensure a fresh session next time
        await resetSession();
        
        throw error;
    }
}


/**
 * Clean up AI-generated JSON string
 */
function sanitizeJSON(rawText) {
    if (!rawText) {
        throw new Error('Empty response from AI model');
    }
    
    let cleaned = rawText;
    
    // Remove markdown code fences
    cleaned = cleaned.replace(/```json\s*/gi, '');
    cleaned = cleaned.replace(/```\s*/g, '');
    
    // Remove common prefixes
    cleaned = cleaned.replace(/^(Here's the JSON|Here is the JSON|JSON output|Output):\s*/gi, '');
    
    // Trim whitespace
    cleaned = cleaned.trim();
    
    // Find first { or [ and last } or ]
    const firstBrace = cleaned.indexOf('{');
    const firstBracket = cleaned.indexOf('[');
    
    let startIndex = -1;
    if (firstBrace !== -1 && firstBracket !== -1) {
        startIndex = Math.min(firstBrace, firstBracket);
    } else if (firstBrace !== -1) {
        startIndex = firstBrace;
    } else if (firstBracket !== -1) {
        startIndex = firstBracket;
    }
    
    const lastBrace = cleaned.lastIndexOf('}');
    const lastBracket = cleaned.lastIndexOf(']');
    const endIndex = Math.max(lastBrace, lastBracket);
    
    if (startIndex !== -1 && endIndex > startIndex) {
        cleaned = cleaned.substring(startIndex, endIndex + 1);
    }
    
    // Final validation
    if (!cleaned.startsWith('{') && !cleaned.startsWith('[')) {
        throw new Error('AI response does not contain valid JSON');
    }
    
    return cleaned;
}

export function getSessionUsage() {
    if (!session) return null;
    
    return {
        inputUsage: session.inputUsage,
        inputQuota: session.inputQuota,
        percentUsed: Math.round((session.inputUsage / session.inputQuota) * 100)
    };
}


export async function getModelParams() {
    const LanguageModel = getLanguageModel();
    if (!LanguageModel) return null;
    
    try {
        return await LanguageModel.params();
    } catch (error) {
        console.error('Failed to get model params:', error);
        return null;
    }
}


// Session management
export async function resetSession() {
    if (session) {
        session.destroy();
        session = null;
    }
}

export async function cloneSession() {
    if (!session) throw new Error('No active session to clone');
    return await session.clone();
}

// Public API
export async function available() {
    return await checkAvailability();
}

// Additional utilities
export async function getModelInfo() {
    const LM = getLanguageModel();
    if (!LM) return null;

    try {
        const params = await LM.params();
        return {
            defaultTemperature: params.defaultTemperature,
            maxTemperature: params.maxTemperature,
            defaultTopK: params.defaultTopK,
            maxTopK: params.maxTopK
        };
    } catch {
        return null;
    }
}

export default {
    checkAvailability,
    extractJSONFromImages,
    getSessionUsage,
    resetSession,
    getModelParams,
    available,
};