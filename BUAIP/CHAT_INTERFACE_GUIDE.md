# BUAIP Production AI Interface - Implementation Guide

## Overview

A modern, production-quality conversational AI interface combining the design principles of ChatGPT, Claude, and GitHub Copilot. Built with Next.js, React, TailwindCSS, and Framer Motion.

## Architecture

### Component Structure

```
app/
├── page.tsx                          # Main entry point → Chat interface
└── chat/
    └── page.tsx                      # Chat page component
└── components/
    ├── Navbar.tsx                    # Sticky navigation bar
    ├── ChatWindow.tsx                # Chat message container
    ├── ChatMessage.tsx               # Individual message (user/assistant)
    ├── ChatInput.tsx                 # Sticky input area with controls
    ├── EngineSelector.tsx            # Engine dropdown (Copilot style)
    ├── WelcomeScreen.tsx             # Welcome screen with prompts
    ├── TypingIndicator.tsx           # AI thinking animation
    ├── EngineRoutingIndicator.tsx    # Engine detection badge
    ├── QuestionCard.tsx              # Claude-style question UI
    └── ResultCard.tsx                # Formatted result cards
```

## Key Features

### 1. Sticky Navigation Bar (`Navbar.tsx`)
- Left: BUAIP logo + title
- Right: Language selector (English, Hindi, Telugu, Tamil)
- Minimal design with thin bottom border
- Responsive: Logo and text adapt on mobile

**Usage:**
```tsx
<Navbar onLanguageChange={(lang) => console.log(lang)} />
```

### 2. Chat Message Display (`ChatMessage.tsx`)
- User messages: Right-aligned, blue background
- Assistant messages: Left-aligned with BUAIP logo avatar
- Smooth fade-in animation
- Responsive text sizing (xs/sm on mobile, sm on desktop)

**Structure:**
```tsx
<ChatMessage role="user" content="Your message" />
<ChatMessage role="assistant" content="AI response" />
```

### 3. Engine Selector (`EngineSelector.tsx`)
- Dropdown with 6 specialized engines + Auto option
- Smooth dropdown animation
- Visual indicator for selected engine
- Auto-routes to optimal engine when set to "Auto"

**Options:**
- Auto (BUAIP Decides)
- Scheme Eligibility
- ANNADATA (Agriculture Intelligence)
- NYAYA (Legal Assistant)
- UDYOG (Entrepreneurship Engine)
- GlobalSeller (Export AI)
- ATITHI (Travel AI)

### 4. Welcome Screen (`WelcomeScreen.tsx`)
- Centered BUAIP logo with animation
- Greeting message
- 5 interactive prompt cards with staggered animation
- Clicking a card pre-fills the chat input

**Prompt Examples:**
- Find government schemes I am eligible for
- Best crops to grow in Telangana
- How to file a consumer complaint
- How to export spices from India
- Plan a trip to Kerala

### 5. Chat Input (`ChatInput.tsx`)
- Sticky footer position
- Text input with character counter
- Microphone icon (placeholder for voice input)
- Attachment icon (placeholder)
- Send button with validation
- Visual feedback with typing glow

### 6. AI Typing Indicator (`TypingIndicator.tsx`)
- Animated dots (3 bouncing circles)
- Text: "BUAIP is analyzing your request..."
- Smooth pulsing animation

### 7. Engine Routing Indicator (`EngineRoutingIndicator.tsx`)
- Shows when Auto engine detects domain
- Example: "Routing request to ANNADATA Agriculture Intelligence Engine"
- Light blue background with pulsing dot indicator
- Auto-hides after 2 seconds

### 8. Question Card (`QuestionCard.tsx`)
- Claude-style interactive questions
- Multiple choice buttons
- Slide-in animation with staggered options
- Sends selection automatically

**Example:**
```tsx
<QuestionCard
  question="What is your occupation?"
  options={["Farmer", "Student", "Entrepreneur", "Other"]}
  onSelect={(option) => sendMessage(option)}
/>
```

### 9. Result Card (`ResultCard.tsx`)
- Structured information display
- Title and description
- Key-value pairs (supports lists)
- Action button with external link
- Staggered animation for multiple cards

**Example:**
```tsx
<ResultCard
  title="Eligible Scheme"
  description="Government scheme matching your profile"
  items={[
    { label: "Scheme Name", value: "Pradhan Mantri Fasal Bima Yojana" },
    { label: "Benefits", value: ["Insurance coverage", "Subsidies"] },
  ]}
  action={{ label: "Apply Online", url: "#" }}
/>
```

## Design System

### Color Palette
- Primary Blue: `#3b82f6` (actions, highlights)
- Text: `#111827` (gray-900)
- Secondary: `#6b7280` (gray-500)
- Light Background: `#f9fafb` (gray-50)
- Borders: `#e5e7eb` (gray-200)

