# Library Management System - JavaScript Starter Code

This is the starter codebase for your digital library management system. The code is approximately 70% complete but contains numerous errors, omissions, and areas requiring significant improvement. This project is more complex than a basic task manager and requires careful analysis and debugging.

## What's Included

- `library.js` - Core library logic with Book, Member, and utility functions (incomplete with errors)
- `ui.js` - DOM manipulation and UI rendering code (incomplete with errors)
- `index.html` - HTML structure for the library interface
- `library.test.js` - Jest test suite (highly incomplete)
- `package.json` - Project configuration

## System Overview

The library system manages:
- Physical and digital books with ISBN tracking
- Member accounts (standard and premium)
- Book borrowing and returns
- Late fee calculations
- Library statistics and reporting

## Errors and Omissions

The starter code contains complex, intentional errors across all JavaScript topics:

**Fundamentals:**
- Variable scoping issues (var, let, const confusion)
- Missing variable declarations
- Incorrect operators (=, ==, ===)
- Type checking errors
- Null/undefined/empty value handling gaps

**Control Flow:**
- Off-by-one errors in loops
- Infinite while loops (missing increments)
- Missing for-of loop implementations
- Nested loop inefficiencies
- Broken conditional logic

**Functions & OOP:**
- Missing function parameters
- Broken recursive functions (no base cases)
- Class inheritance errors (missing super())
- Missing class methods and properties
- Object literal improvements needed

**Modern JavaScript:**
- No destructuring implementations
- Missing template literals
- No spread/rest operators used
- Array methods not utilised (filter, map, reduce)
- Outdated string concatenation

**DOM & Storage:**
- Incorrect DOM selectors
- Missing event handlers and delegation
- No JSON operations implemented
- LocalStorage not functional
- Poor error handling throughout

**Testing:**
- Highly incomplete test coverage
- Missing edge case tests
- No test setup/teardown
- Missing module structure

## Your Task

1. Analyse the entire codebase systematically
2. Identify and document all errors by category
3. Fix all bugs and logic errors
4. Implement all missing modern JavaScript features
5. Complete the DOM manipulation and event handling
6. Write comprehensive Jest tests (15+ test cases)
7. Ensure robust error handling throughout
8. Optimise code performance and readability

## Getting Started

1. Install dependencies: `npm install`
2. Review all code files thoroughly
3. Run tests: `npm test` (expect failures)
4. Create an issues document listing all problems found
5. Systematically fix and improve the code
6. Re-run tests until all pass with good coverage

## Testing

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode for development
npm run test:coverage # Generate coverage report
```

## Complexity Notes

This project is more challenging than a basic application:
- Multiple interrelated classes with inheritance
- Complex data relationships (books ↔ members)
- Nested data structures requiring careful manipulation
- Performance considerations with search/filter operations
- Comprehensive error handling requirements

Good luck with your debugging and implementation!
