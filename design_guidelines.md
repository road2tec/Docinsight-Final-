# Design Guidelines: Intelligent Document Processing System

## Design Approach
**Selected Approach**: Design System + Enterprise Reference Hybrid

Drawing inspiration from Linear's professional precision, Notion's content management clarity, and Dropbox's file handling patterns. This enterprise productivity tool prioritizes efficiency, data clarity, and professional polish.

## Core Design Principles
1. **Data-First Hierarchy**: Information density without clutter
2. **Processing Transparency**: Clear status indicators and progress feedback
3. **Enterprise Professionalism**: Trustworthy, sophisticated interface
4. **Scannable Content**: Easy navigation through complex document data

## Typography System

**Font Stack**: Inter (primary), JetBrains Mono (code/data)

**Hierarchy**:
- Page Titles: text-3xl font-semibold
- Section Headers: text-2xl font-semibold
- Card Titles: text-xl font-medium
- Body Text: text-base font-normal
- Metadata/Labels: text-sm font-medium uppercase tracking-wide
- Small Text: text-xs
- Document Content: text-sm leading-relaxed (for readability)

## Layout System

**Spacing Units**: Use Tailwind units of 2, 4, 6, 8, 12, 16, 24
- Component padding: p-6 or p-8
- Section gaps: gap-6 or gap-8
- Page margins: px-6 lg:px-8
- Vertical rhythm: space-y-6 or space-y-8

**Grid System**:
- Dashboard cards: grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6
- Two-panel layouts: grid grid-cols-1 lg:grid-cols-3 gap-6 (1 col sidebar, 2 col main)
- Max content width: max-w-7xl mx-auto

## Application Layout Structure

**Global Shell**:
- Fixed sidebar navigation (w-64) with collapsed state (w-20)
- Top header bar (h-16) with breadcrumbs and user menu
- Main content area with consistent padding (p-8)

**Sidebar Navigation**:
- Logo/brand at top (h-16 px-6)
- Navigation groups with labels (text-xs uppercase)
- Icon + label pattern (gap-3)
- Active state: bold with accent background
- Bottom section for user profile/settings

## Screen-Specific Layouts

### Dashboard
- Stats cards grid (4 columns on desktop): Recent uploads, Processing status, Total documents, Storage used
- Recent documents table with sortable columns
- Quick action buttons prominently placed
- Activity timeline or processing queue widget

### Upload Page
- Large drag-drop zone (min-h-96) with dashed border
- File list below with upload progress bars
- Batch upload support with individual file controls
- File type restrictions and size limits clearly displayed
- Processing status indicators (pending, processing, complete, error)

### Document Viewer
- Two-column layout: Document preview (65%) + Metadata panel (35%)
- Tabbed interface: Extracted Text, Tables, Entities, Metadata
- Zoom controls and pagination for multi-page documents
- Text highlighting for search results
- Download/export actions in header

### Chat Interface
- Split view: Document context (40%) + Chat panel (60%)
- Chat messages with user/AI distinction
- Document section citations with click-to-highlight
- Input field with send button and example queries
- Conversation history sidebar (collapsible)

### Reports Page
- Filter bar at top with date range, document type
- Chart cards in grid layout
- Data tables with sorting and export options
- Visual summaries: bar charts, pie charts, word clouds
- Export buttons for PDF/Word generation

### Admin Panel
- Data table for user management
- Role assignment dropdowns
- Action buttons (edit, delete, permissions)
- Activity logs table with filtering
- System stats dashboard

## Component Library

### Cards
- Base: rounded-lg border shadow-sm p-6
- Stat cards: Centered number (text-4xl font-bold) with label below
- Document cards: Thumbnail + title + metadata (text-sm)
- Hover states: subtle shadow elevation

### Tables
- Header: border-b font-medium text-sm
- Rows: border-b hover state with subtle background
- Alternating row backgrounds for large tables
- Action columns aligned right
- Pagination controls below

### Buttons
Primary: px-6 py-2.5 rounded-lg font-medium
Secondary: outlined variant
Tertiary: text-only with hover underline
Icon buttons: p-2 rounded-md
Button groups: gap-2 flex

### Forms
- Input fields: border rounded-lg px-4 py-2.5 w-full
- Labels: block text-sm font-medium mb-2
- Validation messages: text-sm mt-1
- File upload: dashed border with icon and text
- Form sections: space-y-6

### Status Badges
- Rounded-full px-3 py-1 text-xs font-medium
- Processing: animated pulse
- Success, Error, Pending: distinct visual treatments
- Use sparingly for key states

### Data Visualization
- Chart containers: rounded-lg border p-6
- Chart height: h-64 or h-80
- Legend placement: bottom or right
- Responsive scaling on mobile

### Document Preview
- PDF viewer iframe or canvas rendering
- Page navigation controls
- Text selection enabled in viewer
- Thumbnail sidebar for multi-page docs

### Chat Messages
- User messages: ml-auto max-w-2xl rounded-lg p-4
- AI messages: mr-auto max-w-2xl rounded-lg p-4
- Timestamp: text-xs below message
- Citation links: underlined with icon

## Navigation Patterns

**Breadcrumbs**: text-sm with separator icons (/)
**Tabs**: border-b with active indicator, px-4 py-2
**Pagination**: numbered with prev/next, rounded buttons
**Search**: Input with icon, instant results dropdown

## Responsive Behavior

**Mobile** (< 768px):
- Collapsible sidebar with overlay
- Single column layouts
- Stacked form fields
- Simplified tables (card view)
- Bottom navigation bar option

**Tablet** (768px - 1024px):
- Two-column grids
- Persistent sidebar (collapsed state)
- Adjusted chart sizes

**Desktop** (> 1024px):
- Full multi-column layouts
- Expanded sidebar
- Side-by-side views

## Empty States
- Centered with icon (h-48 w-48)
- Explanatory text (text-lg)
- Clear call-to-action button
- Example: "No documents uploaded" with upload button

## Loading States
- Skeleton screens matching final layout
- Spinner for quick operations
- Progress bars for file uploads
- Processing status with animated dots

## Error Handling
- Inline validation messages
- Toast notifications for system errors
- Error pages with helpful actions
- Retry mechanisms for failed operations

## Accessibility
- Semantic HTML throughout
- ARIA labels on interactive elements
- Keyboard navigation support
- Focus visible states on all controls
- Sufficient contrast ratios

## Performance Considerations
- Lazy load document previews
- Virtual scrolling for long tables
- Optimistic UI updates
- Debounced search inputs

This design system creates a professional, enterprise-grade document processing interface that balances information density with usability, ensuring efficient workflows for power users while maintaining clarity for occasional users.