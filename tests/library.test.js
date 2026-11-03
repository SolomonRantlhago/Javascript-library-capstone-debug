//Library.test.js
import {
    Book, DigitalBook, Member, PremiumMember,
    books, members,
    borrowBook, processReturnQueue, findOverdueBooks,
    findMemberById, findBookByISBN,
    addMultipleBooks, addMultipleMembers, updateMemberInfo,
    combineBookCollections, calculateTotalLateFees,
    calculateFineAmount, LibraryStats,formatBookInfo,
    getBooksByTitle, getBooksByAuthor,
    filterBooks, filterCollection, iterateBooks,
    searchBooksByCategory, searchMembersByType,
    MAX_BOOKS_PER_MEMBER, LATE_FEE_PER_DAY
} from '../src/library.js';

import {
    resetLibrary,
    makeBook,
    makeDigitalBook,
    makeMember,
    makePremiumMember,
    innerHTML
} from '../src/utils.js';

import { jest } from '@jest/globals';
import * as uiModule from '../src/ui.js';

describe('Book Class', () => {
    let book;

    beforeEach(() => {
        book = makeBook();
    });
    test('should create a book instance', () => {
        expect(book.isbn).toBe('9780743273565');
        expect(book.title).toBe('The Great Gatsby');
        expect(book.author).toBe('F. Scott Fitzgerald');
        expect(book.year).toBe(1925);
        expect(book.totalCopies).toBe(3);
        expect(book.availableCopies).toBe(3);
        expect(book.category).toBe('fiction');
        expect(book.isDigital).toBe(false);
        expect(book.checkedOut).toEqual([]);
    });
    
    // checkOut
    test('checkOut decrements availableCopies and pushes a record', () => {
        const result = book.checkOut(1);
        expect(result).toBe(true);
        expect(book.availableCopies).toBe(2);
        expect(book.checkedOut).toHaveLength(1);
        expect(book.checkedOut[0].memberId).toBe(1);
        expect(book.checkedOut[0].isbn).toBe(book.isbn);
    });

    test('checkOut returns false when no copies available', () => {
        book.availableCopies = 0;
        const result = book.checkOut(1);
        expect(result).toBe(false);
        expect(book.checkedOut).toHaveLength(0);
    });

    test('multiple checkouts reduce availableCopies correctly', () => {
        book.checkOut(1);
        book.checkOut(2);
        expect(book.availableCopies).toBe(1);
        expect(book.checkedOut).toHaveLength(2);
    });

    // isAvailable
    test('isAvailable returns true when copies remain', () => {
        expect(book.isAvailable()).toBe(true);
    });
    test('isAvailable returns false when all copies are checked out', () => {
        book.availableCopies = 0;
        expect(book.isAvailable()).toBe(false);
    });

    // getInfo
    test('getInfo returns a string containing title, author, year and isbn', () => {
        const info = book.getInfo();
        expect(typeof info).toBe('string');
        expect(info).toContain('The Great Gatsby');
        expect(info).toContain('F. Scott Fitzgerald');
        expect(info).toContain('1925');
        expect(info).toContain('9780743273565');
    });
});

describe('DigitalBook Class', () => {
    let digital;

    beforeEach(() => {
        digital = makeDigitalBook();
    });

    // Inheritance
    test('is an instance of both DigitalBook and Book', () => {
        expect(digital).toBeInstanceOf(DigitalBook);
        expect(digital).toBeInstanceOf(Book);
    });

    // getInfo inherited
    test('inherits getInfo from Book', () => {
        const info = digital.getInfo();
        expect(info).toContain('Sapiens');
        expect(info).toContain('Yuval Noah Harari');
    });

    // Constructor via super()
    test('sets digital-specific properties correctly', () => {
        expect(digital.isbn).toBe('9780062316097');
        expect(digital.fileSize).toBe(2.4);
        expect(digital.format).toBe('EPUB');
        expect(digital.isDigital).toBe(true);
        expect(digital.totalCopies).toBe(Infinity);
        expect(digital.availableCopies).toBe(Infinity);
    });

    // download
    test('download pushes a record to checkedOut and returns true', () => {
        const result = digital.download(1);
        expect(result).toBe(true);
        expect(digital.checkedOut).toHaveLength(1);
        expect(digital.checkedOut[0].memberId).toBe(1);
    });

    test('multiple downloads all record correctly', () => {
        digital.download(1);
        digital.download(2);
        digital.download(3);
        expect(digital.checkedOut).toHaveLength(3);
    });
});

describe('Member Class', () => {
    let member;

    beforeEach(() => {
        member = makeMember();
    });
    // Constructor
    test('creates a member with all correct properties', () => {
        expect(member.id).toBe(1);
        expect(member.name).toBe('Alice Johnson');
        expect(member.email).toBe('alice@example.com');
        expect(member.membershipType).toBe('regular');
        expect(member.borrowedBooks).toEqual([]);
        expect(member.downloads).toEqual([]);
        expect(member.joinDate).toBeInstanceOf(Date);
    });
    // getMembershipDuration
    test('getMembershipDuration returns hours string for same-day join', () => {
        const duration = member.getMembershipDuration();
        expect(typeof duration).toBe('string');
        expect(duration).toMatch(/hour/);
    });

    test('getMembershipDuration returns days string for recent join', () => {
        const past = new Date();
        past.setDate(past.getDate() - 10);
        const m    = new Member(1, 'Test', 'test@test.com', 'regular', past);
        expect(m.getMembershipDuration()).toBe('10 days');
    });
     test('getMembershipDuration returns months string for old join', () => {
        const past = new Date();
        past.setDate(past.getDate() - 90);
        const m    = new Member(1, 'Test', 'test@test.com', 'regular', past);
        expect(m.getMembershipDuration()).toMatch(/month/);
    });

    // getMemberInfo
    test('getMemberInfo returns a string with member details', () => {
        const info = member.getMemberInfo();
        expect(typeof info).toBe('string');
        expect(info).toContain('#1');
        expect(info).toContain('Alice Johnson');
        expect(info).toContain('alice@example.com');
        expect(info).toContain('Regular');
    });

    test('getMemberInfo shows correct borrow limit for regular member', () => {
        const info = member.getMemberInfo();
        expect(info).toContain(`/ ${MAX_BOOKS_PER_MEMBER}`);
    });

    // canBorrow — physical book
    test('canBorrow returns success for a physical book not yet borrowed', () => {
        const book   = makeBook();
        const result = member.canBorrow(book);
        expect(result.success).toBe(true);
    });
    test('canBorrow returns failure if member already borrowed the book', () => {
        const book = makeBook();
        member.addBorrowedBook({ isbn: book.isbn, loanPeriod: 14 });
        const result = member.canBorrow(book);
        expect(result.success).toBe(false);
        expect(result.message).toContain('already borrowed');
    });

    test('canBorrow returns failure when borrow limit is reached', () => {
        const book = makeBook();
        for (let i = 0; i < MAX_BOOKS_PER_MEMBER; i++) {
            member.addBorrowedBook({ isbn: `isbn-${i}`, loanPeriod: 14 });
        }
        const result = member.canBorrow(book);
        expect(result.success).toBe(false);
        expect(result.message).toContain('borrowing limit');
    });

    test('canBorrow returns success for a digital book not yet downloaded', () => {
        const digital = makeDigitalBook();
        const result  = member.canBorrow(digital);
        expect(result.success).toBe(true);
    });
    
    test('canBorrow returns failure if member already downloaded the digital book', () => {
        const digital = makeDigitalBook();
        member.addDownload({ isbn: digital.isbn, expirePeriod: 7 });
        const result = member.canBorrow(digital);
        expect(result.success).toBe(false);
        expect(result.message).toContain('already downloaded');
    });

});

describe('PremiumMember Class', () => {
    let premium;

    beforeEach(() => {
        premium = makePremiumMember();
    });
        // Inheritance
    test('is an instance of both PremiumMember and Member', () => {
        expect(premium).toBeInstanceOf(PremiumMember);
        expect(premium).toBeInstanceOf(Member);
    });
    // Constructor via super()
    test('sets premium-specific properties correctly', () => {
        expect(premium.membershipType).toBe('premium');
        expect(premium.maxBooks).toBe(10);
        expect(premium.discountRate).toBe(0.2);
        expect(premium.priorityHolds).toBe(true);
    });
        test('inherits base Member properties correctly', () => {
        expect(premium.id).toBe(2);
        expect(premium.name).toBe('Bob Smith');
        expect(premium.email).toBe('bob@example.com');
        expect(premium.borrowedBooks).toEqual([]);
        expect(premium.downloads).toEqual([]);
    });
    // canBorrow override — uses this.maxBooks not MAX_BOOKS_PER_MEMBER
    test('canBorrow allows borrowing up to maxBooks (10) not MAX_BOOKS_PER_MEMBER (5)', () => {
        const book = makeBook();
        for (let i = 0; i < MAX_BOOKS_PER_MEMBER; i++) {
            premium.addBorrowedBook({ isbn: `isbn-${i}`, loanPeriod: 14 });
        }
        // Regular limit (5) reached but premium should still allow
        const result = premium.canBorrow(book);
        expect(result.success).toBe(true);
    });
    test('canBorrow returns failure when premium limit of 10 is reached', () => {
        const book = makeBook();
        for (let i = 0; i < 10; i++) {
            premium.addBorrowedBook({ isbn: `isbn-${i}`, loanPeriod: 14 });
        }
        const result = premium.canBorrow(book);
        expect(result.success).toBe(false);
        expect(result.message).toContain('10');
    });

    test('canBorrow returns failure if premium member already downloaded the digital book', () => {
        const digital = makeDigitalBook();
        premium.addDownload({ isbn: digital.isbn, expirePeriod: 7 });
        const result = premium.canBorrow(digital);
        expect(result.success).toBe(false);
        expect(result.message).toContain('already downloaded');
    });

    test('canBorrow returns failure if premium member already borrowed the book', () => {
        const book = makeBook();
        premium.addBorrowedBook({ isbn: book.isbn, loanPeriod: 7 });
        const result = premium.canBorrow(book);
        expect(result.success).toBe(false);
        expect(result.message).toContain('already borrowed');
    });

});

