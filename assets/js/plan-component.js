// Plan Component Extension for BookKing
BookKingComponents.prototype.loadPlanScreen = function() {
    this.updateHeader('', false);
    this.renderPlanScreen();
};

BookKingComponents.prototype.renderPlanScreen = function() {
    const container = document.querySelector('.main-content');
    if (!container) return;

    container.innerHTML = `
        <h1 class="page-title">Plan</h1>
        <div class="calendar-container">
            <div class="calendar-header">
                <button class="calendar-nav-btn" id="prevMonth">‹</button>
                <div class="calendar-month">${this.getMonthName(this.selectedDate)} ${this.selectedDate.getFullYear()}</div>
                <button class="calendar-nav-btn" id="nextMonth">›</button>
            </div>
            <div class="calendar-weekdays">
                <div class="calendar-weekday">Sun</div>
                <div class="calendar-weekday">Mon</div>
                <div class="calendar-weekday">Tue</div>
                <div class="calendar-weekday">Wed</div>
                <div class="calendar-weekday">Thu</div>
                <div class="calendar-weekday">Fri</div>
                <div class="calendar-weekday">Sat</div>
            </div>
            <div class="calendar-grid" id="calendarGrid">
                ${this.renderCalendarDays()}
            </div>
        </div>
        <div class="plan-stats">
            <table class="plan-metrics-table">
                <tr>
                    <td class="plan-metric-label">Pages Read</td>
                    <td class="plan-metric-value">${this.getDayStats().totalPages}</td>
                </tr>
                <tr>
                    <td class="plan-metric-label">Time Read</td>
                    <td class="plan-metric-value">${this.formatTimeDisplay(this.getDayStats().totalTime)}</td>
                </tr>
            </table>
        </div>
    `;

    this.bindCalendarEvents();
};

BookKingComponents.prototype.renderCalendarDays = function() {
    const year = this.selectedDate.getFullYear();
    const month = this.selectedDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    let html = '';
    let dayCounter = 1;

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
        const prevMonthDay = new Date(year, month, 0 - (startingDayOfWeek - 1 - i));
        html += `<div class="calendar-day other-month" data-date="${prevMonthDay.toDateString()}">${prevMonthDay.getDate()}</div>`;
    }

    // Add days of the current month
    for (let day = 1; day <= daysInMonth; day++) {
        const currentDate = new Date(year, month, day);
        const isSelected = this.isSameDate(currentDate, this.selectedDate);
        const isToday = this.isSameDate(currentDate, new Date());
        const hasReading = this.hasReadingOnDate(currentDate);
        
        let classes = 'calendar-day';
        if (isSelected) classes += ' selected';
        if (isToday) classes += ' today';
        if (hasReading) classes += ' has-reading';
        
        html += `<div class="${classes}" data-date="${currentDate.toDateString()}">${day}</div>`;
    }

    // Fill remaining cells with next month's days
    const totalCells = Math.ceil((startingDayOfWeek + daysInMonth) / 7) * 7;
    let nextMonthDay = 1;
    for (let i = startingDayOfWeek + daysInMonth; i < totalCells; i++) {
        const nextMonthDate = new Date(year, month + 1, nextMonthDay);
        html += `<div class="calendar-day other-month" data-date="${nextMonthDate.toDateString()}">${nextMonthDay}</div>`;
        nextMonthDay++;
    }

    return html;
};

BookKingComponents.prototype.bindCalendarEvents = function() {
    // Calendar day clicks
    document.querySelectorAll('.calendar-day').forEach(day => {
        day.addEventListener('click', (e) => {
            const dateString = e.target.getAttribute('data-date');
            this.selectedDate = new Date(dateString);
            this.renderPlanScreen();
        });
    });

    // Month navigation
    const prevBtn = document.getElementById('prevMonth');
    const nextBtn = document.getElementById('nextMonth');

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            this.selectedDate.setMonth(this.selectedDate.getMonth() - 1);
            this.renderPlanScreen();
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            this.selectedDate.setMonth(this.selectedDate.getMonth() + 1);
            this.renderPlanScreen();
        });
    }
};

BookKingComponents.prototype.getDayStats = function() {
    return this.storage.getDayStats(this.storage.getData()?.sessions || [], this.selectedDate);
};

BookKingComponents.prototype.hasReadingOnDate = function(date) {
    const sessions = this.storage.getSessions(null, date);
    return sessions.length > 0;
};

// formatTimeDisplay function moved to components.js - removed duplicate

// Calendar styles are now handled in components.css 