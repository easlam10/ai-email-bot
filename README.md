## 🔁  Workflow Diagram

```mermaid
flowchart TD
    A[📥 Outlook Inbox] -->|Microsoft Graph API| B[Fetch Emails]
    B -->|JSON Structure| C[Filter Today's Emails]
    C --> D[AI Analysis]
    D -->|Google AI| E{Categorize}
    E -->|Priority| F[🟢 Immediate Alert]
    E -->|Marketing| G[🟡 Daily Digest]
    E -->|General| H[⚪ Weekly Report]
    E -->|Spam| I[🗑️ Auto-Archive]
    F & G & H -->|twilio| J[📱 WhatsApp Delivery]
    
    subgraph Tech Stack
        B -.-> X1["Microsoft Graph API"]
        D -.-> X2["Gemini AI"]
        J -.-> X3["twilio (v5.5.2)"]
    end
```

## 🔄 Email Processing Pipeline

1. [GRAPH API] 📥 Outlook Inbox
→ axios with OAuth 2.0
↓

2. [FILTER] ⏳ Today's Emails
→ JavaScript date filtering
↓

3. [ANALYZE] 🧠 AI Categorization
→ @google/generative-ai
↓

4. ROUTE] 🗂️ Priority Decision
├─ 🟢 PRIORITY → Immediate WhatsApp
├─ 🟡 MARKETING → Daily Digest
├─ ⚪ GENERAL → Weekly Report
└─ 🗑️ SPAM → Auto-archive
↓

5 .[DELIVER] 📱 WhatsApp Notification
→ Existing Twilio integration

### 🧩 Tech Stack Summary

| Component                 | Purpose                                      | Library Used                    |
|--------------------------|----------------------------------------------|----------------------------------|
| **Email Fetching**       | Read email inbox                             | `Microsoft Graph api via axios`  |
| **AI Categorization**    | Analyze and label emails                     | `@google/generative-ai`          |
| **Formatting Messages**  | Create WhatsApp-friendly content             | Custom template logic            |
| **WhatsApp Messaging**   | Send messages to users                       | `twilio`                         |


---




