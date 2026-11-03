const books = [];  
const members = []; 
const LATE_FEE_PER_DAY = 0.50;
const MAX_BOOKS_PER_MEMBER = 5;  
const ERROR_MESSAGES = {
    invalidLoanPeriod: (title) => `Invalid loan period record for book: ${title}`,
    nonNegativeNumber: (field, value) => `${field} must be a non-negative number, got ${value}`,
    unknownMembershipType: () => "membershipType doesn't exist",
    invalidType: (field, expectedType, value) => `${field} must be a ${expectedType}, got ${typeof value}`,
    invalidValue: (field, expectedDescription) => `${field} must be a valid ${expectedDescription}`,
};
/**
 * Creates a physical book.
 * @param {string} isbn - The ISBN of the book.
 * @param {string} title - The book title.
 * @param {string} author - The author's name.
 * @param {number} year - Publication year.
 * @param {number} copies - Number of physical copies available.
 * @param {string} category - Book category.
 */
class Book {
    #checkedOutRecords = [];
    #availableCopies;
    #totalCopies;
    constructor(isbn, title, author, year, copies,category) {
        this.isbn  = isbn;
        this.title = title;
        this.author = author;
        this.year = year;
        this.totalCopies = copies;
        this.availableCopies  = copies;
        this.category = category;
        this.isDigital = false;
    }
    /**
    * Gets the total number of copies owned by the library.
    * @returns {number}
    */
    get totalCopies() {
        return this.#totalCopies;
    }

    /**
    * Sets the total number of copies.
    * @param {number} value
    */
    set totalCopies(value) {
        if (typeof value !== 'number' || value < 0) {
            throw new Error(ERROR_MESSAGES.nonNegativeNumber('totalCopies', value));
        }
        this.#totalCopies = value;
    }

    /**
     * @returns {boolean} True if at least one copy is currently available.
     */
    isAvailable() {
        return this.#availableCopies > 0;
    }
    /**
    * Controls how a Book serializes via JSON.stringify — needed because
    * totalCopies, availableCopies, and checkedOut are accessor properties
    * backed by private fields, and are not enumerated by default.
    * @returns {object} Plain-object representation of this book.
    */
    toJSON() {
        return {
            isbn: this.isbn,
            title: this.title,
            author: this.author,
            year: this.year,
            totalCopies: this.totalCopies,
            availableCopies: this.availableCopies,
            checkedOut: this.checkedOut,
            category: this.category,
            isDigital: this.isDigital,
            fileSize: this.fileSize,
            format: this.format
        };
    }
    /**
    * Returns a plain-text summary of the book, used in confirm dialogs.
    * @returns {string} Multi-line summary including title, author, year, and ISBN.
    */
    getInfo() {
        return `
            Title:  ${this.title}
            Author: ${this.author}
            Year:   ${this.year}
            ISBN:   ${this.isbn}
            `;
    }
    /**
    * Gets the number of currently available copies.
    * @returns {number}
    */
    get availableCopies() {
        return this.#availableCopies;
    }

    /**
    * Sets the available copy count.
    * @param {number} value
    */
    set availableCopies(value) {
        if (typeof value !== 'number' || value < 0) {
             throw new Error(ERROR_MESSAGES.nonNegativeNumber('availableCopies', value));
        }
        this.#availableCopies = value;
    }

