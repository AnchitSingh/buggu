# Buggu - Your Privacy-First Document Extractor

> Ask Buggu to turn your PDFs and images into structured JSON. Zero server uploads, zero API costs, 100% on-device processing.

![Prompt API](https://img.shields.io/badge/Chrome-Prompt%20API-4285F4?style=flat&logo=google-chrome&logoColor=white)
![Privacy First](https://img.shields.io/badge/Privacy-100%25%20On--Device-green)


[Live Demo](https://youtu.be/UYL1tCx-APg)

---

## Meet Buggu

**Buggu is your personal document extraction assistant that lives entirely in your browser.**

Have an invoice? **Ask Buggu.**  
Got a receipt? **Ask Buggu.**  
Need data from a form? **Ask Buggu.**

The best part? Buggu never sends your documents anywhere. Everything happens on your device using Chrome's Built-in AI.

---

## The Problem Buggu Solves

### The Privacy Paradox of Document Extraction

Every day, millions of people need to extract data from documents:
- **Small businesses** processing invoices and receipts
- **Healthcare workers** digitizing patient forms
- **Students** organizing study materials
- **Freelancers** tracking expenses

**But here's the problem:**

Current solutions require **uploading sensitive documents to cloud servers**:
- ❌ Privacy risks (invoices contain financial data, forms contain PII)
- ❌ API costs (per-document charges add up)
- ❌ Internet dependency (offline = unusable)
- ❌ Vendor lock-in (different APIs for OCR vs. extraction)

**What if you could just ask someone you trust?**

---

## How Buggu Works

Buggu leverages **Chrome's Built-in AI (Gemini Nano)** to extract structured JSON from documents **without ever leaving your browser**.

### What Makes Buggu Special

✅ **100% Private**  
Buggu processes everything on your device. Your invoices, receipts, and forms never touch a server.

✅ **Natural Language**  
Just tell Buggu what you want in plain English:  
*"Hey Buggu, extract the invoice number, date, and line items"*

✅ **Handles PDFs Like a Pro**  
Upload multi-page PDFs (up to 3 pages). Buggu converts them to images and "sees" the layout just like you do.

✅ **Shows Its Work**  
Preview your documents before extraction. Watch Buggu process them in real-time.

✅ **Zero Cost**  
No subscriptions, no API keys, no credit cards. Buggu is completely free.

✅ **Works Offline**  
Once Chrome's AI model is downloaded, Buggu works without internet.

---

## Architecture

### The Buggu Stack

```
Frontend:  React 18 + Vite
Brain:     Chrome Prompt API (Gemini Nano) with Multimodal Input
PDF Eyes:  PDF.js (Canvas rendering at 2x quality)
Style:     CSS3 with modern gradients
```

### How Buggu Thinks

```
┌─────────────────────────────────────────────────────────────────┐
│                     Buggu's Interface                          │
│  User Flow: Upload → Tell Buggu what you want → Get JSON        │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                  📄 Document Processing                          │
│                                                                  │
│  PDF → PDF.js renders to Canvas → High-res PNG blobs           │
│  Images → Direct blob processing                                │
│                                                                  │
│  Why images? Buggu needs to "see" tables, forms, layouts        │
└──────────────────────────────────┬──────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                  🧠 Buggu's Brain (Chrome AI)                    │
│                                                                  │
│  System Prompt: "You're Buggu, a data extraction assistant"     │
│  User Message: [What user wants + Document images]              │
│  Gemini Nano: Analyzes images & extracts structured data        │
│  Output: Raw JSON text                                           │
└──────────────────────────────┬───────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                  ✨ JSON Cleanup & Delivery                      │
│                                                                  │
│  -  Remove markdown artifacts                                     │
│  -  Parse & validate JSON                                         │
│  -  Show results with copy/download options                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## Getting Started

### Prerequisites

**What You Need:**
- **Chrome Canary 127+** or **Chrome Dev 127+**

**Wake Up Buggu (Enable Chrome AI):**

1. Go to `chrome://flags/#prompt-api-for-gemini-nano`
2. Set to **"Enabled"**
3. Go to `chrome://flags/#optimization-guide-on-device-model`
4. Set to **"Enabled BypassPerfRequirement"**
5. Restart Chrome
6. Visit `chrome://components/` and click "Check for update" on "Optimization Guide On Device Model"
7. Wait for download (this is Buggu's brain!)

### Installation

```
# Get Buggu
git clone https://github.com/AnchitSingh/buggu.git
cd buggu

# Install dependencies
npm install

# Start Buggu
npm run dev
```

Visit `http://localhost:5173` and meet Buggu!

### Deploy Buggu

```
npm run build
npm run preview
```

---

## Using Buggu

### Step 1: Show Buggu Your Documents
- Click **"Convert to JSON"**
- Upload images (JPG, PNG, WebP) or PDFs
- Buggu shows you previews (max 3 pages)

### Step 2: Tell Buggu What You Want
Use natural language - just like talking to a friend!

**Buggu's Favorite Requests:**

**For Invoices:**
```
Hey Buggu, extract the invoice number, date, vendor name, 
vendor address, line items with descriptions and prices, 
subtotal, tax, and total amount
```

**For Receipts:**
```
Buggu, get me the store name, date, time, all items with 
quantities and prices, subtotal, tax, and total
```

**For Forms:**
```
Buggu, extract all the form fields and their values
```

**For Study Materials:**
```
Buggu, organize this into sections with headings and 
key points as bullet points
```

### Step 3: Watch Buggu Work
- Click **Process Files**
- No internet needed (check your network tab!)

### Step 4: Get Your Data
- Copy JSON to clipboard
- Download as `.json` file
- Use in spreadsheets, databases, or apps

---


## Chrome AI Challenge 2025

### What Buggu Uses

✅ **Prompt API** - Buggu's reasoning engine  
✅ **Multimodal Input** - Buggu's ability to "see" documents

### The Problem Buggu Solves

**Privacy-first document extraction for sensitive data.**

Traditional services force you to upload invoices, medical records, tax forms, and personal documents to strangers' servers. 

**Buggu changes that.**

With Buggu, your documents stay on your device. This means:

- ✅ Healthcare workers can process HIPAA-regulated documents safely
- ✅ Small businesses keep financial data private
- ✅ Students organize notes without data collection
- ✅ Freelancers track expenses without third-party exposure

### Who Can Use Buggu?

**Everyone with Chrome!**

- **Regional:** Works worldwide (no geo-restrictions)
- **Audience:** Small businesses, students, healthcare, freelancers, privacy-conscious users
- **Languages:** English (more coming soon via `outputLanguages`)

---

## Technical Deep Dive

### How Buggu Understands Documents

Buggu uses Chrome's multimodal Prompt API to "see" documents:

```
const bugguMessage = {
  role: 'user',
  content: [
    {
      type: 'text',
      value: 'Extract invoice data: invoice_number, date, items...'
    },
    {
      type: 'image',
      value: invoicePageBlob
    }
  ]
};

const result = await bugguSession.prompt([bugguMessage]);
```

### Why Buggu Uses Images (Not Text)

PDFs have **visual structure** that plain text loses:
- Table rows and columns
- Form field positions
- Handwritten notes
- Logos and stamps

Buggu renders PDFs to 2x high-res images so Gemini Nano can "see" this structure:

```
const viewport = page.getViewport({ scale: 2.0 });
await page.render({ canvasContext, viewport }).promise;
const blob = await canvas.toBlob('image/png', 0.95);
```

---

## Buggu's Privacy Promise

### What Buggu NEVER Does

❌ Upload your documents  
❌ Store your data  
❌ Track your extractions  
❌ Send telemetry  
❌ Call external APIs  

### What Buggu Always Does

✅ Process locally  
✅ Use Chrome's on-device AI  
✅ Clear memory after extraction  
✅ Give YOU full control  

**Trust, but verify:** Open DevTools → Network tab while using Buggu. You'll see **zero outbound requests** during processing.

---

## License

MIT License - see [LICENSE](LICENSE) file

---

<p align="center">
  <strong>Buggu - Your Privacy-First Document Extractor</strong>
</p>

<p align="center">
  Built with ❤️ for the <strong>Chrome Built-in AI Challenge 2025</strong>
</p>

<p align="center">
  <i>"Ask Buggu. Keep it private."</i>
</p>
