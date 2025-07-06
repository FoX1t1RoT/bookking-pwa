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
                dailyMinutes: 30,
                weeklyBooks: 1
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
}

// Initialize and export
window.bookKingStorage = new BookKingStorage(); 