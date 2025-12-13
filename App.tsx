
import React, { useState } from 'react';
import { UploadCloud, Code, Loader2, Sparkles, FileText, Github, Search, ArrowRight, Check, AlertTriangle } from 'lucide-react';
import { analyzeCode } from './services/geminiService';
import { fetchGithubCode } from './services/githubService';
import { AnalysisResult, AnalysisStatus } from './types';
import AnalysisView from './components/AnalysisView';

type InputMethod = 'paste' | 'upload' | 'github';

const App: React.FC = () => {
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<AnalysisStatus>(AnalysisStatus.IDLE);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [inputMethod, setInputMethod] = useState<InputMethod>('paste');
  const [githubUrl, setGithubUrl] = useState('');
  const [isLoadingGithub, setIsLoadingGithub] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setCode(event.target.result as string);
          setErrorMsg(null);
          setResult(null); // Clear previous results
          setStatus(AnalysisStatus.IDLE);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleGithubFetch = async () => {
    if (!githubUrl.trim()) {
      setErrorMsg("Please enter a valid GitHub URL.");
      return;
    }

    try {
      setIsLoadingGithub(true);
      setErrorMsg(null);
      setResult(null); // Clear previous results
      setStatus(AnalysisStatus.IDLE);
      
      const fetchedCode = await fetchGithubCode(githubUrl);
      setCode(fetchedCode);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to fetch from GitHub.");
    } finally {
      setIsLoadingGithub(false);
    }
  };

  const handleAnalyze = async () => {
    if (!code.trim()) {
      setErrorMsg("Please provide code to analyze.");
      return;
    }

    // Safety check for size before sending
    if (code.length > 900000) {
        setErrorMsg("Code is too large to analyze at once. Please reduce the content or number of files.");
        return;
    }

    try {
      setStatus(AnalysisStatus.ANALYZING);
      setErrorMsg(null);
      
      const analysisData = await analyzeCode(code);
      setResult(analysisData);
      setStatus(AnalysisStatus.COMPLETE);
    } catch (err: any) {
      console.error(err);
      setStatus(AnalysisStatus.ERROR);
      
      // Better error message for token limits
      if (err.message && err.message.includes('token count')) {
          setErrorMsg("The code is too large for the AI to process. Please try analyzing fewer files or a specific module.");
      } else {
          setErrorMsg(err.message || "An unexpected error occurred while contacting Gemini.");
      }
    }
  };

  const reset = () => {
    setCode('');
    setResult(null);
    setStatus(AnalysisStatus.IDLE);
    setErrorMsg(null);
    setGithubUrl('');
  };

  // Render the Results View if complete
  if (status === AnalysisStatus.COMPLETE && result) {
    return (
      <div className="min-h-screen bg-slate-50 pb-20 animate-in fade-in duration-500">
         <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50 transition-all">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="bg-gradient-to-tr from-brand-600 to-emerald-500 text-white p-1.5 rounded-lg shadow-sm">
                 <Sparkles className="w-5 h-5" />
              </div>
              <h1 className="font-bold text-xl text-slate-800 tracking-tight">Code<span className="text-brand-600">Doc</span></h1>
            </div>
            <div className="text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200 hidden sm:block">
                Powered by Gemini 2.5
            </div>
          </div>
        </header>
        <AnalysisView result={result} code={code} onReset={reset} />
      </div>
    );
  }

  // Render the Input View
  return (
    <div className="min-h-screen flex flex-col font-sans relative overflow-hidden bg-slate-50">
      
      {/* Background Decor */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>
      <div className="absolute top-0 inset-x-0 h-96 bg-gradient-to-b from-brand-50 to-transparent pointer-events-none"></div>
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-brand-200/40 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-emerald-200/40 rounded-full blur-3xl pointer-events-none"></div>

      <header className="relative z-10 border-b border-transparent">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
             <div className="bg-gradient-to-tr from-brand-600 to-emerald-500 text-white p-2 rounded-xl shadow-lg shadow-brand-500/20">
                 <Sparkles className="w-5 h-5" />
              </div>
            <h1 className="font-bold text-2xl text-slate-800 tracking-tight">Code<span className="text-brand-600">Doc</span></h1>
          </div>
        </div>
      </header>

      <main className="relative z-10 flex-1 max-w-5xl mx-auto w-full p-4 sm:p-6 flex flex-col justify-start pt-10 md:pt-16">
        
        <div className="text-center mb-12 space-y-6 animate-in slide-in-from-bottom-5 fade-in duration-700">
          <h2 className="text-4xl md:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.1]">
            Turn Legacy Code into <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 via-teal-500 to-emerald-500">
              Clear Documentation
            </span>
          </h2>
          <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Instantly generate architecture diagrams, plain English summaries, and junior developer guides powered by <span className="font-semibold text-brand-700">Gemini 2.5 Pro</span>.
          </p>
        </div>

        {/* Main Input Card */}
        <div className="bg-white/80 backdrop-blur-xl p-3 md:p-4 rounded-3xl shadow-2xl shadow-slate-200/50 border border-white/50 ring-1 ring-slate-200 animate-in slide-in-from-bottom-8 fade-in duration-1000 delay-150">
          
          {/* Tabs */}
          <div className="flex p-1.5 bg-slate-100/80 rounded-2xl mb-6 gap-1">
            {[
                { id: 'paste', label: 'Paste Code', icon: Code },
                { id: 'github', label: 'GitHub Repo', icon: Github },
                { id: 'upload', label: 'Upload File', icon: UploadCloud }
            ].map((tab) => (
                 <button
                    key={tab.id}
                    onClick={() => setInputMethod(tab.id as InputMethod)}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold rounded-xl transition-all duration-200 ${
                        inputMethod === tab.id 
                        ? 'bg-white text-brand-700 shadow-md ring-1 ring-black/5' 
                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                    }`}
                    >
                    <tab.icon className={`w-4 h-4 ${inputMethod === tab.id ? 'text-brand-600' : 'text-slate-400'}`} />
                    {tab.label}
                </button>
            ))}
          </div>

          <div className="px-2 md:px-4">
            
            {/* GitHub Input */}
            {inputMethod === 'github' && (
               <div className="mb-6 space-y-3 bg-slate-50/50 p-6 rounded-2xl border border-slate-200/60 animate-in fade-in zoom-in-95 duration-300">
                 <label className="text-sm font-bold text-slate-700 ml-1">GitHub File or Repository URL</label>
                 <div className="flex gap-3">
                   <div className="relative flex-1">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Github className="h-5 w-5 text-slate-400" />
                        </div>
                        <input 
                            type="text" 
                            value={githubUrl}
                            onChange={(e) => setGithubUrl(e.target.value)}
                            placeholder="https://github.com/username/repo"
                            className="w-full pl-10 bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm focus:ring-4 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all shadow-sm"
                        />
                   </div>
                   <button 
                    onClick={handleGithubFetch}
                    disabled={isLoadingGithub}
                    className="bg-slate-900 text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-slate-800 disabled:opacity-50 flex items-center gap-2 transition-all shadow-lg shadow-slate-900/20 active:scale-95"
                   >
                     {isLoadingGithub ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                     Fetch
                   </button>
                 </div>
                 <p className="text-xs text-slate-500 ml-1 flex items-center gap-1">
                    <Check className="w-3 h-3 text-brand-500" />
                    Supports public repos and gists. Large repos are automatically filtered.
                 </p>
               </div>
            )}

            {/* File Upload Input */}
            {inputMethod === 'upload' && (
              <div className="mb-6 animate-in fade-in zoom-in-95 duration-300">
                 <div className="border-2 border-dashed border-slate-300 rounded-2xl p-10 text-center hover:bg-brand-50/50 hover:border-brand-300 transition-all duration-300 relative group cursor-pointer bg-slate-50/30">
                    <input 
                      type="file" 
                      onChange={handleFileUpload} 
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div className="group-hover:scale-105 transition-transform duration-300">
                        <div className="w-16 h-16 bg-white rounded-full shadow-md flex items-center justify-center mx-auto mb-4 group-hover:shadow-lg transition-shadow">
                            <UploadCloud className="w-8 h-8 text-brand-500" />
                        </div>
                        <p className="text-lg text-slate-700 font-semibold">Click to upload or drag and drop</p>
                        <p className="text-sm text-slate-500 mt-2">Supports .js, .ts, .py, .java, .go, etc.</p>
                    </div>
                 </div>
              </div>
            )}

            {/* Code Text Area */}
            <div className="relative group">
               <div className="absolute -top-3 left-4 bg-white px-2 text-xs font-bold text-slate-400 uppercase tracking-wider z-10 pointer-events-none">
                    Source Code
               </div>
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder={inputMethod === 'github' ? "Code will appear here after fetching..." : "Paste your legacy code here..."}
                className="w-full h-64 md:h-80 bg-slate-50/50 border border-slate-200 rounded-2xl p-6 font-mono text-sm text-slate-800 focus:ring-4 focus:ring-brand-500/20 focus:border-brand-500 outline-none resize-none transition-all focus:bg-white shadow-inner"
                disabled={status === AnalysisStatus.ANALYZING}
              />
              {code && (
                <div className="absolute bottom-4 right-4 text-xs bg-white text-slate-500 px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm font-mono">
                  {code.length.toLocaleString()} chars
                </div>
              )}
            </div>
          </div>

          <div className="p-4 flex flex-col items-center mt-4">
            {errorMsg && (
              <div className="mb-6 text-red-600 text-sm bg-red-50 px-4 py-3 rounded-xl border border-red-100 w-full flex items-center gap-2 animate-in slide-in-from-top-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                {errorMsg}
              </div>
            )}
            
            <button
              onClick={handleAnalyze}
              disabled={status === AnalysisStatus.ANALYZING || !code}
              className={`
                group relative w-full md:w-auto min-w-[280px] px-8 py-4 rounded-xl font-bold text-lg text-white shadow-xl shadow-brand-500/30
                transition-all duration-300 transform overflow-hidden
                ${status === AnalysisStatus.ANALYZING || !code
                  ? 'bg-slate-300 cursor-not-allowed shadow-none grayscale' 
                  : 'bg-gradient-to-r from-brand-600 to-emerald-600 hover:shadow-brand-500/50 hover:-translate-y-1 hover:scale-[1.02]'}
              `}
            >
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
              {status === AnalysisStatus.ANALYZING ? (
                <span className="flex items-center justify-center gap-3 relative z-10">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  Analyzing Logic...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-3 relative z-10">
                  <FileText className="w-6 h-6" />
                  Generate Onboarding Kit
                  <ArrowRight className="w-5 h-5 opacity-80 group-hover:translate-x-1 transition-transform" />
                </span>
              )}
            </button>
          </div>
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 text-center pb-12">
          <div className="group p-6 rounded-3xl bg-white border border-slate-200 hover:border-brand-200 hover:shadow-xl hover:shadow-brand-100/50 transition-all duration-300">
            <div className="w-14 h-14 bg-brand-50 text-brand-600 rounded-2xl flex items-center justify-center mx-auto mb-5 group-hover:scale-110 transition-transform duration-300">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <h3 className="font-bold text-lg text-slate-900 mb-2">Plain English</h3>
            <p className="text-slate-500 leading-relaxed">Complex spaghetti code translated into simple, human-readable logic summaries.</p>
          </div>
          <div className="group p-6 rounded-3xl bg-white border border-slate-200 hover:border-brand-200 hover:shadow-xl hover:shadow-brand-100/50 transition-all duration-300">
            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-5 group-hover:scale-110 transition-transform duration-300">
               <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" /></svg>
            </div>
            <h3 className="font-bold text-lg text-slate-900 mb-2">Visual Flows</h3>
            <p className="text-slate-500 leading-relaxed">Architecture and data flow visualized instantly with auto-generated Mermaid diagrams.</p>
          </div>
          <div className="group p-6 rounded-3xl bg-white border border-slate-200 hover:border-brand-200 hover:shadow-xl hover:shadow-brand-100/50 transition-all duration-300">
            <div className="w-14 h-14 bg-teal-50 text-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-5 group-hover:scale-110 transition-transform duration-300">
               <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
            </div>
            <h3 className="font-bold text-lg text-slate-900 mb-2">Junior Guides</h3>
            <p className="text-slate-500 leading-relaxed">Detailed docstrings, "gotchas", and educational notes for easy onboarding.</p>
          </div>
        </div>
      </main>
      
      {/* Footer */}
      <footer className="bg-white/50 border-t border-slate-200 py-8 mt-auto">
        <div className="max-w-6xl mx-auto px-6 text-center">
            <p className="text-slate-400 text-sm">Powered by Google Gemini 2.5 Flash & Mermaid.js</p>
        </div>
      </footer>
    </div>
  );
};

export default App;
