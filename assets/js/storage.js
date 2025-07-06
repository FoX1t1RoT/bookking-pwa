// BookKing Storage Module
class BookKingStorage {
    constructor() {
        this.storageKey = 'bookking_data';
        this.init();
    }

    // Initialize storage with default data structure
    init() {
        if (!localStorage.getItem(this.storageKey)) {
            const defaultData = {
                books: [],
                sessions: [],
                goals: {
                    dailyPages: 0,
                    weeklyPages: 0,
                    monthlyBooks: 0,
                    yearlyBooks: 0
                },
                settings: {
                    theme: 'light'
                },
                lastSync: new Date().toISOString()
            };
            this.saveData(defaultData);
        }
    }

    // Get all data from storage
    getData() {
        try {
            const data = localStorage.getItem(this.storageKey);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Error reading from storage:', error);
            return null;
        }
    }

    // Save data to storage
    saveData(data) {
        try {
            data.lastSync = new Date().toISOString();
            localStorage.setItem(this.storageKey, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('Error saving to storage:', error);
            return false;
        }
    }

    // Book management methods
    addBook(book) {
        const data = this.getData();
        const newBook = {
            id: this.generateId(),
            title: book.title,
            author: book.author,
            firstPage: parseInt(book.firstPage) || 1,
            lastPage: parseInt(book.lastPage),
            currentPage: parseInt(book.firstPage) || 1,
            status: 'reading',
            dateAdded: new Date().toISOString(),
            dateStarted: null,
            dateFinished: null,
            totalPages: parseInt(book.lastPage) - parseInt(book.firstPage) + 1,
            cover: book.cover || null // Store book cover image
        };
        
        data.books.push(newBook);
        this.saveData(data);
        return newBook;
    }

    getBooks(status = null) {
        const data = this.getData();
        if (!data || !data.books) return [];
        
        if (status) {
            return data.books.filter(book => book.status === status);
        }
        return data.books;
    }

    updateBook(bookId, updates) {
        const data = this.getData();
        const bookIndex = data.books.findIndex(book => book.id === bookId);
        
        if (bookIndex !== -1) {
            data.books[bookIndex] = { ...data.books[bookIndex], ...updates };
            this.saveData(data);
            return data.books[bookIndex];
        }
        return null;
    }

    deleteBook(bookId) {
        const data = this.getData();
        data.books = data.books.filter(book => book.id !== bookId);
        this.saveData(data);
        return true;
    }

    // Reading session methods
    addSession(session) {
        const data = this.getData();
        const newSession = {
            id: this.generateId(),
            bookId: session.bookId,
            startTime: session.startTime,
            endTime: session.endTime,
            duration: session.duration || 0, // Save duration in seconds
            startPage: session.startPage || null,
            endPage: session.endPage || null,
            pagesRead: parseInt(session.pagesRead) || 0,
            readingSpeed: session.readingSpeed || 0,
            notes: session.notes || '',
            date: new Date(session.startTime).toDateString()
        };
        
        data.sessions.push(newSession);
        this.saveData(data);
        return newSession;
    }

    getSessions(bookId = null, date = null) {
        const data = this.getData();
        if (!data || !data.sessions) return [];
        
        let sessions = data.sessions;
        
        if (bookId) {
            sessions = sessions.filter(session => session.bookId === bookId);
        }
        
        if (date) {
            sessions = sessions.filter(session => session.date === new Date(date).toDateString());
        }
        
        return sessions.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
    }

    // Goals management
    getGoals() {
        const data = this.getData();
        return data ? data.goals : {
            dailyPages: 0,
            weeklyPages: 0,
            monthlyBooks: 0,
            yearlyBooks: 0
        };
    }

    updateGoals(goals) {
        const data = this.getData();
        data.goals = { ...data.goals, ...goals };
        this.saveData(data);
        return data.goals;
    }

    // Statistics methods
    getReadingStats(period = 'week') {
        const data = this.getData();
        if (!data || !data.sessions) return this.getEmptyStats();

        const now = new Date();
        const sessions = data.sessions;
        
        switch (period) {
            case 'day':
                return this.getDayStats(sessions, now);
            case 'week':
                return this.getWeekStats(sessions, now);
            case 'month':
                return this.getMonthStats(sessions, now);
            case 'year':
                return this.getYearStats(sessions, now);
            default:
                return this.getEmptyStats();
        }
    }

    getDayStats(sessions, date) {
        const targetDate = new Date(date).toDateString();
        const daySessions = sessions.filter(session => session.date === targetDate);
        
        return {
            totalPages: daySessions.reduce((sum, session) => sum + session.pagesRead, 0),
            totalTime: daySessions.reduce((sum, session) => {
                // Use saved duration if available, otherwise calculate from timestamps
                if (session.duration !== undefined) {
                    return sum + (session.duration / 60); // convert seconds to minutes (keep decimals)
                } else {
                    const duration = new Date(session.endTime) - new Date(session.startTime);
                    return sum + (duration / 1000 / 60); // minutes (keep decimals)
                }
            }, 0),
            totalSessions: daySessions.length,
            averageSpeed: daySessions.length > 0 
                ? daySessions.reduce((sum, session) => sum + session.readingSpeed, 0) / daySessions.length 
                : 0
        };
    }

    getWeekStats(sessions, date) {
        const weekStats = {
            days: [],
            totalPages: 0,
            totalTime: 0,
            totalSessions: 0
        };

        // Get last 7 days
        for (let i = 6; i >= 0; i--) {
            const day = new Date(date);
            day.setDate(day.getDate() - i);
            const dayStats = this.getDayStats(sessions, day);
            
            weekStats.days.push({
                date: day.toDateString(),
                dayName: day.toLocaleDateString('en', { weekday: 'short' }),
                ...dayStats
            });
            
            weekStats.totalPages += dayStats.totalPages;
            weekStats.totalTime += dayStats.totalTime;
            weekStats.totalSessions += dayStats.totalSessions;
        }

        return weekStats;
    }

    getMonthStats(sessions, date) {
        const month = date.getMonth();
        const year = date.getFullYear();
        const monthSessions = sessions.filter(session => {
            const sessionDate = new Date(session.startTime);
            return sessionDate.getMonth() === month && sessionDate.getFullYear() === year;
        });

        // Массив по дням месяца
        const days = [];
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        for (let d = 1; d <= daysInMonth; d++) {
            const daySessions = monthSessions.filter(session => {
                const sessionDate = new Date(session.startTime);
                return sessionDate.getDate() === d;
            });
            days.push({
                day: d,
                totalPages: daySessions.reduce((sum, s) => sum + s.pagesRead, 0),
                totalTime: daySessions.reduce((sum, s) => sum + (s.duration ? s.duration / 60 : 0), 0),
                totalSessions: daySessions.length
            });
        }

        return {
            totalPages: monthSessions.reduce((sum, session) => sum + session.pagesRead, 0),
            totalTime: monthSessions.reduce((sum, session) => {
                if (session.duration !== undefined) {
                    return sum + (session.duration / 60);
                } else {
                    const duration = new Date(session.endTime) - new Date(session.startTime);
                    return sum + (duration / 1000 / 60);
                }
            }, 0),
            totalSessions: monthSessions.length,
            booksCompleted: this.getBooksCompletedInPeriod(month, year),
            days
        };
    }

    getYearStats(sessions, date) {
        const year = date.getFullYear();
        const yearSessions = sessions.filter(session => {
            const sessionDate = new Date(session.startTime);
            return sessionDate.getFullYear() === year;
        });

        // Массив по месяцам
        const months = [];
        for (let m = 0; m < 12; m++) {
            const monthSessions = yearSessions.filter(session => {
                const sessionDate = new Date(session.startTime);
                return sessionDate.getMonth() === m;
            });
            months.push({
                month: m + 1,
                totalPages: monthSessions.reduce((sum, s) => sum + s.pagesRead, 0),
                totalTime: monthSessions.reduce((sum, s) => sum + (s.duration ? s.duration / 60 : 0), 0),
                totalSessions: monthSessions.length,
                booksCompleted: this.getBooksCompletedInPeriod(m, year)
            });
        }

        return {
            totalPages: yearSessions.reduce((sum, session) => sum + session.pagesRead, 0),
            totalTime: yearSessions.reduce((sum, session) => {
                if (session.duration !== undefined) {
                    return sum + (session.duration / 60);
                } else {
                    const duration = new Date(session.endTime) - new Date(session.startTime);
                    return sum + (duration / 1000 / 60);
                }
            }, 0),
            totalSessions: yearSessions.length,
            booksCompleted: this.getBooksCompletedInYear(year),
            months
        };
    }

    getBooksCompletedInPeriod(month, year) {
        const data = this.getData();
        if (!data || !data.books) return 0;
        
        return data.books.filter(book => {
            if ((book.status !== 'finished' && book.status !== 'archived') || !book.dateFinished) return false;
            const finishedDate = new Date(book.dateFinished);
            return finishedDate.getMonth() === month && finishedDate.getFullYear() === year;
        }).length;
    }

    getBooksCompletedInYear(year) {
        const data = this.getData();
        if (!data || !data.books) return 0;
        
        return data.books.filter(book => {
            if ((book.status !== 'finished' && book.status !== 'archived') || !book.dateFinished) return false;
            const finishedDate = new Date(book.dateFinished);
            return finishedDate.getFullYear() === year;
        }).length;
    }

    getEmptyStats() {
        return {
            totalPages: 0,
            totalTime: 0,
            totalSessions: 0,
            averageSpeed: 0
        };
    }

    // Backup and restore methods
    createBackup() {
        const data = this.getData();
        const backup = {
            ...data,
            backupDate: new Date().toISOString(),
            version: '1.0'
        };
        
        const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `bookking-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        return true;
    }

    restoreFromBackup(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const backup = JSON.parse(e.target.result);
                    
                    // Validate backup structure
                    if (!backup.books || !backup.sessions || !backup.goals) {
                        throw new Error('Invalid backup format');
                    }
                    
                    // Restore data
                    this.saveData(backup);
                    resolve(true);
                } catch (error) {
                    reject(error);
                }
            };
            
            reader.onerror = () => reject(new Error('Failed to read backup file'));
            reader.readAsText(file);
        });
    }

    // Utility methods
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    searchBooks(query) {
        const data = this.getData();
        if (!data || !data.books || !query) return data.books;
        
        const searchTerm = query.toLowerCase();
        return data.books.filter(book => 
            book.title.toLowerCase().includes(searchTerm) ||
            book.author.toLowerCase().includes(searchTerm)
        );
    }

    // Clear all data (for testing/reset)
    clearAllData() {
        localStorage.removeItem(this.storageKey);
        this.init();
        return true;
    }

    // Sync pending data when coming back online
    syncPendingData() {
        const data = this.getData();
        if (data) {
            // Update last sync timestamp
            data.lastSync = new Date().toISOString();
            this.saveData(data);
            console.log('BookKing: Data synced successfully');
        }
    }

    // Check if data is fresh (synced within last 24 hours)
    isDataFresh() {
        const data = this.getData();
        if (!data || !data.lastSync) return false;
        
        const lastSync = new Date(data.lastSync);
        const now = new Date();
        const hoursSinceSync = (now - lastSync) / (1000 * 60 * 60);
        
        return hoursSinceSync < 24;
    }

    // Get offline status information
    getOfflineStatus() {
        const data = this.getData();
        return {
            hasData: !!data,
            lastSync: data ? data.lastSync : null,
            isFresh: this.isDataFresh(),
            booksCount: data ? data.books.length : 0,
            sessionsCount: data ? data.sessions.length : 0
        };
    }
}

// Export storage instance
const bookKingStorage = new BookKingStorage();
window.bookKingStorage = bookKingStorage; 