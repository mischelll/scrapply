import { search } from "duck-duck-scrape";

export interface SearchResult {
    title: string;
    description: string;
    url: string;
}

export async function searchForNewsletter(brandName: string): Promise<SearchResult[]> {                                                                                          
    try {                                                                                                                                                                          
      console.log(`Searching DuckDuckGo for: "${brandName} newsletter"`);                                                                                                      
                                                                                                                                                                                   
      const results = await search(`${brandName} newsletter email campaign`, {                                                                                                     
        safeSearch: 0,                                                                                                                                                             
      });                                                                                                                                                                          
                                                                                                                                                                                   
      const searchResults: SearchResult[] = results.results.slice(0, 10).map(r => ({                                                                                               
        title: r.title,                                                                                                                                                            
        description: r.description,                                                                                                                                                
        url: r.url,                                                                                                                                                                
      }));                                                                                                                                                                         
                                                                                                                                                                                   
      console.log(`Found ${searchResults.length} search results`);                                                                                                             
                                                                                                                                                                                   
      return searchResults;                                                                                                                                                        
                                                                                                                                                                                   
    } catch (error: any) {                                                                                                                                                         
      console.log(`Search failed: ${error.message}`);                                                                                                                          
      return [];                                                                                                                                                                   
    }                                                                                                                                                                              
  }                                                                                                                                                                                
                                                                                                                                                                                   
  export function formatSearchResultsForLLM(results: SearchResult[]): string {                                                                                                     
    if (results.length === 0) {                                                                                                                                                    
      return 'No search results found.';                                                                                                                                           
    }                                                                                                                                                                              
                                                                                                                                                                                   
    return results.map((result, index) => {                                                                                                                                        
      return `${index + 1}. ${result.title}                                                                                                                                        
     URL: ${result.url}                                                                                                                                                            
     Description: ${result.description}                                                                                                                                            
  `;                                                                                                                                                                               
    }).join('\n');                                                                                                                                                                 
  }                             