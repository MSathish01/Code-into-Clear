
import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { AnalysisResult } from '../types';
import MermaidRenderer from './MermaidRenderer';
import { BookOpen, GitGraph, FileCode, CheckCircle2, Download, ArrowLeft, AlertTriangle, Terminal, Loader2, Sparkles } from 'lucide-react';

interface AnalysisViewProps {
  result: AnalysisResult;
  onReset: () => void;
}

const AnalysisView: React.FC<AnalysisViewProps> = ({ result, onReset }) => {
  const [activeTab, setActiveTab] = useState<'summary' | 'diagram' | 'guide'>('summary');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const handlePdfDownload = () => {
    setIsGeneratingPdf(true);
    
    // @ts-ignore
    if (typeof html2pdf === 'undefined') {
        alert("PDF generation library is still loading. Please try again in 5 seconds.");
        setIsGeneratingPdf(false);
        return;
    }

    // Scroll to top to ensure clean capture context
    window.scrollTo(0, 0);

    // Wait for the "Visible Overlay" to render and Mermaid to draw
    setTimeout(() => {
        const element = document.getElementById('print-container');
        if (!element) {
            setIsGeneratingPdf(false);
            return;
        }

        const opt = {
          margin: [10, 10, 10, 10], // top, left, bottom, right
          filename: 'Developer_Onboarding_Kit.pdf',
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, logging: false, scrollY: 0 },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
          pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
        };

        // @ts-ignore
        html2pdf().set(opt).from(element).save().then(() => {
            setIsGeneratingPdf(false);
        }).catch((err: any) => {
            console.error(err);
            setIsGeneratingPdf(false);
            alert("Failed to generate PDF. Please try again.");
        });
    }, 3000); // Extended wait to 3s to ensure large diagrams fully paint
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* 
          PDF Generation Overlay
          Visible ONLY during generation to ensure html2canvas captures it correctly.
      */}
      <div 
        className={`fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[100] flex justify-center overflow-y-auto transition-opacity duration-300 ${isGeneratingPdf ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      >
        <div className="absolute top-8 left-1/2 -translate-x-1/2 z-[110] bg-white px-8 py-4 rounded-full shadow-2xl flex items-center gap-4">
             <div className="relative">
                <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
                <div className="absolute inset-0 animate-ping opacity-30 bg-brand-400 rounded-full"></div>
             </div>
             <span className="font-bold text-slate-800 text-lg">Generating PDF Report...</span>
        </div>

        {/* The Actual Content to be Captured */}
        <div 
            id="print-container" 
            className={`${isGeneratingPdf ? 'block' : 'hidden'} bg-white text-slate-900 shadow-2xl mx-auto mt-24 mb-20`}
            style={{ width: '794px', minHeight: '1123px', padding: '40px' }} 
        >
            <div className="border-b-4 border-slate-900 pb-6 mb-10 flex justify-between items-end">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="w-6 h-6 text-brand-600" />
                        <span className="font-bold text-slate-400 tracking-wider text-sm uppercase">CodeDoc AI Report</span>
                    </div>
                    <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Developer Onboarding Kit</h1>
                </div>
                <div className="text-right">
                    <p className="text-sm text-slate-400 font-medium">Generated On</p>
                    <p className="font-bold text-lg">{new Date().toLocaleDateString()}</p>
                </div>
            </div>
            
            {/* Section 1: Summary */}
            <div className="mb-12 break-inside-avoid">
                <h2 className="text-2xl font-bold mb-4 text-brand-700 uppercase tracking-wide border-b-2 border-slate-100 pb-2 flex items-center gap-2">
                    <span className="bg-brand-100 text-brand-700 w-8 h-8 rounded-lg flex items-center justify-center text-sm">01</span>
                    Plain English Summary
                </h2>
                <div className="prose prose-slate max-w-none text-justify leading-relaxed text-slate-700">
                    <ReactMarkdown>{result.plainEnglishSummary}</ReactMarkdown>
                </div>
            </div>

            {/* Section 2: Diagram */}
            <div className="mb-12 break-inside-avoid w-full">
                <h2 className="text-2xl font-bold mb-6 text-brand-700 uppercase tracking-wide border-b-2 border-slate-100 pb-2 flex items-center gap-2">
                    <span className="bg-brand-100 text-brand-700 w-8 h-8 rounded-lg flex items-center justify-center text-sm">02</span>
                    Visual Architecture
                </h2>
                <div className="border border-slate-200 p-8 rounded-xl bg-slate-50/50 text-center min-h-[300px] w-full block">
                    {isGeneratingPdf && (
                        <div className="inline-block w-full">
                            <MermaidRenderer chart={result.mermaidCode} id="pdf-mermaid" />
                        </div>
                    )}
                </div>
            </div>

            {/* Section 3: Guide */}
            <div className="break-inside-avoid">
                <h2 className="text-2xl font-bold mb-6 text-brand-700 uppercase tracking-wide border-b-2 border-slate-100 pb-2 flex items-center gap-2">
                    <span className="bg-brand-100 text-brand-700 w-8 h-8 rounded-lg flex items-center justify-center text-sm">03</span>
                    Junior Dev Guide
                </h2>
                <div className="prose prose-slate max-w-none text-justify">
                    <ReactMarkdown
                    components={{
                        h3: ({node, ...props}) => <h3 className="text-xl font-bold text-slate-900 mt-8 mb-4 border-l-4 border-brand-500 pl-4 py-1 bg-brand-50/50" {...props} />,
                        strong: ({node, ...props}) => <strong className="font-bold text-slate-900" {...props} />,
                        // Styled Blockquotes for PDF (Light Theme)
                        blockquote: ({node, ...props}) => (
                            <div className="bg-amber-50 border-l-4 border-amber-500 p-5 my-6 rounded-r-lg shadow-sm">
                                <div className="flex items-center gap-2 mb-2 text-amber-700 font-bold uppercase tracking-wider text-xs">
                                    <AlertTriangle className="w-4 h-4" />
                                    <span>Critical Note / Gotcha</span>
                                </div>
                                <blockquote className="not-italic text-slate-800" {...props} />
                            </div>
                        ),
                        // Styled Code Blocks for PDF (Light Theme)
                        code({node, inline, className, children, ...props}: any) {
                        const match = /language-(\w+)/.exec(className || '')
                        return !inline && match ? (
                            <div className="my-6 rounded-lg border border-slate-300 bg-slate-100 overflow-hidden break-inside-avoid shadow-sm">
                            <div className="px-4 py-2 bg-slate-200 border-b border-slate-300 flex justify-between items-center">
                                <span className="text-xs font-mono font-bold text-slate-600 uppercase tracking-wider">{match[1]}</span>
                            </div>
                            <pre className="!bg-slate-50 !p-5 !m-0 overflow-x-auto">
                                <code className={`${className} font-mono text-xs leading-relaxed text-slate-800`} {...props}>
                                {children}
                                </code>
                            </pre>
                            </div>
                        ) : (
                            <code className="bg-slate-100 text-brand-800 px-1.5 py-0.5 rounded border border-slate-200 text-sm font-mono font-medium" {...props}>
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
            
            <div className="mt-16 pt-8 border-t border-slate-200 text-center text-slate-400 text-xs flex justify-between items-center">
                <span>Generated automatically by CodeDoc AI</span>
                <span className="font-mono">Page 1 of 1</span>
            </div>
        </div>
      </div>

      {/* Header Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200/60 ring-1 ring-slate-100">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
            <span className="bg-brand-100 text-brand-600 p-2 rounded-xl">
              <CheckCircle2 className="w-7 h-7" />
            </span>
            Analysis Complete
          </h2>
          <p className="text-slate-500 mt-2 text-sm ml-16">
            Your onboarding documentation is ready to review.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 ml-16 md:ml-0">
           <button 
            onClick={handlePdfDownload}
            disabled={isGeneratingPdf}
            className="flex items-center gap-2 px-6 py-3 text-sm font-bold text-white bg-slate-900 rounded-xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20 active:scale-95 disabled:opacity-70 disabled:cursor-wait"
          >
            {isGeneratingPdf ? (
                <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Preparing PDF...
                </>
            ) : (
                <>
                    <Download className="w-4 h-4" />
                    Download Report
                </>
            )}
          </button>
          <button 
            onClick={onReset}
            className="flex items-center gap-2 px-6 py-3 text-sm font-bold text-brand-700 bg-brand-50 border border-brand-200 rounded-xl hover:bg-brand-100 transition-all active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" />
            Analyze New File
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden flex flex-col md:flex-row min-h-[600px] ring-4 ring-slate-50/50">
        
        {/* Sidebar Navigation */}
        <div className="md:w-72 bg-slate-50/80 border-b md:border-b-0 md:border-r border-slate-200 flex md:flex-col shrink-0 overflow-x-auto md:overflow-visible p-2 md:p-4 gap-2">
          <div className="px-4 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest hidden md:block">
            Report Sections
          </div>
          
          <button
            onClick={() => setActiveTab('summary')}
            className={`flex-1 md:flex-none p-4 rounded-xl text-sm font-bold flex items-center gap-3 transition-all duration-200 group ${
              activeTab === 'summary' 
                ? 'bg-white text-brand-700 shadow-sm ring-1 ring-slate-200' 
                : 'text-slate-500 hover:text-slate-800 hover:bg-white/60'
            }`}
          >
            <span className={`p-2 rounded-lg ${activeTab === 'summary' ? 'bg-brand-100 text-brand-600' : 'bg-slate-200/50 text-slate-400 group-hover:text-slate-600'}`}>
                <BookOpen className="w-4 h-4" />
            </span>
            <span className="whitespace-nowrap">Logic Summary</span>
          </button>
          
          <button
            onClick={() => setActiveTab('diagram')}
            className={`flex-1 md:flex-none p-4 rounded-xl text-sm font-bold flex items-center gap-3 transition-all duration-200 group ${
              activeTab === 'diagram' 
                ? 'bg-white text-brand-700 shadow-sm ring-1 ring-slate-200' 
                : 'text-slate-500 hover:text-slate-800 hover:bg-white/60'
            }`}
          >
            <span className={`p-2 rounded-lg ${activeTab === 'diagram' ? 'bg-brand-100 text-brand-600' : 'bg-slate-200/50 text-slate-400 group-hover:text-slate-600'}`}>
                <GitGraph className="w-4 h-4" />
            </span>
            <span className="whitespace-nowrap">Visual Architecture</span>
          </button>
          
          <button
            onClick={() => setActiveTab('guide')}
            className={`flex-1 md:flex-none p-4 rounded-xl text-sm font-bold flex items-center gap-3 transition-all duration-200 group ${
              activeTab === 'guide' 
                ? 'bg-slate-900 text-white shadow-md shadow-slate-900/20' 
                : 'text-slate-500 hover:text-slate-800 hover:bg-white/60'
            }`}
          >
            <span className={`p-2 rounded-lg ${activeTab === 'guide' ? 'bg-white/20 text-white' : 'bg-slate-200/50 text-slate-400 group-hover:text-slate-600'}`}>
                <FileCode className="w-4 h-4" />
            </span>
            <span className="whitespace-nowrap">Junior Dev Guide</span>
          </button>
        </div>

        {/* Content Area */}
        <div className={`flex-1 overflow-y-auto max-h-[800px] ${activeTab === 'guide' ? 'bg-[#0B1120] text-slate-300' : 'bg-white text-slate-600'}`}>
          
          {activeTab === 'summary' && (
            <div className="p-8 md:p-12 animate-in fade-in duration-300">
               <div className="mb-8 pb-4 border-b border-slate-100">
                  <h3 className="text-3xl font-bold text-slate-900 tracking-tight">Plain English Logic</h3>
                  <p className="text-slate-500 mt-2 text-lg">A jargon-free explanation of the codebase.</p>
               </div>
               <div className="prose prose-slate prose-lg max-w-none text-slate-600 leading-8">
                  <ReactMarkdown>{result.plainEnglishSummary}</ReactMarkdown>
               </div>
            </div>
          )}

          {activeTab === 'diagram' && (
             <div className="p-6 md:p-12 animate-in fade-in duration-300 h-full flex flex-col">
                <div className="mb-8 pb-4 border-b border-slate-100 flex justify-between items-end">
                  <div>
                    <h3 className="text-3xl font-bold text-slate-900 tracking-tight">Visual Architecture</h3>
                    <p className="text-slate-500 mt-2 text-lg">Auto-generated system diagram.</p>
                  </div>
                  <span className="text-xs font-mono bg-slate-100 text-slate-500 px-3 py-1.5 rounded-full border border-slate-200">Mermaid.js</span>
               </div>
               <div className="flex-1 flex flex-col items-center justify-start min-h-[400px] bg-slate-50/30 rounded-2xl border border-slate-100 p-4">
                  <MermaidRenderer chart={result.mermaidCode} id="main-mermaid" />
               </div>
            </div>
          )}

          {activeTab === 'guide' && (
            <div className="p-8 md:p-12 animate-in fade-in duration-300">
              <div className="mb-8 pb-6 border-b border-white/10">
                  <div className="flex items-center gap-4">
                      <div className="p-3 bg-brand-500/10 rounded-xl border border-brand-500/20">
                        <Terminal className="w-8 h-8 text-brand-400" />
                      </div>
                      <div>
                        <h3 className="text-3xl font-bold text-white tracking-tight">Junior Dev Guide</h3>
                        <p className="text-slate-400 mt-1">Technical deep-dives and critical alerts.</p>
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
                    // Style Blockquotes as Alerts/Gotchas - Dark Theme Version
                    blockquote: ({node, ...props}) => (
                        <div className="bg-[#1e1b10] border-l-4 border-amber-500/80 p-6 my-8 rounded-r-xl shadow-lg relative overflow-hidden group">
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
                    // Enhanced Code Blocks - Dark Theme IDE style
                    code({node, inline, className, children, ...props}: any) {
                      const match = /language-(\w+)/.exec(className || '')
                      return !inline && match ? (
                        <div className="relative group my-8 rounded-2xl overflow-hidden shadow-2xl bg-[#0f172a] border border-slate-700/50">
                           <div className="flex items-center justify-between bg-[#1e293b] px-5 py-3 border-b border-slate-700/50">
                              <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest">{match[1]}</span>
                              <div className="flex gap-2 opacity-50">
                                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                              </div>
                           </div>
                           <pre className="!bg-[#0f172a] !p-6 !m-0 overflow-x-auto">
                             <code className={`${className} font-mono text-sm leading-7 text-slate-200`} {...props}>
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
    </div>
  );
};

export default AnalysisView;
