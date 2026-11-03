import {
    Book, DigitalBook, Member, PremiumMember,
    books, members,
    borrowBook, processReturnQueue, findOverdueBooks,
    findMemberById, findBookByISBN,combineLists,
    addMultipleBooks, addMultipleMembers, updateMemberInfo,
    combineBookCollections, calculateTotalLateFees,
    calculateFineAmount, LibraryStats,
    getBooksByTitle, getBooksByAuthor,
    searchBooksByCategory, searchMembersByType,
    filterCollection, iterateBooks,
    MAX_BOOKS_PER_MEMBER
} from './library.js';

let catalogue_list;
let banner_borrowbook;
let banner_addBook;         
let detailsContainer;
let memberDetails;
let returnBook_btn;
let returnMemberElement;
let banner_catalogue;
let banner_editbook;
let banner_editMember;

/* Caches all DOM references into module-level variables, Called once on DOMContentLoaded after data has loaded. */
function initializeUI() {
    memberDetails       = document.getElementById('member-details');
    banner_addBook      = document.getElementById('message-banner-addbook');
    banner_borrowbook   = document.getElementById('message-banner-borrowbook');
    detailsContainer    = document.getElementById('book-details');
    returnBook_btn      = document.getElementById('return-book-btn');
    returnMemberElement = document.getElementById('return-member-id');
    banner_catalogue    = document.getElementById('message-banner-catalogue');
    banner_editbook     = document.getElementById('message-banner-editbook');
    banner_editMember   = document.getElementById('message-banner-editMember');
    catalogue_list      = document.getElementById('catalogue-list');
}

//Attaches all event listeners to DOM elements.
function setupEventListeners() {

    document.getElementById('add-book-form').addEventListener("submit", handleAddBookSubmit);
    document.getElementById('catalogue-tab').addEventListener("click", (event) => {
        handleNavTabs(event.target.id);
    });
    document.getElementById('members-tab').addEventListener("click", (event) => {
        handleNavTabs(event.target.id);
    });
    document.getElementById('statistics-tab').addEventListener("click", (event) => {
        handleNavTabs(event.target.id);
    });
    document.getElementById('search-btn-book').addEventListener('click', handleSearchBook);
    document.getElementById('member-search-btn').addEventListener('click', handleSearchMember);
    catalogue_list.addEventListener('click',(event)=>{
        handleBookClick(event);
    })
    document.getElementById('member-list').addEventListener('click',(event)=>{
        handleMemberClick(event);
    })

    document.getElementById('borrow-form').addEventListener("submit", (event) =>{
        handleBorrowSubmit(event);
    });
    document.getElementById('return-form').addEventListener('submit', (event)=>{
        handleReturnBookSubmit(event);
    })

    returnMemberElement.addEventListener('change',(event)=>{
        populateReturnBooksDropdown(event.target.value); 
    })

    document.getElementById('check-overdue-btn').addEventListener('click',handleCheckOverdue);

        document.getElementById('new-book-type').addEventListener('change', (e) => {
        const isDigital = e.target.value === 'digital';
        document.getElementById('physical-fields').classList.toggle('is-hidden', isDigital);
        document.getElementById('digital-fields').classList.toggle('is-hidden', !isDigital);

        document.getElementById('new-copies').required   = !isDigital;
        document.getElementById('new-filesize').required =  isDigital;
    });
}

//Clears and re-renders the book grid from a given book list.
function renderBookCatalogue(bookList) {
    catalogue_list.innerHTML = '';

    if (bookList.length === 0) {
        catalogue_list.innerHTML = '<p class="empty-state">No books found.</p>';
        return;
    }

    const fragment = document.createDocumentFragment();

    bookList.forEach(book => {
        const card = document.createElement('div');
        card.className = 'book-card';
        card.dataset.isbn = book.isbn;

        if (!book.isAvailable() && !book.isDigital) card.classList.add('is-checked-out');
        if (book.isDigital)      card.classList.add('is-digital');

        card.innerHTML = `
            <p class="category-label">${book.category}</p>
            <h3>${book.title}</h3>
            <p class="author">${book.author}</p>
            <div class="card-actions">
                <button class="card-btn view-btn" data-action="view" data-isbn="${book.isbn}">View</button>
                <button class="card-btn edit-btn" data-action="edit" data-isbn="${book.isbn}">Edit</button>
            </div>
        `;

        fragment.appendChild(card);
    });

    catalogue_list.appendChild(fragment);
}

