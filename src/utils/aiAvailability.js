// src/utils/aiAvailability.js
import chromeAI from './chromeAI';

export async function getAIStatus() {
  try {
    const result = await chromeAI.available();
    
    console.log('AI availability result:', result);
    
    // Map official availability status to user-friendly states
    switch (result.status) {
      case 'readily':
      case 'available':
        return { state: 'ready', detail: result.detail };
      case 'after-download':
      case 'downloadable':
        return { state: 'downloadable', detail: result.detail };
      case 'downloading':
        return { state: 'downloading', detail: result.detail };
      case 'unavailable':
        return { state: 'unavailable', detail: result.detail };
      case 'no-api':
        return { state: 'unsupported', detail: 'Prompt API not available in this browser' };
      case 'error':
        return { state: 'error', error: result.error, detail: result.detail };
      default:
        console.warn('Unknown AI status:', result.status);
        return { state: 'unknown', detail: result };
    }
  } catch (error) {
    console.error('AI status check failed:', error);
    return { 
      state: 'error', 
      error: error?.message || 'AI status check failed',
      detail: null 
    };
  }
}

// Helper to trigger download behind user activation
export async function initializeAI() {
  const status = await getAIStatus();
  if (status.state === 'downloadable') {
    try {
      // This should be called behind a click/keypress
      await chromeAI.available(); // This triggers the session creation flow
      return { success: true, message: 'AI model download started' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  return { success: true, message: `AI is ${status.state}` };
}