describe('Library Functions', () => {
    describe('findBookByISBN', () => {
        beforeEach(() => {
            resetLibrary();
            addMultipleBooks(makeBook({ isbn: '9780743273565' }));
        });

        afterEach(resetLibrary);

        test('returns the book when found', () => {
            const result = findBookByISBN('9780743273565');
            expect(result).not.toBeNull();
            expect(result.isbn).toBe('9780743273565');
        });

        test('returns null when book not found', () => {
            const result = findBookByISBN('0000000000000');
            expect(result).toBeNull();
        });

        test('returns null for empty books array', () => {
            books.length = 0;
            const result = findBookByISBN('9780743273565');
            expect(result).toBeNull();
        });
    });
    describe('findMemberById', () => {
        beforeEach(() => {
            resetLibrary();
            addMultipleMembers(makeMember({ id: 1 }),makePremiumMember({ id: 2 }));
        });

        afterEach(resetLibrary);

        test('returns the member when found', () => {
            const result = findMemberById(1);
            expect(result).toBeDefined();
            expect(result.id).toBe(1);
        });

        test('returns undefined when member not found', () => {
            const result = findMemberById(99);
            expect(result).toBeUndefined();
        });
    });
    describe('getBooksByAuthor', () => {
        beforeEach(() => {
            resetLibrary();
            addMultipleBooks(
                makeBook({ isbn: '001', author: 'George Orwell' }),
                makeBook({ isbn: '002', author: 'George Orwell' }),
                makeBook({ isbn: '003', author: 'Jane Austen' })
            );
        });

        afterEach(resetLibrary);

        test('returns books matching the author (case-insensitive)', () => {
            const result = getBooksByAuthor('george orwell');
            expect(result).toHaveLength(2);
        });

        test('returns books matching a partial author name', () => {
            const result = getBooksByAuthor('orwell');
            expect(result).toHaveLength(2);
        });

        test('returns empty array when no books match', () => {
            const result = getBooksByAuthor('Tolkien');
            expect(result).toHaveLength(0);
        });

        test('returns empty array when books array is empty', () => {
            books.length = 0;
            const result = getBooksByAuthor('George Orwell');
            expect(result).toHaveLength(0);
        });
    }); 
    describe('getBooksByTitle', () => {
        beforeEach(() => {
            resetLibrary();
            addMultipleBooks(
                makeBook({ isbn: '001', title: '1984' }),
                makeBook({ isbn: '002', title: 'Animal Farm' }),
                makeBook({ isbn: '003', title: 'Brave New World' })
            );
        });

        afterEach(resetLibrary);

        test('returns books matching the title (case-insensitive)', () => {
            const result = getBooksByTitle('1984');
            expect(result).toHaveLength(1);
        });

        test('returns books matching a partial title', () => {
            const result = getBooksByTitle('animal');
            expect(result).toHaveLength(1);
            expect(result[0].title).toBe('Animal Farm');
        });

        test('returns empty array when no books match', () => {
            const result = getBooksByTitle('Lord of the Rings');
            expect(result).toHaveLength(0);
        });
    });
    describe('addMultipleBooks — rest parameters and spread', () => {
        beforeEach(resetLibrary);
        afterEach(resetLibrary);

        test('adds a single book using rest params', () => {
            addMultipleBooks(makeBook({ isbn: '001' }));
            expect(books).toHaveLength(1);
        });

        test('adds multiple books in one call using rest params', () => {
            addMultipleBooks(
                makeBook({ isbn: '001' }),
                makeBook({ isbn: '002' }),
                makeBook({ isbn: '003' })
            );
            expect(books).toHaveLength(3);
        });
    }); 
    describe('updateMemberInfo', () => {
        test('updates name and email', () => {
            const member = makeMember();
            updateMemberInfo(member, { name: 'New Name', email: 'new@email.com', membershipType: 'regular' });
            expect(member.name).toBe('New Name');
            expect(member.email).toBe('new@email.com');
        });

        test('upgrades member to premium and sets premium properties', () => {
            const member = makeMember();
            updateMemberInfo(member, { name: member.name, email: member.email, membershipType: 'premium' });
            expect(member.membershipType).toBe('premium');
            expect(member.maxBooks).toBe(10);
            expect(member.discountRate).toBe(0.2);
            expect(member.priorityHolds).toBe(true);
        });

        test('downgrades member to regular and removes premium properties', () => {
            const premium = makePremiumMember();
            updateMemberInfo(premium, { name: premium.name, email: premium.email, membershipType: 'regular' });
            expect(premium.membershipType).toBe('regular');
            expect(premium.maxBooks).toBeUndefined();
            expect(premium.discountRate).toBeUndefined();
            expect(premium.priorityHolds).toBeUndefined();
        });

        test('returns the updated member', () => {
            const member  = makeMember();
            const result  = updateMemberInfo(member, { name: 'X', email: 'x@x.com', membershipType: 'regular' });
            expect(result).toBe(member);
        });

        test('does not change type if same type passed', () => {
            const member = makeMember();
            updateMemberInfo(member, { name: member.name, email: member.email, membershipType: 'regular' });
            expect(member.membershipType).toBe('regular');
            expect(member.maxBooks).toBeUndefined();
        });
    });
});

describe('Array Operations', () => {
    test('filter — filterCollection filters correctly', () => {
        const nums   = [1, 2, 3, 4, 5];
        const result = filterCollection(nums, n => n % 2 === 0);
        expect(result).toEqual([2, 4]);
    });

    test('map — getBookStats uses map to get checkout counts', () => {
        resetLibrary();
        addMultipleBooks(makeBook({ isbn: '001' }), makeBook({ isbn: '002' }));
        books[0].checkOut(1);
        const stats = LibraryStats.getBookStats();
        expect(stats.max).toBe(1);
        expect(stats.min).toBe(0);
        resetLibrary();
    });

    test('reduce — calculateTotalLateFees uses reduce correctly', () => {
        const fresh  = makeMember({ id: 1 });
        const result = calculateTotalLateFees(fresh);
        expect(result.success).toBe(true);
        expect(result.message).toBe(0);
    });

    test('find — findMemberById uses find via findMember', () => {
        resetLibrary();
        addMultipleMembers(makeMember({ id: 42 }));
        const result = findMemberById(42);
        expect(result.id).toBe(42);
        resetLibrary();
    });

    test('some — canBorrow uses some to check duplicates', () => {
        const member = makeMember();
        const book   = makeBook();
        member.addBorrowedBook({ isbn: book.isbn, loanPeriod: 14 });
        const result = member.canBorrow(book);
        expect(result.success).toBe(false);
    });

    test('spread — combineBookCollections uses spread operator', () => {
        const f = [makeBook({ isbn: '001' })];
        const n = [makeBook({ isbn: '002' })];
        const r = [makeBook({ isbn: '003' })];
        expect(combineBookCollections(f, n, r)).toHaveLength(3);
    });

    test('rest — addMultipleBooks uses rest parameters', () => {
        resetLibrary();
        addMultipleBooks(makeBook({ isbn: 'A' }), makeBook({ isbn: 'B' }), makeBook({ isbn: 'C' }));
        expect(books).toHaveLength(3);
        resetLibrary();
    });
});