// Validates inputs, constructs a Book or DigitalBook, and adds it to the catalogue
function handleAddBookSubmit(event) {
    event.preventDefault();

    const isbn      = document.getElementById("new-isbn").value.trim();
    const title     = document.getElementById("new-title").value.trim();
    const author    = document.getElementById("new-author").value.trim();
    const year      = parseInt(document.getElementById("new-year").value, 10);
    const category  = document.getElementById("new-category").value;
    const isDigital = document.getElementById("new-book-type").value === "digital";

    // ISBN must be exactly 10 or 13 digits after stripping hyphens
    const isbnDigits = isbn.replace(/-/g, '');
    if (!/^\d{10}$|^\d{13}$/.test(isbnDigits)) {
        showMessage({ success: false, message: "ISBN must be 10 or 13 digits" },banner_addBook);
        return;
    }
    // ISBN must be unique — physical and digital editions require separate ISBNs
    if (findBookByISBN(isbn)) {
        showMessage({ success: false, message: `ISBN ${isbn} already exists. Physical and digital editions must have separate ISBNs.` },banner_addBook);
        return;
    }
    // Author name must contain only letters, spaces, hyphens, apostrophes, or periods
    if (!/^[a-zA-Z\s\-'.]+$/.test(author)) {
        showMessage({ success: false, message: "Author name contains invalid characters" },banner_addBook);
        return;
    }

    let newBook;
    if (isDigital) {
        const fileSize = parseFloat(document.getElementById("new-filesize").value);
        if ( fileSize === 0) {
            showMessage({ success: false, message: "File size must be greater than 0" },banner_addBook);
            return;
        }
        const format   = document.getElementById("new-format").value;
        newBook = new DigitalBook(isbn, title, author, year, fileSize, format, category);
        
    } else {
        const copies  = parseInt(document.getElementById("new-copies").value, 10);
        newBook = new Book(isbn, title, author, year, copies, category);
    }

    addMultipleBooks(newBook);
    populateBooksDropdown();
    updateStatisticsDisplay();
    showMessage({ success: true, message: `"${title}" added to the catalogue` },banner_addBook);
    event.target.reset();
}
// Populates the year-select with options from current year down to 1800.
function populateYearDropdown() {
    const select     = document.getElementById('new-year');
    const currentYear = new Date().getFullYear();

    for (let year = currentYear; year >= 1800; year--) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        select.appendChild(option);
    }
}
//Populates a member-select element with members.
function populateMemberDropdown(elementID) {
    const select = document.getElementById(elementID);
    select.innerHTML = ''; 

    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Select a member...';
    select.appendChild(defaultOption);

    for (let i = 0; i < members.length; i++) {
        const option = document.createElement('option');
        option.value = members[i].id;
        option.textContent = `${members[i].name} (#${members[i].id})`;
        select.appendChild(option);
    }
}
/*
Populates the borrow book dropdown with all books.
Disables unavailable physical books so they appear but can't be selected.
*/
function populateBooksDropdown() {
    const select = document.getElementById('borrow-book-id');
    select.innerHTML = ''; 

    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Select a book to borrow...';
    select.appendChild(defaultOption);

    for (let i = 0; i < books.length; i++) {
        const option = document.createElement('option');
        option.value = books[i].isbn;
        option.textContent = `${books[i].title} (#${books[i].isbn})`;
        option.disabled = !books[i].isDigital && !books[i].isAvailable();
        select.appendChild(option);
    }
}

//Populates the return-books-list element with checkboxes for a given member's borrowed books.
function populateReturnBooksDropdown(memberId) {
    const container = document.getElementById('return-books-list');
    container.innerHTML = '';

    const member = findMemberById(parseInt(memberId, 10));
    if (!member) return;
    if (member.borrowedBooks.length === 0) {
        container.innerHTML = '<p class="empty-state">No books to return</p>';
        returnBook_btn.disabled = true;
        return;
    }
    returnBook_btn.disabled = false; 

    member.borrowedBooks.forEach(borrowedbook => { 
        const book = findBookByISBN(borrowedbook.isbn);                           

        const label = document.createElement('label');
        label.className = 'return-book-item';
        label.innerHTML = `
            <input type="checkbox" name="return-isbn" value="${borrowedbook.isbn}">
            <span>${book?.title ?? 'Unknown title'}</span>
            <span class="meta">${book?.author ?? 'Unknown'} · ${borrowedbook.isbn}</span>
        `;

        container.appendChild(label);
    });
}
// Validates the add-member form, constructs the right member type
function handleAddMemberSubmit(event) {
    event.preventDefault();
    const memId = document.getElementById("new-member-id");

    const memberId         = parseInt(memId.value,10); 
    const name             = document.getElementById("new-member-name").value.trim();
    const newEmail         = document.getElementById("new-member-email").value.trim();
    const type             = document.getElementById("new-member-type").value;
    const banner_addmember = document.getElementById("message-banner-addmember");

    // Email must not already be registered to another member
    const emailTaken = members.some(m =>m.email === newEmail && m.id !== memberId);  
    if (emailTaken) {
        showMessage({ success: false, message: `Email ${newEmail} is already registered` }, banner_addmember);
        return;
    }

    const newMember = type === 'premium'
        ? new PremiumMember(memberId, name, newEmail)
        : new Member(memberId, name, newEmail, 'regular');

    addMultipleMembers(newMember);
    populateMemberDropdown('borrow-member-id');
    renderMemberList(members);
    populateMemberDropdown('return-member-id');
    updateStatisticsDisplay();

    showMessage({ success: true, message: `Member #${memberId} · ${name} (${type}) added successfully` },banner_addmember);
    event.target.reset();
    const nextId = members.length > 0 ? Math.max(...members.map(m => m.id)) + 1 : 1;
    memId.value = nextId;

}

