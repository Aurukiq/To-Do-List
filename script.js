// متغيرات التطبيق
let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
let currentFilter = 'all';

// عناصر DOM
const taskInput = document.getElementById('task');
const taskTimeInput = document.getElementById('taskTime');
const addTaskBtn = document.getElementById('addTaskBtn');
const taskList = document.getElementById('taskList');
const filterButtons = document.querySelectorAll('.filter-btn');
const totalTasksSpan = document.getElementById('totalTasks');
const completedTasksSpan = document.getElementById('completedTasks');
const pendingTasksSpan = document.getElementById('pendingTasks');

// تهيئة التطبيق
function init() {
    loadTasks();
    setupEventListeners();
    updateStats();
}

// تحميل المهام من localStorage
function loadTasks() {
    const savedTasks = localStorage.getItem('tasks');
    if (savedTasks) {
        tasks = JSON.parse(savedTasks);
        renderTasks();
    }
    
    if (tasks.length === 0) {
        showEmptyState();
    }
}

// إعداد مستمعي الأحداث
function setupEventListeners() {
    // إضافة مهمة
    addTaskBtn.addEventListener('click', addTask);
    taskInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addTask();
    });

    // تصفية المهام
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            currentFilter = btn.dataset.filter;
            filterTasks(currentFilter);
        });
    });

    // تفويض الأحداث لقائمة المهام
    taskList.addEventListener('click', handleTaskActions);
}

// معالجة أحداث المهام
function handleTaskActions(e) {
    const taskElement = e.target.closest('li');
    if (!taskElement) return;

    const taskId = parseInt(taskElement.dataset.id);
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    if (e.target.closest('.complete-btn')) {
        toggleComplete(taskId);
    } else if (e.target.closest('.edit-btn')) {
        editTask(taskId);
    } else if (e.target.closest('.delete-btn')) {
        deleteTask(taskId);
    } else if (e.target.classList.contains('task-text')) {
        toggleComplete(taskId);
    }
}

// إضافة مهمة جديدة
function addTask() {
    const taskText = taskInput.value.trim();
    const taskTime = taskTimeInput.value;

    if (!taskText) {
        showNotification('الرجاء إدخال نص المهمة!', 'error');
        return;
    }

    const newTask = {
        id: Date.now(),
        text: taskText,
        time: taskTime,
        completed: false,
        createdAt: new Date().toISOString()
    };

    tasks.unshift(newTask);
    saveToLocalStorage();
    renderTask(newTask);
    taskInput.value = '';
    taskTimeInput.value = '';
    taskInput.focus();
    updateStats();
    showNotification('تمت إضافة المهمة بنجاح!', 'success');
}

// عرض المهام
function renderTasks() {
    taskList.innerHTML = '';

    const filteredTasks = filterTasksByType(tasks, currentFilter);
    
    if (filteredTasks.length === 0) {
        showEmptyState(currentFilter);
        return;
    }

    filteredTasks.forEach(task => {
        renderTask(task);
    });
}

// تصفية المهام حسب النوع
function filterTasksByType(tasks, filterType) {
    switch(filterType) {
        case 'completed':
            return tasks.filter(task => task.completed);
        case 'pending':
            return tasks.filter(task => !task.completed);
        case 'urgent':
            return tasks.filter(task => {
                if (task.completed || !task.time) return false;
                const deadline = new Date(task.time);
                const now = new Date();
                const hoursDiff = (deadline - now) / (1000 * 60 * 60);
                return hoursDiff < 24 && hoursDiff >= 0;
            });
        case 'overdue':
            return tasks.filter(task => {
                if (task.completed || !task.time) return false;
                return new Date(task.time) < new Date();
            });
        default:
            return tasks;
    }
}

