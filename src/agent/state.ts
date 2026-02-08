import { Annotation } from "@langchain/langgraph";                                                                                                                               
                                                                                                                                                                                   
  export const AgentState = Annotation.Root({                                                                                                                                      
    // Input                                                                                                                                                                       
    websiteUrl: Annotation<string>,                                                                                                                                                
    brandName: Annotation<string>,                                                                                                                                                 
                                                                                                                                                                                   
    // Milled.com check                                                                                                                                                            
    milledPageContent: Annotation<string | null>,                                                                                                                                  
    milledChecked: Annotation<boolean>,                                                                                                                                            
    milledFound: Annotation<boolean>,                                                                                                                                              
                                                                                                                                                                                   
    // Analysis results                                                                                                                                                            
    hasRecentEmails: Annotation<boolean>,                                                                                                                                          
    emailCount: Annotation<number>,                                                                                                                                                
    lastEmailDate: Annotation<string | null>,                                                                                                                                      
                                                                                                                                                                                   
    // Search fallback                                                                                                                                                             
    searchAttempted: Annotation<boolean>,                                                                                                                                          
    searchResults: Annotation<string | null>,                                                                                                                                      
                                                                                                                                                                                   
    // Final result                                                                                                                                                                
    isActive: Annotation<boolean>,                                                                                                                                                 
    confidence: Annotation<'high' | 'medium' | 'low'>,                                                                                                                             
    reasoning: Annotation<string>,                                                                                                                                                 
    error: Annotation<string | null>,                                                                                                                                              
                                                                                                                                                                                   
    // Control flow                                                                                                                                                                
    nextAction: Annotation<'check_milled' | 'search_fallback' | 'finalize' | 'end'>,                                                                                               
  });                                                                                                                                                                              
                                                                                                                                                                                   
  export type AgentStateType = typeof AgentState.State;  