// Displays a result message in a given banner element and triggers save on success
function showMessage(result,elementID) {

    elementID.textContent = result.message;
    elementID.style.color = result.success ? 'green' : 'red';
    elementID.classList.add('is-visible');

    if(result.success){
        saveToLocalStorage();
        exportLibraryData();
    }
}
// Reads borrow form inputs, calls borrowBook, and refreshes dropdowns and stats
function handleBorrowSubmit(event) {
    event.preventDefault()
    
    const memberIdInput = parseInt(document.getElementById("borrow-member-id").value,10);
    const isbnInput = document.getElementById("borrow-book-id").value;
    const loanPeriodInput = parseInt(document.getElementById("loan-bookperiod-id").value,10); 
    const result = borrowBook(memberIdInput, isbnInput ,loanPeriodInput);

    if(result.success){
        populateBooksDropdown();
        updateStatisticsDisplay();
        renderMemberList(members);
    }

    showMessage(result,banner_borrowbook);

    event.target.reset();
}

/*
Handles book search button click.
Combines category filter result with title/author search via
getBooksByTitle and getBooksByAuthor.
 */
function handleSearchBook() {
    const term = document.getElementById('book-search').value.trim().toLowerCase();
    const filteredByCategory = handleFilterChange();
    let filtered;
    if (!term) {
        // No search term — show full category filter result
        filtered = filteredByCategory;
    }else{
        const byTitle  = getBooksByTitle(term);
        const byAuthor = getBooksByAuthor(term);
        // Keep only books that are in the category result AND match the search term
        filtered = filterCollection(filteredByCategory,element =>{
            return combineLists(byTitle, byAuthor).some(item => element.isbn === item.isbn);
        })
    }

    renderBookCatalogue(filtered);
    detailsContainer.classList.remove('is-visible');
    banner_editbook.textContent = '';
    banner_editbook.classList.remove('is-visible');
    
}

/*
Handles member search button click.
Filters members by type first, then narrows by the name search term
 */
function handleSearchMember() {
    const term            = document.getElementById('member-search').value.trim().toLowerCase();
    const filteredByType  = handleFilterMemberType();

    const filtered = filterCollection(filteredByType,member =>
        !term || member.name.toLowerCase().includes(term)
    );

    renderMemberList(filtered);
    memberDetails.classList.remove('is-visible');
}

// Returns all books matching the selected category, or all books if 'all' is selected
function handleFilterChange() {
    const category = document.getElementById('filter-category').value;
    return category === 'all'
        ? [...books]
        : searchBooksByCategory(books, category);
}

// Returns all members matching the selected membership type, or all members if 'all' is selected
function handleFilterMemberType() {
    const member = document.getElementById('filter-member-type').value;
    return member === 'all'
        ? [...members]
        : searchMembersByType(members, member);
}
//Clears and re-renders the member grid from a given member list.
function renderMemberList(memberList) {
    const container = document.getElementById('member-list');
    container.innerHTML = '';

    if (memberList.length === 0) {
        container.innerHTML = '<p class="empty-state">No members found.</p>';
        return;
    }

    const fragment = document.createDocumentFragment();

    memberList.forEach(member => {
        const card = document.createElement('div');
        card.className = 'member-card';
        card.dataset.memberId = member.id;

        card.innerHTML = `
            <div>
                <p class="name">${member.name}</p>
                <p class="meta">#${member.id} · ${member.email}</p>
                <p class="meta">${member.borrowedBooks.length} book(s) borrowed</p>
                <p class="meta">${member.downloads.length} book(s) downloaded</p>
                <div class="card-actions">
                    <button class="card-btn view-btn" data-action="view" data-member-id="${member.id}">View</button>
                    <button class="card-btn edit-btn" data-action="edit" data-member-id="${member.id}">Edit</button>
                </div>
                
            </div>
            ${member.membershipType === 'premium'
                ? '<span class="badge-premium">Premium</span>'
                : ''}
        `;

        fragment.appendChild(card);
    });

    container.appendChild(fragment);
}
//POSTs current library data to the Express /save endpoint then save to Data.txt.
async function exportLibraryData() {

    try {
        const data = {
            fiction:    books.filter(b => b.category === "fiction"),
            nonFiction: books.filter(b => b.category === "non-fiction"),
            reference:  books.filter(b => b.category === "reference"),
            members
        };

        const response = await fetch("/save", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });

        if (!response.ok) throw new Error("Server error");

    } catch (error) {
        banner_catalogue.classList.add('is-visible');
        banner_catalogue.textContent = "Export failed: " + error.message;
        banner_catalogue.style.color = "red";
    }
}
//Parses a JSON string and reconstructs Book/DigitalBook and Member/PremiumMember
export function importLibraryData(jsonString) {

    try {
        const data = JSON.parse(jsonString);

        books.length = 0;
        members.length = 0;

        // Use combineBookCollections to merge the three category arrays into one
        const rawBooks = combineBookCollections(data.fiction || [], data.nonFiction || [],data.reference || []);

        rawBooks.forEach(b => {
            const book = b.isDigital
                ? new DigitalBook(
                    b.isbn, b.title, b.author,
                    b.year, b.fileSize, b.format, b.category
                )
                : new Book(
                    b.isbn, b.title, b.author,
                    b.year, b.totalCopies, b.category
                );
            if(!book.isDigital){
                book.availableCopies = b.availableCopies;
            }
            book.checkedOut = b.checkedOut
            books.push(book);
        });

        data.members.forEach(m => {
            const member = m.membershipType === "premium"
                ? new PremiumMember(m.id, m.name, m.email,m.joinDate)
                : new Member(m.id, m.name, m.email, m.membershipType,m.joinDate);

            member.borrowedBooks = m.borrowedBooks || [];
            member.downloads = m.downloads || [];
            members.push(member);
        });

    } catch (error) {
        banner_catalogue.classList.add('is-visible');
        banner_catalogue.textContent = "Import failed: " + error.message;
        banner_catalogue.style.color = "red";
    }
}
//Saves the current books and members to localStorage.
function saveToLocalStorage() {
    try {
        const booksData = {
            fiction:    books.filter(b => b.category === "fiction"),
            nonFiction: books.filter(b => b.category === "non-fiction"),
            reference:  books.filter(b => b.category === "reference"),
        };

        localStorage.setItem(
            "libraryBooks",
            JSON.stringify(booksData)
        );

        localStorage.setItem(
            "libraryMembers",
            JSON.stringify(members)
        );
    } catch (error) {
        banner_catalogue.classList.add('is-visible');
        banner_catalogue.textContent = "Local save failed: " + error.message;
        banner_catalogue.style.color = "red";
    }
}

