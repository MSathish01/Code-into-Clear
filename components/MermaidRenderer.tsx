
import React, { useEffect, useState } from 'react';
import mermaid from 'mermaid';
import { AlertCircle } from 'lucide-react';

interface MermaidRendererProps {
  chart: string;
  id?: string;
}

const MermaidRenderer: React.FC<MermaidRendererProps> = ({ chart, id = 'mermaid-chart' }) => {
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'base',
      securityLevel: 'loose',
      themeVariables: {
        primaryColor: '#ccfbf1', // teal-100
        primaryTextColor: '#134e4a', // teal-900
        primaryBorderColor: '#14b8a6', // teal-500
        lineColor: '#64748b',
        secondaryColor: '#f0fdfa', // teal-50
        tertiaryColor: '#fff',
        fontFamily: 'Inter',
      },
      // CRITICAL FOR PDF: Disable HTML labels. 
      // html2canvas fails to render foreignObject (HTML inside SVG). 
      // Setting this to false forces pure SVG text, which renders perfectly.
      flowchart: { htmlLabels: false },
    });
  }, []);

  useEffect(() => {
    const renderChart = async () => {
      if (!chart) return;
      
      try {
        setError(null);
        
        // --- Aggressive Cleaning Logic ---
        let cleanChart = chart.trim();
        cleanChart = cleanChart.replace(/```mermaid/g, '').replace(/```/g, '');
        cleanChart = cleanChart.replace(/^mermaid\s*(\n|$)/i, '');
        cleanChart = cleanChart.replace(/%%.*$/gm, ''); // Remove comments
        
        // Fix common AI error: "A, B, C --> D" should be "A & B & C --> D"
        // This regex matches lines starting with comma-separated alphanumeric IDs followed by an arrow/link
        cleanChart = cleanChart.replace(/^(\s*)((?:[A-Za-z0-9_]+,\s*)+[A-Za-z0-9_]+)(\s*[-=])/gm, (match, indent, nodes, arrow) => {
            return indent + nodes.replace(/,\s*/g, ' & ') + arrow;
        });

        cleanChart = cleanChart.trim();

        // Fallback checks
        const typeMatch = cleanChart.match(/^(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|gitGraph|mindmap|timeline)/m);
        if (typeMatch && typeMatch.index !== undefined) {
          cleanChart = cleanChart.substring(typeMatch.index);
        } else {
             if (!cleanChart.includes('-->') && !cleanChart.includes('graph ') && !cleanChart.includes('classDef')) {
                 throw new Error("Invalid Mermaid code detected.");
             }
        }

        const uniqueId = `${id}-${Math.random().toString(36).substr(2, 9)}`;
        const { svg } = await mermaid.render(uniqueId, cleanChart);
        setSvg(svg);
        
      } catch (err: any) {
        console.error('Mermaid render error:', err);
        setError(`Syntax Error: ${err.message || 'The AI generated an invalid diagram definition.'}`);
      }
    };

    renderChart();
  }, [chart, id]);

  if (error) {
    return (
      <div className="w-full p-6 bg-red-50 border border-red-200 rounded-xl flex flex-col items-start gap-3">
        <div className="flex items-center gap-2 text-red-700 font-semibold">
           <AlertCircle className="w-5 h-5" />
           <span>Diagram Rendering Failed</span>
        </div>
        <p className="text-sm text-red-600">{error}</p>
        <details className="w-full text-xs">
          <summary className="cursor-pointer text-red-500 hover:text-red-700 font-medium select-none mb-2">View Raw Code</summary>
          <pre className="bg-white p-4 rounded-lg border border-red-100 overflow-auto max-h-64 font-mono whitespace-pre-wrap text-slate-700">{chart}</pre>
        </details>
      </div>
    );
  }

  return (
    <div className="w-full bg-transparent flex flex-col items-center overflow-visible">
      {/* 
         CRITICAL STYLE FOR PDF: 
         Force the SVG to fit the container width (100%) and scale height automatically.
         This prevents clipping when the diagram is wider than the A4 page.
         Added margin: auto to force centering.
      */}
      <style dangerouslySetInnerHTML={{__html: `
        #${id} svg {
          max-width: 100% !important;
          height: auto !important;
          display: block;
          margin-left: auto !important;
          margin-right: auto !important;
        }
      `}} />

      {svg ? (
          <div 
            id={id}
            dangerouslySetInnerHTML={{ __html: svg }} 
            className="mermaid-diagram w-full flex justify-center"
          />
      ) : (
          <div className="animate-pulse flex flex-col space-y-4 w-full justify-center items-center p-10">
            <div className="h-4 bg-slate-200 rounded w-1/3"></div>
            <div className="h-32 bg-slate-100 rounded w-2/3 border border-slate-200 border-dashed"></div>
          </div>
      )}
    </div>
  );
};

export default MermaidRenderer;
