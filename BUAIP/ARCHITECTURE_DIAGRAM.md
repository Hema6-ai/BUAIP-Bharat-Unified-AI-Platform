# BUAIP Chat Interface - Architecture & Component Diagram

## 🏗️ Component Hierarchy

```
ChatPage (/app/chat/page.tsx) [Main Component]
│
├── Navbar
│   ├── Logo (BUAIP_logo.png)
│   └── Language Selector Dropdown
│       ├── English
│       ├── Hindi
│       ├── Telugu
│       └── Tamil
│
├── ChatWindow (Flex-1, Auto-scroll)
│   ├── Welcome Screen (Initial)
│   │   ├── Logo (Animated)
│   │   ├── Greeting Text
│   │   └── Prompt Cards (5 × interactive buttons)
│   │
│   └── Chat Messages (After initial message)
│       ├── Message 1 (User)
│       │   ├── User Avatar
│       │   └── Message Content
│       │
│       ├── Engine Routing Indicator (if Auto)
│       │
│       ├── Message 2 (Assistant)
│       │   ├── BUAIP Avatar
│       │   └── Response Content
│       │
│       ├── Message N (Various)
│       │   └── Question Card OR Result Cards (Optional)
│       │
│       └── Typing Indicator (While loading)
│
└── Input Container (Sticky Footer)
    ├── EngineSelector Dropdown
    │   ├── Auto
    │   ├── Scheme Eligibility
    │   ├── ANNADATA
    │   ├── NYAYA
    │   ├── UDYOG
    │   ├── GlobalSeller
    │   └── ATITHI
    │
    └── ChatInput
        ├── Text Input Field
        ├── Microphone Icon
        ├── Attachment Icon
        └── Send Button
```

## 🔄 Data Flow Diagram

```
User Input
    │
    ▼
ChatInput Component
    │
    ├─→ Validate message (not empty)
    │
    └─→ onSend() callback
        │
        ▼
    ChatPage.handleSendMessage()
        │
        ├─→ Create User Message
        │   └─→ Add to messages state
        │
        ├─→ Show Typing Indicator
        │
        ├─→ Detect Engine (if Auto)
        │   ├─→ Analyze keywords
        │   ├─→ Select best engine
        │   └─→ Show routing badge
        │
        ├─→ Simulate API call (1.5s delay)
        │   │
        │   └─→ generateResponse()
        │       ├─→ Switch on engine
        │       └─→ Return mock response
        │
        ├─→ Remove Typing Indicator
        │
        └─→ Add Assistant Message
            └─→ Animate in
```

## 🎨 Component Props & Dependencies

### Navbar
```typescript
interface NavbarProps {
  onLanguageChange?: (language: string) => void;
}

Dependencies:
- Image (Next.js)
- motion (Framer Motion)
- State: language, isDropdownOpen
```

### ChatMessage
```typescript
interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  isTyping?: boolean;
}

Features:
- Animated fade-in
- Role-based styling
- Avatar display
- Typing indicator
```

### ChatInput
```typescript
interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading?: boolean;
}

Features:
- Enter key submit
- Disabled while loading
- Character counter
- Icon buttons
- Glow animation on focus
```

### EngineSelector
```typescript
interface EngineSelectorProps {
  selectedEngine: string;
  onEngineChange: (engine: string) => void;
}

Features:
- Dropdown animation
- Selected indicator
- 6 engine options + Auto
- Staggered menu animation
```

### WelcomeScreen
```typescript
interface WelcomeScreenProps {
  onPromptSelect: (prompt: string) => void;
}

Features:
- Animated logo
- Greeting text
- 5 prompt cards
- Staggered animation
- Hover effects
```

### TypingIndicator
```typescript
No props needed.

Features:
- 3 bouncing dots
- Auto-hide ready
- Smooth animation
- Semantic message
```

### EngineRoutingIndicator
```typescript
interface EngineRoutingIndicatorProps {
  engine: string;
  show: boolean;
}

Features:
- Auto-hide after 2s
- Pulsing indicator dot
- Engine name lookup
- Fade in/out animation
```

### QuestionCard
```typescript
interface QuestionCardProps {
  question: string;
  options: string[];
  onSelect: (option: string) => void;
  index?: number;
}

Features:
- Slide-in animation
- Multiple choice buttons
- Staggered button animation
- Auto-submit on click
```

### ResultCard
```typescript
interface ResultCardProps {
  title: string;
  description?: string;
  items: {
    label: string;
    value: string | string[];
  }[];
  action?: {
    label: string;
    url: string;
  };
  index?: number;
}

Features:
- Structured display
- List support
- Action link
- Staggered cards
```

### ChatWindow
```typescript
interface ChatWindowProps {
  messages: any[];
  children: React.ReactNode;
}

Features:
- Auto-scroll to bottom
- Chat-styled scrollbar
- Message container
```

## 🔀 State Management (ChatPage)

```typescript
// Message management
messages: Message[][] 
└─ Stored as array of message objects
   {
     id: string;
     role: 'user' | 'assistant';
     content: string;
     isTyping?: boolean;
     engine?: string;
   }

// Engine selection
selectedEngine: 'auto' | 'scheme' | 'annadata' | 'nyaya' | 'udyog' | 'globalseller' | 'atithi'

// Loading state
isLoading: boolean
└─ Disables input while API call in progress

// UI state
routingEngine: string | null
└─ Shows routing indicator temporarily
```

## 📊 Message Lifecycle