//Loads data from localStorage if cached, otherwise fetches from Data.txt
async function loadFromLocalStorage() {
    try {
        const booksData = localStorage.getItem("libraryBooks");
        const membersData = localStorage.getItem("libraryMembers");
        if (booksData && membersData) {
            const parsedBooks = JSON.parse(booksData);

            if (
                (parsedBooks.fiction    && parsedBooks.fiction.length    > 0) ||
                (parsedBooks.nonFiction && parsedBooks.nonFiction.length > 0) ||
                (parsedBooks.reference  && parsedBooks.reference.length  > 0)
            ) {
                importLibraryData(JSON.stringify({
                    fiction   : parsedBooks.fiction,
                    nonFiction: parsedBooks.nonFiction,
                    reference : parsedBooks.reference,
                    members   : JSON.parse(membersData)
                }));
                return;
            }
        }

        await loadFromFile();
        saveToLocalStorage(); 

    } catch (error) {
        banner_catalogue.classList.add('is-visible');
        banner_catalogue.textContent = "Error loading data: " + error.message;
        banner_catalogue.style.color = "red";
    }
}
//Fetches Data.txt from the server.js and passes content to importLibraryData.
export async function loadFromFile() {
    try {
        const response = await fetch("./LibraryData/Data.txt");

        if (!response.ok) {
            return;
        }

        const content = await response.text();

        importLibraryData(content);

    } catch (error) {
        banner_catalogue.classList.add('is-visible');
        banner_catalogue.textContent = "File load failed: " + error.message;
        banner_catalogue.style.color = "red";
    }
}

// Switches the active tab and section by toggling is-active on the relevant elements
function handleNavTabs(tabId){
    const tabs = {
        'catalogue-tab': 'catalogue-section',
        'members-tab': 'member-section',
        'statistics-tab': 'statistics-section'
    };
    Object.keys(tabs).forEach(id => document.getElementById(id).classList.remove('is-active'));
    Object.values(tabs).forEach(sectionId => document.getElementById(sectionId).classList.remove('is-active'));
 
    document.getElementById(tabId).classList.add('is-active');
    document.getElementById(tabs[tabId]).classList.add('is-active');

}
// Renders full book info in the details panel; shows error banner if book is not found
function displayBookDetails(isbn) {
    const book = findBookByISBN(isbn);
    if (!book) {                        
        showMessage({ success: false, message: `Book not found` }, banner_catalogue);
        return;
    }

    detailsContainer.innerHTML = `
        <p class="category-label">${book.category}</p>
        <h3>${book.title}</h3>
        <p class="author">${book.author}</p>
        <p class="isbn">${book.isbn}</p>
        <p><strong>Year:</strong> ${book.year}</p>
        ${book.isDigital
            ? `<p><strong>Format:</strong> ${book.format}</p>
               <p><strong>File size:</strong> ${book.fileSize} MB</p>
               <p class="availability available">Digital — always available</p>`
            : `<p class="availability ${book.isAvailable() ? 'available' : 'unavailable'}">
                   ${book.availableCopies} of ${book.totalCopies} available
               </p>`
        }
    `;

    detailsContainer.classList.add('is-visible');
}

