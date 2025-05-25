## 🔁  Workflow Diagram

```mermaid
flowchart LR
    A[🔐 Outlook Auth] -->|OAuth 2.0| B[📩 Fetch Emails]
    B -->|Graph API| C[🧹 Clean Content]
    C -->|cheerio| D[🗃️ Save as JSON]
    D --> E[🤖 AI Analysis]
    E --> F{{"📊 Categories"}}
    F -->|"🚨 Priority"| G[📱 WhatsApp Alert]
    F -->|"🛍️ Marketing"| H[📧 Digest]
    F -->|"📌 General"| I[🗄 Archive]
    F -->|"📭 Promotions"| J[🗑 Auto-Delete]
    F -->|"⚠️ Spam"| K[⛔ Block]

    style A fill:#0078d4,color:white
    style B fill:#0078d4,color:white
    style C fill:#4caf50,color:white
    style D fill:#ff9800,color:white
    style E fill:#9c27b0,color:white
    style F fill:#607d8b,color:white

    subgraph Tech Stack
        A & B --> X1["Microsoft Graph API"]
        C --> X2["cheerio"]
        D --> X3["Node.js FS"]
        E --> X4["Gemini AI"]
        G & H --> X5["Twilio API"]
    end
```

## 🔄 Email Processing Pipeline

1.🔐 Authentication
→ OAuth 2.0 flow with Microsoft Identity Platform
→ Generates access/refresh tokens

2.📩 Email Fetching
→ Graph API GET /me/messages endpoint
→ Filters by current date

3.🧹 Content Cleaning
→ Uses Cheerio to extract clean text
→ Handles HTML/plaintext alternatives

4.🗃️ JSON Storage
    → Saves structured data for AI processing

5.🤖 AI Categorization
→ Gemini Pro for multi-label classification
→ Dynamic prompt engineering

6.📱 WhatsApp Notification
→ Existing Twilio integration

### 🧩 Tech Stack Summary

| Component                 | Purpose                                      | Library Used                    |
|--------------------------|----------------------------------------------|----------------------------------|
| **Authentication**       | Secure Outlook account access                | `Microsoft Identity Platform`    |
| **Email Fetching**       | Retrieve emails with metadata                | `Microsoft Graph api via axios`  |
| **HTML Processing**      | Extract clean text from email bodies         | `cheerio`                        |
| **AI Analysis**   | Categorize emails and detect urgency                | `@google/generative-ai`          |
| **Notification Engine**       | Send WhatsApp alerts                    | `twilio SDK`                     |

---




