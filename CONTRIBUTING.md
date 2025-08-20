# Contributing to Alameda Sidewalk Map

Thank you for your interest in contributing to the Alameda Sidewalk Map project! This guide will help you get started with contributing.

## Getting Started

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/alameda-sidewalk-map.git
   cd alameda-sidewalk-map
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Create a new branch for your feature:
   ```bash
   git checkout -b feature/your-feature-name
   ```

## Development Workflow

### Running the Application
```bash
npm run dev
```

### Running Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Code Quality
```bash
# Type checking
npm run typecheck

# Linting
npm run lint
```

## Code Standards

### Testing Requirements
- All new features must include unit tests
- Maintain minimum 85% code coverage
- Tests should cover both happy path and error cases
- Use descriptive test names and organize tests logically

### Code Style
- Use TypeScript for all new code
- Follow existing naming conventions
- Add JSDoc comments for complex functions
- Keep functions small and focused
- Use meaningful variable names

### Git Conventions
- Use conventional commit messages:
  - `feat:` for new features
  - `fix:` for bug fixes
  - `test:` for test additions/changes
  - `docs:` for documentation changes
  - `refactor:` for code refactoring
- Keep commits atomic and focused
- Write clear commit messages

## Types of Contributions

### Data Contributions
- Document new sidewalk segments with accurate coordinates
- Upload high-quality photos of contractor stamps
- Add historical context and notes
- Verify existing contractor information

### Code Contributions
- Bug fixes
- New features
- Performance improvements
- Test coverage improvements
- Documentation updates

### Content Contributions
- Historical research about contractors
- Verification of installation years
- Documentation of special markings
- Community guidelines and best practices

## Pull Request Process

1. Ensure your code passes all tests:
   ```bash
   npm run test:ci
   npm run typecheck
   npm run lint
   ```

2. Update documentation if needed

3. Add tests for new functionality

4. Create a pull request with:
   - Clear description of changes
   - Reference to any related issues
   - Screenshots for UI changes
   - Test coverage information

5. Wait for code review and address feedback

## Community Guidelines

### Data Quality Standards
- **Accuracy**: Verify contractor names and years when possible
- **Completeness**: Include all available information
- **Consistency**: Follow existing naming conventions for contractors and streets
- **Attribution**: Credit sources when adding historical information

### Photo Guidelines
- **Quality**: Upload clear, well-lit photos
- **Relevance**: Focus on contractor stamps and special markings
- **Privacy**: Avoid including personal information or faces
- **Orientation**: Ensure stamps are readable in photos

### Collaboration
- Be respectful and constructive in discussions
- Help new contributors get started
- Share knowledge about local history
- Report issues and suggest improvements

## Technical Architecture

### Database Schema
- **Segments**: Coordinate-based sidewalk sections
- **Photos**: Linked images with metadata
- **Contractors**: Aggregated contractor statistics
- **Users**: Authentication and role management

### API Design
- RESTful endpoints for all resources
- Consistent error handling
- Input validation and sanitization
- Rate limiting for uploads

### Frontend Components
- Reusable React components
- TypeScript for type safety
- Responsive design principles
- Accessibility best practices

## Security Considerations

- Never commit sensitive information
- Validate all user inputs
- Use parameterized database queries
- Implement proper authentication
- Follow OWASP security guidelines

## Getting Help

- Check existing issues and documentation
- Ask questions in pull request discussions
- Join community discussions
- Contact maintainers for major changes

## Recognition

Contributors will be recognized in:
- CONTRIBUTORS.md file
- Release notes for significant contributions
- Community acknowledgments

Thank you for helping preserve Alameda's sidewalk history!