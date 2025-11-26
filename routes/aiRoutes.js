const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Customer = require('../models/Customer');
const Property = require('../models/Property');
const Task = require('../models/Task');

const ok = (data, extra={}) => ({ success:true, data, ...extra});
const fail = (message, extra={}) => ({ success:false, message, ...extra});

// Validate environment
function getModel(){
  const apiKey = process.env.GEMINI_API_KEY;
  if(!apiKey) throw new Error('Gemini API key (GEMINI_API_KEY) missing');
  const genAI = new GoogleGenerativeAI(apiKey);
  // User requires model 2.5 flash lite
  return genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite'});
}

// Expert-Grade Schema Specification for AI Query Planner
const SCHEMA_SPEC = `You are an EXPERT MongoDB Query Architect for a premium real estate CRM system.
Your role: Transform natural language questions into precise, optimized MongoDB queries with ZERO errors.

=== DATA SCHEMA ===
Collection: Customer
Fields: custId (string), name (string), phone (string), email (string), dealType (string: 'Sale'|'Rent'|'Lease'), 
        req (string: 'Residential'|'Commercial'), description (string), bhk (string), typology (string), 
        propertyTypes (array), budget (number), status (string: 'New Lead'|'Interested'|'Site Visit'|'Negotiation'|'Closed'|'Lost'), 
        createdAt (date), updatedAt (date)

Collection: Property
Fields: _id (ObjectId), title (string), location (string), price (number), typology (string), segment (string), 
        bhk (string), sizeSqFt (number), commission (number), sourceChannel (string), customerCustId (string), 
        closedDate (date), createdAt (date)

Collection: Task
Fields: _id (ObjectId), title (string), description (string), dueDate (date), status (string), 
        customerCustId (string), createdAt (date)

=== STRICT OUTPUT FORMAT ===
{
  "collection": "Customer" | "Property" | "Task",
  "operation": "find",
  "filter": { /* MongoDB filter object */ },
  "projection": { /* optional: field selection */ },
  "sort": { /* optional: sort specification */ },
  "limit": number,
  "meta": { "countOnly": boolean } /* optional: for count queries */
}

=== CRITICAL RULES (ZERO TOLERANCE) ===
1. OUTPUT ONLY VALID JSON - No markdown, no explanations, no code blocks
2. Operator Whitelist: $gt, $gte, $lt, $lte, $eq, $ne, $in, $nin, $exists, $and, $or, $regex
3. REGEX SYNTAX: Use {"$regex": "pattern", "$options": "i"} format ONLY - NEVER use /pattern/flags
4. Date Comparisons: Convert relative dates (e.g., "last 30 days") to ISO date strings
5. Budget/Price: Always use numeric comparisons ($gte, $lte) - 1 crore = 10000000
6. Text Search: Use $regex with $options:"i" for case-insensitive matching
7. Count Queries: Set "meta": {"countOnly": true} when user asks "how many", "count", "total"
8. Default Limit: 50 records (max: 200)
9. Status Matching: Use exact case-sensitive values from schema
10. Field Validation: Only reference fields listed in schema

=== EXAMPLES ===
Q: "Show top 5 customers by budget"
A: {"collection":"Customer","operation":"find","filter":{},"sort":{"budget":-1},"limit":5}

Q: "Count luxury properties"
A: {"collection":"Property","operation":"find","filter":{"typology":{"$regex":"luxury","$options":"i"}},"projection":{},"meta":{"countOnly":true}}

Q: "Customers interested in 3BHK with budget above 2 crore"
A: {"collection":"Customer","operation":"find","filter":{"bhk":"3BHK","budget":{"$gte":20000000}},"limit":50}

Q: "Tasks due in next 7 days"
A: {"collection":"Task","operation":"find","filter":{"dueDate":{"$gte":"2025-11-23T00:00:00.000Z","$lte":"2025-11-30T23:59:59.999Z"}},"limit":50}

=== QUALITY STANDARDS ===
✓ Precision: Query exactly what user asks, nothing more
✓ Performance: Use indexed fields (custId, status, createdAt) in filters when possible
✓ Safety: READ-ONLY operations guaranteed
✓ Robustness: Handle typos gracefully with $regex when appropriate
`;

// Enhanced query sanitization with regex fix
function sanitizeQuery(q){
  if(!q || typeof q !== 'object') return fail('Invalid query object received from model');
  const { collection, operation, filter, projection, sort, limit, meta } = q;
  
  // Validate operation
  if(operation !== 'find') return fail('Only read-only find operations are permitted');
  
  // Validate collection
  if(!['Customer','Property','Task'].includes(collection)) return fail('Unsupported collection. Allowed: Customer, Property, Task');
  
  // Sanitize filter to prevent dangerous operations
  const sanitizedFilter = sanitizeFilter(filter || {});
  if(!sanitizedFilter.success) return sanitizedFilter;
  
  // Build safe query object
  const safe = { 
    collection, 
    operation: 'find', 
    filter: sanitizedFilter.data, 
    projection: projection || null, 
    sort: sort || null, 
    limit: Math.min(Math.max(parseInt(limit)||50, 1), 200), 
    meta: meta || null 
  };
  
  return ok(safe);
}

