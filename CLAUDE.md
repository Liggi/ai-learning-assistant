# Claude Project Instructions

## Project Context
This is a personal learning assistant application built with React, TypeScript, and TanStack Router. The app helps users create personalized learning journeys with AI-generated content.

## Architecture Overview

### Tech Stack
- **Frontend**: React 19 + TypeScript + Vite
- **Routing**: TanStack Router with SSR capabilities
- **Styling**: Tailwind CSS + shadcn/ui components
- **Authentication**: Better Auth v1.3.0 with PostgreSQL adapter
- **Database**: PostgreSQL with Prisma ORM
- **State Management**: Zustand
- **AI Integration**: Anthropic Claude + OpenAI APIs
- **Testing**: Vitest with React Testing Library

### Key Dependencies
- `better-auth`: Authentication system with email/password + GitHub OAuth
- `@tanstack/react-router`: File-based routing with SSR
- `@prisma/client`: Database ORM
- `@anthropic-ai/sdk`: Claude AI integration
- `openai`: OpenAI API integration
- `framer-motion`: Animations
- `@xyflow/react`: Interactive flow diagrams

## Project Structure
```
src/
├── components/          # Reusable UI components
│   ├── ui/             # shadcn/ui base components
│   └── auth-form.tsx   # Authentication form (see Known Issues)
├── lib/                # Utility libraries
│   ├── auth-client.ts  # Better Auth client configuration
│   └── auth.server.ts  # Better Auth server configuration
├── routes/             # TanStack Router pages
└── types/              # TypeScript type definitions

prisma/
└── schema.prisma       # Database schema with User, Session, Subject, etc.
```

## Known Issues & Solutions

### 1. Better Auth React Client Signup Hanging
**Issue**: The `signUp.email()` method from Better Auth React client hangs indefinitely instead of resolving/rejecting properly.

**Root Cause**: Compatibility issue with Better Auth v1.3.0 React client for signup operations.

**Solution Implemented**: Bypass the React client for signup and use direct fetch calls:
```typescript
// Instead of: result = await signUp.email({ email, password, name })
const response = await fetch('/api/auth/sign-up/email', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password, name })
})
```

**Status**: ✅ Fixed in auth-form.tsx

### 2. Authentication Error Handling
**Issue**: Signup form wasn't displaying validation errors to users (password too short, user already exists, etc.)

**Solution**: Added proper error state management and visual feedback with red error boxes.

**Status**: ✅ Fixed with comprehensive error handling

## Authentication Configuration

### Environment Variables Required
```env
BETTER_AUTH_SECRET=your-secret-here
BETTER_AUTH_URL=http://localhost:3000
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
DATABASE_URL=postgresql://user@localhost:5432/learning_assistant
```

### Auth Features
- ✅ Email/password authentication
- ✅ GitHub OAuth
- ✅ Session management with cookies
- ✅ Email verification disabled (requireEmailVerification: false)
- ✅ PostgreSQL session storage

### Common Auth Endpoints
- `POST /api/auth/sign-up/email` - Create new user
- `POST /api/auth/sign-in/email` - Sign in existing user
- `GET /api/auth/session` - Get current session
- `POST /api/auth/sign-out` - Sign out user

## Development Guidelines

### Test Account Credentials
For testing purposes, use these credentials:
- **Email**: test@example.com
- **Password**: testpassword123
- **Name**: Test User

### Running the App
```bash
npm run dev          # Start development server on port 3000
npm run build        # Build for production
npm run test         # Run tests
npm run clear-db     # Clear database (development)
```

### Database Management
- Uses Prisma with PostgreSQL
- Run `prisma migrate deploy` before production builds
- Auto-generates Prisma client on postinstall

### Testing Authentication Flows
- Sign-in works with Better Auth React client
- Sign-up requires direct fetch calls (see Known Issues)
- Test with invalid credentials to verify error handling
- GitHub OAuth requires proper environment variables

## Code Patterns & Conventions

### Component Structure
- Use function components with TypeScript
- Implement proper loading states with `isLoading`
- Add error boundaries and user feedback
- Follow shadcn/ui patterns for consistent styling

### Authentication Patterns
```typescript
// Good: Sign-in with Better Auth client
const result = await signIn.email({ email, password })

// Good: Sign-up with direct fetch (workaround)
const response = await fetch('/api/auth/sign-up/email', { ... })

// Good: Error handling with user feedback
if (result.error) {
  setError(result.error.message || "Authentication failed")
}
```

### Routing Patterns
- Use TanStack Router file-based routing
- Implement proper navigation after auth success
- Handle loading states during route transitions

## Troubleshooting

### Authentication Issues
1. **Signup hanging**: Use direct fetch instead of Better Auth client
2. **No error messages**: Check error state management and UI display
3. **Session issues**: Verify session polling logic (max 10 attempts)
4. **OAuth failures**: Check environment variables and callback URLs

### Database Issues
1. **Connection errors**: Verify DATABASE_URL format
2. **Migration issues**: Run `prisma migrate deploy`
3. **Schema changes**: Update schema.prisma and regenerate client

### Development Issues
1. **Port conflicts**: App runs on port 3000 by default
2. **Build failures**: Check TypeScript errors and dependency versions
3. **Hot reload issues**: Restart dev server if TanStack Router changes

## Performance Notes
- TanStack Router provides SSR capabilities
- Database queries use Prisma's connection pooling
- Authentication sessions cached for 5 minutes
- Session cookies expire in 7 days with 24-hour refresh

## Security Considerations
- HTTPS required in production (secure cookies)
- CSRF protection via Better Auth
- Session cookies are httpOnly and sameSite
- Secrets stored in environment variables
- GitHub OAuth configured with proper redirect URIs

## Future Improvements
- [ ] Fix Better Auth React client signup issue (upgrade or report bug)
- [ ] Add email verification flow
- [ ] Implement password reset functionality  
- [ ] Add rate limiting for auth endpoints
- [ ] Consider adding more OAuth providers

## Logging
Session logs for this project should be saved to: `~/.claude/logs/personal/`

## Development Guidelines
- Use existing patterns and conventions from the codebase
- Follow the established commit message format: `[category] lowercase description`
- Keep commit messages as one-liners - no multi-line or detailed descriptions
- Run type checking and linting before committing changes
- Test authentication flows thoroughly before deploying