describe('Recursive Functions', () => {
    describe('searchBooksByCategory — recursive function', () => {
        const bookList = [
            makeBook({ isbn: '001', category: 'fiction' }),
            makeBook({ isbn: '002', category: 'non-fiction' }),
            makeBook({ isbn: '003', category: 'fiction' }),
            makeBook({ isbn: '004', category: 'reference' })
        ];

        test('returns all books matching the given category', () => {
            const result = searchBooksByCategory(bookList, 'fiction');
            expect(result).toHaveLength(2);
            expect(result.every(b => b.category === 'fiction')).toBe(true);
        });

        test('returns empty array when no books match', () => {
            const result = searchBooksByCategory(bookList, 'biography');
            expect(result).toEqual([]);
        });

        test('base case: returns empty array for empty list', () => {
            const result = searchBooksByCategory([], 'fiction');
            expect(result).toEqual([]);
        });

        test('handles null entries without crashing', () => {
            const listWithNull = [null, makeBook({ isbn: '001', category: 'fiction' })];
            const result = searchBooksByCategory(listWithNull, 'fiction');
            expect(result).toHaveLength(0); // null hits the base case early
        });

        test('returns a new array — does not mutate original', () => {
            const original = [...bookList];
            searchBooksByCategory(bookList, 'fiction');
            expect(bookList).toHaveLength(original.length);
        });

        test('works with a single-element list', () => {
            const result = searchBooksByCategory([bookList[0]], 'fiction');
            expect(result).toHaveLength(1);
        });
    });
    describe('searchMembersByType — recursive function', () => {
        const memberList = [
            makeMember({ id: 1, membershipType: 'regular' }),
            makePremiumMember({ id: 2 }),
            makeMember({ id: 3, membershipType: 'regular' })
        ];

        test('returns all members matching the given type', () => {
            const result = searchMembersByType(memberList, 'regular');
            expect(result).toHaveLength(2);
        });

        test('returns empty array when no members match', () => {
            const result = searchMembersByType(memberList, 'enterprise');
            expect(result).toEqual([]);
        });

        test('base case: returns empty array for empty list', () => {
            const result = searchMembersByType([], 'regular');
            expect(result).toEqual([]);
        });

        test('skips null entries and continues recursion', () => {
            const listWithNull = [null, makeMember({ id: 1, membershipType: 'regular' })];
            const result = searchMembersByType(listWithNull, 'regular');
            expect(result).toHaveLength(1);
        });
    });

});

describe('Error Handling', () => {
    describe('Error Handling — try-catch blocks', () => {
        test('calculateFineAmount catches type errors gracefully', () => {
            expect(() => calculateFineAmount(null, 5)).not.toThrow();
            const result = calculateFineAmount(null, 5);
            expect(result.success).toBe(false);
        });

        test('calculateFineAmount catches NaN gracefully', () => {
            const result = calculateFineAmount(makeMember(), NaN);
            expect(result.success).toBe(false);
        });

        test('borrowBook catches and returns errors from inside the try block', () => {
            resetLibrary();
            // No member or book added — will throw inside borrowBook
            const result = borrowBook(1, '0000000000000', 14);
            expect(result.success).toBe(false);
            resetLibrary();
        });
    });


    describe('Null and Undefined Checks', () => {
        test('findBookByISBN returns null for unknown ISBN', () => {
            resetLibrary();
            expect(findBookByISBN('unknown')).toBeNull();
            resetLibrary();
        });

        test('findMemberById returns undefined for unknown ID', () => {
            resetLibrary();
            expect(findMemberById(999)).toBeUndefined();
            resetLibrary();
        });

        test('calculateFineAmount returns failure for null memberRecord', () => {
            const result = calculateFineAmount(null, 5);
            expect(result.success).toBe(false);
        });

        test('calculateTotalLateFees skips books not found by ISBN', () => {
            const member = makeMember({ id: 1 });
            // Push a borrowed book entry with an ISBN that doesn't exist in books array
            member.addBorrowedBook({ isbn: 'nonexistent', loanPeriod: 14 });
            resetLibrary();
            addMultipleMembers(member);
            const result = calculateTotalLateFees(member);
            // Should succeed with 0 since the book was skipped
            expect(result.success).toBe(true);
            resetLibrary();
        });
    });
    describe('typeof checks', () => {
        test('borrowBook rejects string memberId', () => {
            const result = borrowBook('not-a-number', '1234567890', 14);
            expect(result.success).toBe(false);
            expect(result.message).toContain('number');
        });

        test('borrowBook rejects numeric isbn', () => {
            const result = borrowBook(1, 1234567890, 14);
            expect(result.success).toBe(false);
            expect(result.message).toContain('string');
        });

        test('borrowBook rejects string loanPeriod', () => {
            const result = borrowBook(1, '1234567890', '14');
            expect(result.success).toBe(false);
            expect(result.message).toContain('number');
        });

        test('calculateFineAmount rejects string daysDiff', () => {
            const result = calculateFineAmount(makeMember(), '5');
            expect(result.success).toBe(false);
            expect(result.message).toContain('valid number');
        });

        test('calculateFineAmount rejects non-object memberRecord', () => {
            const result = calculateFineAmount('not-an-object', 5);
            expect(result.success).toBe(false);
            expect(result.message).toContain('valid object');
        });
    });
});

describe('String Operations', () => {
    describe('formatBookInfo — pure function', () => {
        test('returns a string', () => {
            const book   = makeBook();
            const result = formatBookInfo(book);
            expect(typeof result).toBe('string');
        });

        test('delegates to book.getInfo()', () => {
            const book   = makeBook();
            const result = formatBookInfo(book);
            expect(result).toBe(book.getInfo());
        });

        test('contains book title in output', () => {
            const book = makeBook({ title: 'Unique Title XYZ' });
            expect(formatBookInfo(book)).toContain('Unique Title XYZ');
        });
    });
});

describe('Math Operations', () => {

    describe('calculateFineAmount', () => {
        const regular = makeMember();
        const premium = makePremiumMember();

        test('calculates correct fine for regular member', () => {
            const result = calculateFineAmount(regular, 5);
            expect(result.success).toBe(true);
            expect(result.message).toBe(5 * LATE_FEE_PER_DAY);
        });

        test('applies 20% discount for premium member', () => {
            const result   = calculateFineAmount(premium, 10);
            const expected = parseFloat((10 * LATE_FEE_PER_DAY * 0.8).toFixed(2));
            expect(result.message).toBe(expected);
        });

        test('returns failure for non-number daysDiff', () => {
            expect(calculateFineAmount(regular, '5').success).toBe(false);
        });

        test('returns failure for null memberRecord', () => {
            expect(calculateFineAmount(null, 5).success).toBe(false);
        });

        test('returns failure for NaN', () => {
            expect(calculateFineAmount(regular, NaN).success).toBe(false);
        });
    });
    describe('calculateTotalLateFees', () => {
        beforeEach(() => {
            resetLibrary();
        });

        afterEach(resetLibrary);

        test('returns 0 for member with no borrowed books', () => {
            const result = calculateTotalLateFees(makeMember());
            expect(result.success).toBe(true);
            expect(result.message).toBe(0);
        });

        test('returns correct fine for overdue book', () => {
            const book   = makeBook({ isbn: '001' });
            const member = makeMember({ id: 1 });

            const checkoutDate = new Date();
            checkoutDate.setDate(checkoutDate.getDate() - 20); 
            book.checkOut(1,checkoutDate);
            member.addBorrowedBook({ isbn: book.isbn, loanPeriod: 7 }); 

            addMultipleBooks(book);
            addMultipleMembers(member);

            const result   = calculateTotalLateFees(member);
            const expected = parseFloat((13 * LATE_FEE_PER_DAY).toFixed(2));
            expect(result.success).toBe(true);
            expect(result.message).toBe(expected);
        });
        test('returns failure when calculateFineAmount receives NaN daysOverdue', () => {
            const member = makeMember({ id: 1 });
            const book = makeBook({ isbn: '001' });
            const checkoutDate = new Date();
            checkoutDate.setDate(checkoutDate.getDate() - 20);
            book.checkOut(1,checkoutDate);
            member.addBorrowedBook({ isbn: '001', loanPeriod: 'abc' });

            addMultipleBooks(book);
            addMultipleMembers(member);

            const result = calculateTotalLateFees(member);

            expect(result.success).toBe(false);
            expect(result.message).toContain('Invalid loan period');
        });
        test('returns failure when calculateFineAmount fails due to invalid memberRecord', () => {
            const corruptMember = {
                id           : 1,
                name         : 'Corrupt Member',
                email        : 'corrupt@test.com',
                membershipType: null, 
                borrowedBooks: [{ isbn: '001', loanPeriod: 7 }],
                downloads    : []
            };

            const book = makeBook({ isbn: '001' });
            const checkoutDate = new Date();
            checkoutDate.setDate(checkoutDate.getDate() - 20);
            book.checkOut(1,checkoutDate);

            addMultipleBooks(book);

            const result = calculateTotalLateFees(corruptMember);
            expect(result.success).toBe(false);
            expect(result.message).toBe("membershipType doesn't exist");
        });
    });
});

