# Library Management System
**Capstone 2 — JavaScript Library Debug**
 
A browser-based Library Management System built with HTML, CSS, JavaScript, Node.js, and Express. The system supports physical and digital books, member management, borrowing and returning books, overdue tracking, fine calculation, and data storage using localStorage and a file-based server.

## System Overview
The system is split across four layers:
- **`public/src/library.js`** - Contains the main business logic, including the Book, DigitalBook, Member, and PremiumMember classes, borrowing rules, overdue calculations, searching, statistics, and other library operations.
- **`public/src/ui.js`**  - Handles the user interface, event listeners, DOM updates, and data storage. It connects user actions to the functions in `library.js`.
- **`server.js`** - Runs an Express server locally that serves the `public/` folder and provides a POST `/save` endpoint for saving data to `public/LibraryData/Data.txt`. On Vercel the app is exported instead and `public/` is served by the CDN.
- **`tests/library.test.js`** - Jest test suite that imports functions from `library.js` and `ui.js`, and uses helper functions from `utils.js` to test core functionality and UI interactions.

## Critical Errors Found & Fixes Implemented

### 1. Declarations, Scope, and Initialization
* **Error:** Missing variable declarations (`books = []`, `MAX_BOOKS_PER_MEMBER = 5`) – Causes a `ReferenceError` in strict mode, blocking application execution.
    * *Fix:* Replaced all implicit globals with explicit block-scoped `let` and `const` declarations.
* **Error:** Use of `var members` instead of `let`/`const` – `var` is function-scoped and hoisted, making the global state harder to manage.
    * *Fix:* Changed global arrays to use `let` instead of `var` to avoid scope and hoisting issues.
* **Error:** Incorrect script loading order in `index.html` (`ui.js` before `library.js`) – `ui.js` runs before required classes and functions are available, causing initialization to fail.
    * *Fix:* Rearranged HTML script dependencies sequentially, placing `library.js` cleanly above `ui.js`.
* **Error:** `initializeUI()` executes before the document loads – UI selector configurations run eagerly before structural DOM elements are available in the browser frame.
    * *Fix:* Moved the UI initialization into a `DOMContentLoaded` event so the page loads before accessing DOM elements.

### 2. OOP Hierarchy and Class Structure
* **Error:** Missing `super()` call in the `DigitalBook` constructor – Creating a `DigitalBook` throws a `ReferenceError` because the parent constructor is never called.
    * *Fix:* Added the missing `super()` call so `DigitalBook` correctly inherits from `Book`.
* **Error:** Missing `totalCopies` and `availableCopies` properties in `Book` – The system cannot track how many copies are available for borrowing.
    * *Fix:* Added `totalCopies`, `availableCopies`, and availability checks to manage book inventory correctly.
* **Error:** Missing `joinDate` and `getMembershipDuration()` in `Member` – The system cannot track how long a member has been registered.
    * *Fix:* Added the `joinDate` property and implemented `getMembershipDuration()`.
* **Error:** Incomplete implementation in `PremiumMember` – Premium members do not receive their additional borrowing limits or premium properties.
    * *Fix:* Added the missing premium properties and updated `canBorrow()` to support premium borrowing limits.

### 3. Comparison Operators and Iteration Logic
* **Error:** Assignment (`=`) instead of comparison (`===`) in `findMemberById()` – Always returns the wrong member.
    * *Fix:* Replaced assignment (`=`) with strict comparison (`===`).
* **Error:** Assignment (`=`) instead of comparison (`===`) in `handleFilterChange()` – Changes the book category instead of comparing it, breaking category filtering.
    * *Fix:* Replaced assignment (`=`) with strict comparison (`===`).
* **Error:** Assignment (`=`) instead of comparison (`===`) in `canBorrow()` – Borrow limits are never enforced.
    * *Fix:* Replaced assignment (`=`) with strict comparison (`===`).
* **Error:** Infinite loop in `processReturnQueue()` – The loop index is never incremented, causing the application to freeze.
    * *Fix:* Replaced the infinite loop with a `for...of` loop.
* **Error:** Missing base case terminal criteria inside `searchBooksByCategory()` – Causes recursive executions to overflow call stacks.
    * *Fix:* Added a base case and null checks to stop the recursion correctly.