    /**
    * Returns a copy of all checkout records.
    * @returns {Array<{memberId:number, checkoutDate:Date|string, isbn:string}>}
    */
    get checkedOut() {
        return [...this.#checkedOutRecords];
    }

    /**
    * Restores checkout records.
    * @param {Array<{memberId:number, checkoutDate:Date|string, isbn:string}>} records
    */
    set checkedOut(records) {
        this.#checkedOutRecords = Array.isArray(records) ? records : [];
    }

    /**
    * Checks out a physical book to a member.
    * @param {number} memberId - Borrowing member's ID.
    * @param {Date} [checkoutDate=new Date()] - Checkout date.
    * @returns {boolean} True if checkout succeeds; otherwise false.
    */
    checkOut(memberId,checkoutDate = new Date()) {
        if (!this.isAvailable()) {
            return false;
        }

        this.#checkedOutRecords.push({memberId,checkoutDate, isbn: this.isbn});
        this.#availableCopies--;
        return true;
    }
}

/*
DigitalBook Class (Subclass of Book)
Models electronic books with infinite availability, downloading logs, and digital properties.
*/
class DigitalBook extends Book {
    /**
    * Creates a digital book.
    * @param {string} isbn
    * @param {string} title
    * @param {string} author
    * @param {number} year
    * @param {number} fileSize - File size in MB.
    * @param {string} format - File format (e.g. PDF, EPUB).
    * @param {string} category - Book category.
    */
    constructor(isbn, title, author, year, fileSize, format,category) {
        super(isbn, title, author, year, Infinity,category);
        this.fileSize = fileSize;
        this.format = format;
        this.isDigital = true;
    }