// Collects checked ISBNs and member ID, then calls processReturnQueue
function handleReturnBookSubmit(event){
    event.preventDefault();
    const checked = document.querySelectorAll('input[name="return-isbn"]:checked');
    const isbns = [...checked].map(book => book.value);
    const memberId = parseInt(returnMemberElement.value.trim(),10);
    const banner_returnbook = document.getElementById('message-banner-returnbook');

    const memberReturnBooks = {'memberId':memberId, 'isbns':isbns};
    if(isbns.length === 0){
        showMessage({ success: false, message: "Please select book(s) you'd like to return "},banner_returnbook);
        return;
    }

    const result = processReturnQueue(memberReturnBooks);

    if(result.success){
        populateReturnBooksDropdown(returnMemberElement.value.trim()); 
        updateStatisticsDisplay();
        populateBooksDropdown();
        renderMemberList(members);
    }
    showMessage(result,banner_returnbook);

}

// Dynamically builds the add-member form
function createMemberForm() {
    const formContainer = document.getElementById("member-form");

    const form = document.createElement("form");
    form.id = "add-member-form";
    form.className = "inline-form";

    const memberIdInput = document.createElement("input");
    memberIdInput.type = "number";
    memberIdInput.id = "new-member-id";
    memberIdInput.disabled = true;

    const nextId = members.length > 0 ? Math.max(...members.map(m => m.id)) + 1 : 1;
    memberIdInput.value = nextId;

    // Name input
    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.id = "new-member-name";
    nameInput.placeholder = "Full name";
    nameInput.required = true;

    // Email input
    const emailInput = document.createElement("input");
    emailInput.type = "email";
    emailInput.id = "new-member-email";
    emailInput.placeholder = "Email";
    emailInput.required = true;

    // Membership type select
    const typeSelect = document.createElement("select");
    typeSelect.id = "new-member-type";

    const options = [
        { value: "regular", text: "Regular" },
        { value: "premium", text: "Premium" }
    ];
    options.forEach(opt => {
        const option = document.createElement("option");
        option.value = opt.value;
        option.textContent = opt.text;
        typeSelect.appendChild(option);
    });

    // Submit button
    const submitBtn = document.createElement("button");
    submitBtn.type = "submit";
    submitBtn.className = "btn btn-primary";
    submitBtn.textContent = "Add member";

    // Assemble form
    form.appendChild(memberIdInput);
    form.appendChild(nameInput);
    form.appendChild(emailInput);
    form.appendChild(typeSelect);
    form.appendChild(submitBtn);

    formContainer.appendChild(form);

    // Attach submit listener
    form.addEventListener("submit", function(e) {
        handleAddMemberSubmit(e)

    });
}

function handleBookClick(event) {
    const btn = event.target.closest('[data-action]');
    if (!btn) return;

    const isbn   = btn.dataset.isbn;
    const action = btn.dataset.action;

    if (action === 'view') {
        displayBookDetails(isbn);
        document.getElementById('book-details').scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
        });
    }
    if (action === 'edit'){
        displayBookEdit(isbn);
        document.getElementById('book-details').scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
        });
    } 
    banner_editbook.textContent = '';
    banner_editbook.classList.remove('is-visible');
}