describe('DOM Manipulation', () => {

     beforeEach(() => {
        document.body.innerHTML = innerHTML();
        resetLibrary();
        uiModule.initializeUI();
     })

    afterEach(() => {
        resetLibrary();
        document.body.innerHTML = '';
    });
        describe('renderBookCatalogue', () => {
        test('renders a card for each book in the list', () => {
            addMultipleBooks(
                makeBook({ isbn: '001', title: 'Book One' }),
                makeBook({ isbn: '002', title: 'Book Two' })
            );
            uiModule.renderBookCatalogue(books);
            const cards = document.querySelectorAll('.book-card');
            expect(cards).toHaveLength(2);
        });

        test('renders empty-state paragraph when bookList is empty', () => {
            uiModule.renderBookCatalogue([]);
            const empty = document.querySelector('.empty-state');
            expect(empty).not.toBeNull();
            expect(empty.textContent).toContain('No books found');
        });

        test('each card contains the book title', () => {
            addMultipleBooks(makeBook({ isbn: '001', title: 'Unique Title ABC' }));
            uiModule.renderBookCatalogue(books);
            const card = document.querySelector('.book-card');
            expect(card.innerHTML).toContain('Unique Title ABC');
        });


        test('renders view and edit buttons with correct data attributes', () => {
            addMultipleBooks(makeBook({ isbn: '9780743273565' }));
            uiModule.renderBookCatalogue(books);
            const viewBtn = document.querySelector('[data-action="view"]');
            const editBtn = document.querySelector('[data-action="edit"]');
            expect(viewBtn).not.toBeNull();
            expect(editBtn).not.toBeNull();
            expect(viewBtn.dataset.isbn).toBe('9780743273565');
            expect(editBtn.dataset.isbn).toBe('9780743273565');
        });
    });
    describe('renderMemberList', () => {
        test('renders a card for each member', () => {
            addMultipleMembers(makeMember({ id: 1 }),makePremiumMember({ id: 2 }));
            uiModule.renderMemberList(members);
            expect(document.querySelectorAll('.member-card')).toHaveLength(2);
        });

        test('renders empty-state when member list is empty', () => {
            uiModule.renderMemberList([]);
            expect(document.querySelector('.empty-state').textContent).toContain('No members found');
        });

        test('shows premium badge for premium members', () => {
            addMultipleMembers(makePremiumMember({ id: 1 }));
            uiModule.renderMemberList(members);
            expect(document.querySelector('.badge-premium')).not.toBeNull();
        });

        test('does not show premium badge for regular members', () => {
            addMultipleMembers(makeMember({ id: 1 }));
            uiModule.renderMemberList(members);
            expect(document.querySelector('.badge-premium')).toBeNull();
        });

        test('shows correct borrowed books count', () => {
            const member = makeMember({ id: 1 });
            member.addBorrowedBook({ isbn: '001', loanPeriod: 14 });
            addMultipleMembers(member);
            uiModule.renderMemberList(members);
            expect(document.querySelector('.member-card').innerHTML).toContain('1 book(s) borrowed');
        });

        test('shows correct downloads count', () => {
            const member = makeMember({ id: 1 });
            member.addDownload({ isbn: '001', expirePeriod: 7 });
            addMultipleMembers(member);
            uiModule.renderMemberList(members);
            expect(document.querySelector('.member-card').innerHTML).toContain('1 book(s) downloaded');
        });

        describe('handleNavTabs', () => {
            test('activates the clicked tab and deactivates others', () => {
                uiModule.handleNavTabs('members-tab');
                expect(document.getElementById('members-tab').classList.contains('is-active')).toBe(true);
                expect(document.getElementById('catalogue-tab').classList.contains('is-active')).toBe(false);
                expect(document.getElementById('statistics-tab').classList.contains('is-active')).toBe(false);
            });
        })
        describe('handleSearchBook', () => {
            beforeEach(() => {
                addMultipleBooks(
                    makeBook({ isbn: '001', title: '1984',        author: 'George Orwell',  category: 'fiction' }),
                    makeBook({ isbn: '002', title: 'Animal Farm', author: 'George Orwell',  category: 'fiction' }),
                    makeBook({ isbn: '003', title: 'Sapiens',     author: 'Yuval Harari',   category: 'non-fiction' })
                );
            });

            test('renders all books when search term is empty', () => {
                document.getElementById('book-search').value = '';
                uiModule.handleSearchBook();
                expect(document.querySelectorAll('.book-card')).toHaveLength(3);
            });

            test('filters by title match', () => {
                document.getElementById('book-search').value = '1984';
                uiModule.handleSearchBook();
                expect(document.querySelectorAll('.book-card')).toHaveLength(1);
                expect(document.querySelector('.book-card').innerHTML).toContain('1984');
            });

            test('filters by author match', () => {
                document.getElementById('book-search').value = 'orwell';
                uiModule.handleSearchBook();
                expect(document.querySelectorAll('.book-card')).toHaveLength(2);
            });

            test('shows empty-state when no books match', () => {
                document.getElementById('book-search').value = 'Tolkien';
                uiModule.handleSearchBook();
                expect(document.querySelector('.empty-state')).not.toBeNull();
            });

            test('combines category filter with search term', () => {
                document.getElementById('filter-category').value = 'fiction';
                document.getElementById('book-search').value     = '1984';
                uiModule.handleSearchBook();
                expect(document.querySelectorAll('.book-card')).toHaveLength(1);
            });
        });
    });
    describe('handleSearchMember', () => {
        beforeEach(() => {
            addMultipleMembers(makeMember({ id: 1, name: 'Alice Johnson', membershipType: 'regular' }),
                makePremiumMember({ id: 2, name: 'Bob Smith' }),
                makeMember({ id: 3, name: 'Alice Wonder', membershipType: 'regular' }));
        });

        test('renders all members when search term is empty', () => {
            document.getElementById('member-search').value = '';
            uiModule.handleSearchMember();
            expect(document.querySelectorAll('.member-card')).toHaveLength(3);
        });

        test('filters members by name', () => {
            document.getElementById('member-search').value = 'alice';
            uiModule.handleSearchMember();
            expect(document.querySelectorAll('.member-card')).toHaveLength(2);
        });

        test('shows empty-state when no members match', () => {
            document.getElementById('member-search').value = 'Nonexistent';
            uiModule.handleSearchMember();
            expect(document.querySelector('.empty-state')).not.toBeNull();
        });

        test('combines membership type filter with name search', () => {
            document.getElementById('filter-member-type').value = 'premium';
            document.getElementById('member-search').value      = 'bob';
            uiModule.handleSearchMember();
            expect(document.querySelectorAll('.member-card')).toHaveLength(1);
        });
    })
    describe('displayBookDetails', () => {
        test('renders book info in the details container', () => {
            addMultipleBooks(makeBook({ isbn: '9780743273565', title: 'Gatsby' }));
            uiModule.displayBookDetails('9780743273565');
            expect(document.getElementById('book-details').innerHTML).toContain('Gatsby');
        });
        test('shows error message when book not found', () => {
            uiModule.displayBookDetails('nonexistent');
            const banner = document.getElementById('message-banner-catalogue');
            expect(banner.classList.contains('is-visible')).toBe(true);
            expect(banner.textContent).toContain('Book not found');
        });
    })
    describe('renderOverdueList', () => {
        test('shows empty-state when no overdue items', () => {
            uiModule.renderOverdueList([]);
            expect(document.getElementById('overdue-list').innerHTML).toContain('empty-state');
        });
        test('renders one overdue-item per entry', () => {
            const items = [
                { bookTitle: 'Book A', isbn: '001', memberName: 'Alice', memberId: 1, daysOverdue: 5,  fine: 2.50, isDigital: false },
                { bookTitle: 'Book B', isbn: '002', memberName: 'Bob',   memberId: 2, daysOverdue: 10, fine: 5.00, isDigital: false }
            ];
            uiModule.renderOverdueList(items);
            expect(document.querySelectorAll('.overdue-item')).toHaveLength(2);
        });
        test('shows days late and fine for physical overdue book', () => {
            uiModule.renderOverdueList([
                { bookTitle: 'Test', isbn: '001', memberName: 'Alice', memberId: 1, daysOverdue: 3, fine: 1.50, isDigital: false }
            ]);
            expect(document.querySelector('.days-late').textContent).toContain('3 day(s) late');
            expect(document.querySelector('.days-late').textContent).toContain('R1.5');
        });
        test('shows Expired message for digital overdue book', () => {
            uiModule.renderOverdueList([
                { bookTitle: 'Digital', isbn: '001', memberName: 'Alice', memberId: 1, daysOverdue: 5, fine: null, isDigital: true }
            ]);
            expect(document.querySelector('.days-late').textContent).toContain('Expired');
        });
    });
    describe('handleFilterChange', () => {
        beforeEach(() => {
            addMultipleBooks(
                makeBook({ isbn: '001', category: 'fiction' }),
                makeBook({ isbn: '002', category: 'non-fiction' }),
                makeBook({ isbn: '003', category: 'fiction' })
            );
        });

        test('returns all books when category is all', () => {
            document.getElementById('filter-category').value = 'all';
            const result = uiModule.handleFilterChange();
            expect(result).toHaveLength(3);
        });

        test('returns only fiction books when fiction is selected', () => {
            document.getElementById('filter-category').value = 'fiction';
            const result = uiModule.handleFilterChange();
            expect(result).toHaveLength(2);
            expect(result.every(b => b.category === 'fiction')).toBe(true);
        });

        test('returns empty array when no books match the category', () => {
            document.getElementById('filter-category').value = 'reference';
            const result = uiModule.handleFilterChange();
            expect(result).toHaveLength(0);
        });
    });
    describe('handleFilterMemberType', () => {
        beforeEach(() => {
            addMultipleMembers(makeMember({ id: 1, membershipType: 'regular' }),makePremiumMember({ id: 2 }));
        });

        test('returns all members when type is all', () => {
            document.getElementById('filter-member-type').value = 'all';
            const result = uiModule.handleFilterMemberType();
            expect(result).toHaveLength(2);
        });

        test('returns only premium members when premium is selected', () => {
            document.getElementById('filter-member-type').value = 'premium';
            const result = uiModule.handleFilterMemberType();
            expect(result).toHaveLength(1);
            expect(result[0].membershipType).toBe('premium');
        });
    });
    describe('populateYearDropdown', () => {
        beforeEach(() => {
            const select  = document.createElement('select');
            select.id     = 'new-year';
            document.body.appendChild(select);
        });

        test('populates the year dropdown with options', () => {
            uiModule.populateYearDropdown();
            const options = document.getElementById('new-year').options;
            expect(options.length).toBeGreaterThan(0);
        });

        test('first option is the current year', () => {
            uiModule.populateYearDropdown();
            const first = document.getElementById('new-year').options[0];
            expect(parseInt(first.value)).toBe(new Date().getFullYear());
        });

        test('last option is 1800', () => {
            uiModule.populateYearDropdown();
            const options = document.getElementById('new-year').options;
            expect(parseInt(options[options.length - 1].value)).toBe(1800);
        });
    });
    describe('createMemberForm', () => {
        test('creates a form inside member-form container', () => {
            uiModule.createMemberForm();
            expect(document.getElementById('add-member-form')).not.toBeNull();
        });

        test('form contains name, email, and type inputs', () => {
            uiModule.createMemberForm();
            expect(document.getElementById('new-member-name')).not.toBeNull();
            expect(document.getElementById('new-member-email')).not.toBeNull();
            expect(document.getElementById('new-member-type')).not.toBeNull();
        });

        test('member ID input is disabled', () => {
            uiModule.createMemberForm();
            expect(document.getElementById('new-member-id').disabled).toBe(true);
        });

        test('member ID starts at 1 when no members exist', () => {
            uiModule.createMemberForm();
            expect(parseInt(document.getElementById('new-member-id').value)).toBe(1);
        });

        test('member ID increments from highest existing member ID', () => {
            addMultipleMembers(makeMember({ id: 5 }),makeMember({ id: 3 }));
            uiModule.createMemberForm();
            expect(parseInt(document.getElementById('new-member-id').value)).toBe(6);
        });

        test('type select has Regular and Premium options', () => {
            uiModule.createMemberForm();
            const options = [...document.getElementById('new-member-type').options];
            const values  = options.map(o => o.value);
            expect(values).toContain('regular');
            expect(values).toContain('premium');
        });
    });
        describe('updateStatisticsDisplay', () => {
        test('updates total-members-id with correct count', () => {
            addMultipleMembers(makeMember({ id: 1 }),makePremiumMember({ id: 2 }));
            uiModule.updateStatisticsDisplay();
            expect(document.getElementById('total-members-id').textContent).toBe('2');
        });

        test('updates total-physical-id with correct count', () => {
            addMultipleBooks(makeBook({ isbn: '001' }), makeBook({ isbn: '002' }),
                makeDigitalBook({ isbn: '003' }));
            uiModule.updateStatisticsDisplay();
            expect(document.getElementById('total-physical-id').textContent).toBe('2');
        });

        test('updates total-digital-id with correct count', () => {
            addMultipleBooks(makeDigitalBook({ isbn: '001' }));
            uiModule.updateStatisticsDisplay();
            expect(document.getElementById('total-digital-id').textContent).toBe('1');
        });

        test('updates books-borrowed with active checkout count', () => {
            const book = makeBook({ isbn: '001' });
            book.checkOut(1);
            addMultipleBooks(book);
           uiModule.updateStatisticsDisplay();
            expect(document.getElementById('books-borrowed').textContent).toBe('1');
        });

        test('shows empty-state in popular-book when no checkouts', () => {
            uiModule.updateStatisticsDisplay();
            expect(document.getElementById('popular-book').innerHTML).toContain('empty-state');
        });

        test('shows most borrowed book title when checkouts exist', () => {
            const book = makeBook({ isbn: '001', title: 'Most Popular Book' });
            book.checkOut(1);
            book.checkOut(2);
            addMultipleBooks(book);
            uiModule.updateStatisticsDisplay();
            expect(document.getElementById('popular-book').innerHTML).toContain('Most Popular Book');
        });
    });
    describe('populateReturnBooksDropdown', () => {
        test('shows empty-state and disables button when member has no borrowed books', () => {
            addMultipleMembers(makeMember({ id: 1 }));
            uiModule.populateReturnBooksDropdown('1');
            expect(document.getElementById('return-books-list').innerHTML).toContain('No books to return');
            expect(document.getElementById('return-book-btn').disabled).toBe(true);
        });

        test('renders a checkbox per borrowed book', () => {
            const member = makeMember({ id: 1 });
            const book   = makeBook({ isbn: '001' });
            member.addBorrowedBook({ isbn: '001', loanPeriod: 14 });
            addMultipleMembers(member);
            addMultipleBooks(book);
            uiModule.populateReturnBooksDropdown('1');
            expect(document.querySelectorAll('input[name="return-isbn"]')).toHaveLength(1);
        });

        test('enables return button when member has borrowed books', () => {
            const member = makeMember({ id: 1 });
            const book   = makeBook({ isbn: '001' });
            member.addBorrowedBook({ isbn: '001', loanPeriod: 14 });
            addMultipleMembers(member);
            addMultipleBooks(book);
            uiModule.populateReturnBooksDropdown('1');
            expect(document.getElementById('return-book-btn').disabled).toBe(false);
        });

        test('returns early when member not found', () => {
            uiModule.populateReturnBooksDropdown('99');
            expect(document.getElementById('return-books-list').innerHTML).toBe('');
        });
    });
        describe('populateMemberDropdown', () => {
        test('populates select with one option per member plus default', () => {
            addMultipleMembers(makeMember({ id: 1 }),makePremiumMember({ id: 2 }));
            uiModule.populateMemberDropdown('borrow-member-id');
            const options = document.getElementById('borrow-member-id').options;
            expect(options.length).toBe(3);
        });

        test('first option is the default placeholder', () => {
            uiModule.populateMemberDropdown('borrow-member-id');
            expect(document.getElementById('borrow-member-id').options[0].value).toBe('');
            expect(document.getElementById('borrow-member-id').options[0].textContent).toContain('Select a member');
        });

        test('member option value is the member id', () => {
            addMultipleMembers(makeMember({ id: 42 }));
            uiModule.populateMemberDropdown('borrow-member-id');
            const options = document.getElementById('borrow-member-id').options;
            expect(options[1].value).toBe('42');
        });

        test('clears previous options before repopulating', () => {
            addMultipleMembers(makeMember({ id: 1 }));
            uiModule.populateMemberDropdown('borrow-member-id');
            uiModule.populateMemberDropdown('borrow-member-id'); 
            expect(document.getElementById('borrow-member-id').options.length).toBe(2);
        });
    });

    describe('populateBooksDropdown', () => {
        test('populates select with one option per book plus default', () => {
            addMultipleBooks(makeBook({ isbn: '001' }), makeBook({ isbn: '002' }));
            uiModule.populateBooksDropdown();
            expect(document.getElementById('borrow-book-id').options.length).toBe(3);
        });

        test('disables options for unavailable physical books', () => {
            const book = makeBook({ isbn: '001' });
            book.availableCopies = 0;
            addMultipleBooks(book);
            uiModule.populateBooksDropdown();
            expect(document.getElementById('borrow-book-id').options[1].disabled).toBe(true);
        });

        test('does not disable digital books even with 0 active copies', () => {
            addMultipleBooks(makeDigitalBook({ isbn: '001' }));
            uiModule.populateBooksDropdown();
            expect(document.getElementById('borrow-book-id').options[1].disabled).toBe(false);
        });
    });

    describe('handleAddBookSubmit', () => {
        beforeEach(() => {
            resetLibrary();
            global.fetch = jest.fn(() => Promise.resolve({ ok: true }));
        })

        test('shows error when ISBN is not 10 or 13 digits', () => {
            document.getElementById('new-isbn').value = '123';
            const event = { preventDefault: jest.fn(), target: { reset: jest.fn() } };
            uiModule.handleAddBookSubmit(event);
            const banner = document.getElementById('message-banner-addbook');
            expect(banner.classList.contains('is-visible')).toBe(true);
            expect(banner.textContent).toContain('ISBN must be 10 or 13 digits');
            expect(books).toHaveLength(0);
        });
        test('shows error when ISBN already exists', () => {
            const existingIsbn = '9780743273565';
            addMultipleBooks(makeBook({ isbn: existingIsbn }));
            document.getElementById('new-isbn').value = existingIsbn;

            const event = { preventDefault: jest.fn(), target: { reset: jest.fn() } };
  
            uiModule.handleAddBookSubmit(event);
            const banner = document.getElementById('message-banner-addbook');
            expect(banner.textContent).toContain('already exists');
            expect(books).toHaveLength(1);
        });

        test('shows error when author contains invalid characters', () => {
            document.getElementById('new-isbn').value = '9780743273565'; 
            document.getElementById('new-title').value = 'Valid Title';
            document.getElementById('new-author').value = 'J0hn Sm1th ###';
            const event = { preventDefault: jest.fn(), target: { reset: jest.fn() } };
            uiModule.handleAddBookSubmit(event);
            expect(document.getElementById('message-banner-addbook').textContent)
                .toContain('invalid characters');
        });
        test('adds a physical book and shows success message', () => {
            document.getElementById('new-isbn').value = '9780743273565'; // Valid 13-digit ISBN
            document.getElementById('new-title').value = 'The Great Gatsby';
            document.getElementById('new-author').value = 'F. Scott Fitzgerald';
            document.getElementById('new-book-type').value = 'physical';

            const event = { preventDefault: jest.fn(), target: { reset: jest.fn() } };
            uiModule.handleAddBookSubmit(event);
            expect(books).toHaveLength(1);
            expect(books[0].isbn).toBe('9780743273565');
            expect(books[0].isDigital).toBe(false);
            const banner = document.getElementById('message-banner-addbook');
            expect(banner.textContent).toContain('added to the catalogue');
        });
        test('adds a digital book with correct properties', () => {
            document.getElementById('new-isbn').value = '9780062316097';
            document.getElementById('new-title').value = 'The Digital Age';
            document.getElementById('new-author').value = 'Author Name';
            document.getElementById('new-book-type').value = 'digital';
            document.getElementById('new-filesize').value  = '2.4';
            const event = { preventDefault: jest.fn(), target: { reset: jest.fn() } };
            uiModule.handleAddBookSubmit(event);
            expect(books).toHaveLength(1);
            expect(books[0].isDigital).toBe(true);
            expect(books[0].fileSize).toBe(2.4);
        });
    })
    describe('handleAddMemberSubmit', () => {
        beforeEach(() => {
            resetLibrary();
            uiModule.createMemberForm();
            global.fetch = jest.fn(() => Promise.resolve({ ok: true }));
        })
        test('adds a regular member and shows success message', () => {
            document.getElementById('new-member-name').value = 'Alice Johnson';
            document.getElementById('new-member-email').value = 'Alice@gmail.com';
            
            document.getElementById('new-member-type').value = 'regular';
            const event = { 
                preventDefault: jest.fn(),
                target: {
                    reset: jest.fn()
                }
            };
            uiModule.handleAddMemberSubmit(event);
            expect(members).toHaveLength(1);
            expect(members[0].name).toBe('Alice Johnson');
            expect(members[0].membershipType).toBe('regular');
            const banner = document.getElementById('message-banner-addmember');
            expect(banner.textContent).toContain('added successfully');
        });
        test('shows error when email is already registered', () => {
            const registeredEmail = 'alice@example.com';
            addMultipleMembers(makeMember({ id: 99, email: registeredEmail }));
            document.getElementById('new-member-name').value = 'Alice Duplicate';
            document.getElementById('new-member-email').value = registeredEmail;
            document.getElementById('new-member-type').value = 'regular';
            const event = { 
                preventDefault: jest.fn(),
                target: {
                    reset: jest.fn()
                }
            };
            uiModule.handleAddMemberSubmit(event);
            const banner = document.getElementById('message-banner-addmember');
            expect(banner.textContent).toContain('already registered');
            expect(members).toHaveLength(1);
        });

        test('uses the member ID from the disabled input field', () => {
            document.getElementById('new-member-id').value = '42';
            document.getElementById('new-member-name').value = 'Bob Smith';
            document.getElementById('new-member-email').value = 'bob@example.com';
            document.getElementById('new-member-type').value = 'regular';
            const event = { 
                preventDefault: jest.fn(),
                target: {
                    reset: jest.fn()
                }
            };
            uiModule.handleAddMemberSubmit(event);
            expect(members[0].id).toBe(42);
        });
    })
    describe('showMessage', () => {
        beforeEach(() => {
            resetLibrary();
            global.fetch = jest.fn(() => Promise.resolve({ ok: true }));
        })
        test('sets textContent to result message', () => {
            const banner = document.getElementById('test-banner');
            uiModule.showMessage({ success: true, message: 'Book added' }, banner);
            expect(banner.textContent).toBe('Book added');
        });
        test('sets red color on failure', () => {
            const banner = document.getElementById('test-banner');
            uiModule.showMessage({ success: false, message: 'Error' }, banner);
            expect(banner.style.color).toBe('red');
        });
    })
    describe('exportLibraryData', () => {
        beforeEach(() => {
            resetLibrary();
            addMultipleBooks(makeBook({ isbn: '001', category: 'fiction' }));
            addMultipleMembers(makeMember({ id: 1 }));
        });

        test('POSTs categorised data to /save endpoint', async () => {
            global.fetch = jest.fn(() => Promise.resolve({ ok: true }));
            await uiModule.exportLibraryData();
            expect(global.fetch).toHaveBeenCalledWith('/save', expect.objectContaining({
                method : 'POST',
                headers: { 'Content-Type': 'application/json' }
            }));
        });

        test('POST body contains fiction, nonFiction, reference and members', async () => {
            global.fetch = jest.fn(() => Promise.resolve({ ok: true }));
            await uiModule.exportLibraryData();
            const body = JSON.parse(global.fetch.mock.calls[0][1].body);
            expect(body).toHaveProperty('fiction');
            expect(body).toHaveProperty('nonFiction');
            expect(body).toHaveProperty('reference');
            expect(body).toHaveProperty('members');
        });

        test('shows error banner when server returns non-ok response', async () => {
            global.fetch = jest.fn(() => Promise.resolve({ ok: false }));
            await uiModule.exportLibraryData();
            const banner = document.getElementById('message-banner-catalogue');
            expect(banner.classList.contains('is-visible')).toBe(true);
            expect(banner.textContent).toContain('Export failed');
        });

        test('shows error banner when fetch throws a network error', async () => {
            global.fetch = jest.fn(() => Promise.reject(new Error('Network error')));
            await uiModule.exportLibraryData();
            const banner = document.getElementById('message-banner-catalogue');
            expect(banner.textContent).toContain('Export failed');
            expect(banner.textContent).toContain('Network error');
        });
    });
    describe('importLibraryData — catch block', () => {
        beforeEach(() => {
            resetLibrary();
        
        });
        test('shows error banner when JSON string is invalid', () => {
            uiModule.importLibraryData('not valid json {{{');
            const banner = document.getElementById('message-banner-catalogue');
            expect(banner.classList.contains('is-visible')).toBe(true);
            expect(banner.textContent).toContain('Import failed');
        });

        test('shows error banner when data is missing members array', () => {
            uiModule.importLibraryData(JSON.stringify({
                fiction   : [],
                nonFiction: [],
                reference : []
            }));
            const banner = document.getElementById('message-banner-catalogue');
            expect(banner.classList.contains('is-visible')).toBe(true);
            expect(banner.textContent).toContain('Import failed');
        });

        test('successfully imports valid data and clears previous state', () => {
            addMultipleBooks(makeBook({ isbn: 'old-001' }));

            uiModule.importLibraryData(JSON.stringify({
                fiction   : [{ isbn: '9780743273565', title: 'Gatsby', author: 'Fitzgerald', year: 1925, totalCopies: 3, availableCopies: 3, checkedOut: [], category: 'fiction', isDigital: false }],
                nonFiction: [],
                reference : [],
                members   : [{ id: 1, name: 'Alice', email: 'alice@test.com', membershipType: 'regular', borrowedBooks: [], downloads: [], joinDate: new Date().toISOString() }]
            }));

            expect(books).toHaveLength(1);
            expect(books[0].isbn).toBe('9780743273565');
            expect(members).toHaveLength(1);
            expect(members[0].name).toBe('Alice');
        });
    }); 
    describe('loadFromFile — catch block', () => {
        beforeEach(() => {
            resetLibrary();
        });

        test('silently returns when server responds with non-ok status', async () => {
            global.fetch = jest.fn(() => Promise.resolve({ ok: false, status: 404 }));
            await uiModule.loadFromFile();
            expect(document.getElementById('message-banner-catalogue').classList.contains('is-visible')).toBe(false);
        });

        test('shows error banner when fetch throws a network error', async () => {
            global.fetch = jest.fn(() => Promise.reject(new Error('Failed to fetch')));
            await uiModule.loadFromFile();
            const banner = document.getElementById('message-banner-catalogue');
            expect(banner.classList.contains('is-visible')).toBe(true);
            expect(banner.textContent).toContain('File load failed');
            expect(banner.textContent).toContain('Failed to fetch');
        });

        test('shows error banner when response text is invalid JSON', async () => {
            global.fetch = jest.fn(() => Promise.resolve({
                ok  : true,
                text: () => Promise.resolve('not valid json {{{')
            }));
            await uiModule.loadFromFile();
            const banner = document.getElementById('message-banner-catalogue');
            expect(banner.classList.contains('is-visible')).toBe(true);
            expect(banner.textContent).toContain('Import failed');
        });

        test('successfully imports data from file response', async () => {
            global.fetch = jest.fn(() => Promise.resolve({
                ok  : true,
                text: () => Promise.resolve(JSON.stringify({
                    fiction   : [{ isbn: '001', title: 'File Book', author: 'Author', year: 2020, totalCopies: 1, availableCopies: 1, checkedOut: [], category: 'fiction', isDigital: false }],
                    nonFiction: [],
                    reference : [],
                    members   : []
                }))
            }));

            await uiModule.loadFromFile();

            expect(books).toHaveLength(1);
            expect(books[0].isbn).toBe('001');
            expect(books[0].title).toBe('File Book');
        });
    });
});

