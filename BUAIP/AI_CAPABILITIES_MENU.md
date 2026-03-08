# AI Capabilities Menu Implementation

## Overview
Added a comprehensive AI capabilities launcher to the chat input, accessed via a "+" button positioned on the left side of the microphone button.

## Features

### 1. **AI Capabilities Menu (+ Button)**
- Location: Left side of input field, before mic button
- Visual: Plus icon (+) button with hover effects
- State: Opens/closes floating menu panel
- Click outside to close: Implemented with useEffect

### 2. **Five AI Interaction Modes**

#### 📄 Document Explainer
- **Purpose**: Upload documents (PDF, Word, images) and get plain language explanations
- **Flow**: Click → File upload dialog → OCR processing → AI analysis → Simple explanation
- **Current Status**: File upload dialog working, needs backend OCR/analysis API
- **Next Steps**: Implement `/api/document-analysis` endpoint

#### 📸 Photo → Answer
- **Purpose**: Take or upload photos to get contextual answers
- **Flow**: Click → Camera/photo picker → Vision AI → Context extraction → Actionable answer
- **Current Status**: Photo picker working, needs Vision AI integration
- **Next Steps**: Implement `/api/image-analysis` with AWS Rekognition or Bedrock Vision

#### 🧠 Learning Mode
- **Purpose**: Adaptive complexity teaching based on user understanding
- **Flow**: Click → Prefills "🧠 Start Learning Mode: " → User adds topic → AI adjusts explanation complexity
- **Current Status**: Menu trigger working, sets input prefix
- **Next Steps**: Backend logic to track user comprehension level and adjust responses

#### 🎤 Voice Query
- **Purpose**: Speak questions instead of typing
- **Flow**: Click → Triggers existing voice input → Web Speech API → Transcript → Send
- **Current Status**: **Fully working** - reuses existing voice input functionality
- **Implementation**: Calls `handleMicClick()` from existing voice system

#### 📂 Upload File
- **Purpose**: General file upload for any document/image processing
- **Flow**: Click → File picker → Upload → AI processing → Response
- **Current Status**: File picker working, creates placeholder message
- **Next Steps**: Server-side file storage, processing pipeline

## Technical Implementation

### Component Structure
```tsx
ChatInput.tsx
├── State Management
│   ├── showAIMenu (boolean)
│   ├── menuRef (for click outside)
│   └── fileInputRef (for file uploads)
├── Plus Button
│   ├── Framer Motion animations
│   ├── Toggle menu on click
│   └── Active state styling
├── Floating Menu (AnimatePresence)
│   ├── Positioned above input (bottom-full)
│   ├── 5 menu options with icons
│   ├── Hover effects per option
│   └── Auto-close on selection
└── Hidden File Input
    └── Triggered by menu options
```

### Key Code Sections

**Menu State & Refs:**
```tsx
const [showAIMenu, setShowAIMenu] = useState(false);
const fileInputRef = useRef<HTMLInputElement>(null);
const menuRef = useRef<HTMLDivElement>(null);
```

**Click Outside Handler:**
```tsx
useEffect(() => {
  const handleClickOutside = (event: MouseEvent) => {
    if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
      setShowAIMenu(false);
    }
  };
  if (showAIMenu) {
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }
}, [showAIMenu]);
```

**Menu Options Handlers:**
- `handleDocumentExplainer()`: Opens file picker for documents
- `handlePhotoAnswer()`: Opens camera/photo picker
- `handleLearningMode()`: Prefills input with learning mode prompt
- `handleVoiceQuery()`: Calls existing `handleMicClick()`
- `handleFileUploadClick()`: Opens general file picker

## UI/UX Design

### Menu Appearance
- White background with shadow-xl
- Gradient header (blue-purple)
- Clean spacing and typography
- Emoji icons for visual clarity
- Color-coded hover states per option
- Smooth animations (200ms transitions)