// عرض مهمة واحدة
function renderTask(task) {
    const taskElement = document.createElement('li');
    taskElement.className = `task-item ${task.completed ? 'completed' : ''}`;
    taskElement.dataset.id = task.id;

    const deadlineClass = getDeadlineClass(task);
    const timeDisplay = task.time ? formatDateTimeForDisplay(task.time) : '';
    const timeRemaining = task.time && !task.completed ? getTimeRemainingBadge(new Date(task.time)) : '';

    taskElement.innerHTML = `
        <div class="task-content">
            <span class="task-text">${task.text}</span>
            ${task.time ? `
                <div class="date-display">
                    <div class="time-badge ${deadlineClass}">
                        <i class="far fa-clock"></i>
                        <span>${timeDisplay}</span>
                    </div>
                    ${timeRemaining}
                </div>
            ` : ''}
        </div>
        <div class="task-actions">
            <button class="complete-btn" title="${task.completed ? 'إلغاء الإكمال' : 'إكمال'}">
                <i class="fas ${task.completed ? 'fa-undo' : 'fa-check'}"></i>
            </button>
            <button class="edit-btn" title="تعديل">
                <i class="fas fa-edit"></i>
            </button>
            <button class="delete-btn" title="حذف">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;

    taskList.appendChild(taskElement);
}

// تبديل حالة الإكمال
function toggleComplete(taskId) {
    const taskIndex = tasks.findIndex(task => task.id === taskId);
    
    if (taskIndex !== -1) {
        tasks[taskIndex].completed = !tasks[taskIndex].completed;
        saveToLocalStorage();
        renderTasks();
        updateStats();
        
        const status = tasks[taskIndex].completed ? "تم إكمال المهمة" : "تم إعادة فتح المهمة";
        showNotification(status, "info");
    }
}

// تعديل المهمة
function editTask(taskId) {
    const task = tasks.find(task => task.id === taskId);
    if (!task) return;

    const newText = prompt("عدل نص المهمة:", task.text);
    if (newText === null || newText.trim() === "") return;

    task.text = newText.trim();
    
    const newTime = prompt("عدل وقت المهمة (اتركه فارغاً للحفاظ على الوقت الحالي):", task.time || '');
    if (newTime !== null) {
        task.time = newTime || task.time;
    }

    saveToLocalStorage();
    renderTasks();
    updateStats();
    showNotification("تم تعديل المهمة بنجاح!", "success");
}

// حذف المهمة
function deleteTask(taskId) {
    if (!confirm("هل أنت متأكد من حذف هذه المهمة؟")) return;

    tasks = tasks.filter(task => task.id !== taskId);
    saveToLocalStorage();
    renderTasks();
    updateStats();
    showNotification("تم حذف المهمة بنجاح!", "warning");
}

// تصفية المهام
function filterTasks(filterType) {
    currentFilter = filterType;
    updateActiveFilterButtons();
    renderTasks();
    updateStats();
}

// تحديث أزرار التصفية النشطة
function updateActiveFilterButtons() {
    filterButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === currentFilter);
    });
}

// حفظ المهام في localStorage
function saveToLocalStorage() {
    localStorage.setItem('tasks', JSON.stringify(tasks));
}

// تحديث الإحصائيات
function updateStats() {
    const total = tasks.length;
    const completed = tasks.filter(task => task.completed).length;
    const pending = total - completed;

    totalTasksSpan.textContent = total;
    completedTasksSpan.textContent = completed;
    pendingTasksSpan.textContent = pending;
}

// عرض حالة عدم وجود مهام
function showEmptyState(filterType = 'all') {
    const messages = {
        all: 'لا توجد مهام حتى الآن!',
        completed: 'لا توجد مهام مكتملة!',
        pending: 'لا توجد مهام معلقة!',
        urgent: 'لا توجد مهام عاجلة!',
        overdue: 'لا توجد مهام متأخرة!'
    };

    const icons = {
        all: 'fa-tasks',
        completed: 'fa-check-circle',
        pending: 'fa-list',
        urgent: 'fa-exclamation-circle',
        overdue: 'fa-exclamation-triangle'
    };

    taskList.innerHTML = `
        <div class="empty-state">
            <i class="fas ${icons[filterType]}"></i>
            <p>${messages[filterType]}</p>
        </div>
    `;
}

// عرض الإشعارات
function showNotification(message, type) {
    // إزالة أي إشعارات موجودة
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas fa-${getNotificationIcon(type)}"></i>
        ${message}
    `;

    document.body.appendChild(notification);

    // إخفاء الإشعار تلقائياً بعد 3 ثواني
    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// الحصول على أيقونة الإشعار المناسبة
function getNotificationIcon(type) {
    const icons = {
        success: 'check-circle',
        error: 'exclamation-circle',
        info: 'info-circle',
        warning: 'exclamation-triangle'
    };
    return icons[type] || 'info-circle';
}

// تحديد فئة الموعد النهائي
function getDeadlineClass(task) {
    if (task.completed) return 'deadline-normal';
    if (!task.time) return '';
    
    const deadline = new Date(task.time);
    const now = new Date();
    const timeDiff = deadline - now;
    
    if (timeDiff < 0) return 'deadline-passed';
    
    const hoursDiff = timeDiff / (1000 * 60 * 60);
    if (hoursDiff < 24) return 'deadline-urgent';
    
    return 'deadline-normal';
}

// تنسيق التاريخ والوقت للعرض
function formatDateTimeForDisplay(dateTimeString) {
    if (!dateTimeString) return '';
    
    const date = new Date(dateTimeString);
    const now = new Date();
    
    if (isSameDay(date, now)) {
        return `اليوم ${formatTime(date)}`;
    }
    
    if (isSameDay(date, new Date(now.setDate(now.getDate() + 1)))) {
        return `غداً ${formatTime(date)}`;
    }
    
    if (isWithinWeek(date, now)) {
        const days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
        return `${days[date.getDay()]} ${formatTime(date)}`;
    }
    
    return `${formatDate(date)} ${formatTime(date)}`;
}

// التحقق من أن التاريخين في نفس اليوم
function isSameDay(date1, date2) {
    return date1.getDate() === date2.getDate() && 
           date1.getMonth() === date2.getMonth() && 
           date1.getFullYear() === date2.getFullYear();
}

// التحقق من أن التاريخ خلال أسبوع من الآن
function isWithinWeek(date, now) {
    const weekLater = new Date(now);
    weekLater.setDate(weekLater.getDate() + 7);
    return date < weekLater;
}

// تنسيق التاريخ
function formatDate(date) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('ar-EG', options);
}

