// Settings Component Extension for BookKing
BookKingComponents.prototype.loadSettingsScreen = function() {
    this.updateHeader('', false);
    this.renderSettingsScreen();
};

BookKingComponents.prototype.renderSettingsScreen = function() {
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
                    <input type="number" class="settings-input" id="dailyPages" value="${goals.dailyPages}" min="0" max="999">
                </div>
                <div class="settings-item">
                    <div class="settings-label">Weekly Pages</div>
                    <input type="number" class="settings-input" id="weeklyPages" value="${goals.weeklyPages}" min="0" max="9999">
                </div>
                <div class="settings-item">
                    <div class="settings-label">Monthly Books</div>
                    <input type="number" class="settings-input" id="monthlyBooks" value="${goals.monthlyBooks}" min="0" max="999">
                </div>
                <div class="settings-item">
                    <div class="settings-label">Yearly Books</div>
                    <input type="number" class="settings-input" id="yearlyBooks" value="${goals.yearlyBooks}" min="0" max="999">
                </div>
            </div>
            <button class="save-button" id="saveGoals">Save Goals</button>
        </div>
        
        <div class="settings-section">
            <div class="settings-section-title">Data Management</div>
            <div class="settings-card">
                <button class="backup-button" id="createBackup">
                    <span class="backup-icon">💾</span>
                    Create Backup
                </button>
                <button class="backup-button" id="restoreBackup">
                    <span class="backup-icon">📁</span>
                    Restore from Backup
                    <input type="file" id="backupFile" accept=".json" style="display: none;">
                </button>
            </div>
        </div>

        <div class="settings-section">
            <div class="settings-section-title">Statistics</div>
            <div class="settings-card">
                ${this.renderSettingsStats()}
            </div>
        </div>

        <div class="settings-section">
            <div class="settings-section-title">About</div>
            <div class="settings-card">
                <div class="settings-item">
                    <div class="settings-label">Version</div>
                    <div class="settings-value">1.0.0</div>
                </div>
                <div class="settings-item">
                    <div class="settings-label">Data Storage</div>
                    <div class="settings-value">${this.getStorageSize()}</div>
                </div>
                <button class="backup-button danger" id="clearAllData">
                    <span class="backup-icon">🗑️</span>
                    Clear All Data
                </button>
            </div>
        </div>
    `;

    this.bindSettingsEvents();
};

BookKingComponents.prototype.renderSettingsStats = function() {
    const data = this.storage.getData();
    const booksCount = data?.books?.length || 0;
    const sessionsCount = data?.sessions?.length || 0;
    const totalPages = data?.sessions?.reduce((sum, session) => sum + session.pagesRead, 0) || 0;
    const totalTime = data?.sessions?.reduce((sum, session) => {
        const duration = new Date(session.endTime) - new Date(session.startTime);
        return sum + Math.floor(duration / 1000 / 60);
    }, 0) || 0;

    return `
        <div class="settings-item">
            <div class="settings-label">Total Books</div>
            <div class="settings-value">${booksCount}</div>
        </div>
        <div class="settings-item">
            <div class="settings-label">Reading Sessions</div>
            <div class="settings-value">${sessionsCount}</div>
        </div>
        <div class="settings-item">
            <div class="settings-label">Total Pages Read</div>
            <div class="settings-value">${totalPages}</div>
        </div>
        <div class="settings-item">
            <div class="settings-label">Total Time Read</div>
            <div class="settings-value">${this.formatTimeDisplay(totalTime)}</div>
        </div>
    `;
};

BookKingComponents.prototype.bindSettingsEvents = function() {
    // Save goals
    const saveGoalsBtn = document.getElementById('saveGoals');
    if (saveGoalsBtn) {
        saveGoalsBtn.addEventListener('click', () => this.saveGoals());
    }

    // Create backup
    const createBackupBtn = document.getElementById('createBackup');
    if (createBackupBtn) {
        createBackupBtn.addEventListener('click', () => {
            this.storage.createBackup();
            this.showToast('Backup created successfully!');
        });
    }

    // Restore backup
    const restoreBackupBtn = document.getElementById('restoreBackup');
    const backupFile = document.getElementById('backupFile');
    
    if (restoreBackupBtn && backupFile) {
        restoreBackupBtn.addEventListener('click', () => backupFile.click());
        backupFile.addEventListener('change', (e) => this.handleRestoreBackup(e));
    }

    // Clear all data
    const clearDataBtn = document.getElementById('clearAllData');
    if (clearDataBtn) {
        clearDataBtn.addEventListener('click', () => this.confirmClearAllData());
    }

    // Input validation for goals
    document.querySelectorAll('.settings-input').forEach(input => {
        input.addEventListener('input', () => this.validateGoalsInput(input));
        input.addEventListener('blur', () => this.formatGoalsInput(input));
    });
};

BookKingComponents.prototype.saveGoals = function() {
    const goals = {
        dailyPages: parseInt(document.getElementById('dailyPages').value) || 0,
        weeklyPages: parseInt(document.getElementById('weeklyPages').value) || 0,
        monthlyBooks: parseInt(document.getElementById('monthlyBooks').value) || 0,
        yearlyBooks: parseInt(document.getElementById('yearlyBooks').value) || 0
    };

    // Validate goals
    if (goals.dailyPages < 0 || goals.weeklyPages < 0 || goals.monthlyBooks < 0 || goals.yearlyBooks < 0) {
        this.showToast('Goals cannot be negative', 'error');
        return;
    }

    if (goals.dailyPages > goals.weeklyPages && goals.weeklyPages > 0) {
        this.showToast('Daily pages cannot exceed weekly pages', 'error');
        return;
    }

    this.storage.updateGoals(goals);
    this.showToast('Goals saved successfully!');
    
    // Update goals display if on track screen
    if (this.currentTab === 'track') {
        this.loadTrackScreen();
    }
};

BookKingComponents.prototype.validateGoalsInput = function(input) {
    const value = parseInt(input.value);
    const max = parseInt(input.getAttribute('max'));
    
    if (value > max) {
        input.value = max;
    }
    
    if (value < 0) {
        input.value = 0;
    }
};

BookKingComponents.prototype.formatGoalsInput = function(input) {
    if (input.value === '') {
        input.value = '0';
    }
};

BookKingComponents.prototype.handleRestoreBackup = async function(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Reset file input
    event.target.value = '';

    try {
        await this.storage.restoreFromBackup(file);
        this.showToast('Backup restored successfully!');
        this.renderSettingsScreen(); // Refresh stats
        
        // Refresh current screen
        this.loadCurrentScreen();
    } catch (error) {
        this.showToast('Failed to restore backup: ' + error.message, 'error');
    }
};

BookKingComponents.prototype.confirmClearAllData = function() {
    const confirmModal = this.createConfirmModal(
        'Clear All Data',
        'Are you sure you want to delete all your books, reading sessions, and goals? This action cannot be undone.',
        'Delete All',
        () => {
            this.storage.clearAllData();
            this.showToast('All data cleared');
            this.renderSettingsScreen();
            this.loadCurrentScreen();
        }
    );
    
    document.body.appendChild(confirmModal);
    confirmModal.classList.add('active');
};

BookKingComponents.prototype.createConfirmModal = function(title, message, confirmText, onConfirm) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay confirm-modal';
    modal.innerHTML = `
        <div class="modal-content confirm-modal-content">
            <div class="confirm-header">
                <h3>${title}</h3>
            </div>
            <div class="confirm-body">
                <p>${message}</p>
            </div>
            <div class="confirm-actions">
                <button class="confirm-cancel">Cancel</button>
                <button class="confirm-confirm danger">${confirmText}</button>
            </div>
        </div>
    `;

    // Bind events
    const cancelBtn = modal.querySelector('.confirm-cancel');
    const confirmBtn = modal.querySelector('.confirm-confirm');

    cancelBtn.addEventListener('click', () => {
        modal.remove();
    });

    confirmBtn.addEventListener('click', () => {
        onConfirm();
        modal.remove();
    });

    // Close on overlay click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });

    return modal;
};

BookKingComponents.prototype.getStorageSize = function() {
    try {
        const data = JSON.stringify(this.storage.getData());
        const bytes = new Blob([data]).size;
        
        if (bytes < 1024) {
            return `${bytes} bytes`;
        } else if (bytes < 1024 * 1024) {
            return `${(bytes / 1024).toFixed(1)} KB`;
        } else {
            return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
        }
    } catch (error) {
        return 'Unknown';
    }
};

// Add styles for settings components
const settingsStyles = `
.settings-value {
    font-size: 16px;
    color: #8e8e93;
    font-weight: 500;
}

.backup-icon {
    margin-right: 8px;
    font-size: 16px;
}

.backup-button.danger {
    color: #ff3b30;
}

.backup-button.danger:hover {
    background-color: #ffebee;
}

.confirm-modal-content {
    max-width: 320px;
}

.confirm-header {
    padding: 20px 20px 0;
    text-align: center;
}

.confirm-header h3 {
    font-size: 18px;
    font-weight: 600;
    color: #1a1a1a;
    margin: 0;
}

.confirm-body {
    padding: 16px 20px;
    text-align: center;
}

.confirm-body p {
    font-size: 14px;
    color: #8e8e93;
    line-height: 1.4;
    margin: 0;
}

.confirm-actions {
    display: flex;
    border-top: 1px solid #e5e5e7;
}

.confirm-cancel,
.confirm-confirm {
    flex: 1;
    padding: 16px;
    background: none;
    border: none;
    font-size: 16px;
    cursor: pointer;
    border-radius: 0;
}

.confirm-cancel {
    color: #007AFF;
    border-right: 1px solid #e5e5e7;
}

.confirm-confirm {
    font-weight: 600;
}

.confirm-confirm.danger {
    color: #ff3b30;
}

.confirm-cancel:hover,
.confirm-confirm:hover {
    background-color: #f8f9fa;
}
`;

// Inject styles
if (!document.getElementById('settings-styles')) {
    const styleSheet = document.createElement('style');
    styleSheet.id = 'settings-styles';
    styleSheet.textContent = settingsStyles;
    document.head.appendChild(styleSheet);
} 