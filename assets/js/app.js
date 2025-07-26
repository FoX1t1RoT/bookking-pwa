// BookKing Main Application - Version 4.4.11 - Offline Ready
class BookKingApp {
    constructor() {
        this.storage = null;
        this.components = null;
        this.isOnline = navigator.onLine;
        this.init();
    }

    async init() {
        try {
            // Initialize storage
            this.storage = window.bookKingStorage;
            
            // Initialize components
            this.components = new BookKingComponents(this.storage);
            
            // Initialize dark theme
            this.initializeTheme();
        
        // Make components available globally for debugging
        window.bookKingComponents = this.components;
        
        // Add console shortcuts for debugging
        window.switchToRead = () => this.components.switchTab('read');
        window.switchToTrack = () => this.components.switchTab('track');
        window.switchToPlan = () => this.components.switchTab('plan');
        window.switchToSettings = () => this.components.switchTab('settings');
        window.toggleTheme = () => this.toggleTheme();
        window.addTestSession = (bookId, minutes, pages) => this.components.addTestSession(bookId, minutes, pages);
        window.getBooks = () => {
            const books = this.storage.getBooks();
            console.log('All books:', books);
            books.forEach(book => {
                console.log(`📖 "${book.title}" by ${book.author} - ID: ${book.id}`);
            });
            return books;
        };
        window.getSessions = (bookId) => {
            const sessions = this.storage.getSessions(bookId);
            console.log('Sessions for book:', bookId, sessions);
            return sessions;
        };
        window.fixSessions = () => {
            const data = this.storage.getData();
            let fixed = 0;
            data.sessions.forEach(session => {
                if (!session.duration && session.startTime && session.endTime) {
                    const duration = new Date(session.endTime) - new Date(session.startTime);
                    session.duration = Math.floor(duration / 1000);
                    fixed++;
                }
            });
            this.storage.saveData(data);
            console.log(`Исправлено ${fixed} сессий`);
            this.components.loadCurrentScreen();
        };
        window.checkAddButton = () => {
            const addButton = document.querySelector('.add-button');
            console.log('Add button found:', !!addButton);
            console.log('Add button visible:', addButton ? addButton.style.display : 'N/A');
            console.log('Add button onclick:', addButton ? !!addButton.onclick : 'N/A');
            return addButton;
        };
        window.checkTime = (bookId) => {
            const sessions = this.storage.getSessions(bookId);
            console.log('🔍 Сессии для книги:', sessions);
            let totalSeconds = 0;
            sessions.forEach(session => {
                if (session.duration && session.duration > 0) {
                    totalSeconds += session.duration;
                    console.log(`Session ${session.id}: ${session.duration}sec`);
                }
            });
            const totalMinutes = totalSeconds / 60;
            console.log(`⏰ Общее время: ${totalSeconds} секунд (${totalMinutes.toFixed(2)} минут)`);
            
            // Test formatTimeDisplay function
            const formattedTime = this.components.formatTimeDisplay(totalMinutes);
            console.log(`📝 Отформатированное время: "${formattedTime}"`);
            
            return {seconds: totalSeconds, minutes: totalMinutes, formatted: formattedTime};
        };
        window.testFormat = (minutes) => {
            console.log(`🧪 Тестируем formatTimeDisplay с ${minutes} минут:`);
            return this.components.formatTimeDisplay(minutes);
        };
        window.clearCache = () => {
            if ('caches' in window) {
                caches.keys().then(names => {
                    names.forEach(name => {
                        console.log(`Очищаем кеш: ${name}`);
                        caches.delete(name);
                    });
                });
            }
            console.log('Кеш очищен! Перезагрузите страницу.');
        };
        window.showSessions = (bookId) => {
            console.log(`📚 Opening Reading Sessions for book: ${bookId}`);
            this.components.currentBookId = bookId;
            this.components.showReadingSessions();
        };
        window.addSessionForm = (bookId) => {
            console.log(`➕ Opening Add Session form for book: ${bookId}`);
            this.components.currentBookId = bookId;
            this.components.showAddSessionForm();
        };
        
        window.fixFinishedBooks = () => {
            console.log('🔧 Fixing finished books without dateFinished...');
            return this.components.fixFinishedBooksWithoutDate();
        };
        
        window.testTimer = () => {
            console.log('⏰ Timer Test Functions:');
            console.log('- testTimer.check() - Check timer state');
            console.log('- testTimer.simulate() - Simulate background/foreground');
            console.log('- testTimer.clear() - Clear timer state');
            
            return {
                check: () => {
                    const active = localStorage.getItem('bookking_timer_active');
                    const start = localStorage.getItem('bookking_timer_start');
                    const elapsed = this.components.readingElapsed;
                    const running = !!this.components.readingTimer;
                    
                    console.log('Timer state:', {
                        active: active === 'true',
                        startTime: start ? new Date(parseInt(start)) : null,
                        elapsed: elapsed + ' seconds',
                        intervalRunning: running
                    });
                    
                    if (active === 'true' && start) {
                        const realElapsed = Math.floor((Date.now() - parseInt(start)) / 1000);
                        console.log('Real elapsed time:', realElapsed + ' seconds');
                    }
                },
                
                simulate: () => {
                    console.log('Simulating app going to background...');
                    Object.defineProperty(document, 'hidden', { value: true, writable: true });
                    document.dispatchEvent(new Event('visibilitychange'));
                    
                    setTimeout(() => {
                        console.log('Simulating app returning to foreground...');
                        Object.defineProperty(document, 'hidden', { value: false, writable: true });
                        document.dispatchEvent(new Event('visibilitychange'));
                    }, 2000);
                },
                
                clear: () => {
                    localStorage.removeItem('bookking_timer_active');
                    localStorage.removeItem('bookking_timer_start');
                    localStorage.removeItem('bookking_screen_state');
                    if (this.components.readingTimer) {
                        clearInterval(this.components.readingTimer);
                        this.components.readingTimer = null;
                    }
                    console.log('Timer and screen state cleared');
                }
            };
        };
        
        window.testScreen = () => {
            console.log('📱 Screen State Test Functions:');
            console.log('- testScreen.check() - Check current screen state');
            console.log('- testScreen.save() - Save current screen state'); 
            console.log('- testScreen.restore() - Restore screen state');
            console.log('- testScreen.clear() - Clear screen state');
            
            return {
                check: () => {
                    const screenState = localStorage.getItem('bookking_screen_state');
                    const timerActive = localStorage.getItem('bookking_timer_active');
                    
                    console.log('Current components state:', {
                        currentView: this.components.currentView,
                        currentBookId: this.components.currentBookId,
                        currentTab: this.components.currentTab,
                        showingArchive: this.components.showingArchive
                    });
                    
                    console.log('Saved screen state:', screenState ? JSON.parse(screenState) : null);
                    console.log('Timer active:', timerActive === 'true');
                },
                
                save: () => {
                    this.components.saveScreenState();
                    console.log('Screen state saved manually');
                },
                
                restore: () => {
                    const restored = this.components.restoreScreenState();
                    console.log('Screen state restore result:', restored);
                    if (restored) {
                        this.components.loadCurrentScreen();
                    }
                },
                
                clear: () => {
                    this.components.clearScreenState();
                    console.log('Screen state cleared');
                }
            };
        };
        
        console.log('Debug functions available:');
        console.log('- switchToRead() - Switch to Read tab');
        console.log('- switchToTrack() - Switch to Track tab');
        console.log('- switchToPlan() - Switch to Plan tab');
        console.log('- switchToSettings() - Switch to Settings tab');
        console.log('- getBooks() - Show all books with IDs');
        console.log('- getSessions(bookId) - Show sessions for a book');
        console.log('- addTestSession(bookId, minutes, pages) - Add test reading session');
        console.log('- fixSessions() - Fix old sessions without duration');
        console.log('- checkAddButton() - Check add button status');
        console.log('- checkTime(bookId) - Check reading time for book');
        console.log('- testFormat(minutes) - Test time formatting');
        console.log('- clearCache() - Clear browser cache');
        console.log('- showSessions(bookId) - Show reading sessions for a book');
        console.log('- addSessionForm(bookId) - Open manual add session form');
        console.log('- fixFinishedBooks() - Fix finished books without dateFinished');
        console.log('- testTimer() - Timer testing functions (check, simulate, clear)');
        console.log('- testScreen() - Screen state testing functions (check, save, restore, clear)');
        console.log('- window.bookKingComponents - Access to components');
        console.log('- toggleTheme() - Toggle dark/light theme');
            
            // Register service worker for offline functionality
            await this.registerServiceWorker();
            
            // Setup PWA events
            this.setupPWAEvents();
            
            // Setup online/offline detection
            this.setupNetworkDetection();
            
            console.log('BookKing App initialized successfully');
        } catch (error) {
            console.error('Failed to initialize BookKing App:', error);
        }
    }

    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/sw.js');
                console.log('Service Worker registered for offline use:', registration);
                