// تنسيق الوقت
function formatTime(date) {
    const options = { hour: '2-digit', minute: '2-digit', hour12: true };
    return date.toLocaleTimeString('ar-EG', options);
}

// الحصول على شارة الوقت المتبقي
function getTimeRemainingBadge(deadline) {
    const now = new Date();
    const timeDiff = deadline - now;
    
    if (timeDiff < 0) {
        return `
            <div class="time-badge deadline-passed" style="margin-top: 5px;">
                <i class="fas fa-exclamation-triangle"></i>
                <span>تأخرت: ${formatTimePassed(deadline)}</span>
            </div>
        `;
    }
    
    const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    let remainingText = '';
    if (days > 0) {
        remainingText = days === 1 ? 'باقي يوم واحد' : 
                       days === 2 ? 'باقي يومين' : 
                       days < 11 ? `باقي ${days} أيام` : `باقي ${days} يوماً`;
    } else if (hours > 0) {
        remainingText = hours === 1 ? 'باقي ساعة واحدة' : 
                       hours === 2 ? 'باقي ساعتين' : 
                       hours < 11 ? `باقي ${hours} ساعات` : `باقي ${hours} ساعة`;
    } else {
        remainingText = 'أقل من ساعة';
    }
    
    const isUrgent = hours < 24;
    
    return `
        <div class="time-badge ${isUrgent ? 'deadline-urgent' : 'deadline-normal'}" style="margin-top: 5px;">
            <i class="fas ${isUrgent ? 'fa-hourglass-end' : 'fa-hourglass-half'}"></i>
            <span>${remainingText}</span>
        </div>
    `;
}

// تنسيق الوقت المنقضي
function formatTimePassed(pastDate) {
    const now = new Date();
    const diff = now - pastDate;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) {
        return days === 1 ? 'منذ يوم واحد' : 
               days === 2 ? 'منذ يومين' : 
               days < 11 ? `منذ ${days} أيام` : `منذ ${days} يوماً`;
    }
    
    if (hours > 0) {
        return hours === 1 ? 'منذ ساعة واحدة' : 
               hours === 2 ? 'منذ ساعتين' : 
               hours < 11 ? `منذ ${hours} ساعات` : `منذ ${hours} ساعة`;
    }
    
    return 'منذ أقل من ساعة';
}

// بدء تشغيل التطبيق
init();