describe('LocalStorage', () => {
    let mockBanner;

    beforeEach(() => {
         document.body.innerHTML = `
            <div id="message-banner-catalogue"></div>
            `;

        uiModule.initializeUI();
        
        books.length = 0;
        members.length = 0;

        jest.spyOn(Storage.prototype, 'getItem');
        jest.spyOn(Storage.prototype, 'setItem');
    
    });

    afterEach(() => {
        jest.restoreAllMocks();
        localStorage.clear();
    });

    describe('saveToLocalStorage', () => {
        test('should successfully categorize and save books and members to localStorage', () => {
            // Push actual elements to the mutable library instances tracked by ui.js
            books.push(
                { category: 'fiction', title: 'Book A' },
                { category: 'non-fiction', title: 'Book B' },
                { category: 'reference', title: 'Book C' }
            );
            members.push({ id: 1, name: 'Alice' });

            uiModule.saveToLocalStorage();

            expect(localStorage.setItem).toHaveBeenCalledWith('libraryBooks', expect.any(String));
            expect(localStorage.setItem).toHaveBeenCalledWith('libraryMembers', expect.any(String));

            const parsedBooks = JSON.parse(localStorage.getItem('libraryBooks'));
            expect(parsedBooks.fiction).toHaveLength(1);
            expect(parsedBooks.nonFiction).toHaveLength(1);
            expect(parsedBooks.reference).toHaveLength(1);

            const parsedMembers = JSON.parse(localStorage.getItem('libraryMembers'));
            expect(parsedMembers).toHaveLength(1);
        });
        test('should handle storage errors gracefully and display error in banner_catalogue', () => {
            localStorage.setItem.mockImplementationOnce(() => {
                throw new Error("Quota exceeded");
            });

            uiModule.saveToLocalStorage();

            const banner = document.getElementById("message-banner-catalogue");

            expect(banner.classList.contains("is-visible")).toBe(true);
            expect(banner.style.color).toBe("red");
            expect(banner.textContent).toContain("Local save failed: Quota exceeded");
        });
    });

    describe('loadFromLocalStorage', () => {
        test('should import cached data if items exist and are populated', async () => {
            const validBooksData = {
                fiction: [{
                    isbn: "123",
                    title: "Fictional Novel",
                    author: "Author",
                    year: 2024,
                    totalCopies: 2,
                    availableCopies: 2,
                    category: "fiction",
                    checkedOut: []
                }],
                nonFiction: [],
                reference: []
            };
        
            const validMembersData = [{
                id: 1,
                name: "Bob",
                email: "bob@example.com",
                membershipType: "regular",
                borrowedBooks: [],
                downloads: []
            }];
        
            localStorage.setItem("libraryBooks", JSON.stringify(validBooksData));
            localStorage.setItem("libraryMembers", JSON.stringify(validMembersData));
        
            await uiModule.loadFromLocalStorage();
        
            expect(books).toHaveLength(1);
            expect(books[0].title).toBe("Fictional Novel");
        
            expect(members).toHaveLength(1);
            expect(members[0].name).toBe("Bob");
        });

        test('should fall back to file loading if localStorage cache is empty', async () => {
            localStorage.setItem('libraryBooks', JSON.stringify({ fiction: [], nonFiction: [], reference: [] }));
            localStorage.setItem('libraryMembers', JSON.stringify([]));
            global.fetch = jest.fn(() =>
                Promise.resolve({
                    ok:   true,
                    text: () => Promise.resolve(JSON.stringify({
                        fiction   : [{ isbn: '001', title: 'Test Book', author: 'Author', year: 2020, totalCopies: 1, availableCopies: 1, checkedOut: [], category: 'fiction', isDigital: false }],
                        nonFiction: [],
                        reference : [],
                        members   : []
                    }))
                })
            );

            await uiModule.loadFromLocalStorage();
            expect(global.fetch).toHaveBeenCalledWith('./LibraryData/Data.txt');

            expect(books.length).toBeGreaterThan(0);
            expect(books[0].isbn).toBe('001');
        });


        test('should catch loading or parsing errors and display error in banner_catalogue', async () => {

            localStorage.setItem('libraryBooks', 'invalid-json-string');
            localStorage.setItem('libraryMembers', '[]');

            await uiModule.loadFromLocalStorage();
            const banner = document.getElementById("message-banner-catalogue");
            expect(banner.classList.contains("is-visible")).toBe(true);
            expect(banner.style.color).toBe("red");
            expect(banner.textContent).toContain("Error loading data:");

        });
    });
});


