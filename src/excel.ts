import ExcelJS from "exceljs";
import { z } from "zod";

const WebsiteRowSchema = z.object({
  website: z.url(),
});

export type WebsiteRow = z.infer<typeof WebsiteRowSchema>;

export interface CheckResult {
  website: string;
  error: string | null;
  isAccessible: boolean;
  statusCode: number | null;
  responseTime: number | null;
  lastChecked: string;
}

export async function readWebsitesFromExcel(
  filePath: string
): Promise<string[]> {
  const workbook = new ExcelJS.Workbook();

  try {
    await workbook.xlsx.readFile(filePath);
  } catch (error: any) {
    throw new Error(`Failed to read Excel file: ${error.message}`);
  }

  const worksheet = workbook.worksheets[0];

  if (!worksheet) {
    throw new Error("No worksheets found in Excel file");
  }

  console.log(`Reading from worksheet: ${worksheet.name}`);
  console.log(`Total rows: ${worksheet.rowCount}`);

  // Find the "Website" column (case-insensitive)
  const headerRow = worksheet.getRow(1);
  let websiteColIndex: number | null = null;

  console.log("\nHeader row values:");
  headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    const cellValue = extractTextFromCell(cell) || "";
    console.log(`  Column ${colNumber}: "${cellValue}"`);

    if (cellValue.toLowerCase() === "website") {
      websiteColIndex = colNumber;
      console.log(`  ✓ Found Website column at index ${colNumber}`);
    }
  });

  if (!websiteColIndex) {
    const availableColumns: string[] = [];
    headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      availableColumns.push(extractTextFromCell(cell) || `Column${colNumber}`);
    });

    throw new Error(
      `Website column not found. Available columns: ${availableColumns.join(
        ", "
      )}`
    );
  }

  // Read all websites (skip header)
  const websites: string[] = [];

  console.log("\nReading website URLs:");
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // Skip header

    const cell = row.getCell(websiteColIndex!);
    const website = extractTextFromCell(cell);

    console.log(`  Row ${rowNumber}: "${website || "(empty)"}"`);

    if (website && website.length > 0) {
      const normalizedUrl = normalizeUrl(website);
      console.log(`    → Normalized to: "${normalizedUrl}"`);
      websites.push(normalizedUrl);
    }
  });

  console.log(`\nFound ${websites.length} websites to check\n`);

  if (websites.length === 0) {
    throw new Error("No websites found in the Website column");
  }

  return websites;
}