// Validates the editable book-edit fields; returns { valid, message }
function validateBookEditForm(form, book) {
    const newIsbn   = form.isbn.value.trim();
    const newAuthor = form.author.value.trim();

    const isbnDigits = newIsbn.replace(/-/g, '');
    if (!/^\d{10}$|^\d{13}$/.test(isbnDigits)) {
        return { valid: false, message: 'ISBN must be 10 or 13 digits' };
    }

    if (newIsbn !== book.isbn && findBookByISBN(newIsbn)) {
        return { valid: false, message: `ISBN ${newIsbn} already exists. Physical and digital editions must have separate ISBNs.` };
    }

    if (!/^[a-zA-Z\s\-'.]+$/.test(newAuthor)) {
        return { valid: false, message: 'Author name contains invalid characters' };
    }

    return { valid: true, message: 'OK' };
}
// Applies isbn/title/author/category edits and handles physical <-> digital conversion
function applyBookMetadata(book, form, newIsDigital) {
    book.isbn     = form.isbn.value.trim();
    book.title    = form.title.value.trim();
    book.author   = form.author.value.trim();
    book.category = form.category.value;

    const typeChanged = newIsDigital !== book.isDigital;
    if (!typeChanged) return;

    if (newIsDigital) {
        // physical -> digital; fileSize/format handled by syncTypeSpecificFields below
        book.isDigital       = true;
        book.totalCopies     = Infinity;
        book.availableCopies = Infinity;
        book.checkedOut      = [];
    } else {
        // digital -> physical
        book.isDigital       = false;
        book.fileSize        = undefined;
        book.format          = undefined;
        const copies         = parseInt(form.totalCopies.value, 10);
        book.totalCopies     = copies;
        book.availableCopies = copies;
    }
}
// Syncs digital fields (fileSize/format) or physical copy counts from the form.
// Runs on every save, including when the book type didn't change.
// Throws if the resulting availableCopies would be invalid (caught by the caller).
function syncTypeSpecificFields(book, form, newIsDigital) {
    if (newIsDigital) {
        book.fileSize = parseFloat(form.fileSize.value);
        book.format   = form.format.value;
        return;
    }

    const newTotalCopies = parseInt(form.totalCopies.value, 10);
    book.availableCopies += newTotalCopies - book.totalCopies;
    book.totalCopies = newTotalCopies;
}
// Renders an inline edit form in the book details panel
function displayBookEdit(isbn) {
    const book       = findBookByISBN(isbn);
    const isBorrowed = book.checkedOut.length > 0;
    const disabled   = isBorrowed ? 'disabled' : '';
    const warningMsg = isBorrowed
        ? book.isDigital
            ? 'Book has been downloaded — only file size and format can be updated'
            : 'Book is currently borrowed — only total copies can be updated'
        : '';

    const detailsContainer = document.getElementById('book-details');
    detailsContainer.innerHTML = `
        <p class="category-label">${book.category}</p>
        <h3>${book.title}</h3>
        ${isBorrowed 
            ? `<p class="meta overdue-text">${warningMsg}</p>` 
            : ''}
        <form class="edit-form" data-isbn="${book.isbn}">
            <label>ISBN
                <input type="text" name="isbn" value="${book.isbn}" ${disabled} required>
            </label>
            <label>Title
                <input type="text" name="title" value="${book.title}" ${disabled} required>
            </label>
            <label>Author
                <input type="text" name="author" value="${book.author}" ${disabled} required>
            </label>
            <label>Category
                <select name="category" ${disabled}>
                    <option value="fiction"     ${book.category === 'fiction'     ? 'selected' : ''}>Fiction</option>
                    <option value="non-fiction" ${book.category === 'non-fiction' ? 'selected' : ''}>Non-fiction</option>
                    <option value="reference"   ${book.category === 'reference'   ? 'selected' : ''}>Reference</option>
                </select>
            </label>

            <label>Book type
                <select name="bookType" ${disabled}>
                    <option value="physical" ${!book.isDigital ? 'selected' : ''}>Physical</option>
                    <option value="digital"  ${ book.isDigital ? 'selected' : ''}>Digital</option>
                </select>
            </label>

            <span id="edit-physical-fields" class="field-group ${book.isDigital ? 'is-hidden' : ''}">
                <label>Total copies
                    <input type="number" name="totalCopies" value="${book.totalCopies ?? ''}" min="${book.checkedOut.length}" required>
                </label>
            </span>

            <span id="edit-digital-fields" class="field-group ${book.isDigital ? '' : 'is-hidden'}">
                <label>File size (MB)
                    <input type="number" name="fileSize" value="${book.fileSize ?? ''}" min="0" step="0.1">
                </label>
                <label>Format
                    <select name="format">
                        <option value="PDF"  ${book.format === 'PDF'  ? 'selected' : ''}>PDF</option>
                        <option value="EPUB" ${book.format === 'EPUB' ? 'selected' : ''}>EPUB</option>
                        <option value="MOBI" ${book.format === 'MOBI' ? 'selected' : ''}>MOBI</option>
                    </select>
                </label>
            </span>

            <div class="edit-form-actions">
                <button type="submit" class="card-btn view-btn">Save</button>
                <button type="button" class="card-btn" id="cancel-edit-btn">Cancel</button>
            </div>
        </form>
    `;  

    detailsContainer.classList.add('is-visible');

    if (!isBorrowed) {
        detailsContainer.querySelector('[name="bookType"]').addEventListener('change', (e) => {
            const isDigital = e.target.value === 'digital';
            detailsContainer.querySelector('#edit-physical-fields').classList.toggle('is-hidden', isDigital);
            detailsContainer.querySelector('#edit-digital-fields').classList.toggle('is-hidden', !isDigital);

            detailsContainer.querySelector('[name="totalCopies"]').required = !isDigital;
            detailsContainer.querySelector('[name="fileSize"]').required    =  isDigital;
        });
    }

    detailsContainer.querySelector('.edit-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const form          = e.target;
        const newIsDigital  = form.bookType.value === 'digital';

        if (!isBorrowed) {
            const validation = validateBookEditForm(form, book);
            if (!validation.valid) {
                showMessage({ success: false, message: validation.message }, banner_editbook);
                return;
            }
            applyBookMetadata(book, form, newIsDigital);
        }

        try {
        syncTypeSpecificFields(book, form, newIsDigital);
        } catch (error) {
            showMessage({ success: false, message: error.message }, banner_editbook);
            return;
        }

        renderBookCatalogue(books);
        displayBookDetails(isbn);
        populateBooksDropdown();

        showMessage({ success: true, message: `"${book.title}" updated successfully` },banner_editbook);
    });

    detailsContainer.querySelector('#cancel-edit-btn').addEventListener('click', () => {
        displayBookDetails(isbn);
    });
}

