
import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { AnalysisResult } from '../types';
import MermaidRenderer from './MermaidRenderer';
import { createChatSession } from '../services/geminiService';
import { 
    BookOpen, GitGraph, FileCode, CheckCircle2, Download, ArrowLeft, 
    AlertTriangle, Terminal, Loader2, Sparkles, MessageSquare, X, Send, Bot, Mic, MicOff, Volume2, VolumeX,
    Cpu, ScanEye
} from 'lucide-react';
import { Chat, GenerateContentResponse } from "@google/genai";

interface AnalysisViewProps {
  result: AnalysisResult;
  code: string;
  onReset: () => void;
}

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

const AnalysisView: React.FC<AnalysisViewProps> = ({ result, code, onReset }) => {
  const [activeTab, setActiveTab] = useState<'summary' | 'diagram' | 'guide'>('summary');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  
  // Chat State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([{ role: 'model', text: "Systems online. Analytical core active. Query me regarding the codebase structure or logic." }]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [chatSession, setChatSession] = useState<Chat | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Voice State
  const [isListening, setIsListening] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Initialize Chat Session
  useEffect(() => {
    if (code) {
        try {
            const session = createChatSession(code);
            setChatSession(session);
        } catch (e) {
            console.error("Failed to init chat", e);
        }
    }
  }, [code]);

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRecognition) {
            const recognition = new SpeechRecognition();
            recognition.continuous = false;
            recognition.interimResults = false;
            recognition.lang = 'en-US';

            recognition.onstart = () => setIsListening(true);
            recognition.onend = () => setIsListening(false);
            recognition.onresult = (event: any) => {
                const transcript = event.results[0][0].transcript;
                setChatInput(prev => prev ? `${prev} ${transcript}` : transcript);
            };
            recognitionRef.current = recognition;
        }
    }
  }, []);

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isChatOpen]);

  const toggleMic = () => {
    if (!recognitionRef.current) {
        alert("Voice input is not supported in this browser. Please use Chrome or Edge.");
        return;
    }
    if (isListening) {
        recognitionRef.current.stop();
    } else {
        recognitionRef.current.start();
    }
  };

  const speakText = (text: string) => {
    if (!voiceEnabled || !window.speechSynthesis) return;
    
    // Cancel any current speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    // Try to find a "robotic" or deeper voice if available
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => v.name.includes('Google US English') || v.name.includes('Microsoft David'));
    if (preferredVoice) utterance.voice = preferredVoice;
    
    utterance.pitch = 0.9; // Slightly lower pitch for "AI" feel
    utterance.rate = 1.1;  // Slightly faster
    
    window.speechSynthesis.speak(utterance);
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || !chatSession) return;
    
    const userMsg = chatInput;
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsChatLoading(true);

    try {
        const result = await chatSession.sendMessageStream({ message: userMsg });
        
        let fullResponse = "";
        setChatMessages(prev => [...prev, { role: 'model', text: "" }]); // Add placeholder

        for await (const chunk of result) {
            const c = chunk as GenerateContentResponse;
            const text = c.text;
            if (text) {
                fullResponse += text;
                setChatMessages(prev => {
                    const newArr = [...prev];
                    newArr[newArr.length - 1].text = fullResponse;
                    return newArr;
                });
            }
        }
        
        // Speak the full response once stream is done
        if (voiceEnabled) {
            speakText(fullResponse);
        }

    } catch (error) {
        console.error("Chat error", error);
        setChatMessages(prev => [...prev, { role: 'model', text: "Error in analytical sub-routine. Please retry query." }]);
    } finally {
        setIsChatLoading(false);
    }
  };

  const handlePdfDownload = async () => {
    setIsGeneratingPdf(true);
    
    const html2pdf = (window as any).html2pdf;

    if (!html2pdf) {
        alert("PDF generation library is still loading. Please check your internet connection.");
        setIsGeneratingPdf(false);
        return;
    }

    // Scroll to top to prevent scroll offset issues
    window.scrollTo(0, 0);

    // Wait a bit for the print container to render (it becomes visible when isGeneratingPdf is true)
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Wait for Mermaid SVG to be present in the print container
    await new Promise<void>((resolve) => {
      let attempts = 0;
      const checkMermaid = () => {
        const mermaidSvg = document.querySelector('#print-container .mermaid svg');
        attempts++;
        if (mermaidSvg || attempts > 50) {
          setTimeout(resolve, 1000); // Extra time for full render
        } else {
          setTimeout(checkMermaid, 100);
        }
      };
      checkMermaid();
    });

    const element = document.getElementById('print-container');
    if (!element) {
        console.error("Print container not found");
        setIsGeneratingPdf(false);
        return;
    }

    // Fix SVG dimensions directly in the print container
    const svgs = element.querySelectorAll('svg');
    const originalStyles: { svg: SVGSVGElement; width: string | null; height: string | null; style: string }[] = [];
    
    svgs.forEach(svg => {
      // Save original attributes to restore later
      originalStyles.push({
        svg: svg,
        width: svg.getAttribute('width'),
        height: svg.getAttribute('height'),
        style: svg.getAttribute('style') || ''
      });
      
      // Remove hardcoded width and height attributes
      svg.removeAttribute('width');
      svg.removeAttribute('height');
      
      // Set CSS for responsive scaling - fit within page width
      svg.style.width = '100%';
      svg.style.height = 'auto';
      svg.style.maxWidth = '180mm';
      svg.style.display = 'block';
      svg.style.margin = '0 auto';
    });

    const opt = {
      margin: [8, 8, 8, 8], 
      filename: 'Developer_Onboarding_Kit.pdf',
      image: { type: 'jpeg', quality: 0.95 },
      html2canvas: { 
        scale: 2, 
        useCORS: true, 
        logging: false, 
        letterRendering: true,
        allowTaint: true,
        scrollX: 0,
        scrollY: 0,
        x: 0,
        y: 0,
        windowWidth: 794 // A4 width in pixels at 96dpi
      }, 
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { 
        mode: ['css', 'legacy'], 
        avoid: ['pre', 'blockquote', 'h3', '.avoid-break', 'tr'] 
      }
    };

    try {
        await html2pdf().set(opt).from(element).save();
    } catch (err: any) {
        console.error("PDF Gen Error:", err);
        alert("Failed to generate PDF. Please try again.");
    } finally {
        // Restore original SVG attributes
        originalStyles.forEach(({ svg, width, height, style }) => {
          if (width) svg.setAttribute('width', width);
          if (height) svg.setAttribute('height', height);
          svg.setAttribute('style', style);
        });
        setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8 animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
      
      {/* 
        -------------------------------------------
        PDF GENERATION OVERLAY & CONTAINER
        -------------------------------------------
      */}
      {isGeneratingPdf && (
        <div 
            className="fixed inset-0 bg-slate-900/95 z-[9999] flex flex-col justify-center items-center text-white cursor-wait"
        >
             <div className="relative mb-4">
                <Loader2 className="w-12 h-12 animate-spin text-brand-400" />
                <div className="absolute inset-0 animate-ping opacity-30 bg-brand-400 rounded-full"></div>
             </div>
             <span className="font-bold text-xl tracking-tight">Generating PDF Report...</span>
             <p className="text-slate-400 text-sm mt-2">Please wait while we format your document.</p>
        </div>
      )}

      {/* 
         Print Container:
         - Positioned FIXED at 0,0 but with z-index 50 (below overlay, above app).
         - This ensures it is "visible" for html2canvas to capture correctly.
         - A4 Portrait width (210mm).
      */}
      <div 
        className={`${isGeneratingPdf ? 'block' : 'hidden'} fixed top-0 left-0 z-[50] bg-white overflow-auto`}
        style={{ width: '210mm', maxWidth: '210mm', height: 'auto' }}
      >
        <div 
            id="print-container" 
            className="bg-white text-slate-900"
            style={{ 
                width: '210mm',
                maxWidth: '210mm',
                padding: '12mm 15mm', 
                boxSizing: 'border-box',
                overflowWrap: 'break-word',
                wordBreak: 'break-word',
                fontSize: '11pt',
                lineHeight: '1.5'
            }} 
        >
            {/* PDF Header */}
            <div className="border-b-4 border-slate-900 pb-4 mb-8 flex justify-between items-end">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="w-5 h-5 text-brand-600" />
                        <span className="font-bold text-slate-400 tracking-wider text-xs uppercase">CodeDoc AI Report</span>
                    </div>
                    <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Developer Onboarding Kit</h1>
                </div>
                <div className="text-right">
                    <p className="text-xs text-slate-400 font-medium">Generated</p>
                    <p className="font-bold text-sm">{new Date().toLocaleDateString()}</p>
                </div>
            </div>
            
            {/* Section 1: Summary */}
            <div className="mb-8">
                <h2 className="text-lg font-bold mb-3 text-brand-700 uppercase tracking-wide border-b-2 border-slate-100 pb-2 flex items-center gap-2">
                    <span className="bg-brand-100 text-brand-700 w-6 h-6 rounded text-xs flex items-center justify-center">01</span>
                    Plain English Summary
                </h2>
                <div className="prose prose-sm prose-slate max-w-none text-justify leading-relaxed text-slate-700" style={{ fontSize: '10pt' }}>
                    <ReactMarkdown>{result.plainEnglishSummary}</ReactMarkdown>
                </div>
            </div>

            {/* Page Break */}
            <div className="html2pdf__page-break"></div>

            {/* Section 2: Diagram */}
            <div className="mb-8 w-full pt-6">
                <h2 className="text-lg font-bold mb-4 text-brand-700 uppercase tracking-wide border-b-2 border-slate-100 pb-2 flex items-center gap-2">
                    <span className="bg-brand-100 text-brand-700 w-6 h-6 rounded text-xs flex items-center justify-center">02</span>
                    Visual Architecture
                </h2>
                
                {/* Diagram Container */}
                <div className="border border-slate-200 p-3 rounded-lg bg-slate-50 w-full" style={{ maxWidth: '180mm', margin: '0 auto' }}>
                    {isGeneratingPdf && (
                        <div className="mermaid-pdf-container" style={{ width: '100%', overflow: 'visible', display: 'flex', justifyContent: 'center' }}>
                            <MermaidRenderer chart={result.mermaidCode} id="pdf-mermaid" />
                        </div>
                    )}
                </div>
            </div>

            {/* Page Break */}
            <div className="html2pdf__page-break"></div>

            {/* Section 3: Guide */}
            <div className="pt-6">
                <h2 className="text-lg font-bold mb-4 text-brand-700 uppercase tracking-wide border-b-2 border-slate-100 pb-2 flex items-center gap-2">
                    <span className="bg-brand-100 text-brand-700 w-6 h-6 rounded text-xs flex items-center justify-center">03</span>
                    Junior Dev Guide
                </h2>
                <div className="prose prose-sm prose-slate max-w-none text-justify" style={{ fontSize: '10pt' }}>
                    <ReactMarkdown
                    components={{
                        // Add avoid-break to key elements to prevent awkward page splits
                        h3: ({node, ...props}) => <h3 className="text-base font-bold text-slate-900 mt-6 mb-3 border-l-4 border-brand-500 pl-3 py-1 bg-brand-50/50 break-after-avoid avoid-break" {...props} />,
                        strong: ({node, ...props}) => <strong className="font-bold text-slate-900" {...props} />,
                        blockquote: ({node, ...props}) => (
                            <div className="bg-amber-50 border-l-4 border-amber-500 p-3 my-4 rounded-r-lg shadow-sm break-inside-avoid avoid-break">
                                <div className="flex items-center gap-2 mb-1 text-amber-700 font-bold uppercase tracking-wider text-[9pt]">
                                    <AlertTriangle className="w-3 h-3" />
                                    <span>Gotcha</span>
                                </div>
                                <blockquote className="not-italic text-slate-800 text-[10pt]" {...props} />
                            </div>
                        ),
                        code({node, inline, className, children, ...props}: any) {
                        const match = /language-(\w+)/.exec(className || '')
                        return !inline && match ? (
                            <div className="my-4 rounded-lg border border-slate-300 bg-slate-100 overflow-hidden break-inside-avoid avoid-break shadow-sm">
                            <div className="px-3 py-1.5 bg-slate-200 border-b border-slate-300 flex justify-between items-center">
                                <span className="text-[8pt] font-mono font-bold text-slate-600 uppercase tracking-wider">{match[1]}</span>
                            </div>
                            <pre className="!bg-slate-50 !p-3 !m-0 overflow-x-hidden whitespace-pre-wrap break-words">
                                <code className={`${className} font-mono text-[9pt] leading-relaxed text-slate-800`} {...props}>
                                {children}
                                </code>
                            </pre>
                            </div>
                        ) : (
                            <code className="bg-slate-100 text-brand-800 px-1 py-0.5 rounded border border-slate-200 text-[9pt] font-mono font-medium" {...props}>
                            {children}
                            </code>
                        )
                        }
                    }}
                    >
                    {result.juniorDevGuide}
                    </ReactMarkdown>
                </div>
            </div>
            
            <div className="mt-10 pt-4 border-t border-slate-200 text-center text-slate-400 text-[9pt] flex justify-between items-center">
                <span>Generated by CodeDoc AI</span>
                <span className="font-mono">End of Report</span>
            </div>
        </div>
      </div>

      {/* 
        ----------------------
        HEADER ACTIONS
        ----------------------
      */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 md:mb-8 gap-3 bg-white p-3 md:p-6 rounded-xl md:rounded-2xl shadow-sm border border-slate-200/60 ring-1 ring-slate-100">
        <div className="flex items-center gap-2 md:gap-3">
          <span className="bg-brand-100 text-brand-600 p-1.5 md:p-2 rounded-lg md:rounded-xl shrink-0">
            <CheckCircle2 className="w-4 h-4 md:w-7 md:h-7" />
          </span>
          <div>
            <h2 className="text-base md:text-3xl font-bold text-slate-900 tracking-tight">
              Analysis Complete
            </h2>
            <p className="text-slate-500 text-xs md:text-sm hidden md:block">
              Review the sections below. Download the PDF report anytime.
            </p>
          </div>
        </div>
        <div className="flex w-full md:w-auto gap-2">
           <button 
            onClick={handlePdfDownload}
            disabled={isGeneratingPdf}
            className="flex-1 md:flex-none flex items-center justify-center gap-1.5 md:gap-2 px-3 md:px-6 py-2 md:py-3 text-xs md:text-sm font-bold text-white bg-slate-900 rounded-lg md:rounded-xl hover:bg-slate-800 transition-all shadow-md md:shadow-lg shadow-slate-900/20 active:scale-95 disabled:opacity-70 disabled:cursor-wait"
          >
            {isGeneratingPdf ? (
                <>
                    <Loader2 className="w-3.5 h-3.5 md:w-4 md:h-4 animate-spin" />
                    <span className="hidden sm:inline">Preparing...</span>
                    <span className="sm:hidden">PDF...</span>
                </>
            ) : (
                <>
                    <Download className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    <span className="hidden sm:inline">Download Report</span>
                    <span className="sm:hidden">PDF</span>
                </>
            )}
          </button>
          <button 
            onClick={onReset}
            className="flex-1 md:flex-none flex items-center justify-center gap-1.5 md:gap-2 px-3 md:px-6 py-2 md:py-3 text-xs md:text-sm font-bold text-brand-700 bg-brand-50 border border-brand-200 rounded-lg md:rounded-xl hover:bg-brand-100 transition-all active:scale-95"
          >
            <ArrowLeft className="w-3.5 h-3.5 md:w-4 md:h-4" />
            <span className="hidden sm:inline">Analyze New</span>
            <span className="sm:hidden">New</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden flex flex-col md:flex-row min-h-[600px] ring-4 ring-slate-50/50 relative">
        
        {/* Sidebar Navigation (Mobile: Compact scrollable tabs) */}
        <div className="w-full md:w-72 bg-slate-50/80 border-b md:border-b-0 md:border-r border-slate-200 flex flex-row md:flex-col shrink-0 overflow-x-auto md:overflow-visible p-1.5 md:p-4 gap-1 md:gap-2 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          <div className="px-4 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest hidden md:block">
            Report Sections
          </div>
          
          <button
            onClick={() => setActiveTab('summary')}
            className={`flex-none px-3 py-2 md:p-4 rounded-lg md:rounded-xl text-xs md:text-sm font-bold flex items-center gap-1.5 md:gap-3 transition-all duration-200 group whitespace-nowrap ${
              activeTab === 'summary' 
                ? 'bg-white text-brand-700 shadow-sm ring-1 ring-slate-200' 
                : 'text-slate-500 hover:text-slate-800 hover:bg-white/60'
            }`}
          >
            <span className={`p-1 md:p-2 rounded-md md:rounded-lg ${activeTab === 'summary' ? 'bg-brand-100 text-brand-600' : 'bg-slate-200/50 text-slate-400 group-hover:text-slate-600'}`}>
                <BookOpen className="w-3 h-3 md:w-4 md:h-4" />
            </span>
            <span className="hidden md:inline">Logic Summary</span>
            <span className="md:hidden">Summary</span>
          </button>
          
          <button
            onClick={() => setActiveTab('diagram')}
            className={`flex-none px-3 py-2 md:p-4 rounded-lg md:rounded-xl text-xs md:text-sm font-bold flex items-center gap-1.5 md:gap-3 transition-all duration-200 group whitespace-nowrap ${
              activeTab === 'diagram' 
                ? 'bg-white text-brand-700 shadow-sm ring-1 ring-slate-200' 
                : 'text-slate-500 hover:text-slate-800 hover:bg-white/60'
            }`}
          >
            <span className={`p-1 md:p-2 rounded-md md:rounded-lg ${activeTab === 'diagram' ? 'bg-brand-100 text-brand-600' : 'bg-slate-200/50 text-slate-400 group-hover:text-slate-600'}`}>
                <GitGraph className="w-3 h-3 md:w-4 md:h-4" />
            </span>
            <span className="hidden md:inline">Visual Architecture</span>
            <span className="md:hidden">Diagram</span>
          </button>
          
          <button
            onClick={() => setActiveTab('guide')}
            className={`flex-none px-3 py-2 md:p-4 rounded-lg md:rounded-xl text-xs md:text-sm font-bold flex items-center gap-1.5 md:gap-3 transition-all duration-200 group whitespace-nowrap ${
              activeTab === 'guide' 
                ? 'bg-slate-900 text-white shadow-md shadow-slate-900/20' 
                : 'text-slate-500 hover:text-slate-800 hover:bg-white/60'
            }`}
          >
            <span className={`p-1 md:p-2 rounded-md md:rounded-lg ${activeTab === 'guide' ? 'bg-white/20 text-white' : 'bg-slate-200/50 text-slate-400 group-hover:text-slate-600'}`}>
                <FileCode className="w-3 h-3 md:w-4 md:h-4" />
            </span>
            <span className="hidden md:inline">Junior Dev Guide</span>
            <span className="md:hidden">Guide</span>
          </button>
        </div>

        {/* Content Area */}
        <div className={`flex-1 overflow-y-auto max-h-[calc(100vh-200px)] md:max-h-[800px] ${activeTab === 'guide' ? 'bg-[#0B1120] text-slate-300' : 'bg-white text-slate-600'}`}>
          
          {activeTab === 'summary' && (
            <div className="p-4 md:p-12 animate-in fade-in duration-300">
               <div className="mb-4 md:mb-8 pb-3 md:pb-4 border-b border-slate-100">
                  <h3 className="text-xl md:text-3xl font-bold text-slate-900 tracking-tight">Plain English Logic</h3>
                  <p className="text-slate-500 mt-1 md:mt-2 text-sm md:text-lg">A jargon-free explanation of the codebase.</p>
               </div>
               <div className="prose prose-slate prose-sm md:prose-lg max-w-none text-slate-600 leading-relaxed md:leading-8">
                  <ReactMarkdown>{result.plainEnglishSummary}</ReactMarkdown>
               </div>
            </div>
          )}

          {activeTab === 'diagram' && (
             <div className="p-3 md:p-12 animate-in fade-in duration-300 h-full flex flex-col">
                <div className="mb-3 md:mb-8 pb-3 md:pb-4 border-b border-slate-100 flex justify-between items-start md:items-end gap-2">
                  <div>
                    <h3 className="text-lg md:text-3xl font-bold text-slate-900 tracking-tight">Visual Architecture</h3>
                    <p className="text-slate-500 mt-1 text-xs md:text-lg">Auto-generated diagram. <span className="md:hidden text-brand-600 font-medium">Scroll to pan →</span></p>
                  </div>
                  <span className="text-[10px] md:text-xs font-mono bg-slate-100 text-slate-500 px-2 md:px-3 py-1 md:py-1.5 rounded-full border border-slate-200 shrink-0">Mermaid.js</span>
               </div>
               {/* Mobile: Scrollable container with touch support */}
               <div className="flex-1 min-h-[300px] md:min-h-[400px] bg-slate-50/30 rounded-xl md:rounded-2xl border border-slate-100 overflow-hidden relative">
                  <div className="w-full h-full overflow-x-auto overflow-y-auto touch-pan-x touch-pan-y" style={{ WebkitOverflowScrolling: 'touch' }}>
                    <div className="min-w-[600px] md:min-w-0 p-3 md:p-4 flex items-start justify-center">
                      <MermaidRenderer chart={result.mermaidCode} id="main-mermaid" />
                    </div>
                  </div>
                  {/* Mobile hint overlay */}
                  <div className="absolute bottom-2 left-2 right-2 flex justify-center md:hidden pointer-events-none">
                    <span className="text-[10px] bg-white/90 text-slate-500 px-2 py-1 rounded-full border border-slate-200 shadow-sm backdrop-blur-sm">
                      👆 Pinch to zoom • Swipe to pan
                    </span>
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'guide' && (
            <div className="p-4 md:p-12 animate-in fade-in duration-300">
              <div className="mb-4 md:mb-8 pb-4 md:pb-6 border-b border-white/10">
                  <div className="flex items-center gap-2 md:gap-4">
                      <div className="p-2 md:p-3 bg-brand-500/10 rounded-lg md:rounded-xl border border-brand-500/20">
                        <Terminal className="w-5 h-5 md:w-8 md:h-8 text-brand-400" />
                      </div>
                      <div>
                        <h3 className="text-lg md:text-3xl font-bold text-white tracking-tight">Junior Dev Guide</h3>
                        <p className="text-slate-400 mt-0.5 md:mt-1 text-xs md:text-base">Technical deep-dives and critical alerts.</p>
                      </div>
                  </div>
               </div>
              <div className="prose prose-invert prose-lg max-w-none">
                <ReactMarkdown 
                  components={{
                    h3: ({node, ...props}) => <h3 className="text-xl font-bold text-brand-300 mt-10 mb-6 flex items-center gap-2" {...props} />,
                    h4: ({node, ...props}) => <h4 className="text-lg font-semibold text-white mt-8 mb-3 border-l-2 border-brand-500 pl-3" {...props} />,
                    p: ({node, ...props}) => <p className="text-slate-300 leading-relaxed mb-6" {...props} />,
                    li: ({node, ...props}) => <li className="text-slate-300 mb-2 marker:text-brand-500" {...props} />,
                    strong: ({node, ...props}) => <strong className="text-white font-semibold" {...props} />,
                    blockquote: ({node, ...props}) => (
                        <div className="bg-[#1e1b10] border-l-4 border-amber-500/80 p-4 md:p-6 my-8 rounded-r-xl shadow-lg relative overflow-hidden group">
                             <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <AlertTriangle className="w-24 h-24 text-amber-500" />
                             </div>
                            <div className="flex items-center gap-2 mb-3 text-amber-400 font-bold uppercase tracking-wider text-xs relative z-10">
                                <AlertTriangle className="w-4 h-4" />
                                <span>Attention / Gotcha</span>
                            </div>
                            <blockquote className="not-italic text-amber-100/90 pl-0 border-none text-base relative z-10 leading-relaxed" {...props} />
                        </div>
                    ),
                    code({node, inline, className, children, ...props}: any) {
                      const match = /language-(\w+)/.exec(className || '')
                      return !inline && match ? (
                        <div className="relative group my-8 rounded-2xl overflow-hidden shadow-2xl bg-[#0f172a] border border-slate-700/50">
                           <div className="flex items-center justify-between bg-[#1e293b] px-4 md:px-5 py-3 border-b border-slate-700/50">
                              <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest">{match[1]}</span>
                              <div className="flex gap-2 opacity-50">
                                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                              </div>
                           </div>
                           <pre className="!bg-[#0f172a] !p-4 md:!p-6 !m-0 overflow-x-auto">
                             <code className={`${className} font-mono text-xs md:text-sm leading-7 text-slate-200`} {...props}>
                               {children}
                             </code>
                           </pre>
                        </div>
                      ) : (
                        <code className="bg-slate-800 text-brand-300 px-1.5 py-0.5 rounded text-sm font-mono border border-slate-700/50" {...props}>
                          {children}
                        </code>
                      )
                    }
                  }}
                >
                  {result.juniorDevGuide}
                </ReactMarkdown>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 
        ----------------------
        SCIFI CHATBOT UI
        ----------------------
      */}
      <div className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-50 flex flex-col items-end gap-4">
        
        {/* Chat Window */}
        <div 
            className={`
                bg-slate-900 shadow-2xl border-2 border-slate-700/50 overflow-hidden transition-all duration-300 origin-bottom-right backdrop-blur-xl
                fixed z-50
                md:rounded-2xl md:w-96 md:max-w-[90vw] md:bottom-20 md:right-8 md:max-h-[600px]
                ${isChatOpen 
                  ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto inset-0 md:inset-auto' 
                  : 'opacity-0 scale-75 translate-y-12 pointer-events-none inset-0 md:inset-auto'
                }
            `}
            style={{ display: 'flex', flexDirection: 'column' }}
        >
            {/* Header: Sci-Fi HUD Style */}
            <div className="bg-slate-950 p-4 flex justify-between items-center text-cyan-400 border-b border-cyan-900/50 shrink-0 relative overflow-hidden">
                <div className="absolute inset-0 bg-cyan-900/10 pointer-events-none"></div>
                <div className="flex items-center gap-3 relative z-10">
                    <div className="w-8 h-8 rounded-full bg-slate-900 border border-cyan-500/50 flex items-center justify-center shadow-[0_0_10px_rgba(6,182,212,0.3)]">
                        <ScanEye className="w-4 h-4 text-cyan-400" />
                    </div>
                    <div>
                        <h4 className="font-mono font-bold text-xs uppercase tracking-widest text-cyan-300">Analytical Core</h4>
                        <p className="text-[10px] text-slate-500 font-mono">STATUS: ONLINE</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 relative z-10">
                    <button 
                        onClick={() => setVoiceEnabled(!voiceEnabled)}
                        className={`p-1.5 rounded-lg transition-colors ${voiceEnabled ? 'text-cyan-400 bg-cyan-950 border border-cyan-800' : 'text-slate-600 hover:text-slate-400'}`}
                        title={voiceEnabled ? "Mute Voice Output" : "Enable Voice Output"}
                    >
                        {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                    </button>
                    <button onClick={() => setIsChatOpen(false)} className="text-slate-500 hover:text-white transition-colors p-2 md:p-0">
                        <X className="w-6 h-6 md:w-5 md:h-5" />
                    </button>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-900/50 min-h-[300px] font-mono text-sm">
                {chatMessages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`
                            max-w-[85%] rounded-lg px-4 py-3 leading-relaxed border
                            ${msg.role === 'user' 
                                ? 'bg-cyan-950/30 text-cyan-100 border-cyan-800/50 rounded-br-none' 
                                : 'bg-slate-800/50 text-slate-300 border-slate-700/50 rounded-bl-none shadow-sm'
                            }
                        `}>
                            {msg.role === 'model' && !msg.text ? (
                                <div className="flex gap-1 h-5 items-center px-1">
                                    <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-pulse"></div>
                                    <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-pulse delay-100"></div>
                                    <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-pulse delay-200"></div>
                                </div>
                            ) : (
                                <ReactMarkdown>{msg.text}</ReactMarkdown>
                            )}
                        </div>
                    </div>
                ))}
                <div ref={chatEndRef}></div>
            </div>

            {/* Input Area */}
            <div className="p-3 bg-slate-950 border-t border-cyan-900/30 shrink-0 pb-6 md:pb-3">
                <form 
                    onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
                    className="flex gap-2"
                >
                    <div className="flex-1 relative group">
                        <input
                            type="text"
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            placeholder={isListening ? "Listening..." : "Input query..."}
                            className="w-full bg-slate-900 border border-slate-700 text-cyan-100 rounded-lg pl-3 pr-10 py-3 md:py-2.5 text-base md:text-xs font-mono outline-none focus:border-cyan-500/50 focus:shadow-[0_0_10px_rgba(6,182,212,0.1)] transition-all placeholder:text-slate-600"
                            disabled={isChatLoading || isListening}
                        />
                        <button
                            type="button"
                            onClick={toggleMic}
                            className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md transition-colors ${isListening ? 'text-red-500 animate-pulse' : 'text-slate-500 hover:text-cyan-400'}`}
                        >
                            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                        </button>
                    </div>
                    <button
                        type="submit"
                        disabled={isChatLoading || !chatInput.trim()}
                        className="bg-cyan-700 text-white p-3 md:p-2.5 rounded-lg hover:bg-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-cyan-900/20"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </form>
            </div>
        </div>

        {/* 
            SCI-FI FLOATING BUTTON 
            - Outer Ring: Gunmetal (Slate-800)
            - Inner Border: Brass/Amber (Amber-600/50)
            - Center: Holographic Blue Lens (Cyan-500 with glows)
        */}
        <button
            onClick={() => setIsChatOpen(!isChatOpen)}
            className={`
                relative w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center transition-all duration-500 hover:scale-110 active:scale-95 group
                bg-slate-800 border-4 border-slate-700 shadow-2xl z-40
                ${!isChatOpen && 'animate-bounce-slow'}
            `}
            style={{ 
                boxShadow: isChatOpen 
                    ? '0 0 0 0 rgba(0,0,0,0)' 
                    : '0 0 20px rgba(6,182,212,0.4), inset 0 0 10px rgba(0,0,0,0.5)' 
            }}
        >
            {/* Brass Ring Accent */}
            <div className="absolute inset-0 rounded-full border border-amber-500/30 pointer-events-none"></div>
            
            {/* Inner Lens Glow */}
            <div className={`
                absolute inset-1 rounded-full bg-gradient-to-br from-slate-900 to-black flex items-center justify-center overflow-hidden
                ${isChatOpen ? 'border-2 border-red-500/50' : 'border-2 border-cyan-500/50'}
            `}>
                {/* Holographic Emitter Effect */}
                <div className={`absolute inset-0 opacity-50 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-cyan-900/50 via-transparent to-transparent`}></div>
                
                {isChatOpen ? (
                    <X className="w-6 h-6 text-red-400 relative z-10" />
                ) : (
                    <>
                        {/* Spinning Data Ring */}
                        <div className="absolute inset-1 border border-dashed border-cyan-500/30 rounded-full animate-spin-slow"></div>
                        <Bot className="w-6 h-6 text-cyan-400 relative z-10 drop-shadow-[0_0_5px_rgba(34,211,238,0.8)]" />
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-cyan-400/10 rounded-full animate-ping"></div>
                    </>
                )}
            </div>
        </button>
      </div>

    </div>
  );
};

export default AnalysisView;
