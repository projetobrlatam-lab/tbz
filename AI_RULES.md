# AI Rules for Quiz: Diagnóstico da Harmonia Conjugal

## Tech Stack

- **React 19.1.1** - Modern React with hooks for building the user interface
- **TypeScript** - Type-safe JavaScript development with strict type checking
- **Vite** - Fast build tool and development server for modern web applications
- **Tailwind CSS** - Utility-first CSS framework for rapid UI development
- **React Router** - Client-side routing for single-page application navigation
- **Lucide React** - Beautiful and consistent icon library for React applications
- **shadcn/ui** - High-quality, accessible component library built on Radix UI
- **Radix UI** - Low-level UI primitives for accessible component composition

## Library Usage Rules

### UI Components & Styling
- **Always use Tailwind CSS** for all styling - no custom CSS files
- **Use shadcn/ui components** when available for consistent, accessible UI elements
- **Import icons from lucide-react** - do not use other icon libraries
- **Create custom components** only when shadcn/ui doesn't have what you need
- **Keep components small and focused** - aim for under 100 lines per component

### State Management
- **Use React hooks (useState, useEffect, useCallback)** for local state management
- **Avoid external state libraries** for this application's scope
- **Use localStorage** for persistent data storage (metrics, user preferences)
- **Implement proper cleanup** in useEffect hooks to prevent memory leaks

### Routing & Navigation
- **Keep all routes in src/App.tsx** - do not create separate routing files
- **Use hash-based routing** for dashboard access (window.location.hash)
- **Implement proper route guards** for protected areas (dashboard authentication)

### Data & API
- **Use TypeScript interfaces** for all data structures
- **Store metrics in localStorage** with proper error handling
- **Simulate API calls** with async/await and delays for realistic behavior
- **Implement proper error boundaries** for API failures

### File Organization
- **Place pages in src/pages/** - Index.tsx for main page
- **Place components in src/components/** - organize by feature
- **Place constants in src/constants/** - keep configuration separate
- **Place types in src/types.ts** - central type definitions
- **Place API functions in src/api.ts** - centralized data layer

### Code Quality
- **Use strict TypeScript** - no any types, proper interfaces
- **Follow React best practices** - functional components, hooks
- **Implement proper prop typing** for all components
- **Use useCallback for event handlers** that are passed to child components
- **Implement proper cleanup** in useEffect hooks

### Performance
- **Use React.memo** for expensive components that don't change often
- **Implement lazy loading** for routes if the app grows
- **Optimize re-renders** by using proper state management
- **Use useMemo** for expensive calculations

### Accessibility
- **Ensure all interactive elements are keyboard accessible**
- **Use proper ARIA labels** for screen readers
- **Maintain proper color contrast** for text readability
- **Test with different screen sizes** for responsive design

### Development
- **Use Vite for development** - it provides fast hot reload
- **Follow the existing code style** - maintain consistency
- **Write meaningful commit messages** - describe what and why
- **Test thoroughly** - ensure all features work as expected