// Deep filter sanitization to fix regex errors and prevent injection
function sanitizeFilter(filter, depth=0){
  if(depth > 5) return fail('Filter nesting too deep');
  if(!filter || typeof filter !== 'object') return ok({});
  
  const allowed = ['$gt','$gte','$lt','$lte','$eq','$ne','$in','$nin','$exists','$and','$or','$regex','$options'];
  const cleaned = {};
  
  for(const [key, value] of Object.entries(filter)){
    // Check for dangerous operators
    if(key.startsWith('$') && !allowed.includes(key)){
      return fail(`Operator ${key} not permitted for security`);
    }
    
    // Handle $regex - fix String incompatibility
    if(key === '$regex'){
      // Convert regex to string if it's not already
      cleaned[key] = String(value);
      continue;
    }
    
    // Handle $options
    if(key === '$options'){
      // Only allow 'i' flag
      if(value !== 'i') return fail('Only case-insensitive (i) regex flag allowed');
      cleaned[key] = 'i';
      continue;
    }
    
    // Recursively sanitize nested objects
    if(typeof value === 'object' && value !== null && !Array.isArray(value)){
      const nested = sanitizeFilter(value, depth + 1);
      if(!nested.success) return nested;
      cleaned[key] = nested.data;
    } 
    // Handle arrays
    else if(Array.isArray(value)){
      cleaned[key] = value.map(v => 
        typeof v === 'object' && v !== null 
          ? sanitizeFilter(v, depth + 1).data 
          : v
      );
    }
    // Primitive values
    else {
      cleaned[key] = value;
    }
  }
  
  return ok(cleaned);
}

// Read-only query execution with safety checks
async function executeQuery(parsed){
  let Model;
  switch(parsed.collection){
    case 'Customer': Model = Customer; break;
    case 'Property': Model = Property; break;
    case 'Task': Model = Task; break;
  }
  
  if(!Model) throw new Error('Model resolution failed');
  
  // Count-only query
  if(parsed.meta && parsed.meta.countOnly){
    const count = await Model.countDocuments(parsed.filter || {});
    return { count };
  }
  
  // Standard read query - explicitly READ-ONLY
  let query = Model.find(parsed.filter || {}).lean(); // .lean() for read-only performance
  
  if(parsed.projection){ 
    query = query.select(parsed.projection); 
  }
  
  if(parsed.sort){ 
    query = query.sort(parsed.sort); 
  }
  
  query = query.limit(parsed.limit);
  
  const docs = await query.exec();
  return docs;
}

// Helper: Generate human-friendly narrative from results
async function generateNarrative(prompt, query, results){
  try{
    const model = getModel();
    // Limit rows included for summarization
    const preview = Array.isArray(results) ? results.slice(0, 50) : results;
    const meta = Array.isArray(results) ? { total: results.length } : results;
    const sys = `You are a Senior VP of Prompt Quality and an elite Sales & Marketing specialist.
Craft a concise, executive-ready summary for a real estate CRM stakeholder based ONLY on the provided JSON data.
Requirements:
- Tone: clear, confident, and action-oriented
- Include key counts, notable trends, and top drivers; avoid hallucinations
- If money values appear, format in INR with commas (e.g., ₹1,25,00,000)
- Provide 2-3 actionable next steps when relevant
- If no results, explain likely reasons and a next best query
Output: Markdown only, no preambles or code fences.`;
    const content = `${sys}\n\nUser question: ${prompt}\n\nQuery: ${JSON.stringify(query)}\n\nData (first 50 rows or count):\n${JSON.stringify(preview)}`;
    const resp = await model.generateContent(content);
    return resp.response.text();
  }catch(e){
    return null; // Fallback gracefully
  }
}

router.post('/nl-query', async (req,res) => {
  try {
    const { prompt, narrate } = req.body;
    if(!prompt) return res.status(400).json(fail('prompt required'));
    const model = getModel();
    const genPrompt = SCHEMA_SPEC + '\nUser question: ' + prompt + '\nReturn ONLY the JSON:';
    const result = await model.generateContent(genPrompt);
    const text = result.response.text();
    // Attempt to locate JSON substring
    let jsonStr = text.trim();
    const firstBrace = jsonStr.indexOf('{');
    const lastBrace = jsonStr.lastIndexOf('}');
    if(firstBrace === -1 || lastBrace === -1) return res.status(500).json(fail('Model did not return JSON'));
    jsonStr = jsonStr.slice(firstBrace, lastBrace+1);
    let queryObj;
    try { queryObj = JSON.parse(jsonStr); } catch(e){ return res.status(500).json(fail('Failed to parse model JSON')); }
    const sanitized = sanitizeQuery(queryObj);
    if(!sanitized.success) return res.status(400).json(sanitized);
    const data = await executeQuery(sanitized.data);
    let narrative = null;
    if(narrate) {
      narrative = await generateNarrative(prompt, sanitized.data, data);
    }
    res.json(ok({ results: data, query: sanitized.data, narrative }));
  } catch(e){
    console.error('AI query error', e);
    res.status(500).json(fail(e.message));
  }
});

// General chat endpoint: all-rounder with sales & marketing specialization
router.post('/chat', async (req,res) => {
  try{
    const { prompt, context } = req.body || {};
    if(!prompt) return res.status(400).json(fail('prompt required'));
    const model = getModel();
    const sys = `You are GRWO Cortex: an all‑rounder assistant with deep Sales & Marketing expertise.
Guidelines:
- Be precise, helpful, and grounded in business outcomes.
- When applicable, propose concise steps, frameworks, or templates.
- Avoid making up facts about internal data; ask for specifics if needed.
- Output Markdown; keep it skimmable with headings and bullets.`;
    const content = `${sys}\n\nUser: ${prompt}\n${context?`\nContext: ${context}`:''}`;
    const resp = await model.generateContent(content);
    const text = resp.response.text();
    res.json(ok({ text }));
  }catch(e){
    console.error('AI chat error', e);
    res.status(500).json(fail(e.message));
  }
});

module.exports = router;