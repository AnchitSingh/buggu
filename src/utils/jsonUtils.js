/**
 * Clean up AI-generated JSON string
 */
export function sanitizeJSON(rawText) {
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

/**
 * Attempt to repair malformed JSON by fixing common issues
 */
export function repairJSON(jsonString) {
    try {
        // Try parsing as-is first
        return JSON.parse(jsonString);
    } catch (parseError) {
        // Common fixes for malformed JSON
        let fixed = jsonString;
        
        // Fix trailing commas before closing brackets/braces
        fixed = fixed.replace(/,(\s*[}\]])/g, '$1');
        
        // Fix single quotes to double quotes (be careful not to break strings containing quotes)
        // This is complex, so we'll try a simpler approach for basic cases
        try {
            // Try parsing again after basic fixes
            return JSON.parse(fixed);
        } catch {
            // If still failing, try more aggressive fixes
            // This is a more basic approach - in a full implementation you'd want a more robust JSON repair library
            throw new Error('Unable to repair JSON automatically');
        }
    }
}