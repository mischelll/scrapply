import { Browser, Page } from "playwright";
import { chromium } from 'playwright-extra';  
import StealthPlugin from 'puppeteer-extra-plugin-stealth';   


chromium.use(StealthPlugin());
export interface WebsiteCheckResult {
  isAccessible: boolean;
  statusCode: number | null;
  responseTime: number | null;
  error: string | null;
}

export class WebsiteChecker {                                                                                                                                                    
  private browser: Browser | null = null;                                                                                                                                        
                                                                                                                                                                                 
  async initialize() {                                                                                                                                                           
    this.browser = await chromium.launch({                                                                                                                                       
      headless: true,                                                                                                                                                            
      args: [                                                                                                                                                                    
        '--no-sandbox',                                                                                                                                                          
        '--disable-setuid-sandbox',                                                                                                                                              
        '--disable-blink-features=AutomationControlled',                                                                                                                         
      ],                                                                                                                                                                         
    });                                                                                                                                                                          
                                                                                                                                                                                 
    console.log('Browser initialized with stealth mode');                                                                                                                        
  }   

  async checkWebsite(url: string): Promise<WebsiteCheckResult> {
    if (!this.browser) {
      throw new Error("Browser not initialized. Call initialize() first.");
    }

    const startTime = Date.now();
    let page: Page | null = null;

    try {
      page = await this.browser.newPage();
      page.setDefaultTimeout(30000);

      const response = await page.goto(url, {
        waitUntil: "domcontentloaded", // Don't wait for everything
      });

      const responseTime = Date.now() - startTime;

      if (!response) {
        return {
          isAccessible: false,
          statusCode: null,
          responseTime,
          error: "No response received",
        };
      }

      const statusCode = response.status();
      const isAccessible = statusCode >= 200 && statusCode < 400;

      return {
        isAccessible,
        statusCode,
        responseTime,
        error: isAccessible ? null : `HTTP ${statusCode}`,
      };
    } catch (error: any) {
      const responseTime = Date.now() - startTime;

      return {
        isAccessible: false,
        statusCode: null,
        responseTime,
        error: error.message || "Unknown error",
      };
    } finally {
      if (page) {
        await page.close();
      }
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      console.log("Browser closed");
    }
  }
}
