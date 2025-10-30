# PDF-to-JSON Converter

A privacy-first web application that converts PDFs and images to structured JSON data using Chrome's built-in AI, with all processing happening directly in your browser - no server communication, no data sharing, complete privacy protection.

## 🚀 Demo

**[Live Demo](https://your-app-url.com)** (Deploy your app here)

## ✨ Features

- **On-device AI Processing**: All data extraction happens locally in your browser using Chrome's built-in AI
- **Privacy Focused**: Your documents never leave your device - no data is sent to any server
- **Custom Schema Extraction**: Define your JSON structure using natural language prompts
- **Multi-format Support**: Process PDFs, PNG, JPG, and other image formats
- **Schema Templates**: Quick-start templates for common document types (invoices, receipts, study materials)
- **Real-time Preview**: See document previews before processing
- **JSON Output**: Clean, structured JSON output for easy integration with other applications

## 🎯 Why This Project?

### The Problem
Data extraction from documents like PDFs, invoices, and bills is typically expensive and requires sharing sensitive data with third-party services. Many users face privacy concerns and costs associated with these services.

### The Solution
This web application solves these issues by:
- Using Chrome's built-in AI for completely on-device processing
- Ensuring zero data leakage - your documents never leave your computer
- Making data extraction affordable and accessible to everyone
- Providing customizable extraction based on natural language instructions

## 🛠️ Tech Stack

- **Frontend**: React.js
- **Styling**: CSS with Tailwind-inspired classes
- **AI Processing**: Chrome's LanguageModel API
- **Build Tool**: Vite.js
- **Browser**: Requires Chrome 127+ with AI features enabled

## 🚀 Quick Start

### Prerequisites
- Chrome browser version 127 or higher
- Chrome AI features enabled (chrome://flags/#optimization-guide-on-device-model)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd pdf-to-json
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:5173`

### Production Build
```bash
npm run build
```

## 📖 Usage

1. Upload your PDF or image files
2. Describe what data you want to extract in natural language
3. Review document previews if needed
4. Click "Process Files" to extract structured JSON
5. Copy, download, or integrate the extracted data into your applications

### Example Use Cases
- **Invoice Processing**: Extract invoice numbers, dates, vendor info, line items, and totals
- **Receipt Analysis**: Extract store names, dates, items, and total amounts
- **Study Material**: Convert textbook pages to structured content for note-taking apps
- **Document Archiving**: Convert paper documents to JSON for database storage

### Natural Language Schema Examples
- "Extract invoice number, date, vendor name, items with prices, subtotal, tax, and total"
- "Get all line items with product names, quantities, unit prices, and totals"
- "Extract student names, grades, and subjects from a report card"

## 🔧 Architecture

- `src/App.jsx`: Main application component
- `src/utils/chromeAI.js`: Chrome AI API integration and session management
- `src/utils/aiAvailability.js`: AI availability checking with retry logic
- `src/utils/pdfProcessor.js`: File processing and image conversion
- `src/components/`: UI components for different application views

## 🛡️ Privacy & Security

- All document processing occurs locally in your browser
- No data is transmitted to any external servers
- Chrome's LanguageModel API runs completely on-device
- Temporary image previews are cleared after processing

## 🔍 Browser Compatibility

- **Primary Support**: Chrome 127+ with AI features enabled
- **AI API**: LanguageModel API (Experimental)
- **Features**: Requires Chrome flags to be enabled: `#optimization-guide-on-device-model`

## 🤝 Contributing

Contributions are welcome! Here are some areas where you can help:

1. **UI/UX Improvements**: Enhance the interface and user experience
2. **Schema Validation**: Add JSON schema validation and error correction
3. **Additional Formats**: Support more document types
4. **Accessibility**: Improve accessibility features
5. **Documentation**: Enhance documentation and examples

### Development Guidelines
- Follow existing code structure and conventions
- Maintain privacy-first approach in all changes
- Ensure all processing remains on-device
- Write clear, comprehensive commit messages

## 🐛 Known Issues

- AI API availability varies by Chrome version and configuration
- Large documents may require session resets
- Processing time depends on document complexity and device performance

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Chrome team for the experimental LanguageModel API
- React community for the development framework
- Vite.js for the build tooling

## 📞 Support

For support, please open an issue in the GitHub repository.

---

**Privacy-focused data extraction at your fingertips!**