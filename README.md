<div align="center">

# 🧠 Code-into-Clear

### Legacy Code Onboarder

**Instantly transform legacy code into clear documentation, architecture diagrams, and junior developer guides using Google Gemini AI.**

[![React](https://img.shields.io/badge/React-19.x-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.x-646CFF?logo=vite)](https://vitejs.dev/)
[![Gemini](https://img.shields.io/badge/Google%20Gemini-AI-4285F4?logo=google)](https://ai.google.dev/)

</div>

---

## ✨ Features

### 📝 Multi-Input Support
- **Paste Code** - Directly paste your code into the editor
- **Upload Files** - Upload source code files from your computer
- **GitHub Integration** - Fetch code directly from public GitHub repositories, gists, or specific files

### 🤖 AI-Powered Analysis
Powered by **Google Gemini 2.5 Flash**, the app generates a complete "Developer Onboarding Kit":

| Output | Description |
|--------|-------------|
| **📖 Plain English Summary** | High-level explanation of what the code does, broken down into understandable sections |
| **📊 Visual Architecture Diagram** | Auto-generated Mermaid.js diagrams (flowcharts, class diagrams, or sequence diagrams) based on code structure |
| **👨‍💻 Junior Dev Guide** | Rewritten functions with detailed docstrings, plus "gotchas" and potential bugs highlighted |

### 💬 Interactive AI Chat
- **Context-Aware Chat** - Ask follow-up questions about the analyzed code
- **Voice Input** - Use speech-to-text for hands-free queries (Chrome/Edge)
- **Voice Output** - AI responses can be read aloud with text-to-speech
- **Streaming Responses** - Real-time streaming of AI responses

### 📥 Export Options
- **PDF Download** - Export the complete analysis as a formatted PDF document

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v18 or higher recommended)
- **Google Gemini API Key** - Get one from [Google AI Studio](https://aistudio.google.com/app/apikey)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/Code-into-Clear.git
   cd Code-into-Clear
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure API Key**
   
   Create a `.env.local` file in the root directory:
   ```env
   API_KEY=your_gemini_api_key_here
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open in browser**
   
   Navigate to `http://localhost:3000`

---

## 📁 Project Structure

```
Code-into-Clear/
├── App.tsx                    # Main application component
├── index.tsx                  # React entry point
├── index.html                 # HTML template
├── types.ts                   # TypeScript type definitions
├── vite.config.ts             # Vite configuration
├── components/
│   ├── AnalysisView.tsx       # Results display with tabs & chat
│   └── MermaidRenderer.tsx    # Mermaid diagram rendering
└── services/
    ├── geminiService.ts       # Google Gemini API integration
    └── githubService.ts       # GitHub repository fetching
```

---

## 🛠️ Tech Stack

| Technology | Purpose |
|------------|---------|
| **React 19** | UI Framework |
| **TypeScript** | Type Safety |
| **Vite** | Build Tool & Dev Server |
| **Google Gemini API** | AI Code Analysis |
| **Mermaid.js** | Diagram Generation |
| **React Markdown** | Markdown Rendering |
| **Lucide React** | Icons |
| **Web Speech API** | Voice Input/Output |

---

## 🎯 Usage

### Option 1: Paste Code
1. Select the "Paste Code" tab
2. Paste your code into the text area
3. Click "Analyze Code"

### Option 2: Upload File
1. Select the "Upload File" tab
2. Click to upload or drag & drop a source file
3. Click "Analyze Code"

### Option 3: GitHub Repository
1. Select the "GitHub" tab
2. Enter a GitHub URL:
   - Repository: `https://github.com/owner/repo`
   - Specific file: `https://github.com/owner/repo/blob/main/file.js`
   - Gist: `https://gist.github.com/user/gist-id`
3. Click "Fetch Code", then "Analyze Code"

### Viewing Results
- **Summary Tab** - Read the plain English explanation
- **Diagram Tab** - View the auto-generated architecture diagram
- **Guide Tab** - Access the junior developer documentation
- **Chat Button** - Open the AI assistant for follow-up questions

---

## ⚙️ Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `API_KEY` | Google Gemini API Key | ✅ Yes |

### GitHub Rate Limits
- Public repositories are fetched via GitHub API
- Rate limits may apply for unauthenticated requests
- For large repositories, only the first 20 code files are analyzed

---

## 📜 Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |

---

## 🤝 Contributing

Contributions are welcome! Feel free to:
- Report bugs
- Suggest new features
- Submit pull requests

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

<div align="center">

**Made with ❤️ for developers who inherit legacy code**

</div>