```
1. USER TYPES MESSAGE
   └─ Input field updates character count

2. USER CLICKS SEND OR PRESSES ENTER
   ├─ Message stored in state
   ├─ Input cleared
   ├─ isLoading = true
   └─ ChatMessage rendered with animation

3. SYSTEM PROCESSES REQUEST
   ├─ Typing indicator added
   ├─ Engine detected (if Auto)
   ├─ Routing badge shown (2s)
   └─ Simulated API call (1.5s)

4. RESPONSE RECEIVED
   ├─ Typing indicator removed
   ├─ Response message added
   ├─ ChatMessage animates in
   └─ Auto-scroll to latest message

5. CONVERSATION CONTINUES
   └─ User can send more messages
```

## 🎯 Event Flow

```
┌─→ Engine Changed
│   └─→ onEngineChange() → selectedEngine updated
│       └─→ Next message uses new engine
│
├─→ Prompt Card Clicked
│   └─→ onPromptSelect() → handleSendMessage()
│       └─→ Full chat flow starts
│
├─→ Question Card Option Selected
│   └─→ onSelect() → handleSendMessage()
│       └─→ Answer sent automatically
│
├─→ Language Changed
│   └─→ onLanguageChange() → setLanguage()
│       └─→ UI language changes (future: translations)
│
└─→ Message Sent (Enter or Button)
    └─→ onSend() → handleSendMessage()
        └─→ Full chat flow starts
```

## 🎭 Animation Timeline

### Welcome Screen Load
```
0ms   ───────────────────────────────────────────────
      Welcome Screen starts (opacity 0)

300ms ┤
      └─→ Logo animates in (scale 0→1, 400ms)
          Greeting text fades in (300ms)

400ms ┤
      └─→ Prompt cards stagger in (300ms + 0-250ms delay)

650ms ───────────────────────────────────────────────
      All content visible, ready for input
```

### Message Send Flow
```
0ms   User taps send button (scale 1 → 0.98)
      ├─→ Message stored
      ├─→ Typing indicator added
      └─→ User message animates (fade + slide, 300ms)

50ms  ├─→ Routing badge appears (fade in, 200ms)
      └─→ Disappears after 2s

1500ms Animation complete
      ├─→ AI response added
      ├─→ Typing indicator removed
      ├─→ Message animates in (fade + slide, 300ms)
      └─→ Auto-scroll to bottom (smooth 300ms)

2000ms Chat ready for next input
```

## 🔗 Component Connections

```
Parent: ChatPage
├── Controls: selectedEngine, isLoading, messages, handleSendMessage
├── Passes through: Navbar, ChatWindow, ChatInput, EngineSelector
│
├─→ Navbar
│   └── Uses: Logo image, language state
│
├─→ ChatWindow
│   ├── Receives: messages array
│   └── Renders:
│       ├── WelcomeScreen (when no messages)
│       ├── EngineRoutingIndicator (when routing)
│       ├── ChatMessage (for each message)
│       └── TypingIndicator (during loading)
│
├─→ ChatInput
│   ├── Calls: handleSendMessage(message)
│   └── Receives: isLoading state
│
└─→ EngineSelector
    ├── Shows: selectedEngine
    └── Calls: onEngineChange(engine)

Child Components (Used by messages):
├── QuestionCard
│   └── For interactive Q&A flows
│
└── ResultCard
    └── For structured results
```

## 📱 Responsive Behavior

```
MOBILE (< 640px)
├── Navbar height: 56px
├── Fonts: xs/sm
├── Spacing: p-3, gap-2
├── Icons: 16-20px
├── Prompt grid: 1 column
└── Input: Full width

TABLET (640-1024px)
├── Navbar height: 64px
├── Fonts: sm
├── Spacing: p-4, gap-3
├── Icons: 20px
├── Prompt grid: 2 column
└── Input: Max 640px

DESKTOP (> 1024px)
├── Navbar height: 64px
├── Fonts: base/sm
├── Spacing: p-6, gap-4
├── Icons: 20-24px
├── Prompt grid: 2 column
├── Max width: 1024px content
└── Input: Max width 1024px
```

## 🎨 Styling Strategy

```
TailwindCSS Classes
├── Colors: bg-*, text-*, border-*, hover:*
├── Spacing: p-*, m-*, gap-*
├── Typography: text-*, font-*
└── Responsive: sm:*, md:*, lg:*

Framer Motion Variants
├── initial: Starting state (opacity 0, y: ±10)
├── animate: Final state (opacity 1, y: 0)
├── exit: Leaving state (opacity 0, y: ±10)
└── hover/tap: Interaction states

Custom CSS (globals.css)
├── Scroll bar styling (.chat-scroll)
├── Animation delays (.animation-delay-*)
└── Smooth scroll behavior
```

## ✅ Verification Checklist

```
Component Files:
  ✓ Navbar.tsx
  ✓ ChatWindow.tsx
  ✓ ChatMessage.tsx
  ✓ ChatInput.tsx
  ✓ EngineSelector.tsx
  ✓ WelcomeScreen.tsx
  ✓ TypingIndicator.tsx
  ✓ EngineRoutingIndicator.tsx
  ✓ QuestionCard.tsx
  ✓ ResultCard.tsx

Page Files:
  ✓ /app/chat/page.tsx
  ✓ /app/page.tsx (redirects to chat)

Styling:
  ✓ globals.css updated
  ✓ tailwind.config.js compatible
  ✓ Responsive design working

Build:
  ✓ TypeScript compiles
  ✓ No console errors
  ✓ All routes generated
  ✓ Static optimization working
```

---

*Architecture Document - March 2026*
*Total Components: 10*
*Total Lines of Code: ~1,200*
*Build Size: 139 KB (optimized)*
