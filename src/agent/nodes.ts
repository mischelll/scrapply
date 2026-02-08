                                                                                                                                                                                 
  import { AgentStateType } from './state.js';                                                                                                                                        
  import { ChatOpenAI } from "@langchain/openai";                                                                                                 
  import { Page } from 'playwright';                                                                                                                                               
  import { searchForNewsletter, formatSearchResultsForLLM } from '../tools/search-tool.js';                                                                                           
                                                                                                                                                                                   
  // Initialize LLM                                                                                                                                                                
  const llm = new ChatOpenAI({                                                                                                                                                     
    modelName: 'gpt-4o-mini',                                                                                                                                                      
    temperature: 0,                                                                                                                                                                
  });                                                                                                                                                                              
                                                                                                                                                                                   
  function extractBrandName(url: string): string | undefined{                                                                                                                                 
    try {                                                                                                                                                                          
      const urlObj = new URL(url);                                                                                                                                                 
      const domain = urlObj.hostname.replace('www.', '');                                                                                                                          
      const brand = domain.split('.')[0];                                                                                                                                          
      return brand?.toLowerCase();                                                                                                                                                  
    } catch {                                                                                                                                                                      
      return '';                                                                                                                                                                   
    }                                                                                                                                                                              
  }                                                                                                                                                                                
                                                                                                                                                                                   
  // Node 1: Extract brand from URL                                                                                                                                                
  export function extractBrandNode(state: AgentStateType): Partial<AgentStateType> {                                                                                               
    const brandName = extractBrandName(state.websiteUrl);                                                                                                                          
                                                                                                                                                                                   
    console.log(`  Extracted brand: "${brandName}"`);                                                                                                                              
                                                                                                                                                                                   
    return {                                                                                                                                                                       
      brandName,                                                                                                                                                                   
      nextAction: 'check_milled',                                                                                                                                                  
    };                                                                                                                                                                             
  }                                                                                                                                                                                
                                                                                                                                                                                   
  export async function checkMilledNode(                                                                                                                                           
    state: AgentStateType,                                                                                                                                                         
    page: Page                                                                                                                                                                     
  ): Promise<Partial<AgentStateType>> {                                                                                                                                            
    const { brandName, websiteUrl } = state;                                                                                                                                       
                                                                                                                                                                                   
    try {                                                                                                                                                                          
      console.log(`  Navigating to Milled.com homepage...`);                                                                                                                       
                                                                                                                                                                                   
      // Go to milled.com homepage first                                                                                                                                           
      await page.goto('https://milled.com', {                                                                                                                                      
        waitUntil: 'domcontentloaded',                                                                                                                                             
        timeout: 30000,                                                                                                                                                            
      });                                                                                                                                                                          
                                                                                                                                                                                   
      await page.waitForTimeout(2000);                                                                                                                                             
                                                                                                                                                                                   
      // Check for captcha                                                                                                                                                         
      const hasCaptcha = await detectCaptcha(page);                                                                                                                                
      if (hasCaptcha) {                                                                                                                                                            
        console.log(`  ⚠️  Captcha detected - cannot proceed with Milled.com`);                                                                                                    
        return {                                                                                                                                                                   
          milledChecked: true,                                                                                                                                                     
          milledFound: false,                                                                                                                                                      
          error: 'Captcha detected on Milled.com',                                                                                                                                 
          nextAction: 'search_fallback',                                                                                                                                           
        };                                                                                                                                                                         
      }                                                                                                                                                                            
                                                                                                                                                                                   
      console.log(`  Searching for brand: "${brandName}"`);                                                                                                                        
                                                                                                                                                                                   
      // Find the search input - try multiple possible selectors                                                                                                                   
      const searchSelectors = [                                                                                                                                                    
        'input[type="search"]',                                                                                                                                                    
        'input[name="q"]',                                                                                                                                                         
        'input[placeholder*="Search"]',                                                                                                                                            
        'input[placeholder*="search"]',                                                                                                                                            
        '#search',                                                                                                                                                                 
        '.search-input',                                                                                                                                                           
        '[data-testid*="search"]',                                                                                                                                                 
      ];                                                                                                                                                                           
                                                                                                                                                                                   
      let searchInput = null;                                                                                                                                                      
      for (const selector of searchSelectors) {                                                                                                                                    
        searchInput = await page.locator(selector).first();                                                                                                                        
        const count = await searchInput.count();                                                                                                                                   
        if (count > 0) {                                                                                                                                                           
          console.log(`  Found search input with selector: ${selector}`);                                                                                                          
          break;                                                                                                                                                                   
        }                                                                                                                                                                          
      }                                                                                                                                                                            
                                                                                                                                                                                   
      if (!searchInput || await searchInput.count() === 0) {                                                                                                                       
        console.log(`  Could not find search input on Milled.com`);                                                                                                                
        return {                                                                                                                                                                   
          milledChecked: true,                                                                                                                                                     
          milledFound: false,                                                                                                                                                      
          error: 'Could not find search input',                                                                                                                                    
          nextAction: 'search_fallback',                                                                                                                                           
        };                                                                                                                                                                         
      }                                                                                                                                                                            
                                                                                                                                                                                   
      await searchInput.fill(brandName);                                                                                                                                           
      await page.keyboard.press('Enter');                                                                                                                                          
                                                                                                                                                                                   
      await page.waitForTimeout(3000);                                                                                                                                             
                                                                                                                                                                                   
      const currentUrl = page.url();                                                                                                                                               
      console.log(`  Current URL after search: ${currentUrl}`);                                                                                                                    
                                                                                                                                                                                   
      const pageText = await page.evaluate(() => {                                                                                                                                 
        const scripts = document.querySelectorAll('script, style, noscript');                                                                                                      
        scripts.forEach(el => el.remove());                                                                                                                                        
        return document.body.innerText;                                                                                                                                            
      });                                                                                                                                                                          
                                                                                                                                                                                   
      console.log(`  Extracted ${pageText.length} characters from search results`);                                                                                                
                                                                                                                                                                                   
      const noResultsPatterns = [                                                                                                                                                  
        /no results/i,                                                                                                                                                             
        /nothing found/i,                                                                                                                                                          
        /no emails found/i,                                                                                                                                                        
        /try another search/i,                                                                                                                                                     
        /couldn't find/i,                                                                                                                                                          
      ];                                                                                                                                                                           
                                                                                                                                                                                   
      const hasNoResults = noResultsPatterns.some(pattern => pattern.test(pageText));                                                                                              
                                                                                                                                                                                   
      if (hasNoResults) {                                                                                                                                                          
        console.log(`  No results found for "${brandName}"`);                                                                                                                      
        return {                                                                                                                                                                   
          milledChecked: true,                                                                                                                                                     
          milledFound: false,                                                                                                                                                      
          error: null,                                                                                                                                                             
          nextAction: 'search_fallback',                                                                                                                                           
        };                                                                                                                                                                         
      }                                                                                                                                                                            
                                                                                                                                                                                   
      return {                                                                                                                                                                     
        milledPageContent: pageText,                                                                                                                                               
        milledChecked: true,                                                                                                                                                       
        milledFound: true,                                                                                                                                                         
        nextAction: 'finalize',                                                                                                                                                    
      };                                                                                                                                                                           
                                                                                                                                                                                   
    } catch (error: any) {                                                                                                                                                         
      console.log(`  Error checking Milled: ${error.message}`);                                                                                                                    
                                                                                                                                                                                   
      return {                                                                                                                                                                     
        milledChecked: true,                                                                                                                                                       
        milledFound: false,                                                                                                                                                        
        error: error.message,                                                                                                                                                      
        nextAction: 'search_fallback',                                                                                                                                             
      };                                                                                                                                                                           
    }                                                                                                                                                                              
  }                                                                                                                                                                                
                                                                                                                                                                                   
  // Helper function to detect captcha                                                                                                                                             
  async function detectCaptcha(page: Page): Promise<boolean> {                                                                                                                     
    const captchaSelectors = [                                                                                                                                                     
      'iframe[src*="recaptcha"]',                                                                                                                                                  
      'iframe[src*="hcaptcha"]',                                                                                                                                                   
      'iframe[src*="captcha"]',                                                                                                                                                    
      '[class*="captcha"]',                                                                                                                                                        
      '[id*="captcha"]',                                                                                                                                                           
      '.g-recaptcha',                                                                                                                                                              
      '#captcha',                                                                                                                                                                  
    ];                                                                                                                                                                             
                                                                                                                                                                                   
    for (const selector of captchaSelectors) {                                                                                                                                     
      const count = await page.locator(selector).count();                                                                                                                          
      if (count > 0) {                                                                                                                                                             
        return true;                                                                                                                                                               
      }                                                                                                                                                                            
    }                                                                                                                                                                              
                                                                                                                                                                                   
    // Also check page content for captcha text                                                                                                                                    
    const pageText = await page.textContent('body') || '';                                                                                                                         
    const captchaPatterns = [                                                                                                                                                      
      /please verify/i,                                                                                                                                                            
      /security check/i,                                                                                                                                                           
      /prove you're human/i,                                                                                                                                                       
      /cloudflare/i,                                                                                                                                                               
    ];                                                                                                                                                                             
                                                                                                                                                                                   
    return captchaPatterns.some(pattern => pattern.test(pageText));                                                                                                                
  }                                                                                                                                                                                           
  // Node 3: Analyze Milled content with LLM                                                                                                                                       
  export async function analyzeMilledContentNode(                                                                                                                                  
    state: AgentStateType                                                                                                                                                          
  ): Promise<Partial<AgentStateType>> {                                                                                                                                            
    const { milledPageContent, brandName } = state;                                                                                                                                
                                                                                                                                                                                   
    if (!milledPageContent) {                                                                                                                                                      
      return {                                                                                                                                                                     
        hasRecentEmails: false,                                                                                                                                                    
        emailCount: 0,                                                                                                                                                             
        isActive: false,                                                                                                                                                           
        confidence: 'low',                                                                                                                                                         
        reasoning: 'No content to analyze',                                                                                                                                        
      };                                                                                                                                                                           
    }                                                                                                                                                                              
                                                                                                                                                                                   
    console.log(`  Analyzing content with LLM...`);                                                                                                                                
                                                                                                                                                                                   
    const prompt = `You are analyzing a Milled.com brand page for "${brandName}".                                                                                                  
                                                                                                                                                                                   
  Your task: Determine if this brand has sent any marketing emails in the LAST 7 DAYS.                                                                                             
                                                                                                                                                                                   
  Today's date is: ${new Date().toISOString().split('T')[0]}                                                                                                                       
                                                                                                                                                                                   
  Page content:                                                                                                                                                                    
  ${milledPageContent.slice(0, 8000)}                                                                                                                                              
                                                                                                                                                                                   
  Analyze the content and respond in JSON format:                                                                                                                                  
  {                                                                                                                                                                                
    "hasRecentEmails": true/false,                                                                                                                                                 
    "emailCount": <number of emails found on page>,                                                                                                                                
    "lastEmailDate": "<date of most recent email in YYYY-MM-DD format, or null>",                                                                                                  
    "confidence": "high/medium/low",                                                                                                                                               
    "reasoning": "<brief explanation of your analysis>"                                                                                                                            
  }                                                                                                                                                                                
                                                                                                                                                                                   
  Look for:                                                                                                                                                                        
  - Email subjects/titles with dates                                                                                                                                               
  - Text like "2 days ago", "yesterday", "3 hours ago" (these are recent!)                                                                                                         
  - Specific dates (compare to today's date)                                                                                                                                       
  - If no emails are shown or all are older than 7 days, return hasRecentEmails: false                                                                                             
                                                                                                                                                                                   
  IMPORTANT:                                                                                                                                                                       
  - "X days ago" where X <= 7 means ACTIVE                                                                                                                                         
  - "1 week ago" or less means ACTIVE                                                                                                                                              
  - Dates from the last 7 days mean ACTIVE                                                                                                                                         
  - If you see "No emails" or the page seems empty, return false                                                                                                                   
                                                                                                                                                                                   
  Return ONLY valid JSON, no other text.`;                                                                                                                                         
                                                                                                                                                                                   
    try {                                                                                                                                                                          
      const response = await llm.invoke(prompt);                                                                                                                                   
      const content = response.content.toString();                                                                                                                                 
                                                                                                                                                                                   
      // Extract JSON from response (handle markdown code blocks)                                                                                                                  
      let jsonStr = content;                                                                                                                                                       
      if (content.includes('```')) {                                                                                                                                               
        const match = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);                                                                                                            
        if (match && match[1]) {                                                                                                                                                               
          jsonStr = match[1];                                                                                                                                                      
        }                                                                                                                                                                          
      }                                                                                                                                                                            
                                                                                                                                                                                   
      const analysis = JSON.parse(jsonStr);                                                                                                                                        
                                                                                                                                                                                   
      console.log(`  LLM Analysis: ${analysis.hasRecentEmails ? '✓ ACTIVE' : '✗ Not active'}`);                                                                                    
      console.log(`  Reasoning: ${analysis.reasoning}`);                                                                                                                           
                                                                                                                                                                                   
      return {                                                                                                                                                                     
        hasRecentEmails: analysis.hasRecentEmails,                                                                                                                                 
        emailCount: analysis.emailCount || 0,                                                                                                                                      
        lastEmailDate: analysis.lastEmailDate,                                                                                                                                     
        isActive: analysis.hasRecentEmails,                                                                                                                                        
        confidence: analysis.confidence || 'medium',                                                                                                                               
        reasoning: analysis.reasoning,                                                                                                                                             
      };                                                                                                                                                                           
                                                                                                                                                                                   
    } catch (error: any) {                                                                                                                                                         
      console.log(`  LLM analysis failed: ${error.message}`);                                                                                                                      
                                                                                                                                                                                   
      return {                                                                                                                                                                     
        hasRecentEmails: false,                                                                                                                                                    
        emailCount: 0,                                                                                                                                                             
        isActive: false,                                                                                                                                                           
        confidence: 'low',                                                                                                                                                         
        reasoning: `Analysis failed: ${error.message}`,                                                                                                                            
        error: error.message,                                                                                                                                                      
      };                                                                                                                                                                           
    }                                                                                                                                                                              
  }                                                                                                                                                                                
                                                                                                                                                                                   
  // Node 4: Search fallback                                                                                                                                                       
  export async function searchFallbackNode(                                                                                                                                        
    state: AgentStateType,                                                                                                                                                         
    page: Page                                                                                                                                                                     
  ): Promise<Partial<AgentStateType>> {                                                                                                                                            
    const { brandName } = state;                                                                                                                                                   
                                                                                                                                                                                   
    console.log(`  Milled.com failed, trying search fallback...`);                                                                                                                 
                                                                                                                                                                                   
    try {                                                                                                                                                                          
      // Search for the brand + newsletter                                                                                                                                         
      const searchResults = await searchForNewsletter(brandName);                                                                                                                  
                                                                                                                                                                                   
      if (searchResults.length === 0) {                                                                                                                                            
        return {                                                                                                                                                                   
          searchAttempted: true,                                                                                                                                                   
          hasRecentEmails: false,                                                                                                                                                  
          isActive: false,                                                                                                                                                         
          confidence: 'high',                                                                                                                                                      
          reasoning: 'No results found on Milled.com or search engines',                                                                                                           
          nextAction: 'end',                                                                                                                                                       
        };                                                                                                                                                                         
      }                                                                                                                                                                            
                                                                                                                                                                                   
      const formattedResults = formatSearchResultsForLLM(searchResults);                                                                                                           
                                                                                                                                                                                   
      // Use LLM to analyze search results                                                                                                                                         
      const analysis = await analyzeSearchResults(brandName, formattedResults);                                                                                                    
                                                                                                                                                                                   
      return {                                                                                                                                                                     
        searchAttempted: true,                                                                                                                                                     
        searchResults: formattedResults,                                                                                                                                           
        hasRecentEmails: analysis.hasRecentActivity,                                                                                                                               
        isActive: analysis.hasRecentActivity,                                                                                                                                      
        confidence: analysis.confidence,                                                                                                                                           
        reasoning: analysis.reasoning,                                                                                                                                             
        nextAction: 'end',                                                                                                                                                         
      };                                                                                                                                                                           
                                                                                                                                                                                   
    } catch (error: any) {                                                                                                                                                         
      console.log(`  Search fallback error: ${error.message}`);                                                                                                                    
                                                                                                                                                                                   
      return {                                                                                                                                                                     
        searchAttempted: true,                                                                                                                                                     
        hasRecentEmails: false,                                                                                                                                                    
        isActive: false,                                                                                                                                                           
        confidence: 'low',                                                                                                                                                         
        reasoning: `Search fallback failed: ${error.message}`,                                                                                                                     
        error: error.message,                                                                                                                                                      
        nextAction: 'end',                                                                                                                                                         
      };                                                                                                                                                                           
    }                                                                                                                                                                              
  }                                                                                                                                                                                
                                                                                                                                                                                   
  async function analyzeSearchResults(                                                                                                                                             
    brandName: string,                                                                                                                                                             
    searchResults: string                                                                                                                                                          
  ): Promise<{                                                                                                                                                                     
    hasRecentActivity: boolean;                                                                                                                                                    
    confidence: 'high' | 'medium' | 'low';                                                                                                                                         
    reasoning: string;                                                                                                                                                             
  }> {                                                                                                                                                                             
    console.log(`  Analyzing search results with LLM...`);                                                                                                                         
                                                                                                                                                                                   
    const prompt = `You are analyzing search results to determine if "${brandName}" has active email marketing campaigns or newsletters.                                           
                                                                                                                                                                                   
  Today's date is: ${new Date().toISOString().split('T')[0]}                                                                                                                       
                                                                                                                                                                                   
  Search results for "${brandName} newsletter email campaign":                                                                                                                     
                                                                                                                                                                                   
  ${searchResults}                                                                                                                                                                 
                                                                                                                                                                                   
  Your task: Determine if there is evidence of RECENT (last 7-30 days) email marketing activity.                                                                                   
                                                                                                                                                                                   
  Look for:                                                                                                                                                                        
  - Newsletter signup pages                                                                                                                                                        
  - Email archive/example pages                                                                                                                                                    
  - Marketing campaign announcements                                                                                                                                               
  - URLs suggesting recent email activity (dates in URLs, blog posts about campaigns)                                                                                              
  - Descriptions mentioning "subscribe", "newsletter", "email updates"                                                                                                             
                                                                                                                                                                                   
  Respond in JSON format:                                                                                                                                                          
  {                                                                                                                                                                                
    "hasRecentActivity": true/false,                                                                                                                                               
    "confidence": "high/medium/low",                                                                                                                                               
    "reasoning": "<brief explanation>"                                                                                                                                             
  }                                                                                                                                                                                
                                                                                                                                                                                   
  Guidelines:                                                                                                                                                                      
  - If you see newsletter signup pages, that suggests active campaigns (medium confidence)                                                                                         
  - If you see recent blog posts/announcements about emails, that's evidence (high confidence)                                                                                     
  - If results are just generic company info with no email mentions, return false                                                                                                  
  - If you see email archive sites besides Milled (like reallygoodemails.com), that's evidence                                                                                     
                                                                                                                                                                                   
  Return ONLY valid JSON, no other text.`;                                                                                                                                         
                                                                                                                                                                                   
    try {                                                                                                                                                                          
      const response = await llm.invoke(prompt);                                                                                                                                   
      const content = response.content.toString();                                                                                                                                 
                                                                                                                                                                                   
      // Extract JSON                                                                                                                                                              
      let jsonStr = content;                                                                                                                                                       
      if (content.includes('```')) {                                                                                                                                               
        const match = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);                                                                                                            
        if (match && match[1]) {                                                                                                                                                               
          jsonStr = match[1];                                                                                                                                                      
        }                                                                                                                                                                          
      }                                                                                                                                                                            
                                                                                                                                                                                   
      const analysis = JSON.parse(jsonStr);                                                                                                                                        
                                                                                                                                                                                   
      console.log(`  Search analysis: ${analysis.hasRecentActivity ? '✓ Evidence found' : '✗ No evidence'}`);                                                                      
      console.log(`  Reasoning: ${analysis.reasoning}`);                                                                                                                           
                                                                                                                                                                                   
      return analysis;                                                                                                                                                             
                                                                                                                                                                                   
    } catch (error: any) {                                                                                                                                                         
      console.log(`  Search analysis failed: ${error.message}`);                                                                                                                   
                                                                                                                                                                                   
      return {                                                                                                                                                                     
        hasRecentActivity: false,                                                                                                                                                  
        confidence: 'low',                                                                                                                                                         
        reasoning: `Failed to analyze search results: ${error.message}`,                                                                                                           
      };                                                                                                                                                                           
    }                                                                                                                                                                              
  }                                       