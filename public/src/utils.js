import {
    Book, DigitalBook, Member, PremiumMember,
    books, members
} from './library.js';

export function resetLibrary() {
    books.length   = 0;
    members.length = 0;
}

export function makeBook(overrides = {}) {
    return new Book(
        overrides.isbn     ?? '9780743273565',
        overrides.title    ?? 'The Great Gatsby',
        overrides.author   ?? 'F. Scott Fitzgerald',
        overrides.year     ?? 1925,
        overrides.copies   ?? 3,
        overrides.category ?? 'fiction'
    );
}

export function makeDigitalBook(overrides = {}) {
    return new DigitalBook(
        overrides.isbn     ?? '9780062316097',
        overrides.title    ?? 'Sapiens',
        overrides.author   ?? 'Yuval Noah Harari',
        overrides.year     ?? 2011,
        overrides.fileSize ?? 2.4,
        overrides.format   ?? 'EPUB',
        overrides.category ?? 'non-fiction'
    );
}

export function makeMember(overrides = {}) {
    return new Member(
        overrides.id             ?? 1,
        overrides.name           ?? 'Alice Johnson',
        overrides.email          ?? 'alice@example.com',
        overrides.membershipType ?? 'regular'
    );
}

export function makePremiumMember(overrides = {}) {
    return new PremiumMember(
        overrides.id    ?? 2,
        overrides.name  ?? 'Bob Smith',
        overrides.email ?? 'bob@example.com'
    );
}
export function innerHTML(){
    return `<div id="message-banner-catalogue" class="message-banner"></div>
            <div id="message-banner-addbook"   class="message-banner"></div>
            <div id="message-banner-editbook"  class="message-banner"></div>
            <div id="message-banner-borrowbook" class="message-banner"></div>
            <div id="message-banner-returnbook" class="message-banner"></div>
            <div id="message-banner-editMember" class="message-banner"></div>
            <div id="message-banner-addmember"  class="message-banner"></div>
            <div id="message-banner-OverDuebooks" class="message-banner"></div>
            <div id="test-banner" class="message-banner"></div>


            <div id="catalogue-list" class="book-grid"></div>
            <div id="book-details"   class="book-details"></div>
            <div id="member-list"    class="member-list"></div>
            <div id="member-details" class="member-details"></div>
            <div id="member-form"></div>
            <div id="overdue-list"   class="overdue-list"></div>
            <div id="popular-book"   class="popular-book"></div>
            <div id="return-books-list"></div>

            <p id="total-physical-id">0</p>
            <p id="total-digital-id">0</p>
            <p id="total-available-id">0</p>
            <p id="total-members-id">0</p>
            <p id="books-borrowed">0</p>
            <p id="books-downloaded">0</p>

            <button id="catalogue-tab"  class="tab-btn is-active"></button>
            <button id="members-tab"    class="tab-btn"></button>
            <button id="statistics-tab" class="tab-btn"></button>
            <section id="catalogue-section" class="view is-active"></section>
            <section id="member-section"    class="view"></section>
            <section id="statistics-section" class="view"></section>

            <form id="add-book-form" class="inline-form">
                <input id="new-isbn"     type="text">
                <input id="new-title"    type="text">
                <input id="new-author"   type="text">
                <select id="new-year"></select>
                <select id="new-book-type">
                    <option value="physical">Physical</option>
                    <option value="digital">Digital</option>
                </select>
                <span id="physical-fields" class="field-group">
                    <input id="new-copies"   type="number" value="3">
                </span>
                <span id="digital-fields" class="field-group is-hidden">
                    <input id="new-filesize" type="number" value="2.4">
                    <select id="new-format">
                        <option value="PDF">PDF</option>
                        <option value="EPUB">EPUB</option>
                    </select>
                </span>
                <select id="new-category">
                    <option value="fiction">Fiction</option>
                    <option value="non-fiction">Non-fiction</option>
                    <option value="reference">Reference</option>
                </select>
                <button type="submit" class="btn btn-primary">Add book</button>
            </form>

            <form id="borrow-form" class="inline-form">
                <select id="borrow-member-id"></select>
                <select id="borrow-book-id"></select>
                <select id="loan-bookperiod-id">
                    <option value="14">14 days</option>
                </select>
                <button type="submit">Borrow</button>
            </form>

            <form id="return-form" class="inline-form">
                <select id="return-member-id"></select>
                <button id="return-book-btn" type="submit">Return</button>
            </form>

            <select id="filter-category">
                <option value="all">All</option>
                <option value="fiction">Fiction</option>
            </select>

            <select id="filter-member-type">
                <option value="all">All</option>
                <option value="regular">Regular</option>
                <option value="premium">Premium</option>
            </select>

            <input  id="book-search"   type="text">
            <button id="search-btn-book">Search</button>
            <input  id="member-search" type="text">
            <button id="member-search-btn">Search</button>

            <select id="overdue-period-id">
                <option value="">Select</option>
                <option value="all">All overdue</option>
                <option value="30">Over 30 days</option>
            </select>
            <button id="check-overdue-btn">Check</button>
        `;
}