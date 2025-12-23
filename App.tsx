import React, { useState, useEffect, useCallback } from 'react';
import { Search, RefreshCw, Copy, Check, Download, BrainCircuit, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { fetchBookSources } from './services/scraperService';
import { analyzeTitles } from './services/geminiService';
import { BookSource, ScrapeStatus, AnalysisResult } from './types';
import { SourceCard } from './components/SourceCard';

const App: React.FC = () => {
  const [sources, setSources] = useState<BookSource[]>([]);
  const [status, setStatus] = useState<ScrapeStatus>(ScrapeStatus.IDLE);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredSources, setFilteredSources] = useState<BookSource[]>([]);
  const [copiedAll, setCopiedAll] = useState(false);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  
  // AI Analysis State
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleFetch = useCallback(async (page: number) => {
    setStatus(ScrapeStatus.LOADING);
    setError(null);
    setAnalysis(null);
    setSources([]); // Clear previous sources to show loading state effectively

    const result = await fetchBookSources(page);

    if (result.success) {
      setSources(result.data);
      setStatus(ScrapeStatus.SUCCESS);
    } else {
      setError(result.error || "Unknown error");
      setStatus(ScrapeStatus.ERROR);
    }
  }, []);

  // Filter logic
  useEffect(() => {
    const lowerTerm = searchTerm.toLowerCase();
    const filtered = sources.filter(
      source => 
        source.title.toLowerCase().includes(lowerTerm) || 
        source.id.includes(lowerTerm)
    );
    setFilteredSources(filtered);
  }, [searchTerm, sources]);

  // Initial fetch on mount or page change
  useEffect(() => {
    handleFetch(currentPage);
  }, [handleFetch, currentPage]);

  const handleCopyAll = () => {
    const allLinks = filteredSources.map(s => s.jsonUrl).join('\n');
    navigator.clipboard.writeText(allLinks);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const handleAnalyze = async () => {
    if (sources.length === 0) return;
    
    setIsAnalyzing(true);
    const titles = sources.map(s => s.title);
    const result = await analyzeTitles(titles);
    
    if (result) {
      setAnalysis(result);
    } else {
      // Small graceful fallback if no key or error
      setError("AI Analysis failed. Check console or API Key configuration.");
      setTimeout(() => setError(null), 3000);
    }
    setIsAnalyzing(false);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1) return;
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Helper to generate page numbers for the pagination UI
  const getPageNumbers = () => {
    const totalButtons = 5;
    // Ensure we start at 1, and try to center the current page
    let startPage = Math.max(1, currentPage - Math.floor(totalButtons / 2));
    
    // Create array of page numbers
    const pages = [];
    for (let i = 0; i < totalButtons; i++) {
        pages.push(startPage + i);
    }
    return pages;
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 text-white p-2 rounded-lg">
                <Download size={24} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Book Source Extractor</h1>
                <p className="text-xs text-gray-500">Auto-generate JSON links from yckceo.sbs</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {process.env.API_KEY && sources.length > 0 && (
                 <button
                 onClick={handleAnalyze}
                 disabled={isAnalyzing}
                 className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100 disabled:opacity-50 transition-colors"
                 title="Use Gemini to analyze titles"
               >
                 <BrainCircuit size={18} />
                 {isAnalyzing ? 'Analyzing...' : 'AI Analyze'}
               </button>
              )}
             
              <button
                onClick={() => handleFetch(currentPage)}
                disabled={status === ScrapeStatus.LOADING}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                <RefreshCw size={18} className={status === ScrapeStatus.LOADING ? 'animate-spin' : ''} />
                Refresh Page
              </button>
              
              <button
                onClick={handleCopyAll}
                disabled={filteredSources.length === 0}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
              >
                {copiedAll ? <Check size={18} /> : <Copy size={18} />}
                {copiedAll ? 'Copied!' : 'Copy All JSONs'}
              </button>
            </div>
          </div>

          {/* Search Bar - only show if we have data */}
          {sources.length > 0 && (
            <div className="mt-4 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={18} className="text-gray-400" />
                </div>
                <input
                type="text"
                placeholder="Filter by title or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 sm:text-sm"
                />
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full">
        
        {/* Status Messages */}
        {status === ScrapeStatus.ERROR && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-md flex items-start gap-3">
             <AlertCircle className="text-red-500 mt-0.5" size={20}/>
             <div>
                <h3 className="text-red-800 font-medium">Error Fetching Page {currentPage}</h3>
                <p className="text-red-700 text-sm">{error}</p>
                <p className="text-red-600 text-xs mt-1">
                    Wait a moment and try refreshing.
                </p>
             </div>
          </div>
        )}

        {/* AI Analysis Result */}
        {analysis && (
          <div className="mb-6 bg-purple-50 border border-purple-100 rounded-lg p-4 animate-in fade-in slide-in-from-top-4 duration-500">
             <div className="flex items-center gap-2 mb-2">
                <BrainCircuit className="text-purple-600" size={20} />
                <h3 className="font-semibold text-purple-900">AI Analysis</h3>
             </div>
             <p className="text-purple-800 text-sm mb-3">{analysis.summary}</p>
             <div className="flex flex-wrap gap-2">
                {analysis.tags.map((tag, idx) => (
                  <span key={idx} className="px-2 py-1 bg-white text-purple-700 text-xs font-medium rounded border border-purple-200 shadow-sm">
                    {tag}
                  </span>
                ))}
             </div>
          </div>
        )}

        {/* Loading Skeleton */}
        {status === ScrapeStatus.LOADING && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg p-4 h-32 animate-pulse border border-gray-200">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2 mb-8"></div>
                <div className="h-8 bg-gray-100 rounded w-full"></div>
              </div>
            ))}
          </div>
        )}

        {/* Results */}
        {status === ScrapeStatus.SUCCESS && (
          <>
            <div className="mb-4 text-sm text-gray-500 flex justify-between items-center">
              <span>Found {filteredSources.length} sources on Page {currentPage}</span>
              {filteredSources.length !== sources.length && (
                 <span>(Filtered from {sources.length})</span>
              )}
            </div>

            {filteredSources.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredSources.map((source) => (
                  <SourceCard key={source.id} source={source} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <p>No sources found matching your filter.</p>
              </div>
            )}
          </>
        )}

        {/* Quick Page Select Pagination */}
        <div className="mt-8 flex justify-center items-center gap-2 py-4 border-t border-gray-200 flex-wrap">
            <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1 || status === ScrapeStatus.LOADING}
                className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Previous Page"
            >
                <ChevronLeft size={16} />
                <span className="hidden sm:inline">Prev</span>
            </button>
            
            {getPageNumbers().map(pageNum => (
                <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    disabled={status === ScrapeStatus.LOADING}
                    className={`min-w-[40px] px-3 py-2 text-sm font-medium rounded-lg transition-colors border ${
                        currentPage === pageNum
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                >
                    {pageNum}
                </button>
            ))}

            <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={status === ScrapeStatus.LOADING || (status === ScrapeStatus.ERROR && sources.length === 0)}
                className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Next Page"
            >
                <span className="hidden sm:inline">Next</span>
                <ChevronRight size={16} />
            </button>
        </div>
      </main>
      
      <footer className="bg-white border-t border-gray-200 py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center text-xs text-gray-400">
          Generated for automated source extraction. Data fetched via allorigins/corsproxy/codetabs proxies.
        </div>
      </footer>
    </div>
  );
};

export default App;