# 🤝 Contributing to Internshala Voice Interview Platform

Thank you for your interest in contributing! This document provides guidelines for contributing to the project.

## How to Contribute

### Reporting Bugs

If you find a bug, please create an issue with:
- Clear description of the problem
- Steps to reproduce
- Expected vs actual behavior
- Your environment (OS, Node version, Python version)
- Screenshots if applicable

### Suggesting Features

Feature suggestions are welcome! Please:
- Check if the feature already exists or is planned
- Describe the use case clearly
- Explain why it would be valuable

### Code Contributions

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make your changes**
   - Follow the existing code style
   - Add comments for complex logic
   - Update documentation if needed

4. **Test your changes**
   - Ensure the app runs without errors
   - Test both frontend and backend
   - Check browser compatibility

5. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```

6. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

7. **Create a Pull Request**
   - Describe what you changed and why
   - Reference any related issues
   - Wait for review

## Development Guidelines

### Code Style

**TypeScript/React:**
- Use functional components with hooks
- Use TypeScript types (avoid `any`)
- Follow existing naming conventions
- Keep components small and focused

**Python:**
- Follow PEP 8 style guide
- Use type hints where possible
- Add docstrings to functions
- Keep functions focused on single responsibility

### Commit Messages

Use conventional commits format:
- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting)
- `refactor:` - Code refactoring
- `test:` - Adding tests
- `chore:` - Maintenance tasks

Examples:
```
feat: add voice activity detection
fix: resolve microphone permission issue
docs: update setup instructions
```

### Project Structure

```
src/
├── components/     # Reusable UI components
├── pages/         # Page-level components
├── hooks/         # Custom React hooks
├── utils/         # Helper functions
└── assets/        # Static files

api_py/
├── main.py        # FastAPI app
├── services/      # Business logic
│   ├── stt.py    # Speech-to-text
│   ├── tts.py    # Text-to-speech
│   └── ai.py     # AI integration
└── models/        # Data models
```

### Adding New Features

When adding features:
1. Check if it requires backend, frontend, or both
2. Update relevant documentation
3. Consider backward compatibility
4. Add error handling
5. Test edge cases

### Testing

Before submitting:
- [ ] Frontend builds without errors (`npm run build`)
- [ ] Backend starts successfully (`npm run py:dev`)
- [ ] No console errors in browser
- [ ] Microphone and audio work correctly
- [ ] Works in multiple browsers (Chrome, Brave, Firefox)

## Areas for Contribution

Here are some areas where contributions are especially welcome:

### High Priority
- 🐛 Bug fixes
- 📝 Documentation improvements
- ♿ Accessibility enhancements
- 🌐 Internationalization (i18n)

### Feature Ideas
- 📊 Interview analytics dashboard
- 💾 Export interview transcripts
- 🎨 Customizable themes
- 🔊 Multiple voice options
- 📱 Mobile app version
- 🎯 Custom interview templates
- 🔐 User authentication
- 📈 Progress tracking

### Technical Improvements
- ⚡ Performance optimizations
- 🧪 Unit and integration tests
- 🔒 Security enhancements
- 📦 Docker containerization
- 🚀 CI/CD pipeline

## Questions?

If you have questions about contributing:
- Check the [README.md](README.md) and [SETUP.md](SETUP.md)
- Open an issue for discussion
- Reach out to the maintainers

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Focus on the code, not the person
- Help others learn and grow

---

**Thank you for contributing! 🎉**
