import path from "path";
import { WebsiteChecker } from "./checker.js";
import { readWebsitesFromExcel, CheckResult, writeResultsToExcel } from "./excel.js";
import { runAgent } from "./agent/graph.js";

                                                                                                                                                        
                                                                                                                                                                                   
  async function main() {                                                                                                                                                          
    const inputFile = process.argv[2] || path.join(__dirname, '../data/input/websites.xlsx');                                                                                      
    const outputFile = process.argv[3] || path.join(__dirname, '../data/output/results.xlsx');                                                                                     
                                                                                                                                                                                   
    console.log(`Reading websites from: ${inputFile}`);                                                                                                                            
                                                                                                                                                                                   
    const websites = await readWebsitesFromExcel(inputFile);                                                                                                                       
                                                                                                                                                                                   
    const checker = new WebsiteChecker();                                                                                                                                          
    await checker.initialize();                                                                                                                                                    
                                                                                                                                                                                   
    const results: CheckResult[] = [];                                                                                                                                             
                                                                                                                                                                                   
    for (let i = 0; i < websites.length; i++) {                                                                                                                                    
      const website = websites[i];      
      if(!website) return;                                                                                                                                           
      console.log(`\n[${i + 1}/${websites.length}] Processing ${website}...`);                                                                                                     
                                                                                                                                                                                   
      try {                                                                                                                                                                        
        // Create a new page for this check                                                                                                                                        
        const page = await checker['browser']!.newPage();                                                                                                                          
                                                                                                                                                                                   
        // Run the agent                                                                                                                                                           
        const agentResult = await runAgent(website, page);                                                                                                                         
                                                                                                                                                                                   
        await page.close();                                                                                                                                                        
                                                                                                                                                                                   
        console.log(`  Final result: ${agentResult.isActive ? '✓ ACTIVE' : '✗ Inactive'} (${agentResult.confidence} confidence)`);                                                 
                                                                                                                                                                                   
        // Determine source                                                                                                                                                        
        let source: 'milled' | 'search' | 'none' = 'none';                                                                                                                         
        if (agentResult.milledFound) {                                                                                                                                             
          source = 'milled';                                                                                                                                                       
        } else if (agentResult.searchAttempted) {                                                                                                                                  
          source = 'search';                                                                                                                                                       
        }                                                                                                                                                                          
                                                                                                                                                                                   
        results.push({
            website,
            isActive: agentResult.isActive,
            emailCount: agentResult.emailCount || 0,
            lastEmailDate: agentResult.lastEmailDate,
            confidence: agentResult.confidence,
            reasoning: agentResult.reasoning || '',
            source,
            error: agentResult.error,
            lastChecked: new Date().toISOString(),
            isAccessible: false,
            statusCode: null,
            responseTime: null
        });                                                                                                                                                                        
                                                                                                                                                                                   
      } catch (error: any) {                                                                                                                                                       
        console.log(`  Error: ${error.message}`);                                                                                                                                  
                                                                                                                                                                                   
        results.push({
            website,
            isActive: false,
            emailCount: 0,
            lastEmailDate: null,
            confidence: 'low',
            reasoning: '',
            source: 'none',
            error: error.message,
            lastChecked: new Date().toISOString(),
            isAccessible: false,
            statusCode: null,
            responseTime: null
        });                                                                                                                                                                        
      }                                                                                                                                                                            
                                                                                                                                                                                   
      // Rate limiting                                                                                                                                                             
      await new Promise(resolve => setTimeout(resolve, 3000));                                                                                                                     
    }                                                                                                                                                                              
                                                                                                                                                                                   
    await checker.close();                                                                                                                                                         
                                                                                                                                                                                   
    await writeResultsToExcel(inputFile, outputFile, results);                                                                                                                     
                                                                                                                                                                                   
    const active = results.filter(r => r.isActive).length;                                                                                                                         
    const milledCount = results.filter(r => r.source === 'milled').length;                                                                                                         
    const searchCount = results.filter(r => r.source === 'search').length;                                                                                                         
                                                                                                                                                                                   
    console.log(`\n✓ Summary:`);                                                                                                                                                   
    console.log(`  Total: ${results.length} websites`);                                                                                                                            
    console.log(`  Active: ${active} (${Math.round(active/results.length*100)}%)`);                                                                                                
    console.log(`  Found on Milled: ${milledCount}`);                                                                                                                              
    console.log(`  Found via Search: ${searchCount}`);                                                                                                                             
  }                                                                                                                                                                                
                                                                                                                                                                                   
  main().catch(console.error);           