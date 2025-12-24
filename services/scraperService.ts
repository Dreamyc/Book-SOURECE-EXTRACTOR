import { BookSource, ScrapeResult } from '../types';
import { TARGET_URL, BASE_URL, JSON_BASE_URL } from '../constants';

// Proxy definitions
const PROXY_CORS_IO = "https://corsproxy.io/?";
const PROXY_ALL_ORIGINS = "https://api.allorigins.win/get?url=";
const PROXY_CODETABS = "https://api.codetabs.com/v1/proxy?quest=";

// Helper to check if HTML looks like it contains what we want
const isValidContent = (html: string): boolean => {
  if (!html || html.length < 500) return false; // Too short to be the real index page
  // Check for the specific link pattern we need
  const hasLinks = /content\/id\/\d+\.html/.test(html);
  return hasLinks;
};

// Fetchers
const fetchViaCorsProxy = async (url: string): Promise<string> => {
  const response = await fetch(`${PROXY_CORS_IO}${url}`);
  if (!response.ok) throw new Error(`CorsProxy error: ${response.status}`);
  const html = await response.text();
  if (!isValidContent(html)) throw new Error("CorsProxy returned invalid content");
  return html;
};

const fetchViaAllOrigins = async (url: string): Promise<string> => {
  const encodedUrl = encodeURIComponent(url);
  const response = await fetch(`${PROXY_ALL_ORIGINS}${encodedUrl}&timestamp=${Date.now()}`);
  if (!response.ok) throw new Error(`AllOrigins error: ${response.status}`);
  const data = await response.json();
  const html = data.contents;
  if (!isValidContent(html)) throw new Error("AllOrigins returned invalid content");
  return html;
};

const fetchViaCodeTabs = async (url: string): Promise<string> => {
  const response = await fetch(`${PROXY_CODETABS}${url}`);
  if (!response.ok) throw new Error(`CodeTabs error: ${response.status}`);
  const html = await response.text();
  if (!isValidContent(html)) throw new Error("CodeTabs returned invalid content");
  return html;
};

export const fetchBookSources = async (page: number = 1): Promise<ScrapeResult> => {
  // Construct the specific URL for the page
  const urlToFetch = page === 1 ? TARGET_URL : `${TARGET_URL}?page=${page}`;
  
  console.log(`Fetching page ${page}: ${urlToFetch}`);

  // We define a set of strategies (promises) to race against each other.
  // We use Promise.any() to get the first *successful* result.
  const strategies: Promise<string>[] = [
    fetchViaCorsProxy(urlToFetch),
    fetchViaAllOrigins(urlToFetch),
    fetchViaCodeTabs(urlToFetch),
  ];
  
  // Add fallback only for page 1 logic, or generic fallback
  if (page === 1) {
      strategies.push(fetchViaCorsProxy(BASE_URL + "/"));
  }

  try {
    console.log("Starting concurrent fetch strategies...");
    // @ts-ignore - Promise.any is ES2021
    const html = await Promise.any(strategies);
    console.log("Successfully fetched valid HTML content.");
    return parseHtmlContent(html);
  } catch (error: any) {
    console.error("All fetch strategies failed:", error);
    
    // Construct a detailed error message
    let errorDetails = "Unknown error";
    
    if (error && (error.name === 'AggregateError' || Array.isArray(error.errors))) {
      errorDetails = (error as any).errors.map((e: any) => e.message).join("; ");
    } else if (error instanceof Error) {
      errorDetails = error.message;
    }

    return {
      success: false,
      data: [],
      error: `Auto-fetch failed for Page ${page}. All proxies were blocked or returned invalid data. Please use Manual Mode or try again. (Details: ${errorDetails})`
    };
  }
};

export const parseHtmlContent = (html: string): ScrapeResult => {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const links = Array.from(doc.querySelectorAll('a'));
    
    const uniqueSources = new Map<string, BookSource>();

    // Regex to match content/id/xxxxx.html
    const idRegex = /content\/id\/(\d+)\.html/;
    
    // Regex 1: YYYY-MM-DD
    const dateRegex1 = /(\d{4}-\d{2}-\d{2})/;
    // Regex 2: MM/DD HH:mm (e.g., 11/24 13:02)
    const dateRegex2 = /(\d{1,2}\/\d{1,2}\s+\d{1,2}:\d{1,2})/;
    // Regex 3: Relative time (e.g., 5天前, 18小时前, 30分钟前)
    const dateRegex3 = /(\d+\s*(?:天|小时|分钟|秒)前)/;

    links.forEach(link => {
      const href = link.getAttribute('href');
      if (!href) return;

      const match = href.match(idRegex);
      if (match) {
        const id = match[1];
        // Clean up title: remove newlines, extra spaces
        const title = link.textContent?.replace(/\s+/g, ' ').trim() || `Source ${id}`;
        
        // Construct the full JSON URL
        const jsonUrl = `${JSON_BASE_URL}/${id}.json`;
        
        // Construct original URL robustly
        let originalUrl = href;
        try {
            originalUrl = new URL(href, BASE_URL + '/').href;
        } catch (e) {
            if (!href.startsWith('http')) {
                originalUrl = `${BASE_URL}/${href.replace(/^\//, '')}`;
            }
        }

        // Try to find a date
        let updateDate: string | undefined;
        
        // Check 1: Immediate parent (e.g., <li>Title <span>Date</span></li>)
        let contextText = link.parentElement?.textContent || "";
        // Clean up excessive whitespace for regex matching
        contextText = contextText.replace(/\s+/g, ' '); 
        
        let dateMatch = contextText.match(dateRegex1) || 
                        contextText.match(dateRegex2) || 
                        contextText.match(dateRegex3);

        // Check 2: Grandparent if not found in parent
        if (!dateMatch && link.parentElement?.parentElement) {
             let grandParentText = link.parentElement.parentElement.textContent || "";
             grandParentText = grandParentText.replace(/\s+/g, ' ');
             
             // Safety check: ensure we aren't scanning the entire body
             if (grandParentText.length < 1000) {
                 dateMatch = grandParentText.match(dateRegex1) || 
                             grandParentText.match(dateRegex2) || 
                             grandParentText.match(dateRegex3);
             }
        }
        
        if (dateMatch) {
            updateDate = dateMatch[1];
        }

        if (!uniqueSources.has(id)) {
          uniqueSources.set(id, {
            id,
            title,
            originalUrl,
            jsonUrl,
            updateDate
          });
        }
      }
    });

    const sources = Array.from(uniqueSources.values());
    
    if (sources.length === 0) {
        return {
            success: false,
            data: [],
            error: "Parsed HTML successfully but found no matching source links on this page."
        };
    }

    return {
      success: true,
      data: sources
    };

  } catch (error: any) {
    return {
      success: false,
      data: [],
      error: `Failed to parse HTML content: ${error.message}`
    };
  }
};