                // Listen for updates
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            this.showUpdateNotification();
                        }
                    });
                });
                
                // Check cache status
                if (registration.active) {
                    const channel = new MessageChannel();
                    channel.port1.onmessage = (event) => {
                        if (event.data.status) {
                            console.log('Cache status:', event.data.status);
                        }
                    };
                    registration.active.postMessage({ action: 'GET_CACHE_STATUS' }, [channel.port2]);
                }
            } catch (error) {
                console.log('Service Worker registration failed:', error);
            }
        }
    }

    setupPWAEvents() {
        // PWA install prompt
        let deferredPrompt;
        
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            this.showInstallButton(deferredPrompt);
        });

        // PWA installed
        window.addEventListener('appinstalled', () => {
            console.log('BookKing PWA was installed');
            this.hideInstallButton();
        });

        // Handle app visibility changes
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.handleAppVisible();
            }
        });
    }

    setupNetworkDetection() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.handleOnlineStatus();
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.handleOfflineStatus();
        });

        // Check initial online status
        this.handleOnlineStatus();
    }

    showInstallButton(deferredPrompt) {
        // Create install button if not exists
        let installButton = document.getElementById('installButton');
        if (!installButton) {
            installButton = document.createElement('button');
            installButton.id = 'installButton';
            installButton.textContent = 'Install App';
            installButton.style.cssText = `
                position: fixed;
                bottom: 100px;
                right: 20px;
                background: #007AFF;
                color: white;
                border: none;
                padding: 12px 20px;
                border-radius: 8px;
                font-weight: 600;
                cursor: pointer;
                z-index: 1000;
            `;
            document.body.appendChild(installButton);
        }

        installButton.addEventListener('click', async () => {
            if (deferredPrompt) {
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                console.log(`User response to install prompt: ${outcome}`);
                deferredPrompt = null;
                this.hideInstallButton();
            }
        });
    }

    hideInstallButton() {
        const installButton = document.getElementById('installButton');
        if (installButton) {
            installButton.remove();
        }
    }

    showUpdateNotification() {
        const notification = document.createElement('div');
        notification.innerHTML = `
            <div style="position: fixed; top: max(0px, env(safe-area-inset-top)); left: 0; right: 0; background: #007AFF; color: white; padding: 12px; text-align: center; z-index: 9999;">
                <span>New version available!</span>
                <button onclick="window.location.reload()" style="background: white; color: #007AFF; border: none; padding: 4px 12px; margin-left: 12px; border-radius: 4px; cursor: pointer;">Update</button>
            </div>
        `;
        document.body.appendChild(notification);
    }

    handleAppVisible() {
        // Try to restore screen state first
        if (this.components && this.components.restoreScreenState()) {
            // Screen state was restored - load the appropriate screen
            console.log('Restoring screen state after background return');
            
            // If we were on reading screen with active timer, restore it
            if (this.components.currentView === 'reading' && 
                localStorage.getItem('bookking_timer_active') === 'true') {
                
                const book = this.components.storage.getBooks().find(b => b.id === this.components.currentBookId);
                if (book) {
                    // Switch to read tab and render reading screen
                    this.components.switchTab('read');
                    this.components.renderReadingScreen(book);
                    
                    // Resume timer updates if timer was active
                    if (this.components.readingStartTime) {
                        this.components.startTimerInterval();
                        console.log('Resumed reading screen with active timer');
                    }
                    return;
                }
            }
            
            // For other screen states, load the appropriate screen
            this.components.loadCurrentScreen();
        } else {
            // No saved state - just refresh current screen
            if (this.components && this.components.currentTab) {
                this.components.loadCurrentScreen();
            }
        }
    }

    handleOnlineStatus() {
        console.log('BookKing: Network available but staying completely offline');
        // Don't show online indicator - we're staying offline
        // Don't sync data - we're completely offline
    }

    handleOfflineStatus() {
        console.log('BookKing: Completely offline mode');
        this.showOfflineIndicator();
        
        // Check if we have cached data
        this.checkOfflineCapability();
    }

    showOnlineIndicator() {
        // Remove offline indicator if exists
        const offlineIndicator = document.getElementById('offline-indicator');
        if (offlineIndicator) {
            offlineIndicator.remove();
        }
    }

    showOfflineIndicator() {
        // Remove existing indicator
        this.showOnlineIndicator();
        
        // Create offline indicator
        const indicator = document.createElement('div');
        indicator.id = 'offline-indicator';
        indicator.innerHTML = `
            <div style="
                position: fixed;
                top: max(0px, env(safe-area-inset-top));
                left: 0;
                right: 0;
                background: #FF9500;
                color: white;
                text-align: center;
                padding: 8px;
                font-size: 14px;
                font-weight: 500;
                z-index: 9999;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            ">
                📱 Работаем в оффлайн режиме
            </div>
            `;
        document.body.appendChild(indicator);
        
        // Auto-hide after 3 seconds
        setTimeout(() => {
            if (indicator.parentNode) {
                indicator.style.opacity = '0';
                indicator.style.transition = 'opacity 0.5s ease';
                setTimeout(() => {
                    if (indicator.parentNode) {
                        indicator.remove();
        }
                }, 500);
            }
        }, 3000);
    }

    async checkOfflineCapability() {
        if ('caches' in window) {
            try {
                const cache = await caches.open('bookking-static-v4.5.19');
                const keys = await cache.keys();
                
                if (keys.length > 0) {
                    console.log('BookKing: Offline cache available with', keys.length, 'items');
                    this.showOfflineReadyMessage();
                } else {
                    console.log('BookKing: No offline cache available');
                    this.showOfflineWarning();
                }
            } catch (error) {
                console.error('BookKing: Error checking cache:', error);
            }
        }
    }

    showOfflineReadyMessage() {
        // Show a subtle message that offline mode is ready
        const message = document.createElement('div');
        message.innerHTML = `
            <div style="
                position: fixed;
                bottom: 80px;
                left: 50%;
                transform: translateX(-50%);
                background: #34C759;
                color: white;
                padding: 8px 16px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: 500;
                z-index: 9998;
                box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            ">
                ✅ Оффлайн режим активен
            </div>
        `;
        document.body.appendChild(message);
        
        setTimeout(() => {
            if (message.parentNode) {
                message.remove();
            }
        }, 2000);
    }

    showOfflineWarning() {
        const message = document.createElement('div');
        message.innerHTML = `
            <div style="
                position: fixed;
                bottom: 80px;
                left: 50%;
                transform: translateX(-50%);
                background: #FF3B30;
                color: white;
                padding: 8px 16px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: 500;
                z-index: 9998;
                box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            ">
                ⚠️ Нет оффлайн данных
            </div>
        `;
        document.body.appendChild(message);
        
        setTimeout(() => {
            if (message.parentNode) {
                message.remove();
            }
        }, 3000);
    }

    // Utility methods for components
    formatTime(minutes) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        
        if (hours > 0) {
            return `${hours}h ${mins}m`;
        }
        return `${mins}m`;
    }

    formatReadingSpeed(pagesPerMinute) {
        if (pagesPerMinute < 1) {
            return `${Math.round(pagesPerMinute * 60)} sec/page`;
        }
        return `${Math.round(pagesPerMinute)} pages/min`;
    }

    // Export/Import functionality
    async exportData() {
        try {
            const success = this.storage.createBackup();
            if (success) {
                this.components.showToast('Data exported successfully!');
            }
        } catch (error) {
            console.error('Export failed:', error);
            this.components.showToast('Export failed', 'error');
        }
    }

    async importData(file) {
        try {
            await this.storage.restoreFromBackup(file);
            this.components.showToast('Data imported successfully!');
            this.components.loadCurrentScreen();
        } catch (error) {
            console.error('Import failed:', error);
            this.components.showToast('Import failed: ' + error.message, 'error');
        }
    }

    // Debug methods (for development)
    addSampleData() {
        // Add sample books
        this.storage.addBook({
            title: "The Great Gatsby",
            author: "F. Scott Fitzgerald",
            firstPage: 1,
            lastPage: 180
        });

        this.storage.addBook({
            title: "To Kill a Mockingbird",
            author: "Harper Lee",
            firstPage: 1,
            lastPage: 281
        });

        // Add sample reading session
        const books = this.storage.getBooks();
        if (books.length > 0) {
            const now = new Date();
            const startTime = new Date(now.getTime() - 30 * 60 * 1000); // 30 minutes ago
            
            this.storage.addSession({
                bookId: books[0].id,
                startTime: startTime.toISOString(),
                endTime: now.toISOString(),
                pagesRead: 10,
                readingSpeed: 0.33, // pages per minute
                notes: 'Great reading session'
            });
        }

        // Set sample goals
        this.storage.updateGoals({
            dailyPages: 20,
            weeklyPages: 100,
            monthlyBooks: 2,
            yearlyBooks: 24
        });

        this.components.showToast('Sample data added!');
        this.components.loadCurrentScreen();
    }

    clearAllData() {
        if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
            this.storage.clearAllData();
            this.components.showToast('All data cleared');
            this.components.loadCurrentScreen();
        }
    }

    // Theme management
    initializeTheme() {
        // Apply dark theme by default
        document.body.classList.add('dark-theme');
        
        // Save preference
        localStorage.setItem('bookking-theme', 'dark');
        
        console.log('Dark theme initialized');
    }

    toggleTheme() {
        const isDark = document.body.classList.contains('dark-theme');
        
        if (isDark) {
            document.body.classList.remove('dark-theme');
            localStorage.setItem('bookking-theme', 'light');
            console.log('Switched to light theme');
        } else {
            document.body.classList.add('dark-theme');
            localStorage.setItem('bookking-theme', 'dark');
            console.log('Switched to dark theme');
        }
    }

    loadSavedTheme() {
        const savedTheme = localStorage.getItem('bookking-theme');
        if (savedTheme === 'dark') {
            document.body.classList.add('dark-theme');
        } else {
            document.body.classList.remove('dark-theme');
        }
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.bookKingApp = new BookKingApp();
    
    // Force refresh for development
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({action: 'SKIP_WAITING'});
    }
});

// Make app available globally for debugging
window.BookKingApp = BookKingApp; 