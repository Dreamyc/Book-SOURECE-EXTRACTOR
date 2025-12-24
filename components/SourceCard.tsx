import React, { useState } from 'react';
import { BookSource } from '../types';
import { Copy, Check, ExternalLink, FileJson } from 'lucide-react';

interface SourceCardProps {
  source: BookSource;
}

export const SourceCard: React.FC<SourceCardProps> = ({ source }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(source.jsonUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4 hover:shadow-md transition-shadow duration-200 flex flex-col justify-between h-full">
      <div>
        <div className="flex flex-col gap-1 sm:gap-0 sm:flex-row sm:items-start sm:justify-between mb-2">
          <h3 className="text-sm sm:text-base font-semibold text-gray-800 line-clamp-2 leading-tight" title={source.title}>
            {source.title}
          </h3>
          <span className="text-[10px] sm:text-xs font-mono bg-gray-100 text-gray-500 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded self-start sm:self-auto shrink-0 whitespace-nowrap">
            ID: {source.id}
          </span>
        </div>
        
        <div className="mb-3">
          <a 
            href={source.originalUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 w-fit"
          >
            Original Page <ExternalLink size={10} className="sm:w-3 sm:h-3" />
          </a>
        </div>
      </div>

      <div className="bg-gray-50 p-2 sm:p-3 rounded-md border border-gray-100">
        <div className="flex items-center gap-1 sm:gap-2 mb-1">
            <FileJson size={12} className="text-orange-500 sm:w-3.5 sm:h-3.5"/>
            <span className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase">JSON Source</span>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <code className="text-[10px] sm:text-xs text-gray-600 truncate flex-1 bg-white px-1.5 py-0.5 sm:px-2 sm:py-1 rounded border border-gray-200">
            {source.jsonUrl}
          </code>
          <button
            onClick={handleCopy}
            className={`p-1 sm:p-1.5 rounded-md transition-colors duration-200 flex-shrink-0 ${
              copied 
                ? 'bg-green-100 text-green-600' 
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'
            }`}
            title="Copy JSON URL"
          >
            {copied ? <Check size={14} className="sm:w-4 sm:h-4" /> : <Copy size={14} className="sm:w-4 sm:h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
};