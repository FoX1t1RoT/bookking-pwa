// BookKing Storage Module
class BookKingStorage {
    constructor() {
        this.data = this.loadData();
    }

    loadData() {
        try {
            const saved = localStorage.getItem('bookking-data');
            return saved ? JSON.parse(saved) : this.getDefaultData();
        } catch (error) {
            console.error('Error loading data:', error);
            return this.getDefaultData();
        }
    }

    saveData(data) {
        try {
            this.data = data;
            localStorage.setItem('bookking-data', JSON.stringify(data));
        } catch (error) {
            console.error('Error saving data:', error);
        }
    }

    getDefaultData() {
        return {
            books: [],
            sessions: [],
            goals: {
                dailyPages: 20,
                weeklyPages: 100,
                monthlyBooks: 2,
                yearlyBooks: 12
            },
            settings: {
                theme: 'light',
                notifications: true
            }
        };
    }

    // Books methods
    getBooks() {
        return this.data.books || [];
    }

    addBook(book) {
        book.id = this.generateId();
        book.createdAt = new Date().toISOString();
        book.status = 'active';
        this.data.books.push(book);
        this.saveData(this.data);
        return book;
    }

    updateBook(bookId, updates) {
        const book = this.data.books.find(b => b.id === bookId);
        if (book) {
            Object.assign(book, updates);
            this.saveData(this.data);
        }
        return book;
    }

    deleteBook(bookId) {
        this.data.books = this.data.books.filter(b => b.id !== bookId);
        this.data.sessions = this.data.sessions.filter(s => s.bookId !== bookId);
        this.saveData(this.data);
    }

    // Sessions methods
    getSessions(bookId = null) {
        if (bookId) {
            return this.data.sessions.filter(s => s.bookId === bookId) || [];
        }
        return this.data.sessions || [];
    }

    addSession(session) {
        session.id = this.generateId();
        session.createdAt = new Date().toISOString();
        this.data.sessions.push(session);
        this.saveData(this.data);
        return session;
    }

    updateSession(sessionId, updates) {
        const session = this.data.sessions.find(s => s.id === sessionId);
        if (session) {
            Object.assign(session, updates);
            this.saveData(this.data);
        }
        return session;
    }

    deleteSession(sessionId) {
        this.data.sessions = this.data.sessions.filter(s => s.id !== sessionId);
        this.saveData(this.data);
    }

    // Goals methods
    getGoals() {
        return this.data.goals || {
            dailyPages: 20,
            dailyMinutes: 30,
            weeklyBooks: 1
        };
    }

    updateGoals(goals) {
        this.data.goals = { ...this.data.goals, ...goals };
        this.saveData(this.data);
    }

    // Settings methods
    getSettings() {
        return this.data.settings || {
            theme: 'light',
            notifications: true
        };
    }

    updateSettings(settings) {
        this.data.settings = { ...this.data.settings, ...settings };
        this.saveData(this.data);
    }

    // Utility methods
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    getData() {
        return this.data;
    }

    clearAllData() {
        this.data = this.getDefaultData();
        this.saveData(this.data);
    }

    // Export/Import
    exportData() {
        return JSON.stringify(this.data, null, 2);
    }

    importData(jsonData) {
        try {
            const data = JSON.parse(jsonData);
            this.data = data;
            this.saveData(this.data);
            return true;
        } catch (error) {
            console.error('Error importing data:', error);
            return false;
        }
    }

