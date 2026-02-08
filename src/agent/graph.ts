import { StateGraph, END } from "@langchain/langgraph";                                                                                                                          
  import { AgentState, AgentStateType } from './state.js';                                                                                                                            
  import {                                                                                                                                                                         
    extractBrandNode,                                                                                                                                                              
    checkMilledNode,                                                                                                                                                               
    analyzeMilledContentNode,                                                                                                                                                      
    searchFallbackNode,                                                                                                                                                            
  } from './nodes.js';                                                                                                                                                                
  import { Page } from 'playwright';                                                                                                                                               
                                                                                                                                                                                   
  export function createAgentGraph(page: Page) {                                                                                                                                   
    const workflow = new StateGraph(AgentState)                                                                                                                                    
      // Add nodes                                                                                                                                                                 
      .addNode("extractBrand", extractBrandNode)                                                                                                                                   
      .addNode("checkMilled", (state: AgentStateType) => checkMilledNode(state, page))                                                                                             
      .addNode("analyzeContent", analyzeMilledContentNode)                                                                                                                         
      .addNode("searchFallback", (state: AgentStateType) => searchFallbackNode(state, page))                                                                                       
                                                                                                                                                                                   
      // Define flow                                                                                                                                                               
      .addEdge("__start__", "extractBrand")                                                                                                                                        
      .addEdge("extractBrand", "checkMilled")                                                                                                                                      
                                                                                                                                                                                   
      // After checking Milled, decide next step                                                                                                                                   
      .addConditionalEdges(                                                                                                                                                        
        "checkMilled",                                                                                                                                                             
        (state: AgentStateType) => {                                                                                                                                               
          if (state.milledFound) {                                                                                                                                                 
            return "analyzeContent";                                                                                                                                               
          } else {                                                                                                                                                                 
            return "searchFallback";                                                                                                                                               
          }                                                                                                                                                                        
        },                                                                                                                                                                         
        {                                                                                                                                                                          
          analyzeContent: "analyzeContent",                                                                                                                                        
          searchFallback: "searchFallback",                                                                                                                                        
        }                                                                                                                                                                          
      )                                                                                                                                                                            
                                                                                                                                                                                   
      // Both paths end                                                                                                                                                            
      .addEdge("analyzeContent", END)                                                                                                                                              
      .addEdge("searchFallback", END);                                                                                                                                             
                                                                                                                                                                                   
    return workflow.compile();                                                                                                                                                     
  }                                                                                                                                                                                
                                                                                                                                                                                   
  // Helper function to run the agent                                                                                                                                              
  export async function runAgent(websiteUrl: string, page: Page) {                                                                                                                 
    const app = createAgentGraph(page);                                                                                                                                            
                                                                                                                                                                                   
    const initialState: Partial<AgentStateType> = {                                                                                                                                
      websiteUrl,                                                                                                                                                                  
      brandName: '',                                                                                                                                                               
      milledChecked: false,                                                                                                                                                        
      milledFound: false,                                                                                                                                                          
      hasRecentEmails: false,                                                                                                                                                      
      emailCount: 0,                                                                                                                                                               
      lastEmailDate: null,                                                                                                                                                         
      searchAttempted: false,                                                                                                                                                      
      searchResults: null,                                                                                                                                                         
      isActive: false,                                                                                                                                                             
      confidence: 'low',                                                                                                                                                           
      reasoning: '',                                                                                                                                                               
      error: null,                                                                                                                                                                 
      nextAction: 'check_milled',                                                                                                                                                  
    };                                                                                                                                                                             
                                                                                                                                                                                   
    const result = await app.invoke(initialState);                                                                                                                                 
                                                                                                                                                                                   
    return result;                                                                                                                                                                 
  }                                  