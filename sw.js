// BookKing Service Worker - iOS Optimized AGGRESSIVE OFFLINE MODE
// Version: aggressive-offline-v1.0.8

const CACHE_NAME = 'bookking-aggressive-offline-v1.0.9';
const OFFLINE_URL = './offline.html';

// AGGRESSIVE OFFLINE MODE - Block all network requests
let AGGRESSIVE_OFFLINE_MODE = true;

// Cache all essential files with version parameters  
const CACHE_FILES = [
    './',
    './index.html',
    './manifest.json?v=4.9.5&t=1734750000',
    './offline.html',
    './favicon.ico',
    './assets/css/main-new.css?v=1.0.25&t=1734750000',
    './assets/css/components.css?v=4.9.27&t=1734750000',
    './assets/js/storage.js?v=4.6.3&t=1734725000',
    './assets/js/components.js?v=4.9.15&t=1734750000',
    './assets/js/plan-component.js?v=4.4.3&t=1734725000',
    './assets/js/settings-component.js?v=4.4.2&t=1734725000',
    './assets/js/app.js?v=4.4.11&t=1734747000',
    './assets/icons/favicon.svg',
    './assets/icons/icon-192.svg',
    './assets/icons/icon-512.svg',
    './assets/icons/tab-plan.svg',
    './assets/icons/tab-read.svg',
    './assets/icons/tab-settings.svg',
    './assets/icons/tab-track.svg'
];

console.log('BookKing SW: iOS AGGRESSIVE OFFLINE MODE - Installing...');

// Install event - cache all files
self.addEventListener('install', (event) => {
    console.log('BookKing SW: iOS AGGRESSIVE OFFLINE - Installing cache...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('BookKing SW: iOS AGGRESSIVE OFFLINE - Caching files...');
                // Cache files one by one to handle failures gracefully
                const cachePromises = CACHE_FILES.map(url => {
                    return cache.add(url).catch(error => {
                        console.log('BookKing SW: Failed to cache:', url, error);
                        return null; // Continue even if some files fail
                    });
                });
                return Promise.all(cachePromises);
            })
            .then(() => {
                console.log('BookKing SW: iOS AGGRESSIVE OFFLINE - Cache installed, skipping waiting');
                return self.skipWaiting();
            })
            .catch((error) => {
                console.log('BookKing SW: iOS AGGRESSIVE OFFLINE - Cache install failed:', error);
                // Continue even if cache fails
                return self.skipWaiting();
            })
    );
});

// Activate event - claim clients immediately
self.addEventListener('activate', (event) => {
    console.log('BookKing SW: iOS AGGRESSIVE OFFLINE - Activating...');
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== CACHE_NAME) {
                            console.log('BookKing SW: iOS AGGRESSIVE OFFLINE - Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('BookKing SW: iOS AGGRESSIVE OFFLINE - Claiming clients...');
                return self.clients.claim();
            })
            .then(() => {
                console.log('BookKing SW: iOS AGGRESSIVE OFFLINE - Activated and claiming clients');
            })
    );
});

// Fetch event - AGGRESSIVE CACHE ONLY STRATEGY for iOS
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    
    // Skip non-GET requests
    if (event.request.method !== 'GET') {
        return;
    }
    
    // AGGRESSIVE OFFLINE MODE - Only serve from cache, never network
    if (AGGRESSIVE_OFFLINE_MODE) {
        console.log('BookKing SW: iOS AGGRESSIVE OFFLINE - Fetch request for:', url.pathname);
        
    event.respondWith(
            caches.match(event.request)
            .then((response) => {
                if (response) {
                        console.log('BookKing SW: iOS AGGRESSIVE OFFLINE - Serving from cache:', url.pathname);
                    return response;
                    } else {
                        // Try to match without query parameters
                        const urlWithoutParams = url.pathname;
                        console.log('BookKing SW: iOS AGGRESSIVE OFFLINE - Trying without params:', urlWithoutParams);
                        return caches.match(urlWithoutParams);
                }
                })
                    .then((response) => {
                    if (response) {
                        console.log('BookKing SW: iOS AGGRESSIVE OFFLINE - Serving from cache (no params):', url.pathname);
                        return response;
                    } else {
                        // For navigation requests, serve index.html
                        if (event.request.mode === 'navigate') {
                            console.log('BookKing SW: iOS AGGRESSIVE OFFLINE - Navigation request, serving index.html');
                            return caches.match('./index.html');
                        }
                        // For other requests, serve offline page
                        console.log('BookKing SW: iOS AGGRESSIVE OFFLINE - Not in cache, serving offline page:', url.pathname);
                        return caches.match(OFFLINE_URL);
                    }
                })
                .catch((error) => {
                    console.log('BookKing SW: iOS AGGRESSIVE OFFLINE - Cache error, serving offline page:', error);
                    return caches.match(OFFLINE_URL);
                })
        );
        return;
    }
    
    // Fallback for non-aggressive mode (should not be used)
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                return response || fetch(event.request);
            })
    );
});

// Message event - handle aggressive offline commands
self.addEventListener('message', (event) => {
    console.log('BookKing SW: iOS AGGRESSIVE OFFLINE - Received message:', event.data);
    
    if (event.data && event.data.action === 'FORCE_AGGRESSIVE_OFFLINE') {
        console.log('BookKing SW: iOS AGGRESSIVE OFFLINE - Force offline mode activated');
        AGGRESSIVE_OFFLINE_MODE = true;
        if (event.ports && event.ports[0]) {
            event.ports[0].postMessage({ status: 'AGGRESSIVE_OFFLINE_ENABLED' });
        }
    }
    
    if (event.data && event.data.action === 'CHECK_AGGRESSIVE_OFFLINE_STATUS') {
        console.log('BookKing SW: iOS AGGRESSIVE OFFLINE - Status check');
        if (event.ports && event.ports[0]) {
            event.ports[0].postMessage({ 
                status: 'AGGRESSIVE_OFFLINE_ACTIVE',
                mode: AGGRESSIVE_OFFLINE_MODE 
            });
    }
    }
    
    if (event.data && event.data.action === 'SKIP_WAITING') {
        console.log('BookKing SW: iOS AGGRESSIVE OFFLINE - Skipping waiting');
        self.skipWaiting();
    }
    
    // Handle other message types
    if (event.data && event.data.action === 'GET_CACHE_STATUS') {
        console.log('BookKing SW: iOS AGGRESSIVE OFFLINE - Cache status requested');
        // Don't send response if no port
    }
});

// Background sync - disabled in aggressive mode
self.addEventListener('sync', (event) => {
    console.log('BookKing SW: iOS AGGRESSIVE OFFLINE - Background sync blocked');
    event.waitUntil(Promise.resolve());
});

// Push notifications - disabled in aggressive mode
self.addEventListener('push', (event) => {
    console.log('BookKing SW: iOS AGGRESSIVE OFFLINE - Push notification blocked');
    event.waitUntil(Promise.resolve());
});

// Error handling for iOS
self.addEventListener('error', (event) => {
    console.log('BookKing SW: iOS AGGRESSIVE OFFLINE - Error:', event.error);
});

// Unhandled rejection handling for iOS
self.addEventListener('unhandledrejection', (event) => {
    console.log('BookKing SW: iOS AGGRESSIVE OFFLINE - Unhandled rejection:', event.reason);
    event.preventDefault();
});

console.log('BookKing SW: iOS AGGRESSIVE OFFLINE MODE - Service Worker loaded and ready'); 