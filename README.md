## 🔁 Workflow Diagram

```mermaid
graph TD
  A[Email Inbox] --> B[IMAP + Mailparser]
  B --> C[Parse Email Subject & Body]
  C --> D[AI Categorization Engine]
  D --> E[Priority / Marketing / General / Spam]
  E --> F[Format WhatsApp Message]
  F --> G[Send via Twilio]
