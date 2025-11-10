# Contributing to RapidPhoto

Thank you for your interest in contributing to RapidPhoto! This document provides guidelines and instructions for contributing.

## Development Setup

### Prerequisites
- Java 17+
- Node.js 20+ and pnpm
- PostgreSQL 15+
- Docker (optional)

### Getting Started

1. Fork and clone the repository
2. Set up environment variables (copy `.env.example` to `.env`)
3. Start PostgreSQL database
4. Run database migrations
5. Start backend: `cd apps/backend && ./gradlew bootRun`
6. Start frontend: `cd apps/web && pnpm dev`

## Code Style

### Backend (Java)
- Follow Google Java Style Guide
- Use 4 spaces for indentation
- Maximum line length: 120 characters
- Use meaningful variable and method names
- Add JavaDoc comments for public methods

### Frontend (TypeScript/React)
- Use ESLint and Prettier configurations
- Use functional components with hooks
- Follow React best practices
- Use TypeScript for type safety

## Git Workflow

1. Create a feature branch from `main`
2. Make your changes
3. Write/update tests
4. Ensure all tests pass
5. Commit with descriptive messages
6. Push and create a pull request

### Commit Messages
- Use present tense ("Add feature" not "Added feature")
- Be descriptive and concise
- Reference issue numbers if applicable

Example:
```
feat: Add photo search functionality

- Implement search by filename
- Add debounced search input
- Update API endpoint with search parameter

Closes #123
```

## Testing

### Backend Tests
- Write unit tests for services
- Write integration tests for controllers
- Aim for >80% code coverage
- Run tests: `./gradlew test`

### Frontend Tests
- Write component tests
- Test user interactions
- Run tests: `pnpm test`

## Pull Request Process

1. Update documentation if needed
2. Add tests for new features
3. Ensure all CI checks pass
4. Request review from maintainers
5. Address review feedback
6. Squash commits before merging

## Code Review Guidelines

- Be respectful and constructive
- Focus on code quality and maintainability
- Suggest improvements, not just point out issues
- Approve when satisfied with changes

## Reporting Issues

When reporting bugs:
- Use the issue template
- Provide steps to reproduce
- Include error messages and logs
- Specify environment details

## Feature Requests

For new features:
- Describe the use case
- Explain the expected behavior
- Consider implementation complexity
- Discuss with maintainers first

## Questions?

Feel free to open a discussion or contact maintainers.

Thank you for contributing! 🎉

