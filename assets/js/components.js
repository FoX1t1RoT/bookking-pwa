// BookKing Components Module
class BookKingComponents {
    constructor(storage) {
        this.storage = storage;
        this.currentTab = 'read';
        this.currentTrackTab = 'goals';
        this.currentStatsPeriod = 'week';
        this.selectedDate = new Date();
        this.isTimerRunning = false;
        this.timerInterval = null;
        this.sessionStartTime = null;
        this.currentView = 'main'; // 'main', 'bookDetails', 'reading', 'newSession', or 'addBook'
        this.currentBookId = null;
        this.readingStartTime = null;
        this.readingTimer = null;
        this.readingElapsed = 0;
        this.sessionData = null;
        this.timerVisibilityHandler = null; // For background/foreground timer handling
        this.showingArchive = false; // Track whether we're showing archive or active books
        this.currentBookCover = null; // Store selected book cover
        this.init();
    }

    init() {
        this.bindEvents();
        this.restoreTimerIfActive();
        this.loadCurrentScreen();
    }
    
    restoreTimerIfActive() {
        // Check if timer was active when app was closed
        const timerActive = localStorage.getItem('bookking_timer_active');
        const timerStartTime = localStorage.getItem('bookking_timer_start');
        const savedElapsed = localStorage.getItem('bookking_timer_elapsed');
        
        if (timerActive === 'true' && timerStartTime) {
            // Restore timer state
            this.readingStartTime = new Date(parseInt(timerStartTime));
            
            // Restore elapsed time if available (for paused timers)
            if (savedElapsed) {
                this.readingElapsed = parseInt(savedElapsed);
                console.log('Restored paused timer with elapsed time:', this.readingElapsed, 'seconds');
            } else {
                // Calculate elapsed time for running timer
                this.updateTimerFromStartTime();
            }
            
            // Don't start the interval yet - wait for user to navigate to reading screen
            // But bind the visibility handler for when they do
            this.bindTimerVisibilityHandler();
            
            console.log('Timer state restored from localStorage - elapsed:', this.readingElapsed, 'seconds');
        }
    }
    
    saveScreenState() {
        // Save current screen state for recovery after background/foreground
        const screenState = {
            currentView: this.currentView,
            currentBookId: this.currentBookId,
            currentTab: this.currentTab,
            showingArchive: this.showingArchive,
            timestamp: Date.now()
        };
        
        localStorage.setItem('bookking_screen_state', JSON.stringify(screenState));
        console.log('Screen state saved:', screenState);
    }
    
    restoreScreenState() {
        const savedState = localStorage.getItem('bookking_screen_state');
        if (!savedState) return false;
        
        try {
            const screenState = JSON.parse(savedState);
            
            // Only restore if state is recent (within last 5 minutes)
            const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
            if (screenState.timestamp < fiveMinutesAgo) {
                localStorage.removeItem('bookking_screen_state');
                return false;
            }
            
            // Restore state
            this.currentView = screenState.currentView;
            this.currentBookId = screenState.currentBookId;
            this.currentTab = screenState.currentTab;
            this.showingArchive = screenState.showingArchive;
            
            console.log('Screen state restored:', screenState);
            return true;
        } catch (error) {
            console.error('Failed to restore screen state:', error);
            localStorage.removeItem('bookking_screen_state');
            return false;
        }
    }
    
    clearScreenState() {
        localStorage.removeItem('bookking_screen_state');
    }

