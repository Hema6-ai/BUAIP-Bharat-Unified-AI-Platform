# Quick Start Guide - Citizen Dashboard

## 🚀 Getting Started

### 1. Start the Development Server
```bash
npm run dev
```

The application will be available at `http://localhost:3000`

### 2. Navigate to Citizen Dashboard
```
http://localhost:3000/citizen-dashboard
```

## ✨ Features

### Category Selection
- 7 government scheme categories are automatically loaded from the CSV
- Click any category to view all schemes in that domain
- Real-time filtering with instant scheme updates

### Scheme Cards
- Displays all schemes in a grid layout
- Shows scheme name and description
- Click any card to open detailed view

### Scheme Detail Modal
- Full scheme information including:
  - Description
  - State applicability
  - Application mode
  - Age & income limits
  - Eligibility criteria
  - Benefits
  - Required documents
  - Timeline
  - Links to official websites

### AI Assistance (with Bedrock)
- Click "Get AI Assistance" button in scheme details
- Query types:
  - **General Information**: Overview of the scheme
  - **Check Eligibility**: Assess if you qualify (provide age, income, state)
  - **View Requirements**: Documents and prerequisites
  - **Application Process**: Step-by-step guide

## 🔧 Configuring Bedrock AI

To enable AI assistance features, set these environment variables:

Create `.env.local` file in the root directory:
```
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here
BEDROCK_MODEL_ID=anthropic.claude-3-sonnet-20240229-v1:0
```

**Without these variables**: AI assistance panel will show errors when submitting queries.

## 📊 Data Source

All schemes are loaded from:
```
public/india_schemes_7domains.csv
```

The CSV contains:
- **70 government schemes**
- **7 categories/domains**
- **All official details** (eligibility, benefits, documents, links)

No mock data is used - everything is real government scheme data.

## 🧩 Component Overview

```
Citizen Dashboard
├── Category Selector (7 categories)
├── Scheme Grid (variable count)
└── Scheme Detail Modal (when selected)
    └── AI Assistance Panel (optional)
```

### Component Files
- `app/citizen-dashboard/page.tsx` - Main dashboard
- `app/components/SchemeDetailModal.tsx` - Scheme details view
- `app/components/SchemeAssistancePanel.tsx` - AI assistant panel

### API Routes
- `app/api/categories/route.ts` - Fetch unique domains
- `app/api/schemes/route.ts` - Fetch schemes (with optional filtering)
- `app/api/scheme-assistance/route.ts` - Bedrock AI integration

## 📝 Common Tasks

### Add a New Feature
Example: Adding scheme comparison

1. Create component: `app/components/SchemeComparison.tsx`
2. Import in dashboard: `import SchemeComparison from "@/app/components/SchemeComparison"`
3. Add state to dashboard
4. Render conditionally

### Modify Scheme Display
Edit scheme card layout in `citizen-dashboard/page.tsx`:
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {schemes.map((scheme) => (
    // YOUR CUSTOM CARD HERE
  ))}
</div>
```

### Add More Input Fields to AI Assistant
Edit `SchemeAssistancePanel.tsx`:
1. Add state: `const [newField, setNewField] = useState("");`
2. Add input component in the form
3. Include in request body:
```tsx
user_inputs: {
  // ... existing fields
  newField: newField || undefined,
}
```

## 🐛 Troubleshooting

### "Categories won't load"
- Check network tab in browser DevTools
- Ensure `public/india_schemes_7domains.csv` exists
- Restart dev server: `npm run dev`

### "AI Assistance shows errors"
- Verify `.env.local` has all Bedrock credentials
- Check AWS credentials are valid
- Ensure `BEDROCK_MODEL_ID` matches your available models
- Restart dev server after adding env variables

### "Scheme details are empty"
- Some CSV fields may be empty (description, benefits, etc.)
- This is expected - UI shows "Not specified" for empty fields
- Check the raw CSV file: `public/india_schemes_7domains.csv`

### Build fails with "Dynamic server error"
- This is a warning - it's expected and doesn't affect runtime
- The `/api/schemes` route uses query parameters (dynamic routing)
- Build will still complete successfully

## 📚 Related Files

- **Datasets**:
  - `public/india_schemes_7domains.csv` - Source schemes data
  - `public/government_usage_dataset.csv` - Synthetic behavioral data (5,000 records)

- **Documentation**:
  - `CITIZEN_DASHBOARD_GUIDE.md` - Detailed technical guide
  - `generate_dataset.py` - Dataset generation script

- **Main App Files**:
  - `tsconfig.json` - TypeScript configuration
  - `tailwind.config.js` - Tailwind CSS setup
  - `next.config.js` - Next.js configuration

## 🔮 Future Enhancements

Prepared in architecture for:
- [ ] Eligibility pre-screening with questions
- [ ] Scheme comparison tool
- [ ] User profile persistence
- [ ] Application history tracking
- [ ] Personalized recommendations
- [ ] Multi-language support

## 📞 Support

For issues or questions:
1. Check the detailed guide: `CITIZEN_DASHBOARD_GUIDE.md`
2. Review component source code with inline comments
3. Check Next.js documentation: https://nextjs.org/docs