// Renders an inline edit form in the member details panel
function displayMemberEdit(memberId) {
    const member = findMemberById(memberId);

    // only physical borrowed books restrict editing
    const hasBorrowedBooks = member.borrowedBooks.length > 0;
    const warningMsg       = hasBorrowedBooks
        ? 'Member has borrowed books — membership downgrade may be restricted'
        : '';

    memberDetails.innerHTML = `
        <div class="member-header">
            <p class="category-label">${member.membershipType}</p>
            <h3>${member.name}</h3>
            ${hasBorrowedBooks
                ? `<p class="meta overdue-text">${warningMsg}</p>`
                : ''}
        </div>

        <form class="edit-form" data-member-id="${member.id}">
            <label>Name
                <input type="text" name="name" value="${member.name}" required>
            </label>

            <label>Email
                <input type="email" name="email" value="${member.email}" required>
            </label>

            <label>Membership type
                <select name="membershipType">
                    <option value="regular" ${member.membershipType === 'regular' ? 'selected' : ''}>Regular</option>
                    <option value="premium" ${member.membershipType === 'premium' ? 'selected' : ''}>Premium</option>
                </select>
            </label>

            <div class="edit-form-actions">
                <button type="submit" class="card-btn view-btn">Save</button>
                <button type="button" class="card-btn" id="cancel-member-edit-btn">Cancel</button>
            </div>
        </form>
    `;

    memberDetails.classList.add('is-visible');

    memberDetails.querySelector('.edit-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const form        = e.target;
        const newName     = form.name.value.trim();
        const newEmail    = form.email.value.trim();
        const newType     = form.membershipType.value;
        const typeChanged = newType !== member.membershipType;

        // email uniqueness — only check if changed
        if (newEmail !== member.email) {
            const emailTaken = members.some(m =>
                m.email === newEmail && m.id !== member.id
            );
            if (emailTaken) {
                showMessage({ success: false, message: `Email ${newEmail} is already registered` }, banner_editMember);
                return;
            }
        }

        // name and email always updatable
        member.name  = newName;
        member.email = newEmail;

        if (typeChanged && newType === 'regular') {
            if (member.borrowedBooks.length > MAX_BOOKS_PER_MEMBER) {
                showMessage({
                    success: false,
                    message: `Cannot downgrade — ${member.name} has ${member.borrowedBooks.length} books borrowed, exceeding the regular limit of ${MAX_BOOKS_PER_MEMBER}. Please return ${member.borrowedBooks.length - MAX_BOOKS_PER_MEMBER} book(s) first.`
                }, banner_editMember);
                return;
            }
        }

        const updatedMember = updateMemberInfo(member, {
            name          : newName,
            email         : newEmail,
            membershipType: newType
        });


        renderMemberList(members);
        displayMemberDetails(updatedMember.id);
        populateMemberDropdown('borrow-member-id');
        populateMemberDropdown('return-member-id');
        showMessage({ success: true, message: `${updatedMember.name} updated successfully` }, banner_editMember);
    });

    memberDetails.querySelector('#cancel-member-edit-btn').addEventListener('click', () => {
        displayMemberDetails(member.id);
    });

}

function handleMemberClick(event) {
    const btn = event.target.closest('[data-action]');
    if (!btn) return;

    const memberId = parseInt(btn.dataset.memberId, 10);
    const action   = btn.dataset.action;

    if (action === 'view') {
        displayMemberDetails(memberId);
        memberDetails.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
        });
    }
    if (action === 'edit'){
        displayMemberEdit(memberId);
        memberDetails.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
        });
    } 
    banner_editMember.textContent = '';
    banner_editMember.classList.remove('is-visible');
}

// Renders full member info including borrowed books, downloads, and outstanding late fees
function displayMemberDetails(memberId) {
    const member = findMemberById(memberId);

    const borrowedHTML = member.borrowedBooks.length > 0
        ? member.borrowedBooks.map(item => {
            const book = findBookByISBN(item.isbn);
            return book
                ? `<li class="member-detail-book">
                       <span>${book?.title ?? 'Unknown title'}</span>
                       <span class="meta">${book?.isbn ?? item.isbn}</span>
                   </li>`
                : '';
        }).join('')
        : '<li class="empty-state">No books currently borrowed</li>';

    const totalFees = calculateTotalLateFees(member);
    if(!totalFees.success){
        showMessage({success:false,message:totalFees.message},memberDetails);
        return;
    }
    const feesHTML  = totalFees.message > 0
        ? `<p class="meta" style="color: red;">Late fees: R${totalFees.message.toFixed(2)}</p>`
        : `<p class="meta">No late fees</p>`;
    
    const downloadsHTML = member.downloads.length > 0
        ? member.downloads.map(item=> {
            const book = findBookByISBN(item.isbn);
            return book
                ? `<li class="member-detail-book">
                       <span>${book?.title ?? 'Unknown title'}</span>
                       <span class="meta">${book?.format ?? 'Unknown'} · ${book?.fileSize ?? '?'} MB</span>
                   </li>`
                : '';
        }).join('')
        : '<li class="empty-state">No books downloaded</li>';

    memberDetails.innerHTML = `
        <p class="category-label">${member.membershipType}</p>
        <h3>${member.name}</h3>
        <p class="meta">#${member.id} · ${member.email}</p>
        <p class="meta">Member for ${member.getMembershipDuration()}</p>
        ${feesHTML}

        <div class="member-detail-section">
            <p><strong>Borrowed books</strong></p>
            <ul class="member-detail-list">${borrowedHTML}</ul>
        </div>

        <div class="member-detail-section">
            <p><strong>Downloaded books</strong></p>
            <ul class="member-detail-list">${downloadsHTML}</ul>
        </div>
    `;

    memberDetails.classList.add('is-visible');
}