describe('Destructuring', () => {
    test('object destructuring in getMemberInfo works correctly', () => {
        const member = makeMember();
        const info   = member.getMemberInfo();
        expect(info).toContain('Alice Johnson');
        expect(info).toContain('alice@example.com');
    });

    test('object destructuring in getSummary returns all expected fields', () => {
        resetLibrary();
        LibraryStats.updateStats();
        const { totalMembers, totalBorrowings } = LibraryStats.getSummary();
        expect(typeof totalMembers).toBe('number');
        expect(typeof totalBorrowings).toBe('number');
        resetLibrary();
    });

    test('object destructuring in updateMemberInfo extracts name email and membershipType', () => {
        const member  = makeMember();
        const updates = { name: 'Updated', email: 'updated@test.com', membershipType: 'regular' };
        updateMemberInfo(member, updates);
        expect(member.name).toBe('Updated');
        expect(member.email).toBe('updated@test.com');
    });
});
describe('filterBooks — higher-order function', () => {
    beforeEach(() => {
        resetLibrary();
        addMultipleBooks(
            makeBook({ isbn: '001', category: 'fiction' }),
            makeBook({ isbn: '002', category: 'non-fiction' }),
            makeBook({ isbn: '003', category: 'fiction' })
        );
    });

    afterEach(resetLibrary);

    test('filters books by category using a predicate', () => {
        const result = filterBooks(b => b.category === 'fiction');
        expect(result).toHaveLength(2);
    });

    test('returns empty array when no books match', () => {
        const result = filterBooks(b => b.category === 'reference');
        expect(result).toHaveLength(0);
    });

    test('returns all books when predicate always returns true', () => {
        const result = filterBooks(() => true);
        expect(result).toHaveLength(3);
    });
});