### Typography
- Headlines: Bold, 14-20px depending on screen
- Body text: Regular, 12-16px depending on screen
- Mobile: All text scales down 1-2 sizes

### Spacing
- Small gap: `gap-2` or `gap-1` (mobile)
- Normal gap: `gap-3` (mobile) to `gap-4`
- Padding: `p-3` (mobile) to `p-6` (desktop)

### Animations
- Message slide-in: 0.3s ease
- Dropdown: 0.15s ease
- Button hover: scale 1.02
- Button press: scale 0.98
- Typing dots: 0.6s bounce repeat

## Responsive Design

### Breakpoints
- Mobile: < 640px (default)
- Tablet: sm: 640px+
- Desktop: md: 768px+, lg: 1024px+

### Mobile Optimizations
- Compact navbar (14px height vs 16px)
- Smaller input icons (16px vs 20px)
- Truncated engine selector label
- Reduced padding (p-3 vs p-6)
- Simplified language display ("En" vs "English")
- Single-column layouts remain single-column

### Desktop Features
- Full text display in navbar
- Larger UI elements
- 4-column grid for prompt cards (2 on mobile)
- More comfortable spacing

## Integration with Backend

### Mock Engine Routing Logic
```typescript
// Auto-detects engine based on keywords:
- "scheme" → Scheme Eligibility
- "crop"/"farm" → ANNADATA
- "legal"/"complaint" → NYAYA
- "business" → UDYOG
- "export"/"trade" → GlobalSeller
- "trip"/"travel" → ATITHI
```

### Response Generation
Each engine has mock responses that can be replaced with real API calls:
```typescript
const response = await fetch(`/api/engine/${detectedEngine}`, {
  method: 'POST',
  body: JSON.stringify({ query: userMessage })
});
```

## Customization

### Modify Colors
Edit color values in component files:
```tsx
className="bg-blue-600"  // Change to bg-blue-700, etc.
className="text-white"   // Message text color
className="border-gray-200" // Border colors
```

### Add More Engines
Update `EngineSelector.tsx` ENGINES array:
```typescript
const ENGINES = [
  { id: 'newengine', label: 'New Engine', icon: '🚀' },
  // ...
];
```

### Customize Prompts
Edit `WelcomeScreen.tsx` PROMPT_SUGGESTIONS:
```typescript
const PROMPT_SUGGESTIONS = [
  'Your custom prompt 1',
  'Your custom prompt 2',
  // ...
];
```

### Configure AI Responses
Update `chat/page.tsx` generateResponse function to call real API:
```typescript
const response = await fetch(`/api/engine/${engine}`, {
  method: 'POST',
  body: JSON.stringify({ query: userMessage })
});
```

## User Experience Flow

1. **Page Load**
   - Navbar appears with sticky positioning
   - Welcome screen slides in with fade animation
   - Logo animates in slightly enlarged
   - Prompt cards appear with staggered animation

2. **User Interaction**
   - Select engine from dropdown OR leave as "Auto"
   - Click prompt card or type in input
   - Message sends and appears immediately

3. **AI Response**
   - Typing indicator appears with animated dots
   - Engine routing badge shows (if Auto)
   - Response appears with animation
   - Messages automatically scroll to bottom

4. **Conversation**
   - Multiple messages accumulate in chat
   - Reference previous context in conversation
   - Switch engines mid-conversation
   - All interactions are logged (in real backend)

## Accessibility

- Semantic HTML (button, form, nav tags)
- ARIA labels on icon buttons
- Keyboard support (Enter to send, Tab navigation)
- High contrast text (WCAG AA compliant)
- Focus indicators on interactive elements
- Screen reader friendly message roles

## Performance

- Components use React.memo optimization
- Framer Motion animations are GPU-accelerated
- Lazy loading enabled on routes
- Image optimization with Next.js Image component
- CSS-in-JS Tailwind for tree-shaking unused styles

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari 14+, Chrome Android)

## Future Enhancements

- [ ] Voice input integration (Microphone button)
- [ ] File attachment support
- [ ] Message pinning/bookmarking
- [ ] Conversation history/export
- [ ] Dark mode toggle
- [ ] Multi-language UI
- [ ] User accounts and preferences
- [ ] Advanced result formatting (tables, charts)
- [ ] Message search and filtering
- [ ] Streaming responses

## Deployment

Built for Vercel or any Node.js hosting:
```bash
npm run build
npm run start
```

The chat interface is now the main entry point at `/` with the original landing page accessible at `/landing` (via route modification if needed).

---

**Created:** March 2026
**Framework:** Next.js 14, React 18, TailwindCSS
**Animations:** Framer Motion 12+
**Status:** Production-Ready