### Button Layout
```
[Input Field] [+ Menu] | [Mic Button] [Send Button]
              ↑               ↑
         New Feature    Existing Feature
```

### Menu Positioning
- Absolute positioning: `bottom-full left-0 mb-2`
- Appears above the input box
- Width: 16rem (256px)
- Z-index: 50 (above other elements)

## Next Development Steps

### Priority 1: File Upload Backend
1. Create `/api/file-upload` endpoint
2. Store files in AWS S3 or local storage
3. Return file URL/ID for processing

### Priority 2: Document Analysis
1. Create `/api/document-analysis` endpoint
2. Integrate AWS Textract for OCR
3. Send extracted text to Bedrock for explanation
4. Return simplified response

### Priority 3: Image Analysis
1. Create `/api/image-analysis` endpoint
2. Integrate AWS Rekognition or Bedrock Vision
3. Extract objects, text, context from image
4. Generate actionable insights

### Priority 4: Learning Mode Logic
1. Track user comprehension in conversation context
2. Adjust response complexity dynamically
3. Ask follow-up questions to gauge understanding
4. Simplify/complexify based on feedback

## Testing Checklist

- [x] Menu opens on + button click
- [x] Menu closes on outside click
- [x] Menu closes after option selection
- [x] Voice Query triggers voice input
- [x] File input dialog opens for upload options
- [ ] Document upload processes correctly
- [ ] Photo capture/upload works on mobile
- [ ] Learning mode adjusts complexity
- [ ] All options route through unified-ai endpoint

## Integration Points

### Existing Systems
- **Voice Input**: `useSpeechToText` hook (already working)
- **Unified AI Router**: `/api/unified-ai` (all requests route here)
- **Translation**: Runtime UI translation for menu labels
- **Animations**: Framer Motion (consistent with rest of UI)

### New APIs Needed
- `/api/file-upload`: Handle multipart file uploads
- `/api/document-analysis`: OCR + AI explanation pipeline
- `/api/image-analysis`: Vision AI + context extraction
- `/api/adaptive-learning`: Complexity adjustment logic

## User Flow Examples

### Document Explainer
1. User clicks + button
2. Selects "📄 Document Explainer"
3. File picker opens
4. User selects PDF/image
5. File uploads to server
6. OCR extracts text
7. AI generates plain language explanation
8. Response appears in chat

### Photo → Answer
1. User clicks + button
2. Selects "📸 Photo → Answer"
3. Camera opens (mobile) or file picker (desktop)
4. User takes/selects photo
5. Image uploads and analyzes
6. Vision AI extracts context
7. AI generates actionable answer
8. Response with guidance appears

### Learning Mode
1. User clicks + button
2. Selects "🧠 Learning Mode"
3. Input prefills with "🧠 Start Learning Mode: "
4. User types topic (e.g., "quantum physics")
5. AI starts with simple explanation
6. Asks comprehension check questions
7. Adjusts complexity based on responses
8. Continues adaptive teaching

## Performance Considerations

- **Menu Animation**: 200ms transition (smooth but fast)
- **File Size Limits**: Set max 10MB for uploads
- **Image Processing**: Should complete in <5s
- **OCR Processing**: May take 5-15s for long documents
- **Loading States**: Show spinner for processing operations

## Accessibility

- Menu keyboard navigation (future enhancement)
- Screen reader labels for all buttons
- High contrast colors for visibility
- Touch-friendly sizing (min 44x44px)
- Clear focus indicators

## Notes

- Voice Query option only shows if Web Speech API supported
- Menu auto-closes after any selection (better UX)
- File input accepts: `.pdf,.doc,.docx,image/*`
- Photo picker uses `capture="environment"` for mobile camera
- All menu options disable when chat is loading

## Success Metrics

- Menu opens/closes without lag
- File upload dialogs trigger correctly
- Voice query seamlessly activates voice input
- No console errors or TypeScript warnings
- Responsive on mobile and desktop
- Menu stays within viewport bounds