describe('borrowBook', () => {
    beforeEach(() => {
        resetLibrary();
        addMultipleBooks(makeBook({ isbn: '9780743273565' }),makeDigitalBook({ isbn: '9780062316097' }));
        addMultipleMembers(makeMember({ id: 1 }));
        // Mock window.confirm to auto-approve
        jest.spyOn(window, 'confirm').mockImplementation(() => true);
    });

    afterEach(() => {
        resetLibrary();
        jest.restoreAllMocks();
    });

    test('returns failure if memberId is not a number', () => {
        const result = borrowBook('1', '9780743273565', 14);
        expect(result.success).toBe(false);
        expect(result.message).toContain('memberId must be a number');
    });

    test('returns failure if isbn is not a string', () => {
        const result = borrowBook(1, 9780743273565, 14);
        expect(result.success).toBe(false);
        expect(result.message).toContain('isbn must be a string');
    });

    test('returns failure if loanPeriod is not a number', () => {
        const result = borrowBook(1, '9780743273565', '14');
        expect(result.success).toBe(false);
        expect(result.message).toContain('loanPeriod must be a number');
    });

    test('returns success and updates book and member for physical checkout', () => {
        const result = borrowBook(1, '9780743273565', 14);
        expect(result.success).toBe(true);
        const book   = findBookByISBN('9780743273565');
        const member = findMemberById(1);
        expect(book.availableCopies).toBe(2);
        expect(member.borrowedBooks).toHaveLength(1);
        expect(member.borrowedBooks[0].isbn).toBe('9780743273565');
        expect(member.borrowedBooks[0].loanPeriod).toBe(14);
    });

    test('returns success and updates downloads for digital book', () => {
        const result = borrowBook(1, '9780062316097', 7);
        expect(result.success).toBe(true);
        const member = findMemberById(1);
        expect(member.downloads).toHaveLength(1);
        expect(member.downloads[0].isbn).toBe('9780062316097');
        expect(member.downloads[0].expirePeriod).toBe(7);
    });

    test('returns failure when user cancels the confirm dialog', () => {
        jest.spyOn(window, 'confirm').mockImplementation(() => false);
        const result = borrowBook(1, '9780743273565', 14);
        expect(result.success).toBe(false);
        expect(result.message).toBe('Borrow cancelled');
    });

    test('canBorrow is called and failure is returned if not eligible', () => {
        const member = findMemberById(1);
        // Fill up borrow limit
        for (let i = 0; i < MAX_BOOKS_PER_MEMBER; i++) {
            member.addBorrowedBook({ isbn: `isbn-${i}`, loanPeriod: 14 });
        }
        const result = borrowBook(1, '9780743273565', 14);
        expect(result.success).toBe(false);
        expect(result.message).toContain('borrowing limit');
    });
    test('returns failure if the book ISBN does not exist in the catalogue', () => {
        const unknownIsbn = '9999999999999';
        
        const result = borrowBook(1, unknownIsbn, 14);
        
        expect(result.success).toBe(false);
        expect(result.message).toBe(`The book with ISBN ${unknownIsbn} was not found in the catalogue`);
    });

    test('returns failure containing the exception message when an error is thrown', () => {
    resetLibrary();

    // Add the book to the global books array
    addMultipleBooks(makeBook({ isbn: '9780743273565' }));

    // Add a real member first so findMemberById finds it
    const member = makeMember({ id: 1 });

    // Override canBorrow on the instance to throw
    member.canBorrow = () => {
        throw new Error('Simulated internal transaction failure');
    };

    addMultipleMembers(member);

    const result = borrowBook(1, '9780743273565', 14);

    expect(result.success).toBe(false);
    expect(result.message).toBe('Simulated internal transaction failure');

    resetLibrary();
});
});
describe('LibraryStats', () => {
    beforeEach(() => {
        resetLibrary();
        addMultipleBooks(
            makeBook({ isbn: '001', category: 'fiction' }),
            makeBook({ isbn: '002', category: 'non-fiction' }),
            makeDigitalBook({ isbn: '003' })
        );
        addMultipleMembers(makeMember({ id: 1 }),makePremiumMember({ id: 2 }));
    });
    afterEach(resetLibrary);

    test('updateStats computes correct totals', () => {
        LibraryStats.updateStats();
        const s = LibraryStats.getSummary();
        expect(s.totalMembers).toBe(2);
        expect(s.totalPhysicalBooks).toBe(2);
        expect(s.totalDigitalBooks).toBe(1);
    });

    test('updateStats resets on repeated calls — no stacking', () => {
        LibraryStats.updateStats();
        LibraryStats.updateStats();
        expect(LibraryStats.getSummary().totalPhysicalBooks).toBe(2);
    });

    test('getAvailableBooks excludes digital and fully checked-out books', () => {
        books[0].availableCopies = 0;
        expect(LibraryStats.getAvailableBooks()).toHaveLength(1);
    });

    test('getMostPopularBook returns most borrowed physical book', () => {
        books[0].checkOut(1);
        books[0].checkOut(2);
        books[1].checkOut(1);
        const { borrowed } = LibraryStats.getMostPopularBook();
        expect(borrowed[0].isbn).toBe('001');
    });

    test('getMostPopularBook returns empty arrays when no checkouts', () => {
        const { borrowed, downloaded } = LibraryStats.getMostPopularBook();
        expect(borrowed).toHaveLength(0);
        expect(downloaded).toHaveLength(0);
    });

    test('getMostPopularBook returns most downloaded digital book matching maxDownloaded', () => {
        const digitalBook = books.find(book => book.isDigital);
        digitalBook.checkOut(1);
        digitalBook.checkOut(2);

        const { downloaded } = LibraryStats.getMostPopularBook();

        expect(downloaded).toHaveLength(1);
        expect(downloaded[0].isbn).toBe(digitalBook.isbn);
        expect(downloaded[0].checkedOut).toHaveLength(2);
    });
});
describe('findOverdueBooks', () => {
    beforeEach(() => {
        resetLibrary();
    });

    afterEach(() => {
        resetLibrary();
    });

    test('identifies overdue physical books and calculates fine when overduePeriod is all', () => {
        const book   = makeBook({ isbn: '111-222', title: 'Overdue Physical Book' });
        const member = makeMember({ id: 42, name: 'John Doe' });

        // Simulate checkout 20 days ago
        const checkoutDate = new Date();
        checkoutDate.setDate(checkoutDate.getDate() - 20);
        book.checkOut(42,checkoutDate);

        // 7-day loan → 13 days overdue
        member.addBorrowedBook({ isbn: '111-222', loanPeriod: 7 });

        addMultipleBooks(book);
        addMultipleMembers(member);

        const result = findOverdueBooks('all');

        expect(result.success).toBe(true);
        expect(result.message).toHaveLength(1);

        const item = result.message[0];
        expect(item.bookTitle).toBe('Overdue Physical Book');
        expect(item.isbn).toBe('111-222');
        expect(item.memberName).toBe('John Doe');
        expect(item.memberId).toBe(42);
        expect(item.daysOverdue).toBe(13);
        expect(item.isDigital).toBe(false);
        // fine = 13 days * 0.50 = 6.50
        expect(item.fine).toBe(parseFloat((13 * LATE_FEE_PER_DAY).toFixed(2)));
    });

    test('identifies overdue digital books with null fine', () => {
        const digital = makeDigitalBook({ isbn: '333-444', title: 'Overdue E-Book' });
        const member  = makeMember({ id: 77, name: 'Jane Smith' });

        // Simulate download 10 days ago
        const checkoutDate = new Date();
        checkoutDate.setDate(checkoutDate.getDate() - 10);
        digital.checkOut(77,checkoutDate);

        // 3-day expire period → 7 days overdue
        member.addDownload({ isbn: '333-444', expirePeriod: 3 });

        addMultipleBooks(digital);
        addMultipleMembers(member);

        const result = findOverdueBooks('all');

        expect(result.success).toBe(true);
        expect(result.message).toHaveLength(1);
        expect(result.message[0].fine).toBeNull();
        expect(result.message[0].isDigital).toBe(true);
        expect(result.message[0].daysOverdue).toBe(7);
    });

    test('excludes books overdue below the threshold', () => {
        const book   = makeBook({ isbn: '555-666' });
        const member = makeMember({ id: 10, name: 'Alice' });

        // 12 days ago, 7-day loan → 5 days overdue
        const checkoutDate = new Date();
        checkoutDate.setDate(checkoutDate.getDate() - 12);
        // book.checkedOut.push({ memberId: 10, checkoutDate, isbn: book.isbn });
        book.checkOut(10,checkoutDate);
        member.addBorrowedBook({ isbn: '555-666', loanPeriod: 7 });

        addMultipleBooks(book);
        addMultipleMembers(member);

        // threshold 10 — 5 days overdue should be excluded
        const strictResult = findOverdueBooks('10');
        expect(strictResult.success).toBe(true);
        expect(strictResult.message).toHaveLength(0);

        // threshold 5 — 5 days overdue should be included
        const matchingResult = findOverdueBooks('5');
        expect(matchingResult.success).toBe(true);
        expect(matchingResult.message).toHaveLength(1);
        expect(matchingResult.message[0].daysOverdue).toBe(5);
    });

    test('returns empty list when no books are overdue', () => {
        const book   = makeBook({ isbn: '001' });
        const member = makeMember({ id: 1 });

        // Checked out today — not overdue
        book.checkedOut.push({ memberId: 1, checkoutDate: new Date(), isbn: book.isbn });
        book.availableCopies--;
        member.addBorrowedBook({ isbn: '001', loanPeriod: 14 });

        addMultipleBooks(book);
        addMultipleMembers(member);

        const result = findOverdueBooks('all');
        expect(result.success).toBe(true);
        expect(result.message).toHaveLength(0);
    });

    test('returns failure when loanPeriod is invalid', () => {
        const book   = makeBook({ isbn: '777-888' });
        const member = makeMember({ id: 99, name: 'Bob' });

        const checkoutDate = new Date();
        checkoutDate.setDate(checkoutDate.getDate() - 15);
        book.checkOut(99,checkoutDate);

        // Invalid loanPeriod — parseInt('abc') = NaN
        member.addBorrowedBook({ isbn: '777-888', loanPeriod: 'abc' });

        addMultipleBooks(book);
        addMultipleMembers(member);

        const result = findOverdueBooks('all');
        expect(result.success).toBe(false);
        expect(result.message).toContain('Invalid loan period');
    });

    test('returns success with empty list when books array is empty', () => {
        const result = findOverdueBooks('all');
        expect(result.success).toBe(true);
        expect(result.message).toHaveLength(0);
    });
});