    bindEvents() {
        // Tab navigation
        document.querySelectorAll('.tab-item').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = e.currentTarget.getAttribute('data-tab');
                this.switchTab(tabName);
            });
        });

        // Modal events
        this.bindModalEvents();
        
        // Form validation
        this.bindFormValidation();
    }

    bindModalEvents() {
        // Archive modal
        const closeArchive = document.getElementById('closeArchive');
        if (closeArchive) {
            closeArchive.addEventListener('click', () => this.hideModal('archiveModal'));
        }

        // Close modal on overlay click
        document.querySelectorAll('.modal-overlay').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideModal(modal.id);
                }
            });
        });
    }

    bindFormValidation() {
        const form = document.getElementById('addBookForm');
        if (form) {
            const inputs = form.querySelectorAll('input[required]');
            const addButton = document.getElementById('confirmAddBook');

            inputs.forEach(input => {
                input.addEventListener('input', () => {
                    this.validateAddBookForm();
                });
            });
        }
    }

    validateAddBookForm() {
        const title = document.getElementById('bookTitle')?.value.trim();
        const author = document.getElementById('bookAuthor')?.value.trim();
        const firstPage = document.getElementById('firstPage')?.value;
        const lastPage = document.getElementById('lastPage')?.value;
        const addButton = document.getElementById('confirmAddBook');

        const isValid = title && author && firstPage && lastPage && 
                       parseInt(lastPage) > parseInt(firstPage);

        if (addButton) {
            addButton.disabled = !isValid;
        }
    }

    // Tab switching
    switchTab(tabName) {
        // Update active tab
        document.querySelectorAll('.tab-item').forEach(tab => {
            tab.classList.remove('active');
            if (tab.getAttribute('data-tab') === tabName) {
                tab.classList.add('active');
            }
        });

        // Reset view state when switching to read tab
        if (tabName === 'read') {
            this.currentView = 'main';
            this.currentBookId = null;
            this.showingArchive = false; // Reset to show active books
            
            // Force restore add button after a delay to ensure it's visible
            setTimeout(() => {
                const addButton = document.querySelector('.add-button');
                if (addButton) {
                    addButton.style.display = 'flex';
                    addButton.onclick = () => this.showAddBookScreen();
                }
            }, 100);
        }

        this.currentTab = tabName;
        this.loadCurrentScreen();
    }

    loadCurrentScreen() {
        switch (this.currentTab) {
            case 'read':
                if (this.currentView === 'addBook') {
                    this.renderAddBookScreen();
                } else {
                    this.loadReadScreen();
                }
                break;
            case 'track':
                this.loadTrackScreen();
                break;
            case 'plan':
                this.loadPlanScreen();
                break;
            case 'settings':
                this.loadSettingsScreen();
                break;
        }
    }

    // Read Screen
    loadReadScreen() {
        this.updateHeader('Read', true, false, false, false, null, true); // Show archive button
        this.renderReadScreen();
        
        // Ensure add button is visible and working after rendering
        setTimeout(() => {
            const addButton = document.querySelector('.add-button');
            if (addButton) {
                addButton.style.display = 'flex';
                // Re-bind click event to be sure
                addButton.onclick = () => this.showAddBookScreen();
            }
        }, 50);
    }

    renderReadScreen() {
        const container = document.querySelector('.main-content');
        if (!container) {
            console.error('Main content container not found');
            return;
        }

        container.innerHTML = `
            <!-- Read Title (when archive button is shown) -->
            <h2 class="read-title">Read</h2>
            
            <!-- Search Bar Component -->
            <div class="search-container">
                <input type="text" class="search-input" placeholder="Search books or authors" id="searchInput">
                <span class="search-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="11" cy="11" r="8" stroke="currentColor" stroke-width="2"/>
                        <path d="m21 21-4.35-4.35" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                </span>
            </div>

            <!-- Books List Component -->
            <div class="books-container" id="booksContainer">
                ${this.renderBooksContent()}
            </div>
        `;

        this.bindSearchFunctionality();
        
        // Bind book card events if there are books
        const books = this.getCurrentBooks();
        if (books.length > 0) {
            setTimeout(() => this.bindBookCardEvents(), 50);
        }

    }

    renderBooksContent() {
        const books = this.getCurrentBooks();
        return books.map(book => this.createBookCard(book)).join('');
    }



    getCurrentBooks() {
        const allBooks = this.storage.getBooks(); // Получаем ВСЕ книги без фильтра
        if (this.showingArchive) {
            // Архив: показываем только архивированные книги
            return allBooks.filter(book => book.status === 'archived');
        } else {
            // Активные книги: показываем все книги кроме архивированных (включая завершённые)
            return allBooks.filter(book => book.status !== 'archived');
        }
    }

    toggleArchiveView() {
        this.currentView = 'archive';
        this.renderArchiveScreen();
    }

    updateHeader(title, showAdd = false, showBack = false, showCancel = false, showSave = false, addCallback = null, showArchive = false, showCancelAdd = false) {
        const headerTitle = document.querySelector('.header-title');
        const addButton = document.querySelector('.add-button');
        const headerLeft = document.querySelector('.header-left');
        const headerRight = document.querySelector('.header-right');

        // На вкладке Read с кнопкой архива - убираем заголовок из header-center
        if (showArchive && this.currentTab === 'read') {
            if (headerTitle) headerTitle.textContent = '';
        } else {
        if (headerTitle) headerTitle.textContent = title;
            if (headerTitle) {
                if (title === 'Book Info' || title === 'Add New Book' || title === 'Reading Sessions' || title === 'New Session') {
                    headerTitle.classList.add('centered');
                } else {
                    headerTitle.classList.remove('centered');
                }
                
                // Add special class for Settings header
                if (title === 'Settings') {
                    headerTitle.classList.add('settings-header');
                } else {
                    headerTitle.classList.remove('settings-header');
                }
                
                // Add special class for Add New Book header
                if (title === 'Add New Book') {
                    headerTitle.classList.add('add-book-header');
                } else {
                    headerTitle.classList.remove('add-book-header');
                }
                
                // Add special class for Book Info header
                if (title === 'Book Info') {
                    headerTitle.classList.add('book-info-header');
                } else {
                    headerTitle.classList.remove('book-info-header');
                }
                
                // Add special class for Reading Sessions header
                if (title === 'Reading Sessions') {
                    headerTitle.classList.add('reading-sessions-header');
                } else {
                    headerTitle.classList.remove('reading-sessions-header');
                }
                
                // Add special class for New Session header
                if (title === 'New Session') {
                    headerTitle.classList.add('new-session-header');
                } else {
                    headerTitle.classList.remove('new-session-header');
                }
            }
        }
        
        // Handle back button
        if (showBack) {
            let backText = 'Book Info';
            if (title === '') backText = 'Read';
            if (title === 'Book Info') backText = 'Read';
            headerLeft.innerHTML = `
                <button class="back-button" id="backButton">
                    <span class="back-icon"><</span>
                    <span class="back-text">${backText}</span>
                </button>
            `;
        } else if (showCancel) {
            headerLeft.innerHTML = `
                <button class="back-button" id="backButton">
                    <span class="back-icon"><</span>
                    <span class="back-text">Book Info</span>
                </button>
                <button class="cancel-button" id="cancelReading">Cancel</button>
            `;
        } else if (showSave) {
            headerLeft.innerHTML = `
                <button class="back-button" id="backButton">
                    <span class="back-icon"><</span>
                    <span class="back-text">Back</span>
                </button>
            `;
        } else if (showCancelAdd) {
            headerLeft.innerHTML = `
                <button class="modal-cancel" id="cancelAddBook">Cancel</button>
            `;
        } else if (showArchive) {
            headerLeft.innerHTML = `
                <button class="archive-toggle-button ${this.showingArchive ? 'active' : ''}" id="toggleArchive">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <!-- Коробка с крышкой -->
                        <rect x="4" y="8" width="16" height="12" rx="1" stroke="currentColor" stroke-width="2" fill="none"/>
                        <rect x="6" y="6" width="12" height="4" rx="1" stroke="currentColor" stroke-width="2" fill="none"/>
                        <path d="M6 6L4 8" stroke="currentColor" stroke-width="2"/>
                        <path d="M18 6L20 8" stroke="currentColor" stroke-width="2"/>
                        <path d="M9 12h6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        <path d="M9 15h6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                </button>
            `;
            
            // Bind archive toggle event
            const toggleButton = document.getElementById('toggleArchive');
            if (toggleButton) {
                toggleButton.addEventListener('click', () => this.toggleArchiveView());
            }
        } else {
            headerLeft.innerHTML = '';
        }

        // Handle right header buttons (save vs add vs confirm)
        if (showSave) {
            // Show save button
            headerRight.innerHTML = `
                <button class="save-button-header" id="saveSession">Save</button>
            `;
        } else if (showCancelAdd) {
            // Show add confirmation button
            headerRight.innerHTML = `
                <button class="modal-add" id="confirmAddBook" disabled>Add</button>
            `;
        } else if (showAdd) {
            // Show add button
            headerRight.innerHTML = `
                <button class="add-button" id="addBookBtn">
                    <span class="plus-icon">+</span>
                </button>
            `;
            // Bind click event to add button
            const newAddButton = document.getElementById('addBookBtn');
            if (newAddButton) {
                if (addCallback) {
                    newAddButton.onclick = addCallback;
                } else {
                    newAddButton.onclick = () => this.showAddBookScreen();
                }
            }
        } else {
            // Clear header right when showing neither
            headerRight.innerHTML = '';
        }
    }

    renderBooksList() {
        const container = document.getElementById('booksContainer');
        if (!container) return;

        const books = this.getCurrentBooks();
        container.innerHTML = books.map(book => this.createBookCard(book)).join('');
        this.bindBookCardEvents();
    }

    createBookCard(book) {
        // Calculate progress: 0% when on first page, 100% when on last page
        const progress = book.lastPage > book.firstPage 
            ? Math.round((book.currentPage - book.firstPage) / (book.lastPage - book.firstPage) * 100)
            : 0;
        
        // Check if book has a custom cover
        const coverContent = book.cover 
            ? `<img src="${book.cover}" alt="${book.title}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px;">`
            : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" stroke="currentColor" stroke-width="2"/>
                    <circle cx="12" cy="13" r="4" stroke="currentColor" stroke-width="2"/>
               </svg>`;
        
        return `
            <div class="book-card" data-book-id="${book.id}">
                <div class="book-cover">
                    ${coverContent}
                </div>
                <div class="book-info">
                    <div class="book-title">${book.title}</div>
                    <div class="book-author">${book.author}</div>
                    <div class="book-progress">${progress}% complete • Page ${book.currentPage} of ${book.lastPage}</div>
                </div>
            </div>
        `;
    }

    bindBookCardEvents() {
        document.querySelectorAll('.book-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const bookId = e.currentTarget.getAttribute('data-book-id');
                this.showBookDetails(bookId);
            });
        });
    }

    showBookDetails(bookId) {
        const book = this.storage.getBooks().find(b => b.id === bookId);
        if (!book) return;

        this.currentView = 'bookDetails';
        this.currentBookId = bookId;
        this.renderBookDetailsScreen(book);
    }

    renderBookDetailsScreen(book) {
        this.updateHeader('Book Info', false, true); // Show back button
        
        const container = document.querySelector('.main-content');
        if (!container) return;

        // Calculate progress: 0% when on first page, 100% when on last page
        const progress = book.lastPage > book.firstPage 
            ? Math.round((book.currentPage - book.firstPage) / (book.lastPage - book.firstPage) * 100)
            : 0;
        const sessions = this.storage.getSessions(book.id);
        const totalTimeSeconds = sessions.reduce((sum, session) => {
            // Use saved duration if available, otherwise calculate from timestamps
            if (session.duration !== undefined && session.duration > 0) {
                return sum + session.duration;
            } else if (session.startTime && session.endTime) {
                const duration = Math.floor((new Date(session.endTime) - new Date(session.startTime)) / 1000);
                return sum + duration;
            } else {
                return sum;
            }
        }, 0);
        
        const totalTimeMinutes = totalTimeSeconds / 60; // Convert to minutes for formatTimeDisplay
        
        // Determine if book is finished
        const isFinished = book.status === 'finished' || progress >= 100;
        const isArchived = book.status === 'archived';

        // Determine button to show based on status and current view
        let actionButton = '';
        if (isArchived && this.showingArchive) {
            // In archive view and book is archived - show Unarchive button
            actionButton = '<button class="unarchive-button" id="unarchiveBook">Unarchive</button>';
        } else if (isFinished && !isArchived) {
            // Book is finished but not archived - show Archive button
            actionButton = '<button class="archive-button" id="archiveBook">Archive</button>';
        } else if (!isFinished && !isArchived) {
            // Book is not finished - show Read button
            actionButton = '<button class="read-button" id="readBook">Read</button>';
        }

        container.innerHTML = `
            <div class="book-details-container">
                <!-- Book Info Card -->
                <div class="book-info-card">
                    <div class="book-cover-large">
                        ${book.cover 
                            ? `<img src="${book.cover}" alt="${book.title}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 10px;">`
                            : `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" stroke="currentColor" stroke-width="2"/>
                                <circle cx="12" cy="13" r="4" stroke="currentColor" stroke-width="2"/>
                               </svg>`
                        }
                    </div>
                    <div class="book-details">
                        <div class="book-title-large">${book.title}</div>
                        <div class="book-author-large">${book.author}</div>
                        <div class="book-pages">${book.totalPages} pages</div>
                    </div>
                    ${actionButton}
                </div>

                <!-- Reading Progress -->
                <div class="reading-stats-card">
                    <div class="stat-item">
                        <span class="stat-label">First Page to Read</span>
                        <span class="stat-value">${book.firstPage}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Last Page to Read</span>
                        <span class="stat-value">${book.lastPage}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Next page</span>
                        <span class="stat-value">${book.currentPage}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Time read</span>
                        <span class="stat-value">${this.formatTimeDisplay(totalTimeMinutes)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Progress</span>
                        <span class="stat-value">${progress}%</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Time/Page</span>
                        <span class="stat-value">${sessions.length > 0 && book.currentPage > book.firstPage ? this.formatTimeDisplay(totalTimeMinutes / (book.currentPage - book.firstPage)) : '0 min 0 sec'}</span>
                    </div>
                </div>

                <!-- Reading Sessions -->
                <div class="sessions-card" id="sessionsCard">
                    <span class="sessions-label">Reading sessions</span>
                    <span class="sessions-arrow">></span>
                </div>
            </div>
        `;

        this.bindBookDetailsEvents();
    }

    bindBookDetailsEvents() {
        // Back button
        const backButton = document.getElementById('backButton');
        if (backButton) {
            backButton.addEventListener('click', () => this.goBackToRead());
        }

        // Read button
        const readButton = document.getElementById('readBook');
        if (readButton) {
            readButton.addEventListener('click', () => this.startReading());
        }

        // Archive button
        const archiveButton = document.getElementById('archiveBook');
        if (archiveButton) {
            archiveButton.addEventListener('click', () => this.archiveBook());
        }

        // Unarchive button
        const unarchiveButton = document.getElementById('unarchiveBook');
        if (unarchiveButton) {
            unarchiveButton.addEventListener('click', () => this.unarchiveBook());
        }

        // Sessions card
        const sessionsCard = document.getElementById('sessionsCard');
        if (sessionsCard) {
            sessionsCard.addEventListener('click', () => this.showReadingSessions());
        }
    }

    goBackToRead() {
        this.currentView = 'main';
        this.currentBookId = null;
        
        // Reset to showing active books when going back
        this.showingArchive = false;
        
        this.loadReadScreen(); // Ensure proper header setup
        
        // Additional safeguard to ensure add button is visible
        setTimeout(() => {
            const addButton = document.querySelector('.add-button');
            if (addButton) {
                addButton.style.display = 'flex';
                addButton.onclick = () => this.showAddBookScreen();
            }
        }, 150);
    }

    archiveBook() {
        const book = this.storage.getBooks().find(b => b.id === this.currentBookId);
        if (!book) return;

        // Calculate progress to determine if book is finished
        const progress = book.lastPage > book.firstPage 
            ? Math.round((book.currentPage - book.firstPage) / (book.lastPage - book.firstPage) * 100)
            : 0;
        const isFinished = progress >= 100;
        
        // Prepare update data
        const updateData = { status: 'archived' };
        
        // Set dateFinished when book is completed (if not already set)
        if (isFinished && !book.dateFinished) {
            updateData.dateFinished = new Date().toISOString();
        }

        // Update book status to archived
        this.storage.updateBook(this.currentBookId, updateData);

        // Show success message
        this.showToast('Book archived successfully!', 'success');

        // Go back to read screen
        this.goBackToRead();
    }

    unarchiveBook() {
        const book = this.storage.getBooks().find(b => b.id === this.currentBookId);
        if (!book) return;

        // Determine the new status based on book completion
        const progress = book.lastPage > book.firstPage 
            ? Math.round((book.currentPage - book.firstPage) / (book.lastPage - book.firstPage) * 100)
            : 0;
        const isFinished = progress >= 100;
        
        const updateData = { status: isFinished ? 'finished' : 'reading' };
        
        // Set dateFinished when book is completed (if not already set)
        if (isFinished && !book.dateFinished) {
            updateData.dateFinished = new Date().toISOString();
        }

        // Update book status
        this.storage.updateBook(this.currentBookId, updateData);

        // Show success message
        this.showToast('Book unarchived successfully!', 'success');

        // Return to archive view (book will disappear from archive list)
        this.currentView = 'main';
        this.currentBookId = null;
        this.showingArchive = true; // Keep showing archive
        this.loadReadScreen();
    }

    startReading() {
        const book = this.storage.getBooks().find(b => b.id === this.currentBookId);
        if (!book) return;

        this.currentView = 'reading';
        this.renderReadingScreen(book);
        
        // Check if we're restoring an active timer
        const timerActive = localStorage.getItem('bookking_timer_active');
        if (timerActive === 'true' && this.readingStartTime) {
            // Resume existing timer with live updates
            this.startTimerInterval();
            console.log('Resumed active timer with', this.readingElapsed, 'seconds elapsed');
        } else {
            // Start new timer
            this.startReadingTimer();
        }
    }

    renderReadingScreen(book) {
        this.updateHeader('', false, false, true); // Show cancel button
        
        // Save current screen state for background/foreground recovery
        this.saveScreenState();
        
        const container = document.querySelector('.main-content');
        if (!container) return;

        container.innerHTML = `
            <div class="reading-screen">
                <div class="reading-timer">
                    <div class="timer-display" id="timerDisplay">00:00:00</div>
                </div>
                
                <div class="reading-book-info">
                    <div class="reading-book-title">${book.title}</div>
                    <div class="reading-book-author">${book.author}</div>
                </div>
                
                <div class="reading-page-info">
                    <span class="reading-page-label">Reading from Page</span>
                    <span class="reading-page-number">${book.currentPage}</span>
                </div>
                
                <div class="reading-controls">
                    <button class="reading-button done-button" id="doneReading">Done</button>
                    <button class="reading-button pause-button" id="pauseReading">Pause</button>
                </div>
            </div>
        `;

        this.bindReadingEvents();
    }

    startReadingTimer() {
        this.readingStartTime = new Date();
        this.readingElapsed = 0;
        
        // Save timer state to localStorage for persistence
        localStorage.setItem('bookking_timer_start', this.readingStartTime.getTime());
        localStorage.setItem('bookking_timer_active', 'true');
        
        this.startTimerInterval();
        
        // Add visibility change handler for this timer session
        this.bindTimerVisibilityHandler();
    }
    
    startTimerInterval() {
        if (this.readingTimer) {
            clearInterval(this.readingTimer);
        }
        
        this.readingTimer = setInterval(() => {
            this.updateTimerFromStartTime();
        }, 1000);
        
        // Update immediately
        this.updateTimerFromStartTime();
    }
    
    updateTimerFromStartTime() {
        if (!this.readingStartTime) return;
        
        // Always calculate from start time - works even after background
        this.readingElapsed = Math.floor((new Date() - this.readingStartTime) / 1000);
        this.updateTimerDisplay();
    }
    
    bindTimerVisibilityHandler() {
        // Remove existing handler if any
        if (this.timerVisibilityHandler) {
            document.removeEventListener('visibilitychange', this.timerVisibilityHandler);
        }
        
        this.timerVisibilityHandler = () => {
            if (!document.hidden && this.readingStartTime) {
                // App became visible - recalculate time and resume updates
                this.updateTimerFromStartTime();
                
                // Restart interval if timer is active
                if (localStorage.getItem('bookking_timer_active') === 'true') {
                    this.startTimerInterval();
                }
                
                console.log('Timer resumed from background - elapsed:', this.readingElapsed, 'seconds');
            }
        };
        
        document.addEventListener('visibilitychange', this.timerVisibilityHandler);
    }

    updateTimerDisplay() {
        const hours = Math.floor(this.readingElapsed / 3600);
        const minutes = Math.floor((this.readingElapsed % 3600) / 60);
        const seconds = this.readingElapsed % 60;
        
        const display = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        const timerElement = document.getElementById('timerDisplay');
        if (timerElement) {
            timerElement.textContent = display;
        }
    }

    bindReadingEvents() {
        // Back button
        const backButton = document.getElementById('backButton');
        if (backButton) {
            backButton.addEventListener('click', () => this.cancelReading());
        }

        // Cancel button
        const cancelButton = document.getElementById('cancelReading');
        if (cancelButton) {
            cancelButton.addEventListener('click', () => this.cancelReading());
        }

        // Done button
        const doneButton = document.getElementById('doneReading');
        if (doneButton) {
            doneButton.addEventListener('click', () => this.finishReading());
        }

        // Pause button
        const pauseButton = document.getElementById('pauseReading');
        if (pauseButton) {
            pauseButton.addEventListener('click', () => this.pauseReading());
        }
    }

    cancelReading() {
        this.stopReadingTimer();
        this.currentView = 'bookDetails';
        const book = this.storage.getBooks().find(b => b.id === this.currentBookId);
        if (book) {
            this.renderBookDetailsScreen(book);
        }
    }

    finishReading() {
        this.stopReadingTimer();
        
        // Prepare session data
        const finishTime = new Date();
        this.sessionData = {
            startTime: this.readingStartTime,
            finishTime: finishTime,
            duration: this.readingElapsed
        };
        
        this.currentView = 'newSession';
        this.renderNewSessionScreen();
    }

    renderNewSessionScreen() {
        this.updateHeader('New Session', false, false, false, true); // Show back and save
        
        const container = document.querySelector('.main-content');
        if (!container) return;

        const book = this.storage.getBooks().find(b => b.id === this.currentBookId);
        if (!book) return;

        // Format dates
        const startTime = this.formatSessionTime(this.sessionData.startTime);
        const finishTime = this.formatSessionTime(this.sessionData.finishTime);
        const duration = this.formatSessionDuration(this.sessionData.duration);

        container.innerHTML = `
            <div class="new-session-screen">
                <!-- Session Times -->
                <div class="session-times-card">
                    <div class="session-time-item">
                        <span class="session-time-label">Start</span>
                        <span class="session-time-value">${startTime}</span>
                    </div>
                    <div class="session-time-item">
                        <span class="session-time-label">Finish</span>
                        <span class="session-time-value">${finishTime}</span>
                    </div>
                </div>

                <!-- Pages Read -->
                <div class="session-pages-card">
                    <div class="session-input-item">
                        <span class="session-input-label">First Page Read</span>
                        <span class="session-input-value">${book.currentPage}</span>
                    </div>
                    <div class="session-input-item">
                        <span class="session-input-label">Last Page Read</span>
                        <input type="number" class="session-input-field" id="lastPageRead" 
                               value="${book.currentPage}" min="${book.currentPage}" max="${book.lastPage}">
                    </div>
                </div>

                <!-- Duration -->
                <div class="session-duration-card">
                    <div class="session-duration-item">
                        <span class="session-duration-label">Duration</span>
                        <span class="session-duration-value">${duration}</span>
                    </div>
                </div>
            </div>
        `;

        this.bindNewSessionEvents();
    }

    formatSessionTime(date) {
        const day = date.getDate();
        const month = date.toLocaleDateString('en', { month: 'short' });
        const year = date.getFullYear();
        const time = date.toLocaleTimeString('en', { 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit',
            hour12: false 
        });
        
        return `${day} ${month} ${year} at ${time}`;
    }

    formatSessionDuration(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        
        if (minutes > 0) {
            return `${minutes} min ${remainingSeconds} sec`;
        } else {
            return `${remainingSeconds} sec`;
        }
    }

    bindNewSessionEvents() {
        // Back button
        const backButton = document.getElementById('backButton');
        if (backButton) {
            backButton.addEventListener('click', () => this.goBackToReading());
        }

        // Save button
        const saveButton = document.getElementById('saveSession');
        if (saveButton) {
            saveButton.addEventListener('click', () => this.saveReadingSession());
        }
    }

    goBackToReading() {
        // Go back to reading screen and resume timer
        this.currentView = 'reading';
        const book = this.storage.getBooks().find(b => b.id === this.currentBookId);
        if (book) {
            this.renderReadingScreen(book);
            this.resumeReading();
        }
    }

    saveReadingSession() {
        const lastPageInput = document.getElementById('lastPageRead');
        const lastPageRead = parseInt(lastPageInput.value);
        const book = this.storage.getBooks().find(b => b.id === this.currentBookId);
        
        if (!book || lastPageRead < book.currentPage) {
            this.showToast('Please enter a valid page number', 'error');
            return;
        }

        if (lastPageRead > book.lastPage) {
            this.showToast(`Cannot read beyond page ${book.lastPage}`, 'error');
            return;
        }

        // Create session record
        const startPage = book.currentPage;
        const endPage = lastPageRead;
        const pagesRead = endPage - startPage + 1;
        
        const session = {
            bookId: this.currentBookId,
            startTime: this.sessionData.startTime.toISOString(),
            endTime: this.sessionData.finishTime.toISOString(),
            duration: this.sessionData.duration, // Save duration in seconds
            startPage: startPage,
            endPage: endPage,
            pagesRead: pagesRead,
            readingSpeed: this.sessionData.duration > 0 ? Math.round(pagesRead / (this.sessionData.duration / 60)) : 0, // pages per minute
            notes: ''
        };

        // Save session
        this.storage.addSession(session);

        // Update book progress - next page to read is lastPageRead + 1
        const nextPage = lastPageRead >= book.lastPage ? book.lastPage : lastPageRead + 1;
        const isFinished = lastPageRead >= book.lastPage;
        
        const updateData = {
            currentPage: nextPage,
            dateStarted: book.dateStarted || new Date().toISOString(),
            status: isFinished ? 'finished' : 'reading'
        };
        
        // Set dateFinished when book is completed
        if (isFinished) {
            updateData.dateFinished = new Date().toISOString();
        }
        
        this.storage.updateBook(this.currentBookId, updateData);

        // Show appropriate success message
        if (lastPageRead >= book.lastPage) {
            this.showToast('Congratulations! You finished the book! 🎉');
        } else {
        this.showToast('Session saved successfully!');
        }
        
        // Go back to book details
        this.currentView = 'bookDetails';
        const updatedBook = this.storage.getBooks().find(b => b.id === this.currentBookId);
        if (updatedBook) {
            this.renderBookDetailsScreen(updatedBook);
        }
    }

    pauseReading() {
        if (this.readingTimer) {
            // Pause timer but keep state for resuming
            this.pauseReadingTimer();
            const pauseButton = document.getElementById('pauseReading');
            if (pauseButton) {
                pauseButton.textContent = 'Resume';
                pauseButton.classList.remove('pause-button');
                pauseButton.classList.add('resume-button');
                pauseButton.onclick = () => this.resumeReading();
            }
        }
    }
    
    pauseReadingTimer() {
        // Stop the interval but keep timer state
        if (this.readingTimer) {
            clearInterval(this.readingTimer);
            this.readingTimer = null;
        }
        
        // Update elapsed time one last time and save it
        if (this.readingStartTime) {
            this.readingElapsed = Math.floor((new Date() - this.readingStartTime) / 1000);
            // Save elapsed time to localStorage for persistence
            localStorage.setItem('bookking_timer_elapsed', this.readingElapsed.toString());
        }
        
        console.log('Timer paused at', this.readingElapsed, 'seconds');
    }

    resumeReading() {
        console.log('Resuming timer - current elapsed:', this.readingElapsed, 'seconds');
        
        // Restore elapsed time from localStorage if needed
        const savedElapsed = localStorage.getItem('bookking_timer_elapsed');
        if (savedElapsed && !this.readingElapsed) {
            this.readingElapsed = parseInt(savedElapsed);
            console.log('Restored elapsed time from localStorage:', this.readingElapsed, 'seconds');
        }
        
        // Calculate new start time by subtracting elapsed time from now
        this.readingStartTime = new Date(Date.now() - (this.readingElapsed * 1000));
        
        console.log('Calculated new start time:', this.readingStartTime);
        console.log('Should show elapsed time:', this.readingElapsed, 'seconds from start time');
        
        // Update localStorage with new start time
        localStorage.setItem('bookking_timer_start', this.readingStartTime.getTime());
        localStorage.setItem('bookking_timer_active', 'true');
        
        // Use our improved timer interval method
        this.startTimerInterval();
        
        // Ensure visibility handler is bound
        this.bindTimerVisibilityHandler();
        
        // Update display immediately
        this.updateTimerFromStartTime();
        
        const pauseButton = document.getElementById('pauseReading');
        if (pauseButton) {
            pauseButton.textContent = 'Pause';
            pauseButton.classList.remove('resume-button');
            pauseButton.classList.add('pause-button');
            pauseButton.onclick = () => this.pauseReading();
        }
        
        console.log('Timer resumed successfully');
    }

    stopReadingTimer() {
        if (this.readingTimer) {
            clearInterval(this.readingTimer);
            this.readingTimer = null;
        }
        
        // Clear timer state from localStorage
        localStorage.removeItem('bookking_timer_start');
        localStorage.removeItem('bookking_timer_active');
        localStorage.removeItem('bookking_timer_elapsed');
        
        // Clear screen state since reading session is ending
        this.clearScreenState();
        
        // Remove visibility change handler
        if (this.timerVisibilityHandler) {
            document.removeEventListener('visibilitychange', this.timerVisibilityHandler);
            this.timerVisibilityHandler = null;
        }
        
        console.log('Timer stopped and state cleared');
    }

    showReadingSessions() {
        if (!this.currentBookId) return;
        
        this.currentView = 'readingSessions';
        this.renderReadingSessionsScreen();
    }

    renderReadingSessionsScreen() {
        const book = this.storage.getBooks().find(b => b.id === this.currentBookId);
        const sessions = this.storage.getSessions(this.currentBookId);
        
        if (!book) return;
        
        this.updateHeader('Reading Sessions', true, true, false, false, () => this.showAddSessionForm()); // Show add and back button with custom add handler
        
        const container = document.querySelector('.main-content');
        if (!container) return;

        if (sessions.length === 0) {
            container.innerHTML = `
                <div class="sessions-screen-simple">
                    <div class="empty-state">
                        <p class="empty-message">No reading sessions yet</p>
                        <p class="empty-subtitle">Start reading to track your sessions</p>
                    </div>
                </div>
            `;
        } else {
            container.innerHTML = `
                <div class="sessions-screen-simple">
                    <div class="sessions-list-simple">
                        ${sessions.map(session => this.createSimpleSessionCard(session)).join('')}
                    </div>
                </div>
            `;
        }
        
        this.bindReadingSessionsEvents();
    }

    createSessionCard(session) {
        const startTime = new Date(session.startTime);
        const endTime = new Date(session.endTime);
        const duration = session.duration || 0;
        
        const date = startTime.toLocaleDateString('en', { 
            weekday: 'short', 
            month: 'short', 
            day: 'numeric' 
        });
        
        const timeRange = `${startTime.toLocaleTimeString('en', { 
            hour: '2-digit', 
            minute: '2-digit' 
        })} - ${endTime.toLocaleTimeString('en', { 
            hour: '2-digit', 
            minute: '2-digit' 
        })}`;
        
        const readingSpeed = session.pagesRead > 0 && duration > 0 
            ? `${Math.round((session.pagesRead / (duration / 60)) * 10) / 10} pages/min`
            : '';

        return `
            <div class="session-card">
                <div class="session-date">${date}</div>
                <div class="session-time">${timeRange}</div>
                <div class="session-stats">
                    <div class="session-stat-item">
                        <span class="session-stat-label">Pages</span>
                        <span class="session-stat-value">${session.pagesRead}</span>
                    </div>
                    <div class="session-stat-item">
                        <span class="session-stat-label">Duration</span>
                        <span class="session-stat-value">${this.formatTimeDisplay(duration / 60)}</span>
                    </div>
                    ${readingSpeed ? `
                        <div class="session-stat-item">
                            <span class="session-stat-label">Speed</span>
                            <span class="session-stat-value">${readingSpeed}</span>
                        </div>
                    ` : ''}
                </div>
                ${session.notes ? `
                    <div class="session-notes">${session.notes}</div>
                ` : ''}
            </div>
        `;
    }

    createSimpleSessionCard(session) {
        const startTime = new Date(session.startTime);
        const duration = session.duration || 0;
        
        // Format: "1 Jul 2025 at 17:17:54"
        const dateTime = startTime.toLocaleDateString('en', { 
            day: 'numeric', 
            month: 'short', 
            year: 'numeric' 
        }) + ' at ' + startTime.toLocaleTimeString('en', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });
        
        // Use saved page range or calculate as fallback
        let startPage, endPage;
        if (session.startPage && session.endPage) {
            startPage = session.startPage;
            endPage = session.endPage;
        } else {
            // Fallback for old sessions without page range
            startPage = 1;
            endPage = session.pagesRead || 1;
        }
        
        return `
            <div class="session-card-simple">
                <div class="session-datetime">${dateTime}</div>
                <div class="session-pages">Pages: ${startPage} - ${endPage}</div>
                <div class="session-duration">Duration: ${this.formatTimeDisplay(duration / 60)}</div>
            </div>
        `;
    }

    bindReadingSessionsEvents() {
        // Back button
        const backButton = document.getElementById('backButton');
        if (backButton) {
            backButton.addEventListener('click', () => this.goBackToBookDetails());
        }
        
        // Add button handler is set in updateHeader with custom callback
        console.log('🔧 Reading Sessions events bound with custom add handler');
    }

    goBackToBookDetails() {
        if (this.currentBookId) {
            this.currentView = 'bookDetails';
            const book = this.storage.getBooks().find(b => b.id === this.currentBookId);
            if (book) {
                this.renderBookDetailsScreen(book);
            }
        }
    }

    showAddSessionForm() {
        if (!this.currentBookId) return;
        
        // No modal handling needed
        
        this.currentView = 'addSession';
        this.renderAddSessionScreen();
    }

    renderAddSessionScreen() {
        const book = this.storage.getBooks().find(b => b.id === this.currentBookId);
        if (!book) return;
        
        this.updateHeader('New Session', false, false, false, true); // Show back and save
        
        const container = document.querySelector('.main-content');
        if (!container) return;

        // Set default times (current time)
        const now = new Date();
        const startTime = new Date(now.getTime() - 5 * 60 * 1000); // 5 minutes ago
        const endTime = now;

        // Format datetime-local values
        const formatDateTime = (date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            return `${year}-${month}-${day}T${hours}:${minutes}`;
        };

        const formatDisplayDateTime = (date) => {
            return date.toLocaleDateString('en', { 
                day: 'numeric', 
                month: 'short', 
                year: 'numeric' 
            }) + ' at ' + date.toLocaleTimeString('en', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            });
        };

        container.innerHTML = `
            <div class="add-session-screen">
                <!-- Session Times -->
                <div class="session-times-card">
                    <div class="session-time-item">
                        <span class="session-time-label">Start</span>
                        <input type="datetime-local" id="startTimeInput" class="session-time-input" 
                               value="${formatDateTime(startTime)}" />
                    </div>
                    <div class="session-time-item">
                        <span class="session-time-label">Finish</span>
                        <input type="datetime-local" id="endTimeInput" class="session-time-input" 
                               value="${formatDateTime(endTime)}" />
                    </div>
                </div>

                <!-- Pages Read -->
                <div class="session-pages-card">
                    <div class="session-input-item">
                        <span class="session-input-label">First Page Read</span>
                        <input type="number" id="firstPageInput" class="session-input-field" 
                               value="${book.currentPage}" min="${book.firstPage}" max="${book.lastPage}" />
                    </div>
                    <div class="session-input-item">
                        <span class="session-input-label">Last Page Read</span>
                        <input type="number" id="lastPageInput" class="session-input-field" 
                               placeholder="Enter page" min="${book.firstPage}" max="${book.lastPage}" />
                    </div>
                </div>

                <!-- Duration (calculated automatically) -->
                <div class="session-duration-card">
                    <div class="session-duration-item">
                        <span class="session-duration-label">Duration</span>
                        <span class="session-duration-value" id="durationDisplay">0 min 5 sec</span>
                    </div>
                </div>
            </div>
        `;

        this.bindAddSessionEvents();
        this.updateDurationDisplay();
    }

    bindAddSessionEvents() {
        // Back button
        const backButton = document.getElementById('backButton');
        if (backButton) {
            backButton.addEventListener('click', () => this.goBackToReadingSessions());
        }

        // Save button
        const saveButton = document.getElementById('saveSession');
        if (saveButton) {
            saveButton.addEventListener('click', () => this.saveManualSession());
        }

        // Update duration when times change
        const startInput = document.getElementById('startTimeInput');
        const endInput = document.getElementById('endTimeInput');
        
        if (startInput) {
            startInput.addEventListener('change', () => this.updateDurationDisplay());
        }
        if (endInput) {
            endInput.addEventListener('change', () => this.updateDurationDisplay());
        }
    }

    updateDurationDisplay() {
        const startInput = document.getElementById('startTimeInput');
        const endInput = document.getElementById('endTimeInput');
        const durationDisplay = document.getElementById('durationDisplay');
        
        if (!startInput || !endInput || !durationDisplay) return;

        const startTime = new Date(startInput.value);
        const endTime = new Date(endInput.value);
        
        if (endTime > startTime) {
            const durationSeconds = Math.floor((endTime - startTime) / 1000);
            const durationMinutes = durationSeconds / 60;
            durationDisplay.textContent = this.formatTimeDisplay(durationMinutes);
        } else {
            durationDisplay.textContent = '0 min 0 sec';
        }
    }

    goBackToReadingSessions() {
        if (this.currentBookId) {
            this.currentView = 'readingSessions';
            this.renderReadingSessionsScreen();
        }
    }

    saveManualSession() {
        const startInput = document.getElementById('startTimeInput');
        const endInput = document.getElementById('endTimeInput');
        const firstPageInput = document.getElementById('firstPageInput');
        const lastPageInput = document.getElementById('lastPageInput');
        
        const startTime = new Date(startInput.value);
        const endTime = new Date(endInput.value);
        const firstPage = parseInt(firstPageInput.value);
        const lastPage = parseInt(lastPageInput.value);
        
        const book = this.storage.getBooks().find(b => b.id === this.currentBookId);
        if (!book) return;

        // Validation
        if (!startTime || !endTime || !firstPage || !lastPage) {
            this.showToast('Please fill all fields', 'error');
            return;
        }

        if (endTime <= startTime) {
            this.showToast('End time must be after start time', 'error');
            return;
        }

        if (firstPage < book.firstPage || lastPage > book.lastPage) {
            this.showToast(`Pages must be between ${book.firstPage} and ${book.lastPage}`, 'error');
            return;
        }

        if (lastPage < firstPage) {
            this.showToast('Last page must be after first page', 'error');
            return;
        }

        // Create session
        const durationSeconds = Math.floor((endTime - startTime) / 1000);
        const pagesRead = lastPage - firstPage + 1;
        
        const session = {
            bookId: this.currentBookId,
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
            duration: durationSeconds,
            startPage: firstPage,
            endPage: lastPage,
            pagesRead: pagesRead,
            readingSpeed: durationSeconds > 0 ? Math.round(pagesRead / (durationSeconds / 60)) : 0,
            notes: ''
        };

        // Save session
        this.storage.addSession(session);

        // Update book progress if this session goes beyond current page
        if (lastPage >= book.currentPage) {
            const nextPage = lastPage >= book.lastPage ? book.lastPage : lastPage + 1;
            const isFinished = lastPage >= book.lastPage;
            
            const updateData = {
                currentPage: nextPage,
                dateStarted: book.dateStarted || startTime.toISOString(),
                status: isFinished ? 'finished' : 'reading'
            };
            
            // Set dateFinished when book is completed
            if (isFinished) {
                updateData.dateFinished = new Date().toISOString();
            }
            
            this.storage.updateBook(this.currentBookId, updateData);
        }

        this.showToast('Session added successfully!');
        
        // Go back to reading sessions
        this.goBackToReadingSessions();
    }

    bindSearchFunctionality() {
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterBooks(e.target.value);
            });
        }
    }

    filterBooks(query) {
        let books = this.storage.searchBooks(query);
        
        // Filter books based on current view (archive or active)
        if (this.showingArchive) {
            books = books.filter(book => book.status === 'archived');
        } else {
            books = books.filter(book => book.status !== 'archived');
        }
        
        const container = document.getElementById('booksContainer');
        
        container.innerHTML = books.map(book => this.createBookCard(book)).join('');
        if (books.length > 0) {
            setTimeout(() => this.bindBookCardEvents(), 50);
        }
    }

    // Track Screen  
    loadTrackScreen() {
        this.updateHeader('', false);
        this.renderTrackScreen();
    }

    renderTrackScreen() {
        const container = document.querySelector('.main-content');
        if (!container) return;

        container.innerHTML = `
            <h1 class="page-title">Track</h1>
            <div class="track-header">
                <div class="track-tabs">
                    <button class="track-tab ${this.currentTrackTab === 'goals' ? 'active' : ''}" data-track-tab="goals">Goals</button>
                    <button class="track-tab ${this.currentTrackTab === 'stats' ? 'active' : ''}" data-track-tab="stats">Stats</button>
                </div>
            </div>
            <div class="track-content" id="trackContent">
                ${this.currentTrackTab === 'goals' ? this.renderGoalsTab() : this.renderStatsTab()}
            </div>
        `;

        this.bindTrackTabEvents();
    }

    bindTrackTabEvents() {
        document.querySelectorAll('.track-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = e.currentTarget.getAttribute('data-track-tab');
                this.switchTrackTab(tabName);
            });
        });

        // Bind stats filter events
        document.querySelectorAll('.stats-filter').forEach(filter => {
            filter.addEventListener('click', (e) => {
                const period = e.currentTarget.getAttribute('data-period');
                this.switchStatsPeriod(period);
            });
        });
    }

    switchStatsPeriod(period) {
        this.currentStatsPeriod = period;
        this.renderTrackScreen();
    }

    switchTrackTab(tabName) {
        this.currentTrackTab = tabName;
        this.renderTrackScreen();
    }

    renderGoalsTab() {
        const goals = this.storage.getGoals();
        const todayStats = this.storage.getReadingStats('day');
        const weekStats = this.storage.getReadingStats('week');
        const monthStats = this.storage.getReadingStats('month');
        const yearStats = this.storage.getReadingStats('year');
        
        // Calculate progress percentages for circular indicators
        const todayProgress = goals.dailyPages > 0 ? Math.min(100, (todayStats.totalPages / goals.dailyPages) * 100) : 0;
        const weekProgress = goals.weeklyPages > 0 ? Math.min(100, (weekStats.totalPages / goals.weeklyPages) * 100) : 0;
        const monthProgress = goals.monthlyBooks > 0 ? Math.min(100, (monthStats.booksCompleted / goals.monthlyBooks) * 100) : 0;
        const yearProgress = goals.yearlyBooks > 0 ? Math.min(100, (yearStats.booksCompleted / goals.yearlyBooks) * 100) : 0;
        
        return `
            <div class="goals-container">
                <div class="goal-item">
                    <div class="goal-info">
                        <div class="goal-title">Today</div>
                        <div class="goal-subtitle">${todayStats.totalPages}/${goals.dailyPages} PAGES</div>
                        </div>
                    <div class="goal-indicator red" data-progress="${todayProgress}">
                        <svg class="progress-ring" width="44" height="44">
                            <circle cx="22" cy="22" r="18" stroke="#333" stroke-width="4" fill="none"/>
                            <circle cx="22" cy="22" r="18" stroke="#ff3b30" stroke-width="4" fill="none" 
                                    stroke-dasharray="113.1" stroke-dashoffset="${113.1 - (113.1 * todayProgress / 100)}" 
                                    stroke-linecap="round" transform="rotate(-90 22 22)"/>
                        </svg>
                    </div>
                </div>
                <div class="goal-item">
                    <div class="goal-info">
                        <div class="goal-title">This Week</div>
                        <div class="goal-subtitle">${weekStats.totalPages}/${goals.weeklyPages} PAGES</div>
                        </div>
                    <div class="goal-indicator yellow" data-progress="${weekProgress}">
                        <svg class="progress-ring" width="44" height="44">
                            <circle cx="22" cy="22" r="18" stroke="#333" stroke-width="4" fill="none"/>
                            <circle cx="22" cy="22" r="18" stroke="#ffcc02" stroke-width="4" fill="none" 
                                    stroke-dasharray="113.1" stroke-dashoffset="${113.1 - (113.1 * weekProgress / 100)}" 
                                    stroke-linecap="round" transform="rotate(-90 22 22)"/>
                        </svg>
                    </div>
                </div>
                <div class="goal-item">
                    <div class="goal-info">
                        <div class="goal-title">This Month</div>
                        <div class="goal-subtitle">${monthStats.booksCompleted || 0}/${goals.monthlyBooks} BOOKS</div>
                        </div>
                    <div class="goal-indicator green" data-progress="${monthProgress}">
                        <svg class="progress-ring" width="44" height="44">
                            <circle cx="22" cy="22" r="18" stroke="#333" stroke-width="4" fill="none"/>
                            <circle cx="22" cy="22" r="18" stroke="#30d158" stroke-width="4" fill="none" 
                                    stroke-dasharray="113.1" stroke-dashoffset="${113.1 - (113.1 * monthProgress / 100)}" 
                                    stroke-linecap="round" transform="rotate(-90 22 22)"/>
                        </svg>
                    </div>
                </div>
                <div class="goal-item">
                    <div class="goal-info">
                        <div class="goal-title">This Year</div>
                        <div class="goal-subtitle">${yearStats.booksCompleted || 0}/${goals.yearlyBooks} BOOKS</div>
                        </div>
                    <div class="goal-indicator blue" data-progress="${yearProgress}">
                        <svg class="progress-ring" width="44" height="44">
                            <circle cx="22" cy="22" r="18" stroke="#333" stroke-width="4" fill="none"/>
                            <circle cx="22" cy="22" r="18" stroke="#007AFF" stroke-width="4" fill="none" 
                                    stroke-dasharray="113.1" stroke-dashoffset="${113.1 - (113.1 * yearProgress / 100)}" 
                                    stroke-linecap="round" transform="rotate(-90 22 22)"/>
                        </svg>
                    </div>
                </div>
            </div>
        `;
    }

    renderStatsTab() {
        const stats = this.getStatsForPeriod(this.currentStatsPeriod);
        let chartHtml = '';
        let metricsRows = [];

        function metricRow(label, value) {
            return `<tr><td class="stats-metric-label">${label}</td><td class="stats-metric-value">${value}</td></tr>`;
        }

        if (this.currentStatsPeriod === 'week') {
            chartHtml = this.renderWeekChart(stats);
            metricsRows = [
                metricRow('Pages', stats.totalPages),
                metricRow('Time', this.formatTimeDisplay(stats.totalTime)),
                metricRow('Sessions', stats.totalSessions)
            ];
        } else if (this.currentStatsPeriod === 'month') {
            chartHtml = this.renderMonthLineChart(stats);
            metricsRows = [
                metricRow('Pages', stats.totalPages),
                metricRow('Time', this.formatTimeDisplay(stats.totalTime)),
                metricRow('Sessions', stats.totalSessions)
            ];
        } else if (this.currentStatsPeriod === 'year') {
            chartHtml = this.renderYearLineChart(stats);
            const avgSession = stats.totalSessions > 0 ? stats.totalTime / stats.totalSessions : 0;
            const avgPage = stats.totalPages > 0 ? stats.totalTime * 60 / stats.totalPages : 0;
            metricsRows = [
                metricRow('Books Finished', stats.booksCompleted),
                metricRow('Time Read', this.formatTimeDisplay(stats.totalTime)),
                metricRow('Sessions', stats.totalSessions),
                metricRow('Time/Session', this.formatTimeDisplay(avgSession)),
                metricRow('Time/Page', avgPage > 60 ? Math.round(avgPage/60) + ' min' : Math.round(avgPage) + ' sec')
            ];
        } else if (this.currentStatsPeriod === 'all') {
            const avgSession = stats.totalSessions > 0 ? stats.totalTime / stats.totalSessions : 0;
            const avgPage = stats.totalPages > 0 ? stats.totalTime * 60 / stats.totalPages : 0;
            const pagesPerHour = stats.totalTime > 0 ? Math.round(stats.totalPages / (stats.totalTime / 60)) : 0;
            const pagesPerSession = stats.totalSessions > 0 ? Math.round(stats.totalPages / stats.totalSessions) : 0;
            chartHtml = `
                <div class="stats-chart stats-line-chart">
                    <div class="stats-alltime-books">${stats.booksCompleted || 0}</div>
                    <svg width="100%" height="120" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <line x1="50" y1="10" x2="50" y2="90" stroke="#007AFF" stroke-width="3"/>
                    </svg>
                    <div class="stats-alltime-pages-hour">${pagesPerHour}</div>
                </div>
            `;
            metricsRows = [
                metricRow('Books Finished', stats.booksCompleted || 0),
                metricRow('Time Read', this.formatTimeDisplay(stats.totalTime)),
                metricRow('Sessions', stats.totalSessions),
                metricRow('Time/Session', this.formatTimeDisplay(avgSession)),
                metricRow('Time/Page', avgPage > 60 ? Math.round(avgPage/60) + ' min' : Math.round(avgPage) + ' sec'),
                metricRow('Pages/Hour', pagesPerHour),
                metricRow('Pages/Session', pagesPerSession)
            ];
        }
        
        return `
            <div class="stats-container">
                <div class="stats-filters">
                    <button class="stats-filter ${this.currentStatsPeriod === 'week' ? 'active' : ''}" data-period="week">Week</button>
                    <button class="stats-filter ${this.currentStatsPeriod === 'month' ? 'active' : ''}" data-period="month">Month</button>
                    <button class="stats-filter ${this.currentStatsPeriod === 'year' ? 'active' : ''}" data-period="year">Year</button>
                    <button class="stats-filter ${this.currentStatsPeriod === 'all' ? 'active' : ''}" data-period="all">All Time</button>
                            </div>
                ${chartHtml}
                <div class="stats-summary-multi">
                    <table class="stats-metrics-table"><tbody>${metricsRows.join('')}</tbody></table>
                    </div>
                </div>
        `;
    }

    renderMonthLineChart(monthStats) {
        const days = monthStats.days || [];
        const maxPages = Math.max(...days.map(d => d.totalPages), 1);
        return `
            <div class="stats-chart stats-line-chart">
                <svg width="100%" height="120" viewBox="0 0 100 100" preserveAspectRatio="none">
                    ${this.renderLinePath(days, maxPages)}
                </svg>
                <div class="chart-x-labels">
                    ${days.map((d, i) => i % 5 === 0 || i === days.length - 1 ? `<span>${d.day}</span>` : '<span></span>').join('')}
                    </div>
                    </div>
        `;
    }

    renderYearLineChart(yearStats) {
        const months = yearStats.months || [];
        const maxPages = Math.max(...months.map(m => m.totalPages), 1);
        return `
            <div class="stats-chart stats-line-chart">
                <svg width="100%" height="120" viewBox="0 0 100 100" preserveAspectRatio="none">
                    ${this.renderLinePath(months, maxPages, true)}
                </svg>
                <div class="chart-x-labels">
                    ${months.map((m, i) => `<span>${i+1}</span>`).join('')}
                    </div>
            </div>
        `;
    }

    renderAllTimeLineChart(stats) {
        // Просто вертикальная линия по центру
        return `<div class="stats-chart stats-line-chart"><svg width="100%" height="120" viewBox="0 0 100 100" preserveAspectRatio="none"><line x1="50" y1="10" x2="50" y2="90" stroke="#007AFF" stroke-width="3"/></svg></div>`;
    }

    renderLinePath(data, maxPages, isYear = false) {
        if (!data.length) return '';
        const points = data.map((d, i) => {
            const x = (i / (data.length - 1)) * 100;
            const y = 100 - (d.totalPages / maxPages) * 90;
            return `${x},${y}`;
        });
        return `<polyline fill=\"none\" stroke=\"#007AFF\" stroke-width=\"0.5\" points=\"${points.join(' ')}\"/>`;
    }

    getStatsForPeriod(period) {
        switch (period) {
            case 'week':
                return this.storage.getReadingStats('week');
            case 'month':
                return this.storage.getReadingStats('month');
            case 'year':
                return this.storage.getReadingStats('year');
            case 'all':
                return this.getAllTimeStats();
            default:
                return this.storage.getReadingStats('week');
        }
    }

    getAllTimeStats() {
        const data = this.storage.getData();
        if (!data || !data.sessions) {
            return { totalPages: 0, totalTime: 0, totalSessions: 0, booksCompleted: 0 };
        }

        const sessions = data.sessions;
        // Подсчёт завершённых книг (включая архивированные)
        const books = data.books || [];
        const booksCompleted = books.filter(book => 
            (book.status === 'finished' || book.status === 'archived') && book.dateFinished
        ).length;

        return {
            totalPages: sessions.reduce((sum, session) => sum + session.pagesRead, 0),
            totalTime: sessions.reduce((sum, session) => {
                if (session.duration !== undefined) {
                    return sum + (session.duration / 60);
                } else {
                    const duration = new Date(session.endTime) - new Date(session.startTime);
                    return sum + (duration / 1000 / 60);
                }
            }, 0),
            totalSessions: sessions.length,
            booksCompleted
        };
    }

    renderWeekChart(weekStats) {
        const maxPages = Math.max(...weekStats.days.map(day => day.totalPages), 1);
        
        return `
            <div class="stats-chart">
                <div class="chart-bars">
                    ${weekStats.days.map(day => {
                        const height = (day.totalPages / maxPages) * 100;
                        return `
                            <div class="chart-bar-container">
                                <div class="chart-bar" style="height: ${height}%">
                                    <div class="chart-value">${day.totalPages}</div>
                                </div>
                                <div class="chart-label">${day.dayName}</div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }

    // Plan Screen
    loadPlanScreen() {
                    this.updateHeader('', false);
        // Check if plan component extension is loaded
        if (typeof this.renderPlanScreen === 'function') {
            this.renderPlanScreen();
        } else {
            // Fallback for plan screen
            const container = document.querySelector('.main-content');
            if (container) {
                container.innerHTML = `
                    <div class="empty-state">
                        <p class="empty-message">Plan feature loading...</p>
                    </div>
                `;
            }
        }
    }

    renderPlanScreen() {
        const container = document.querySelector('.main-content');
        if (!container) return;

        const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        container.innerHTML = `
            <h1 class="page-title">Plan</h1>
            <div class="calendar-container" style="background:#000;">
                <div class="calendar-header" style="background:#000;">
                    <div class="calendar-month">${this.getMonthName(this.selectedDate)} ${this.selectedDate.getFullYear()}</div>
                </div>
                <div class="calendar-weekdays" style="background:#000;">
                    ${weekdays.map(day => `<div style='background:#000;'>${day}</div>`).join('')}
                </div>
                <div class="calendar-grid" id="calendarGrid" style="background:#000;">
                    ${this.renderCalendarDays()}
                </div>
            </div>
            <div class="plan-stats">
                <div class="plan-date">${this.formatDate(this.selectedDate)}</div>
                <div class="plan-metrics">
                    <div class="plan-metric">
                        <div class="plan-metric-label">Pages Read</div>
                        <div class="plan-metric-value">${this.getDayStats().totalPages}</div>
                    </div>
                    <div class="plan-metric">
                        <div class="plan-metric-label">Time Read</div>
                        <div class="plan-metric-value">${this.formatTimeDisplay(this.getDayStats().totalTime)}</div>
                    </div>
                </div>
            </div>
        `;

        this.bindCalendarEvents();
    }

    renderCalendarDays() {
        const year = this.selectedDate.getFullYear();
        const month = this.selectedDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - firstDay.getDay());

        let html = '';
        let currentDate = new Date(startDate);

        for (let i = 0; i < 42; i++) {
            const isCurrentMonth = currentDate.getMonth() === month;
            const isSelected = this.isSameDate(currentDate, this.selectedDate);
            
            html += `
                <div class="calendar-day ${!isCurrentMonth ? 'other-month' : ''} ${isSelected ? 'selected' : ''}" 
                     data-date="${currentDate.toDateString()}">
                    ${currentDate.getDate()}
                </div>
            `;
            
            currentDate.setDate(currentDate.getDate() + 1);
        }

        return html;
    }

    bindCalendarEvents() {
        document.querySelectorAll('.calendar-day').forEach(day => {
            day.addEventListener('click', (e) => {
                const dateString = e.target.getAttribute('data-date');
                this.selectedDate = new Date(dateString);
                this.renderPlanScreen();
            });
        });
    }

    getDayStats() {
        return this.storage.getDayStats(this.storage.getData()?.sessions || [], this.selectedDate);
    }

    // Settings Screen
    loadSettingsScreen() {
                    this.updateHeader('', false);
        // Check if settings component extension is loaded
        if (typeof this.renderSettingsScreen === 'function') {
            this.renderSettingsScreen();
        } else {
            // Fallback for settings screen
            const container = document.querySelector('.main-content');
            if (container) {
                container.innerHTML = `
                    <div class="empty-state">
                        <p class="empty-message">Settings feature loading...</p>
                    </div>
                `;
            }
        }
    }

    renderSettingsScreen() {
        const container = document.querySelector('.main-content');
        if (!container) return;

        const goals = this.storage.getGoals();

        container.innerHTML = `
            <h1 class="page-title">Settings</h1>
            <div class="settings-section">
                <div class="settings-section-title">Goals</div>
                <div class="settings-card">
                    <div class="settings-item">
                        <div class="settings-label">Daily Pages</div>
                        <input type="number" class="settings-input" id="dailyPages" value="${goals.dailyPages}" min="0">
                    </div>
                    <div class="settings-item">
                        <div class="settings-label">Weekly Pages</div>
                        <input type="number" class="settings-input" id="weeklyPages" value="${goals.weeklyPages}" min="0">
                    </div>
                    <div class="settings-item">
                        <div class="settings-label">Monthly Books</div>
                        <input type="number" class="settings-input" id="monthlyBooks" value="${goals.monthlyBooks}" min="0">
                    </div>
                    <div class="settings-item">
                        <div class="settings-label">Yearly Books</div>
                        <input type="number" class="settings-input" id="yearlyBooks" value="${goals.yearlyBooks}" min="0">
                    </div>
                </div>
                <button class="save-button" id="saveGoals">Save Goals</button>
            </div>
            
            <div class="settings-section">
                <div class="settings-section-title">Backup</div>
                <div class="settings-card">
                    <button class="backup-button" id="createBackup">Create Backup</button>
                    <button class="backup-button" id="restoreBackup">
                        Restore from Backup
                        <input type="file" id="backupFile" accept=".json" style="display: none;">
                    </button>
                </div>
            </div>
        `;

        this.bindSettingsEvents();
    }

    bindSettingsEvents() {
        const saveGoalsBtn = document.getElementById('saveGoals');
        if (saveGoalsBtn) {
            saveGoalsBtn.addEventListener('click', () => this.saveGoals());
        }

        const createBackupBtn = document.getElementById('createBackup');
        if (createBackupBtn) {
            createBackupBtn.addEventListener('click', () => this.storage.createBackup());
        }

        const restoreBackupBtn = document.getElementById('restoreBackup');
        const backupFile = document.getElementById('backupFile');
        
        if (restoreBackupBtn && backupFile) {
            restoreBackupBtn.addEventListener('click', () => backupFile.click());
            backupFile.addEventListener('change', (e) => this.handleRestoreBackup(e));
        }
    }

    saveGoals() {
        const goals = {
            dailyPages: parseInt(document.getElementById('dailyPages').value) || 0,
            weeklyPages: parseInt(document.getElementById('weeklyPages').value) || 0,
            monthlyBooks: parseInt(document.getElementById('monthlyBooks').value) || 0,
            yearlyBooks: parseInt(document.getElementById('yearlyBooks').value) || 0
        };

        this.storage.updateGoals(goals);
        this.showToast('Goals saved successfully!');
    }

    async handleRestoreBackup(event) {
        const file = event.target.files[0];
        if (!file) return;

        try {
            await this.storage.restoreFromBackup(file);
            this.showToast('Backup restored successfully!');
            this.loadCurrentScreen();
        } catch (error) {
            this.showToast('Failed to restore backup: ' + error.message, 'error');
        }
    }

    // Modal management (keeping for archive modal)
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
        }
    }

    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
        }
    }

    resetAddBookForm() {
        const form = document.getElementById('addBookForm');
        if (form) {
            form.reset();
            document.getElementById('firstPage').value = '1';
            this.validateAddBookForm();
        }
        
        // Reset cover selection
        this.currentBookCover = null;
        const coverPreview = document.getElementById('coverPreview');
        if (coverPreview) {
            coverPreview.innerHTML = `
                <span class="cover-icon">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" stroke="currentColor" stroke-width="2"/>
                        <circle cx="12" cy="13" r="4" stroke="currentColor" stroke-width="2"/>
                    </svg>
                </span>
                <div class="cover-overlay">
                    <span class="cover-text">Tap to add cover</span>
                </div>
            `;
        }
    }

    // Add Book Screen Functions
    showAddBookScreen() {
        this.currentView = 'addBook';
        this.renderAddBookScreen();
    }

    renderAddBookScreen() {
        this.updateHeader('Add New Book', false, false, false, false, null, false, true); // Show Cancel/Add buttons
        
        const container = document.querySelector('.main-content');
        if (!container) return;

        container.innerHTML = `
            <form class="add-book-form" id="addBookForm">
                <!-- Book Info Section - horizontal layout -->
                <div class="book-info-section">
                    <div class="cover-container">
                        <input type="file" id="coverInput" accept="image/*" style="display: none;">
                        <div class="cover-placeholder" id="coverPreview">
                            <span class="cover-icon">
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" stroke="currentColor" stroke-width="2"/>
                                    <circle cx="12" cy="13" r="4" stroke="currentColor" stroke-width="2"/>
                                </svg>
                            </span>
                            <div class="cover-overlay">
                                <span class="cover-text">Tap to add cover</span>
                            </div>
                        </div>
                    </div>
                    <div class="book-text-fields">
                        <div class="form-group">
                            <input type="text" class="form-input" placeholder="Title" id="bookTitle" required>
                        </div>
                        <div class="form-group">
                            <input type="text" class="form-input" placeholder="Author" id="bookAuthor" required>
                        </div>
                    </div>
                </div>
                
                <!-- Page Fields Section -->
                <div class="page-fields-section">
                    <div class="form-group">
                        <input type="number" class="form-input" placeholder="First Page to Read" id="firstPage" value="1" required>
                    </div>
                    <div class="form-group">
                        <input type="number" class="form-input" placeholder="Last Page to Read" id="lastPage" required>
                    </div>
                </div>
            </form>
        `;

        this.bindAddBookEvents();
        this.resetAddBookForm();
    }

    bindAddBookEvents() {
        // Cancel button
        const cancelButton = document.getElementById('cancelAddBook');
        if (cancelButton) {
            cancelButton.addEventListener('click', () => this.cancelAddBook());
        }

        // Add button
        const addButton = document.getElementById('confirmAddBook');
        if (addButton) {
            addButton.addEventListener('click', () => this.handleAddBook());
        }

        // Cover selection
        const coverPreview = document.getElementById('coverPreview');
        const coverInput = document.getElementById('coverInput');
        
        if (coverPreview) {
            coverPreview.addEventListener('click', () => {
                coverInput.click();
            });
        }

        if (coverInput) {
            coverInput.addEventListener('change', (event) => {
                this.handleCoverSelection(event);
            });
        }

        // Form validation
        this.bindFormValidation();
    }

    cancelAddBook() {
        this.currentView = 'main';
        this.loadReadScreen();
    }

    handleCoverSelection(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Check file size (limit to 2MB)
        if (file.size > 2 * 1024 * 1024) {
            this.showToast('Image too large. Please select an image under 2MB.', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const base64Image = e.target.result;
            this.currentBookCover = base64Image;
            this.updateCoverPreview(base64Image);
        };
        
        reader.onerror = () => {
            this.showToast('Error reading image file', 'error');
        };
        
        reader.readAsDataURL(file);
    }

    updateCoverPreview(imageSrc) {
        const coverPreview = document.getElementById('coverPreview');
        if (!coverPreview) return;

        coverPreview.innerHTML = `
            <img src="${imageSrc}" alt="Book Cover" style="width: 100%; height: 100%; object-fit: cover; border-radius: 10px;">
            <div class="cover-overlay">
                <span class="cover-text">Tap to change</span>
            </div>
        `;
    }

    handleAddBook() {
        const title = document.getElementById('bookTitle').value.trim();
        const author = document.getElementById('bookAuthor').value.trim();
        const firstPage = document.getElementById('firstPage').value;
        const lastPage = document.getElementById('lastPage').value;

        if (!title || !author || !firstPage || !lastPage) return;

        const book = {
            title,
            author,
            firstPage: parseInt(firstPage),
            lastPage: parseInt(lastPage),
            cover: this.currentBookCover // Include selected cover
        };

        const newBook = this.storage.addBook(book);
        this.showToast('Book added successfully!');
        
        // Reset cover selection
        this.currentBookCover = null;
        
        // Show book details after adding
        this.showBookDetails(newBook.id);
    }

    // Utility methods
    showToast(message, type = 'success') {
        // Simple toast implementation
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: max(20px, calc(env(safe-area-inset-top) + 8px));
            left: 50%;
            transform: translateX(-50%);
            background: ${type === 'error' ? '#ff3b30' : '#30d158'};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            z-index: 9999;
            font-size: 14px;
            font-weight: 500;
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }

    getMonthName(date) {
        return date.toLocaleDateString('en', { month: 'long' });
    }

    formatDate(date) {
        return date.toLocaleDateString('en', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
    }

    isSameDate(date1, date2) {
        return date1.toDateString() === date2.toDateString();
    }

    formatTimeDisplay(totalMinutes) {
        console.log(`🕐 NEW formatTimeDisplay вызвана с: ${totalMinutes} минут`);
        
        // Convert to total seconds (no fractional minutes display)
        const totalSeconds = Math.round(totalMinutes * 60);
        console.log(`🕐 Секунды: ${totalSeconds}`);
        
        if (totalSeconds === 0) {
            console.log(`🕐 Возвращаем: "0 min 0 sec"`);
            return '0 min 0 sec';
        }
        
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        
        console.log(`🕐 H:${hours} M:${minutes} S:${seconds}`);
        
        let result;
        if (hours > 0) {
            result = `${hours}h ${minutes}m`;
            console.log(`🕐 Часы: "${result}"`);
        } else {
            result = `${minutes} min ${seconds} sec`;
            console.log(`🕐 Минуты и секунды: "${result}"`);
        }
        
        console.log(`🕐 ФИНАЛЬНЫЙ результат: "${result}"`);
        return result;
    }
    
    // Debug function for testing tab switching
    testTabSwitch(tabName) {
        console.log('Testing tab switch to:', tabName);
        this.switchTab(tabName);
    }

    // Debug function for adding test reading session
    // Fix existing finished books without dateFinished
    fixFinishedBooksWithoutDate() {
        const books = this.storage.getBooks();
        let fixedCount = 0;
        
        books.forEach(book => {
            if (book.status === 'finished' && !book.dateFinished) {
                // Set dateFinished to current date for existing finished books
                this.storage.updateBook(book.id, {
                    dateFinished: new Date().toISOString()
                });
                fixedCount++;
                console.log(`Fixed dateFinished for book: "${book.title}"`);
            }
        });
        
        if (fixedCount > 0) {
            console.log(`Fixed ${fixedCount} finished books without dateFinished`);
            this.showToast(`Fixed ${fixedCount} finished books`);
        } else {
            console.log('No finished books without dateFinished found');
        }
        
        return fixedCount;
    }

    addTestSession(bookId, durationMinutes = 30, pagesRead = 5) {
        const book = this.storage.getBooks().find(b => b.id === bookId);
        if (!book) {
            console.error('Book not found with ID:', bookId);
            console.log('Available books:', this.storage.getBooks());
            return;
        }

        const now = new Date();
        const startTime = new Date(now - durationMinutes * 60 * 1000);
        
        const startPage = book.currentPage;
        const endPage = book.currentPage + pagesRead - 1;
        
        const session = {
            bookId: bookId,
            startTime: startTime.toISOString(),
            endTime: now.toISOString(),
            duration: durationMinutes * 60, // duration in seconds
            startPage: startPage,
            endPage: endPage,
            pagesRead: pagesRead,
            readingSpeed: Math.round(pagesRead / durationMinutes), // pages per minute
            notes: 'Test session'
        };

        this.storage.addSession(session);
        
        // Update book progress
        const newCurrentPage = Math.min(book.currentPage + pagesRead, book.lastPage);
        this.storage.updateBook(bookId, {
            currentPage: newCurrentPage,
            dateStarted: book.dateStarted || now.toISOString()
        });

        this.showToast('Test session added successfully!');
        
        // Refresh current screen
        this.loadCurrentScreen();
    }

    renderArchiveScreen() {
        this.showingArchive = true; // Устанавливаем флаг архива
        this.updateHeader('', false, true); // showBack = true, без заголовка
        const container = document.querySelector('.main-content');
        if (!container) return;
        const archivedBooks = this.storage.getBooks().filter(b => b.status === 'archived');
        container.innerHTML = `
            <div class="archive-screen">
                <h2 class="archive-title">Archive</h2>
                <div class="archive-list">
                    ${archivedBooks.length === 0 ? `<div class="empty-state"><p class="empty-message">No finished books yet</p></div>` :
                        archivedBooks.map(book => `
                            <div class="book-card" data-book-id="${book.id}">
                                <div class="book-cover">
                                    ${book.cover 
                                        ? `<img src="${book.cover}" alt="${book.title}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px;">`
                                        : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" stroke="currentColor" stroke-width="2"/>
                                                <circle cx="12" cy="13" r="4" stroke="currentColor" stroke-width="2"/>
                                           </svg>`}
                                </div>
                                <div class="book-info">
                                    <div class="book-title">${book.title}</div>
                                    <div class="book-author">${book.author}</div>
                                    <div class="book-progress">Page ${book.currentPage} of ${book.lastPage}</div>
                                </div>
                            </div>
                        `).join('')
                    }
                </div>
            </div>
        `;
        // Назад к чтению
        const backBtn = document.getElementById('backButton');
        if (backBtn) backBtn.onclick = () => {
            this.currentView = 'main';
            this.showingArchive = false; // Сбрасываем флаг при возврате
            this.loadReadScreen();
        };
        // Клик по книге (можно добавить просмотр деталей)
        container.querySelectorAll('.book-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const bookId = e.currentTarget.getAttribute('data-book-id');
                this.showBookDetails(bookId);
            });
        });
    }
}

// Export components instance
window.BookKingComponents = BookKingComponents; 

// Global debug functions for testing archive functionality
window.getBooks = () => app.components.storage.getBooks();
window.toggleArchive = () => {
    app.components.toggleArchiveView();
};
window.archiveBook = (bookId) => {
    app.components.storage.updateBook(bookId, { status: 'archived' });
    console.log('Book archived:', bookId);
};
window.unarchiveBook = (bookId) => {
    app.components.storage.updateBook(bookId, { status: 'reading' });
    console.log('Book unarchived:', bookId);
};
window.finishBook = (bookId) => {
    const book = app.components.storage.getBooks().find(b => b.id === bookId);
    if (book) {
        app.components.storage.updateBook(bookId, { 
            status: 'finished', 
            currentPage: book.lastPage 
        });
        console.log('Book finished:', bookId);
    }
};
window.showArchivedBooks = () => {
    const books = app.components.storage.getBooks().filter(b => b.status === 'archived');
    console.log('Archived books:', books);
    return books;
};
window.showActiveBooks = () => {
    const books = app.components.storage.getBooks().filter(b => b.status !== 'archived');
    console.log('Active books:', books);
    return books;
};
window.testFinishedBook = () => {
    const books = app.components.storage.getBooks();
    const finishedBooks = books.filter(b => b.status === 'finished');
    console.log('Finished books:', finishedBooks);
    console.log('Current archive mode:', app.components.showingArchive);
    console.log('Currently visible books:', app.components.getCurrentBooks());
    return finishedBooks;
};
window.checkArchiveState = () => {
    console.log('Archive mode:', app.components.showingArchive);
    console.log('Current view:', app.components.currentView);
    console.log('Current tab:', app.components.currentTab);
    const button = document.getElementById('toggleArchive');
    console.log('Archive button active:', button?.classList.contains('active'));
}; 