    // Statistics methods
    getReadingStats(period = 'week') {
        const sessions = this.data.sessions || [];
        const now = new Date();
        
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
        const daySessions = sessions.filter(session => {
            const sessionDate = new Date(session.startTime || session.createdAt);
            return sessionDate.toDateString() === targetDate;
        });
        
        return {
            totalPages: daySessions.reduce((sum, session) => sum + (session.pagesRead || 0), 0),
            totalTime: daySessions.reduce((sum, session) => {
                if (session.duration !== undefined) {
                    return sum + (session.duration / 60); // convert seconds to minutes
                } else if (session.startTime && session.endTime) {
                    const duration = new Date(session.endTime) - new Date(session.startTime);
                    return sum + (duration / 1000 / 60); // minutes
                }
                return sum;
            }, 0),
            totalSessions: daySessions.length,
            averageSpeed: daySessions.length > 0 
                ? daySessions.reduce((sum, session) => sum + (session.readingSpeed || 0), 0) / daySessions.length 
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
            const sessionDate = new Date(session.startTime || session.createdAt);
            return sessionDate.getMonth() === month && sessionDate.getFullYear() === year;
        });

        // Array by days of month
        const days = [];
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        for (let d = 1; d <= daysInMonth; d++) {
            const daySessions = monthSessions.filter(session => {
                const sessionDate = new Date(session.startTime || session.createdAt);
                return sessionDate.getDate() === d;
            });
            days.push({
                day: d,
                totalPages: daySessions.reduce((sum, s) => sum + (s.pagesRead || 0), 0),
                totalTime: daySessions.reduce((sum, s) => sum + (s.duration ? s.duration / 60 : 0), 0),
                totalSessions: daySessions.length
            });
        }

        return {
            totalPages: monthSessions.reduce((sum, session) => sum + (session.pagesRead || 0), 0),
            totalTime: monthSessions.reduce((sum, session) => {
                if (session.duration !== undefined) {
                    return sum + (session.duration / 60);
                } else if (session.startTime && session.endTime) {
                    const duration = new Date(session.endTime) - new Date(session.startTime);
                    return sum + (duration / 1000 / 60);
                }
                return sum;
            }, 0),
            totalSessions: monthSessions.length,
            booksCompleted: this.getBooksCompletedInPeriod(month, year),
            days
        };
    }

    getYearStats(sessions, date) {
        const year = date.getFullYear();
        const yearSessions = sessions.filter(session => {
            const sessionDate = new Date(session.startTime || session.createdAt);
            return sessionDate.getFullYear() === year;
        });

        // Array by months
        const months = [];
        for (let m = 0; m < 12; m++) {
            const monthSessions = yearSessions.filter(session => {
                const sessionDate = new Date(session.startTime || session.createdAt);
                return sessionDate.getMonth() === m;
            });
            months.push({
                month: m + 1,
                totalPages: monthSessions.reduce((sum, s) => sum + (s.pagesRead || 0), 0),
                totalTime: monthSessions.reduce((sum, s) => sum + (s.duration ? s.duration / 60 : 0), 0),
                totalSessions: monthSessions.length,
                booksCompleted: this.getBooksCompletedInPeriod(m, year)
            });
        }

        return {
            totalPages: yearSessions.reduce((sum, session) => sum + (session.pagesRead || 0), 0),
            totalTime: yearSessions.reduce((sum, session) => {
                if (session.duration !== undefined) {
                    return sum + (session.duration / 60);
                } else if (session.startTime && session.endTime) {
                    const duration = new Date(session.endTime) - new Date(session.startTime);
                    return sum + (duration / 1000 / 60);
                }
                return sum;
            }, 0),
            totalSessions: yearSessions.length,
            booksCompleted: this.getBooksCompletedInYear(year),
            months
        };
    }

    getBooksCompletedInPeriod(month, year) {
        return this.data.books.filter(book => {
            if ((book.status !== 'finished' && book.status !== 'archived') || !book.dateFinished) return false;
            const finishedDate = new Date(book.dateFinished);
            return finishedDate.getMonth() === month && finishedDate.getFullYear() === year;
        }).length;
    }

    getBooksCompletedInYear(year) {
        return this.data.books.filter(book => {
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
}

// Initialize and export
console.log('Initializing BookKingStorage...');
window.bookKingStorage = new BookKingStorage();
console.log('BookKingStorage initialized:', window.bookKingStorage); 