export interface CheckResult {                                                                                                                                                   
    website: string;                                                                                                                                                               
    isActive: boolean;                                                                                                                                                             
    emailCount: number;                                                                                                                                                            
    lastEmailDate: string | null;                                                                                                                                                  
    confidence: string;                                                                                                                                                            
    reasoning: string;                                                                                                                                                             
    source: 'milled' | 'search' | 'none';                                                                                                                                          
    error: string | null;                                                                                                                                                          
    lastChecked: string;                                                                                                                                                           
  }                                                                                                                                                                                
                                                                                                                                                                                   
  // Update writeResultsToExcel function                                                                                                                                           
  export async function writeResultsToExcel(                                                                                                                                       
    inputPath: string,                                                                                                                                                             
    outputPath: string,                                                                                                                                                            
    results: CheckResult[]                                                                                                                                                         
  ): Promise<void> {                                                                                                                                                               
    const workbook = new ExcelJS.Workbook();                                                                                                                                       
    await workbook.xlsx.readFile(inputPath);                                                                                                                                       
                                                                                                                                                                                   
    const worksheet = workbook.worksheets[0];  
    if(!worksheet) return;                                                                                                                                    
                                                                                                                                                                                   
    // Find the Website column                                                                                                                                                     
    const headerRow = worksheet.getRow(1);                                                                                                                                         
    let websiteColIndex: number | null = null;                                                                                                                                     
                                                                                                                                                                                   
    headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {                                                                                                             
      const cellValue = extractTextFromCell(cell) || '';                                                                                                                           
      if (cellValue.toLowerCase().trim() === 'website') {                                                                                                                          
        websiteColIndex = colNumber;                                                                                                                                               
      }                                                                                                                                                                            
    });                                                                                                                                                                            
                                                                                                                                                                                   
    if (!websiteColIndex) {                                                                                                                                                        
      throw new Error('Website column not found when writing results');                                                                                                            
    }                                                                                                                                                                              
                                                                                                                                                                                   
    // Add headers for new columns                                                                                                                                                 
    const startCol = websiteColIndex + 1;                                                                                                                                          
                                                                                                                                                                                   
    worksheet.getCell(1, startCol).value = 'Active Status';                                                                                                                        
    worksheet.getCell(1, startCol + 1).value = 'Email Count';                                                                                                                      
    worksheet.getCell(1, startCol + 2).value = 'Last Email Date';                                                                                                                  
    worksheet.getCell(1, startCol + 3).value = 'Confidence';                                                                                                                       
    worksheet.getCell(1, startCol + 4).value = 'Source';                                                                                                                           
    worksheet.getCell(1, startCol + 5).value = 'Reasoning';                                                                                                                        
    worksheet.getCell(1, startCol + 6).value = 'Error';                                                                                                                            
    worksheet.getCell(1, startCol + 7).value = 'Last Checked';                                                                                                                     
                                                                                                                                                                                   
    // Write results                                                                                                                                                               
    let currentResultIndex = 0;                                                                                                                                                    
                                                                                                                                                                                   
    worksheet.eachRow((row, rowNumber) => {                                                                                                                                        
      if (rowNumber === 1) return; // Skip header                                                                                                                                  
                                                                                                                                                                                   
      const cell = row.getCell(websiteColIndex!);                                                                                                                                  
      const website = extractTextFromCell(cell);                                                                                                                                   
                                                                                                                                                                                   
      if (website && currentResultIndex < results.length) {                                                                                                                        
        const result = results[currentResultIndex];    

                                                                                                                                                                                   
        worksheet.getCell(rowNumber, startCol).value = result?.isActive ? 'Yes' : 'No';                                                                                             
        worksheet.getCell(rowNumber, startCol + 1).value = result?.emailCount || 0;                                                                                                 
        worksheet.getCell(rowNumber, startCol + 2).value = result?.lastEmailDate || 'N/A';                                                                                          
        worksheet.getCell(rowNumber, startCol + 3).value = result?.confidence;                                                                                                      
        worksheet.getCell(rowNumber, startCol + 4).value = result?.source;                                                                                                          
        worksheet.getCell(rowNumber, startCol + 5).value = result?.reasoning;                                                                                                       
        worksheet.getCell(rowNumber, startCol + 6).value = result?.error || '';                                                                                                     
        worksheet.getCell(rowNumber, startCol + 7).value = result?.lastChecked;                                                                                                     
                                                                                                                                                                                   
        currentResultIndex++;                                                                                                                                                      
      }                                                                                                                                                                            
    });                                                                                                                                                                            
                                                                                                                                                                                   
    await workbook.xlsx.writeFile(outputPath);                                                                                                                                     
    console.log(`\n✓ Results written to ${outputPath}`);                                                                                                                           
  }                                                   

function extractTextFromCell(cell: ExcelJS.Cell): string | null {
  const value = cell.value;

  if (!value) return null;

  // Handle hyperlink objects: { text: 'Display Text', hyperlink: 'url' }
  if (typeof value === "object" && "text" in value) {
    return (value as any).text?.toString().trim() || null;
  }

  // Handle hyperlink with hyperlink property
  if (typeof value === "object" && "hyperlink" in value) {
    return (value as any).hyperlink?.toString().trim() || null;
  }

  // Handle formula results
  if (typeof value === "object" && "result" in value) {
    return (value as any).result?.toString().trim() || null;
  }

  // Plain string/number
  return value.toString().trim();
}

function normalizeUrl(url: string): string {
  // Remove whitespace
  url = url.trim();

  // Add https:// if no protocol
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = "https://" + url;
  }

  return url;
}