    /**
    * Records a digital download.
    * @param {number} memberId - ID of the member downloading the book.
    * @returns {boolean} Always returns true.
    */
    download(memberId) {
        this.checkOut(memberId);
        return true;
    }
}

/*
Base Member Class
Manages standard membership durations, member info summaries, and borrowing qualification logic.
*/
class Member {
    #joinDate;
    #borrowedBooks = [];
    #downloads = [];
    /**
    * Creates a library member.
    * @param {number} id - Member ID.
    * @param {string} name - Member name.
    * @param {string} email - Member email.
    * @param {"regular"|"premium"} membershipType - Membership type.
    * @param {Date|string} [joinDate=new Date()] - Membership start date.
    */
    constructor(id, name, email, membershipType,joinDate=new Date()) {
        this.id = id;
        this.name = name;
        this.email = email;
        this.membershipType = membershipType;
        this.borrowedBooks = [];
        this.downloads = [];
        this.#joinDate = new Date(joinDate); 
    }
    /**
    * Gets the member's join date.
    * @returns {Date}
    */
    get joinDate() {
        return new Date(this.#joinDate); 
    }

    /**
    * Gets borrowed books.
    * @returns {Array<{isbn:string, loanPeriod:number}>}
    */
    get borrowedBooks() {
        return [...this.#borrowedBooks];
    }

    /**
    * Restores borrowed book records.
    * @param {Array<{isbn:string, loanPeriod:number}>} records
    */
    set borrowedBooks(records) {
        this.#borrowedBooks = Array.isArray(records) ? records : [];
    }
    /**
    * Gets downloaded books.
    * @returns {Array<{isbn:string, expirePeriod:number}>}
    */
    get downloads() {
        return [...this.#downloads];
    }

    /**
    * Restores download records.
    * @param {Array<{isbn:string, expirePeriod:number}>} records
    */
    set downloads(records) {
        this.#downloads = Array.isArray(records) ? records : [];
    }

    /**
    * Adds a borrowed book record.
    * @param {{isbn:string, loanPeriod:number}} record
    */
    addBorrowedBook(record) {
        this.#borrowedBooks.push(record);
    }

    /**
    * Removes a borrowed book by ISBN.
    * @param {string} isbn
    */
    removeBorrowedBook(isbn) {
        this.#borrowedBooks = this.#borrowedBooks.filter(b => b.isbn !== isbn);
    }

    /**
    * Adds a download record.
    * @param {{isbn:string, expirePeriod:number}} record
    */
    addDownload(record) {
        this.#downloads.push(record);
    }

    /**
    * Returns the duration of membership as a human-readable string.
    * @returns {string}
    */
    getMembershipDuration() {
        const now      = new Date();
        const diffMs   = now - this.#joinDate;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
            return `${diffHours} hour${diffHours !== 1 ? 's' : ''}`;
        }
        if (diffDays > 31) {
            const diffMonths = Math.floor(diffDays / 30);
            return `${diffMonths} month${diffMonths !== 1 ? 's' : ''}`;
        }
        return `${diffDays} day${diffDays !== 1 ? 's' : ''}`;
    }

    /**
    * Controls how a Member serializes via JSON.stringify — needed because
    * borrowedBooks, downloads, and joinDate are accessor properties
    * backed by private fields, and are not enumerated by default.
    * @returns {object} Plain-object representation of this member.
    */
    toJSON() {
        return {
            id: this.id,
            name: this.name,
            email: this.email,
            membershipType: this.membershipType,
            borrowedBooks: this.borrowedBooks,
            downloads: this.downloads,
            joinDate: this.joinDate
        };
    }
    /**
    * Returns a formatted summary of the member.
    * @returns {string}
    */
    getMemberInfo() {
        const { id, name, email, membershipType, borrowedBooks, downloads } = this;
        const borrowedCount  = borrowedBooks.length;
        const downloadCount  = downloads.length;
        const memberLimit    = membershipType === 'premium' ? 10 : MAX_BOOKS_PER_MEMBER;

        return `
            Member   : #${id}
            Name     : ${name ?? 'Unknown'}
            Email    : ${email ?? 'No email'}
            Type     : ${membershipType?.charAt(0).toUpperCase() + membershipType?.slice(1)}
            Borrowed : ${borrowedCount} / ${memberLimit} book(s)
            Downloads: ${downloadCount} book(s)`;
    }

    /**
    * Determines whether a member can borrow or download a book.
    * @param {Book} book
    * @returns {{success:boolean, message:string}}
    */
    canBorrow(book) {
        if (book.isDigital) {
            const alreadyDownloaded = this.downloads.some(entry => entry.isbn === book.isbn);
            if (alreadyDownloaded) {
                return { success: false, message: `You have already downloaded "${book.title}"` };
            }
        } else {
            const alreadyBorrowed = this.borrowedBooks.some(entry => entry.isbn === book.isbn);
            if (alreadyBorrowed) {
                return { success: false, message: `You have already borrowed "${book.title}"` };
            }

            const limit = this.maxBooks ?? MAX_BOOKS_PER_MEMBER;
            if (this.borrowedBooks.length >= limit) {
                return { success: false, message: `${this.name} has reached the borrowing limit of ${limit} books` };
            }
        }

        return { success: true, message: 'OK' };
    }
}

/*
PremiumMember Class (Subclass of Member)
Overrides base capabilities to inject maximum books to be borrowed and discount rates
*/
class PremiumMember extends Member {
    /**
    * Creates a premium member.
    * @param {number} id
    * @param {string} name
    * @param {string} email
    * @param {Date|string} [joinDate=new Date()]
    */
    constructor(id, name, email,joinDate=new Date()) {
        super(id, name, email, "premium",joinDate);
        this.maxBooks = 10;        
        this.discountRate = 0.2;   
        this.priorityHolds = true; 
    }
    /**
    * Extends Member.toJSON() with premium-only fields.
    * @returns {object} Plain-object representation of this premium member.
    */
    toJSON() {
        return {
            ...super.toJSON(),
            maxBooks: this.maxBooks,
            discountRate: this.discountRate,
            priorityHolds: this.priorityHolds
        };
    }


}

/**
 * Finds all books that have exceeded their loan period.
 * @param {string} overduePeriod - 'all' or a number string representing the threshold in days.
 * @returns {{ success: boolean, message: Array|string }} Result with overdue items or error message.
 */
function findOverdueBooks(overduePeriod, bookList=books) {
    const thresholdDays = overduePeriod === 'all' ? 0 : parseInt(overduePeriod, 10);
    const today         = new Date();
    const msPerDay      = 1000 * 60 * 60 * 24;
    const overdueItems  = [];

    for (const book of bookList) {
        for (const { memberId, checkoutDate } of book.checkedOut) {
            const checkedOutDate = new Date(checkoutDate);
            const daysDiff       = Math.floor((today - checkedOutDate) / msPerDay);
            const member         = findMemberById(memberId);
            
            if (!member) continue; 

            const isDigital = book.isDigital;
            let loanPeriod;

            if (isDigital) {
                const downloadEntry = member.downloads.find(entry => entry.isbn === book.isbn);
                if (!downloadEntry) continue;
                loanPeriod = parseInt(downloadEntry?.expirePeriod ?? 0, 10);
            } else {
                const borrowEntry = member.borrowedBooks.find(entry => entry.isbn === book.isbn);
                if (!borrowEntry) continue;
                loanPeriod = parseInt(borrowEntry?.loanPeriod ?? 0, 10);
            }

            if (typeof loanPeriod !== 'number' || Number.isNaN(loanPeriod)) {
                return { success: false, message: ERROR_MESSAGES.invalidLoanPeriod(book.title) };
            }

            const daysOverdue = daysDiff - loanPeriod;

            if (daysOverdue > 0 && daysOverdue >= thresholdDays) {
                let fineValue = null;
                if (!isDigital) {
                    const fineResult = calculateFineAmount(member, daysOverdue);
                    if (!fineResult.success) {
                        return fineResult;
                    }
                    fineValue = fineResult.message;
                }
                overdueItems.push({
                    bookTitle  : book.title,
                    isbn       : book.isbn,
                    memberName : member.name,
                    memberId,
                    daysOverdue,
                    fine       : fineValue,
                    isDigital  : isDigital
                });
                
            }
        }
    }

    return { success: true, message: overdueItems };
}

/**
 * Processes bulk book returns for a member, prompting for fine payed confirmation if overdue.
 * @param {{ memberId: number, isbns: string[] }} memberReturnBooks - Return payload.
 * @returns {{ success: boolean, message: string }} Result object.
 */
function processReturnQueue({ memberId, isbns }) {
    const returnedTitles = [];
    const member = findMemberById(memberId);
    if (!member) return {success: false, message: `The record of the member ${memberId} is not found`};

    for (const item of isbns) {

        const book   = findBookByISBN(item);
        const checkedOutBook = book.checkedOut.find(record => record.memberId === member.id);
        if (!checkedOutBook) {                  
            returnedTitles.push(`${book.title} (no checkout record found)`);
            continue;
        }
        const today = new Date();
        const checkedOutBookDate = new Date(checkedOutBook.checkoutDate); 
        const msPerDay = 1000 * 60 * 60 * 24;
        const daysDiff = Math.floor((today - checkedOutBookDate) / msPerDay);
        const loanPeriod = parseInt(member.borrowedBooks.find(entry => entry.isbn === book.isbn)?.loanPeriod, 10);

        if (typeof loanPeriod !== 'number' || Number.isNaN(loanPeriod)) {
            return { success: false, message: ERROR_MESSAGES.invalidLoanPeriod(book.title) };
        }

        if (daysDiff > loanPeriod) {
            const daysLate   = daysDiff - loanPeriod;
            const fineAmount = calculateFineAmount(member, daysLate);

            if(!fineAmount.success){
                return fineAmount;
            }
            const confirmed = window.confirm(
                `${formatBookInfo(book)}\nThis book is ${daysLate} day(s) overdue.\nFine: R${fineAmount.message}\n
                Click OK to confirm the member has paid the fine.`);

            if (!confirmed) {
                continue;
            }
        }

        book.availableCopies++;
        book.checkedOut = book.checkedOut.filter(record => record.memberId !== member.id);
        member.removeBorrowedBook(item);

        returnedTitles.push(book.title);
    }
    if(returnedTitles.length > 0){
        return { success: true, message: `${member.name} successfully returned: ${returnedTitles.join(', ')}` }
    }else{
        return { success: false, message: 'No books were returned' };
    }
}

/**
 * Recursively filters books by category.
 * @param {Book[]} bookList - The list of books to search.
 * @param {string} category - The category to match ('fiction', 'non-fiction', 'reference').
 * @param {number} [index=0] - Current recursion index (internal use).
 * @returns {Book[]} Books matching the given category.
 */
function searchBooksByCategory(bookList, category, index = 0) {

    if (index >= bookList.length) {
        return [];
    }

    if (!bookList[index]) {
        return [];
    }

    if (bookList[index].category === category) {
        return [bookList[index]].concat(searchBooksByCategory(bookList, category, index + 1));
    }

    return searchBooksByCategory(bookList, category, index + 1);
}

/**
 * Recursively filters members by membership type.
 * @param {Member[]} memberList - The list of members to search.
 * @param {string} type - The membership type to match ('regular', 'premium').
 * @param {number} [index=0] - Current recursion index (internal use).
 * @returns {Member[]} Members matching the given type.
 */
function searchMembersByType(memberList, type, index = 0) {

    if (index >= memberList.length) {
        return [];
    }

    if (!memberList[index]) {
        return searchMembersByType(memberList, type, index + 1);
    }

    if (memberList[index].membershipType === type) {
        return [memberList[index]].concat(searchMembersByType(memberList, type, index + 1));
    }

    return searchMembersByType(memberList, type, index + 1);
}

/**
 * Applies a predicate to filter the global (or supplied) books array.
 * @param {Function} predicate - Filter condition.
 * @param {Book[]} [bookList=books] - Optional book list to filter (defaults to global catalogue).
 * @returns {Book[]} Filtered books.
 */
function filterBooks(predicate,bookList = books) {
    return bookList.filter(predicate);
}

/**
 * Iterates over the global (or supplied) books array, invoking a callback per book.
 * @param {Function} callback - Called once per book.
 * @param {Book[]} [bookList=books] - Optional book list to iterate (defaults to global catalogue).
 * @returns {void}
 */
function iterateBooks(callback,bookList = books) {
    bookList.forEach(callback);
}

/**
 * Flattens any number of arrays into one combined array.
 * Rest-parameter higher-order function — no side effects on the input lists.
 * @param {...Array} lists - Two or more arrays to combine.
 * @returns {Array} A single flattened array containing all items from every input list.
 */
function combineLists(...lists) {
    return lists.flat();
}

/**
 * Filters any array using a caller-supplied predicate.
 * Higher-order function — no side effects on the input list.
 * @param {Array} list - The array to filter.
 * @param {Function} predicate - Filter condition.
 * @returns {Array} Filtered array.
 */
function filterCollection(list, predicate) {
    return list.filter(predicate);
}

/**
 * Finds the first member matching a predicate.
 * @param {(member: Member) => boolean} predicate - Search predicate.
 * @param {Member[]} [memberList=members] - Optional member list.
 * @returns {Member|undefined} Matching member, if found.
 */
function findMember(predicate,memberList = members) {
    return memberList.find(predicate);
}

/**
 * Returns all books whose author name includes the search term (case-insensitive).
 * @param {string} authorName - Search term to match against author names.
 * @param {Book[]} [bookList=books] - Optional book list to search (defaults to global catalogue).
 * @returns {Book[]} Books whose author matches the search term.
 */
function getBooksByAuthor(authorName, bookList = books) {
    const lowerAuthor = authorName.toLowerCase();
    return bookList.filter(book => book.author.toLowerCase().includes(lowerAuthor));
}

/**
 * Returns all books whose title includes the search term (case-insensitive).
 * @param {string} bookTitle - Search term to match against book titles.
 * @param {Book[]} [bookList=books] - Optional book list to search (defaults to global catalogue).
 * @returns {Book[]} Books whose title matches the search term.
 */
function getBooksByTitle(bookTitle, bookList = books) {
    const lowerTitle = bookTitle.toLowerCase();
    return bookList.filter(book => book.title.toLowerCase().includes(lowerTitle));
}

/**
 * Calculates the total outstanding late fees for a member's borrowed books.
 * @param {Member} memberRecord - The member whose fees to calculate.
 * @returns {{ success: boolean, message: number|string }} Result with total fine or error message.
 */
function calculateTotalLateFees(memberRecord) {
    const today    = new Date();
    const msPerDay = 1000 * 60 * 60 * 24;
    
    const result = memberRecord.borrowedBooks.reduce((acc, item) => {
        if (acc.error) return acc;

        const book = findBookByISBN(item.isbn);
        if (!book) return acc;

        const checkedOutBook = book.checkedOut.find(record => record.memberId === memberRecord.id);
        if (!checkedOutBook) return acc;

        const checkedOutDate = new Date(checkedOutBook?.checkoutDate ?? Date.now());
        const daysDiff       = Math.floor((today - checkedOutDate) / msPerDay);
        const loanPeriod     = parseInt(item?.loanPeriod ?? 0, 10);

        if (typeof loanPeriod !== 'number' || Number.isNaN(loanPeriod)) {
            return { error: true, message: ERROR_MESSAGES.invalidLoanPeriod(book.title) };
        }

        const daysOverdue = daysDiff - loanPeriod;

        if (daysOverdue > 0) {

            const amount = calculateFineAmount(memberRecord, daysOverdue);
            
            if (!amount.success) {
                return { error: true, message: amount.message };
            }
            
            acc.fineAmount += amount.message;
        }

        return acc;
    }, { fineAmount: 0, error: false, message: "" }); 

    if (result.error) {
        return { success: false, message: result.message };
    }

    return { success: true, message: result.fineAmount };
}

/**
 * Merges fiction, non-fiction, and reference arrays into one flat collection.
 * Pure function — no side effects.
 * @param {Book[]} fiction - Fiction books array.
 * @param {Book[]} nonFiction - Non-fiction books array.
 * @param {Book[]} reference - Reference books array.
 * @returns {Book[]} Combined flat array.
 */
function combineBookCollections(fiction, nonFiction, reference) {
    return [...fiction, ...nonFiction, ...reference];
}

/**
 * Delegates to book.getInfo() for a plain-text book representation.
 * Pure function — no side effects.
 * @param {Book} book - The book to format.
 * @returns {string} Plain-text summary of the book.
 */
function formatBookInfo(book) {

    return book.getInfo();
}

/**
 * Appends one or more Book instances to the global books array.
 * @param {...Book} newBooks - One or more Book instances to add.
 */
function addMultipleBooks(...newBooks) {
    books.push(...newBooks);
}

/**
 * Appends one or more Member instances to the global members array.
 * @param {...Member} newMembers - One or more Member instances to add.
 */
function addMultipleMembers(...newMembers) {
    members.push(...newMembers);
}

/**
 * Updates a member's name, email, and membership type in place.
 * Handles premium property assignment/removal on type change.
 * @param {Member} member - The member instance to update.
 * @param {{ name: string, email: string, membershipType: string }} updates - New field values.
 * @returns {Member} The updated member instance.
 */
function updateMemberInfo(member, { name, email, membershipType }) {

    member.name  = name;
    member.email = email;

    if (membershipType !== member.membershipType) {
        if (membershipType === 'premium') {
            member.membershipType = 'premium';
            member.maxBooks       = 10;
            member.discountRate   = 0.2;
            member.priorityHolds  = true;
        } else {
            member.membershipType = 'regular';
            delete member.maxBooks;
            delete member.discountRate;
            delete member.priorityHolds;
        }
    }

    return member;
}

/**
 * Processes a borrow or download transaction for a member.
 * @param {number} memberId - The ID of the member borrowing the book.
 * @param {string} isbn - The ISBN of the book to borrow or download.
 * @param {number} loanPeriod - The number of days for the loan.
 * @returns {{ success: boolean, message: string }} Result object.
 */
function borrowBook(memberId,isbn,loanPeriod) {
    try {
        if (typeof memberId !== 'number'|| Number.isNaN(memberId)) {
            return { success: false, message: ERROR_MESSAGES.invalidType('memberId', 'number', memberId) };
        }
        if (typeof isbn !== 'string') {
            return { success: false, message: ERROR_MESSAGES.invalidType('isbn', 'string', isbn) };
        }
        if (typeof loanPeriod !== 'number' || Number.isNaN(loanPeriod)) {
            return { success: false, message: ERROR_MESSAGES.invalidType('loanPeriod', 'number', loanPeriod) };
        }

        const member = findMemberById(memberId);
        if (!member) {
            return { success: false, message: `The record of the member #${memberId} was not found` };
        }
        
        const book = findBookByISBN(isbn);
        if (!book) {
            return { success: false, message: `The book with ISBN ${isbn} was not found in the catalogue` };
        }

        const canBorrowResult = member.canBorrow(book);
        if (!canBorrowResult.success) {
            return canBorrowResult;
        }

         const confirmed = window.confirm(
            `Confirm borrow?\n${member.getMemberInfo()}\n${formatBookInfo(book)}`);

        if (!confirmed) return { success: false, message: 'Borrow cancelled' };

        const checkoutRecord = { isbn, loanPeriod };
        if (book.isDigital) {
            book.download(memberId);
            member.addDownload({ ...checkoutRecord, expirePeriod: loanPeriod });
            return { success: true, message: `"${book.title}" downloaded successfully by ${member.name}` };
        } else {
            if(book.checkOut(memberId)){
                 member.addBorrowedBook(checkoutRecord);
                 return { success: true, message: `"${book.title}" borrowed successfully by ${member.name} must return before ${loanPeriod} days` };
            }
        }

    } catch(e) {
        return { success: false, message: e.message };
    }
}

/**
 * Finds a member by their numeric ID.
 * @param {number} id - The member ID to search for.
 * @param {Member[]} [memberList=members] - Optional member list to search (defaults to global).
 * @returns {Member|undefined} The matching Member instance, or undefined if not found.
 */
function findMemberById(id,memberList = members) {
    return findMember(member => member.id === id,memberList);
}

/** 
 * Finds a book in the catalogue by its ISBN.
 * @param {string} isbn - The ISBN to search for.
 * @param {Book[]} [bookList=books] - Optional book list to search (defaults to global catalogue)
 * @returns {Book|null} The matching Book instance, or null if not found.
 */
function findBookByISBN(isbn,bookList = books) {
    
    for (const book of bookList) {
        if(book.isbn ===isbn){
            return book;
        }
    }

    return null;
}
/**
 * Utility object for tracking library statistics.
 * @type {{
 *   totalMembers:number,
 *   totalBorrowings:number,
 *   totalPhysicalBooks:number,
 *   totalDigitalBooks:number,
 *   totaldownloaded:number,
 *   getBookStats:(bookList?:Book[])=>{max:number,min:number},
 *   getAvailableBooks:(bookList?:Book[])=>string[],
 *   updateStats:()=>void,
 *   getMostPopularBook:(bookList?:Book[])=>{borrowed:Book[],downloaded:Book[]},
 *   getSummary:()=>{totalPhysicalBooks:number,totalDigitalBooks:number,totalMembers:number,totalBorrowings:number,totaldownloaded:number}
 * }}
 */
const LibraryStats = {
    totalMembers : 0,
    totalBorrowings: 0,
    totalPhysicalBooks : 0,
    totalDigitalBooks : 0,
    totaldownloaded : 0,

    /**
    * Returns the maximum and minimum checkout counts across all books.
    * @param {Book[]} [bookList=books] - Optional book list to analyze.
    * @returns {{max: number, min: number}} Highest and lowest checkout counts.
    */
    getBookStats: function(bookList=books) {
        const checkoutCounts = bookList.map(book => book.checkedOut.length);
        return {
            max: Math.max(...checkoutCounts), 
            min: Math.min(...checkoutCounts),  
        };
    },

    /**
    * Returns titles of physical books that currently have available copies.
    * @param {Book[]} [bookList=books] - Optional book list to analyze.
    * @returns {string[]} Titles of available physical books.
    */
    getAvailableBooks: function(bookList = books) {
        return bookList
            .filter(book => book.isAvailable() && !book.isDigital)
            .map(book => book.title);
    },

    /**
    * Resets all counters then recomputes them from the live books and members arrays.
    * @returns {void}
    */
    updateStats: function() {
        this.totalPhysicalBooks = 0;
        this.totalDigitalBooks  = 0;
        this.totalBorrowings    = 0;
        this.totaldownloaded    = 0;
        this.totalMembers       = members.length;
        iterateBooks(book =>{
            if(book instanceof DigitalBook){
                this.totalDigitalBooks++;
                this.totaldownloaded+=book.checkedOut.length;
            }else{
                this.totalPhysicalBooks++;
                this.totalBorrowings+=book.checkedOut.length;
            }
        })
    },
    
    /**
    * Returns the physical book(s) with the most active checkouts and the
    * digital book(s) with the most downloads.
    * @param {Book[]} [bookList=books] - Optional book list to analyze.
    * @returns {{borrowed: Book[], downloaded: Book[]}} Most-popular books by category.
    */
    getMostPopularBook: function(bookList=books) {
        if (bookList.length === 0) return { borrowed: [], downloaded: [] };

        const physicalBooks = bookList.filter(book => !book.isDigital);
        const digitalBooks  = bookList.filter(book =>  book.isDigital);

        const maxBorrowed = physicalBooks.length > 0
            ? Math.max(...physicalBooks.map(book => book.checkedOut.length))
            : 0;

        const mostBorrowed = maxBorrowed > 0
            ? physicalBooks.filter(book => book.checkedOut.length === maxBorrowed)
            : [];

        const maxDownloaded = digitalBooks.length > 0
            ? Math.max(...digitalBooks.map(book => book.checkedOut.length))
            : 0;

        const mostDownloaded = maxDownloaded > 0
            ? digitalBooks.filter(book => book.checkedOut.length === maxDownloaded)
            : [];

        return { borrowed: mostBorrowed, downloaded: mostDownloaded };
    }, 

    /**
    * Returns a plain object snapshot of the current stat totals.
    * @returns {{totalPhysicalBooks: number, totalDigitalBooks: number, totalMembers: number, totalBorrowings: number, totaldownloaded: number}}
    */
    getSummary: function() {
        const { totalPhysicalBooks, totalDigitalBooks,totalMembers, totalBorrowings,totaldownloaded } = this;
        return { totalPhysicalBooks, totalDigitalBooks,totalMembers, totalBorrowings,totaldownloaded};
    }
};

/**
 * Calculates the fine amount for a number of overdue days.
 * Pure function — no side effects.
 * @param {Member} memberRecord - The member being fined (used for premium discount).
 * @param {number} daysDiff - The number of days overdue.
 * @returns {{ success: boolean, message: number|string }} Result with fine amount or error message.
 */
function calculateFineAmount(memberRecord, daysDiff) {
    try {
        if (typeof daysDiff !== 'number' || Number.isNaN(daysDiff)) {
            throw new Error(ERROR_MESSAGES.invalidType('daysDiff', 'valid number', daysDiff));
        }
        if (typeof memberRecord !== 'object' || memberRecord === null) {
            throw new Error(ERROR_MESSAGES.invalidValue('memberRecord', 'object'));
        }

        const fee = daysDiff * LATE_FEE_PER_DAY;
        let fineAmount;

        if (memberRecord.membershipType === 'premium') {
            fineAmount = parseFloat((fee * (1 - memberRecord.discountRate)).toFixed(2));
        } else if (memberRecord.membershipType === 'regular') {
            fineAmount = parseFloat(fee.toFixed(2));
        } else {
            throw new Error(ERROR_MESSAGES.unknownMembershipType());
        }

        return { success: true, message: fineAmount };

    } catch (error) {
        return { success: false, message: error.message };
    }
}


export {
    Book, DigitalBook, Member, PremiumMember,
    books, members,
    borrowBook, processReturnQueue, findOverdueBooks,
    findMemberById, findBookByISBN, combineLists,
    addMultipleBooks, addMultipleMembers, updateMemberInfo,
    combineBookCollections, calculateTotalLateFees,
    calculateFineAmount, LibraryStats,
    getBooksByTitle, getBooksByAuthor,formatBookInfo,
    filterBooks, filterCollection, iterateBooks,
    searchBooksByCategory, searchMembersByType,
    MAX_BOOKS_PER_MEMBER, LATE_FEE_PER_DAY
};