## 🔁  Workflow Diagram

```mermaid
flowchart TD
    A[📥 Email Inbox] -->|IMAP Protocol| B[Fetch Emails]
    B -->|imap + mailparser| C[Parse Content]
    C -->|Extract Text/HTML| D[AI Analysis]
    D -->|@google/generative-ai| E{Categorize}
    E -->|Priority| F[🟢 Immediate Alert]
    E -->|Marketing| G[🟡 Daily Digest]
    E -->|General| H[⚪ Weekly Report]
    F & G & H -->|twilio| I[📱 WhatsApp Delivery]
    
    subgraph Tech Stack
        B -.-> X1["imap (v0.8.19)"]
        C -.-> X2["mailparser (v3.6.5)"]
        D -.-> X3["Gemini AI"]
        I -.-> X4["twilio (v5.5.2)"]
    end
```

## 🔄 Email Processing Pipeline

1. [IMAP] 📥 Email Inbox  
   → `imap` library  
   ↓  
2. [PARSE] 🧹 Extract Content  
   → `mailparser`  
   ↓  
3. [ANALYZE] 🧠 AI Categorization  
   → `@google/generative-ai`  
   ↓  
4. [ROUTE] 🗂️ Priority Decision  
   ├─ 🟢 PRIORITY → Immediate WhatsApp (`twilio`)  
   ├─ 🟡 MARKETING → Daily Digest  
   └─ ⚪ GENERAL → Weekly Report  
   ↓  
5. [DELIVER] 📱 WhatsApp Notification  
   → Existing Twilio integration

### 🧩 Tech Stack Summary

| Component                 | Purpose                                      | Library Used                    |
|--------------------------|----------------------------------------------|----------------------------------|
| **Email Fetching**       | Read email inbox                             | `imap-simple`, `mailparser`      |
| **Parsing Content**      | Extract plain text / HTML from emails        | `mailparser`                     |
| **AI Categorization**    | Analyze and label emails                     | `@google/generative-ai`          |
| **Formatting Messages**  | Create WhatsApp-friendly content             | Custom template logic            |
| **WhatsApp Messaging**   | Send messages to users                       | `twilio`                         |
| **Logging & Reports**    | Save to Excel / cloud                        | `exceljs`, `dropbox`             |

---




