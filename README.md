# grow
Built to help you grow | Built to help you grow

## Email (Reach Module) Configuration
To enable outbound email transmissions from the Reach marketing hub, configure the following environment variables in your `.env` file:

```
GMAIL_USER=your_gmail_address@example.com
GMAIL_APP_PASSWORD=your_gmail_app_password
```

Steps:
1. Create a Google App Password (Google Account -> Security -> App passwords). Choose `Mail` and `Other (Custom)` (e.g., `GrowCRM`).
2. Copy the generated 16‑character password and paste it into `GMAIL_APP_PASSWORD`.
3. Ensure less secure app access is not required (App Password bypasses it) and 2FA is enabled.
4. Restart the server after updating `.env`.

The Reach endpoint used by the UI: `POST /api/reach/send-email` with JSON body `{ custId, message, subject? }`.

## WhatsApp Transmission
The Reach module opens a new window/tab using the official wa.me deep link format:
```
https://wa.me/<digits_only_phone>?text=<url_encoded_message>
```
Phone numbers are sanitized to digits automatically.

## Customer Lookup
Customers are fetched dynamically from `/api/customers/:custId`. The response shape:
```
{ success: true, data: <CustomerObject> }
```
If not found: `{ success:false, message:"Customer not found" }`.

## Session Transmission Log
Sent messages (WhatsApp, Email, placeholder SMS) are appended to an in‑memory session list rendered client side; they are not persisted. Extend this by creating a persistence model if required.

## Environment Summary
Required for Reach email: `GMAIL_USER`, `GMAIL_APP_PASSWORD`.
Required for MongoDB: `MONGODB_URI` (and `MONGODB_PRODUCTION_URI` optional for production).
Required for AI Querying: `GEMINI_API_KEY` (Google AI Studio) and optional `GEMINI_MODEL` (defaults to `gemini-2.5-flash-lite`).

### AI Natural Language MongoDB Query
Endpoint: `POST /api/ai/nl-query`
Body: `{ "prompt": "Show me top 10 customers with budget above 5 crore" }`
Response:
```
{
	"success": true,
	"data": {
		"results": [ /* matched documents */ ],
		"query": {
			"collection": "Customer",
			"operation": "find",
			"filter": { "budget": { "$gte": 50000000 } },
			"projection": null,
			"sort": { "budget": -1 },
			"limit": 10,
			"meta": null
		}
	}
}
```
Safety: Only `find` supported; allowed operators: `$gt,$gte,$lt,$lte,$regex,$in`. Count queries set `meta.countOnly` and return `{ count: N }`.