function handleCheckOverdue() {
    const select              = document.getElementById('overdue-period-id');
    const value               = select.value;
    const banner_OverDuebooks = document.getElementById('message-banner-OverDuebooks');
    banner_OverDuebooks.textContent = '';
    banner_OverDuebooks.classList.remove('is-visible');

    if (!value) {
        showMessage({ success: false, message: 'Please select an overdue period' },banner_OverDuebooks);
        return;
    }

    const overdueItems = findOverdueBooks(value);
    if(!overdueItems.success){
        return showMessage({success:false, message:overdueItems.message},banner_OverDuebooks);
    }
    renderOverdueList(overdueItems.message);
}

// Renders each overdue item as a styled row showing book, member, days late, and fine amount
function renderOverdueList(overdueItems) {
    const container = document.getElementById('overdue-list');
    container.innerHTML = '';

    if (overdueItems.length === 0) {
        container.innerHTML = '<p class="empty-state">No overdue books found.</p>';
        return;
    }

    const fragment = document.createDocumentFragment();

    overdueItems.forEach(item => {
        const div = document.createElement('div');
        div.className = 'overdue-item';
        div.innerHTML = `
            <div>
                <span>${item.bookTitle}</span>
                <span class="meta">${item.isbn}</span>
                <span class="meta">${item.memberName} (#${item.memberId})</span>
            </div>
            <span class="days-late">
                ${item.isDigital
                    ? `Expired ${item.daysOverdue} day(s) ago`
                    : `${item.daysOverdue} day(s) late · R${item.fine}`}
            </span>
        `;
        fragment.appendChild(div);
    });

    container.appendChild(fragment);
}

// Calls LibraryStats methods to recompute totals and renders all stat cards and popular book panels
function updateStatisticsDisplay() {

    LibraryStats.updateStats();

    const { totalPhysicalBooks, totalDigitalBooks,totalMembers, totalBorrowings,totaldownloaded } = LibraryStats.getSummary();
    const availableBooks = LibraryStats.getAvailableBooks();

    document.getElementById('total-members-id').textContent      = totalMembers;
    document.getElementById('books-borrowed').textContent        = totalBorrowings;
    document.getElementById('books-downloaded').textContent      = totaldownloaded;
    document.getElementById('total-physical-id').textContent     = totalPhysicalBooks;
    document.getElementById('total-digital-id').textContent      = totalDigitalBooks;
    document.getElementById('total-available-id').textContent    = availableBooks.length;

    const { borrowed, downloaded } = LibraryStats.getMostPopularBook();
    const popularContainer         = document.getElementById('popular-book');

    const renderBookList = (bookList, label, countLabel) => {
        if (bookList.length === 0) return '';

        const items = bookList.map(book => `
            <div class="member-detail-book">
                <span>${book.title}</span>
                <span class="meta">${book.author} · ${book.checkedOut.length} ${countLabel}</span>
            </div>
        `).join('');

        return `
            <p class="category-label">${label}</p>
            <ul class="member-detail-list">${items}</ul>
        `;
    };

    if (borrowed.length > 0 || downloaded.length > 0) {
        popularContainer.innerHTML = `
            ${renderBookList(borrowed,   'Most borrowed', 'active checkout(s)')}
            ${renderBookList(downloaded, 'Most downloaded', 'active download(s)')}
        `;
    } else {
        popularContainer.innerHTML = '<p class="empty-state">No books currently checked out or downloaded.</p>';
    }
}

document.addEventListener(
    "DOMContentLoaded",
    async () => {
        initializeUI();
        setupEventListeners();
        await loadFromLocalStorage();
        populateYearDropdown() 
        populateMemberDropdown('borrow-member-id');
        populateMemberDropdown('return-member-id');
        populateBooksDropdown();
        createMemberForm();
        updateStatisticsDisplay();
    }
);


export{
    saveToLocalStorage,initializeUI,loadFromLocalStorage,
    renderBookCatalogue,renderMemberList,handleNavTabs,
    handleSearchBook,handleSearchMember,displayBookDetails,
    renderOverdueList,handleFilterChange,handleFilterMemberType,
    populateYearDropdown,createMemberForm,updateStatisticsDisplay,
    populateReturnBooksDropdown,populateMemberDropdown,populateBooksDropdown,
    handleAddBookSubmit,handleAddMemberSubmit,showMessage,exportLibraryData
}