### 4. Business Logic Validation and Error Recovery
* **Error:** Missing book availability checks in `checkOut()` – Books can be borrowed even when no copies are available.
   * *Fix:* Added validation to prevent borrowing books when no copies are available.
* **Error:** Non-existent property in `calculateTotalLateFees()` – References `memberRecord.overdueBooks`, causing a `TypeError`.
    * *Fix:* Updated the function to use `memberRecord.borrowedBooks`.
* **Error:** Missing input parameter validations and error handling in `borrowBook()` – Invalid or missing input can cause runtime errors.
    * *Fix:* Added input validation, null checks, and `try...catch` error handling.
* **Error:** Unchecked inputs in `calculateFineAmount()` – Invalid or missing values can produce incorrect fine calculations.
    * *Fix:* Added input validation and rounded fine amounts to two decimal places.

### 5. DOM Manipulation and Application State Persistence

* **Error:** Missing `event.preventDefault()` in form submissions – Forms automatically reload the page, interrupting user actions.
    * *Fix:* Added `event.preventDefault()` to stop forms from refreshing the page.
* **Error:** Incorrect CSS selector in `ui.js` – Missing the `#` prefix prevents elements from being found.
    * *Fix:* Corrected invalid CSS selectors used with `querySelector()`.
* **Error:** Incorrect event type on the category dropdown – Uses `click` instead of `change`.
    * *Fix:* Changed the event type from `click` to `change`.
* **Error:** Inefficient DOM updates during catalogue rendering – Repeated DOM updates reduce rendering performance.
    * *Fix:* Used `DocumentFragment` to batch DOM updates.
* **Error:** Missing `JSON.stringify()` in `saveToLocalStorage()` and `exportLibraryData()` – Objects are not saved correctly.
    * *Fix:* Used `JSON.stringify()` before saving data.
* **Error:** Missing validation and `JSON.parse()` when loading data – Invalid or empty data can cause runtime errors.
    * *Fix:* Added validation and `JSON.parse()` when loading saved data.

## Modern Features Added (ES6+)
The project was updated to use modern JavaScript (ES6+) features, including:

- ES6 modules (`import` / `export`)
- `let` and `const`
- Arrow functions
- Classes and inheritance (`extends`, `super`)
- Private class fields (`#totalCopies`, `#availableCopies`, `#checkedOutRecords`, `#joinDate`, `#borrowedBooks`, `#downloads`)
- Getters and setters with built-in validation
- Template literals
- Object, array, parameter, and loop destructuring
- Rest and spread operators (e.g. `combineLists(...lists)`, `addMultipleBooks(...newBooks)`)
- Default parameters
- Array methods (`find`, `filter`, `reduce`, `some`, `forEach`, `map`, `flat`)
- `for...of` loops
- `async` / `await`
- Optional chaining (`?.`) and nullish coalescing (`??`)
- `toJSON()` overrides for custom class serialization
 
## Architecture Improvements

The application was reorganized to make it easier to maintain and test.

- Separated business logic (`library.js`) from UI logic (`ui.js`).
- Used inheritance to support physical and digital books, as well as regular and premium members.
- Centralized statistics calculations in the `LibraryStats` object.
- Stored books in separate categories (fiction, non-fiction, and reference).
- Rebuilt imported JSON into `Book`, `DigitalBook`, `Member`, and `PremiumMember` objects so class methods remain available.
- Added helper functions to simplify Jest testing and improve test coverage.

## Installation
 
```bash
git clone <repo-url>
npm install

```
## Running the Application
 
```bash
node server.js

```
Open your browser at `http://localhost:3000`

## Deploying to Vercel
The static site (`index.html`, `styles.css`, `src/`, `LibraryData/`) lives in `public/`, which Vercel serves at `/`. On the deployed site the library is stored in the browser's `localStorage`. First-time visitors start with the default books and members from `public/LibraryData/Data.txt`. The `/save` export to `Data.txt` only runs on `localhost`. To change the default data, run the app locally, make your edits, and commit the updated `public/LibraryData/Data.txt`.

## Running Tests with Coverage
 
```bash
npm test -- --coverage
```