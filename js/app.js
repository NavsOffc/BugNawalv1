// Application JavaScript for GitHub Pages
class DarkVerseApp {
    constructor() {
        this.database = {
            users: [],
            bugRequests: [],
            lastUpdated: null
        };
        this.currentUser = null;
        this.init();
    }

    async init() {
        console.log('Initializing DarkVerse App...');
        await this.loadDatabase();
        this.checkLogin();
        this.setupEventListeners();
    }

    async loadDatabase() {
        try {
            // Try to load from data/database.json
            const response = await fetch('./data/database.json?' + Date.now());
            if (response.ok) {
                const data = await response.json();
                this.database = data;
                console.log('Database loaded from file:', this.database);
            } else {
                // Initialize with default admin user
                await this.initializeDefaultDatabase();
            }
        } catch (error) {
            console.log('Error loading database, initializing default:', error);
            await this.initializeDefaultDatabase();
        }
    }

    async initializeDefaultDatabase() {
        const adminExpiry = new Date();
        adminExpiry.setFullYear(adminExpiry.getFullYear() + 10);
        
        this.database = {
            users: [{
                username: "Nwalhost",
                password: "adminkau123",
                role: "admin",
                expiry: adminExpiry.getTime(),
                createdAt: new Date().getTime()
            }],
            bugRequests: [],
            lastUpdated: new Date().toISOString()
        };

        // Save to localStorage as backup
        this.saveToLocalStorage();
        console.log('Default database initialized');
    }

    saveToLocalStorage() {
        localStorage.setItem('darkverse_database', JSON.stringify(this.database));
        localStorage.setItem('darkverse_last_save', new Date().toISOString());
    }

    loadFromLocalStorage() {
        const saved = localStorage.getItem('darkverse_database');
        if (saved) {
            this.database = JSON.parse(saved);
            return true;
        }
        return false;
    }

    checkLogin() {
        const savedUser = localStorage.getItem('darkverse_current_user');
        if (savedUser) {
            this.currentUser = JSON.parse(savedUser);
            this.showApp();
        }
    }

    login() {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        const user = this.database.users.find(u => u.username === username && u.password === password);
        
        if (user) {
            if (user.role !== 'admin' && user.expiry < Date.now()) {
                this.showNotification('Your account has expired! Contact admin.', 'error');
                return;
            }

            this.currentUser = user;
            localStorage.setItem('darkverse_current_user', JSON.stringify(user));
            this.showApp();
            this.showNotification(`Welcome back, ${user.username}!`, 'success');
        } else {
            this.showNotification('Invalid credentials!', 'error');
        }
    }

    logout() {
        this.currentUser = null;
        localStorage.removeItem('darkverse_current_user');
        document.getElementById('loginSection').classList.remove('hidden');
        document.getElementById('mainHeader').classList.add('hidden');
        document.getElementById('userContent').classList.add('hidden');
        document.getElementById('adminContent').classList.add('hidden');
        this.showNotification('Logged out successfully', 'warning');
    }

    showApp() {
        document.getElementById('loginSection').classList.add('hidden');
        document.getElementById('mainHeader').classList.remove('hidden');
        
        if (this.currentUser.role === 'admin') {
            document.getElementById('adminNav').classList.remove('hidden');
            this.showSection('admin');
            this.loadAdminData();
        } else {
            document.getElementById('adminNav').classList.add('hidden');
            this.showSection('bug');
            this.loadUserData();
        }
    }

    showSection(section) {
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        event.target.classList.add('active');
        
        document.getElementById('userContent').classList.add('hidden');
        document.getElementById('adminContent').classList.add('hidden');
        
        if (section === 'bug') {
            document.getElementById('userContent').classList.remove('hidden');
            this.loadUserData();
        } else if (section === 'admin') {
            document.getElementById('adminContent').classList.remove('hidden');
            this.loadAdminData();
        }
    }

    // User Functions
    sendBugRequest() {
        const targetNumber = document.getElementById('targetNumber').value;
        const bugType = document.getElementById('bugType').value;

        if (!targetNumber) {
            this.showNotification('Please enter target number!', 'error');
            return;
        }

        const newRequest = {
            id: Date.now(),
            targetNumber,
            bugType,
            username: this.currentUser.username,
            status: 'pending',
            timestamp: new Date().toLocaleString()
        };

        this.database.bugRequests.push(newRequest);
        this.database.lastUpdated = new Date().toISOString();
        
        this.saveToLocalStorage();
        this.showNotification('Bug request sent successfully!', 'success');
        this.loadUserData();
        document.getElementById('targetNumber').value = '';
    }

    loadUserData() {
        const userRequests = this.database.bugRequests.filter(req => req.username === this.currentUser.username);
        const bugList = document.getElementById('userBugRequests');
        
        bugList.innerHTML = '';
        
        if (userRequests.length === 0) {
            bugList.innerHTML = '<li class="bug-item">No bug requests found</li>';
            return;
        }

        userRequests.forEach(request => {
            const li = document.createElement('li');
            li.className = 'bug-item';
            li.innerHTML = `
                <div>
                    <div><strong>${request.targetNumber}</strong></div>
                    <div>${this.getBugTypeName(request.bugType)} - ${request.timestamp}</div>
                </div>
                <span class="status ${request.status === 'pending' ? 'status-pending' : 'status-completed'}">
                    <i class="fas ${request.status === 'pending' ? 'fa-clock' : 'fa-check'}"></i>
                    ${request.status === 'pending' ? 'Pending' : 'Completed'}
                </span>
            `;
            bugList.appendChild(li);
        });
    }

    // Admin Functions
    addUser() {
        const newUsername = document.getElementById('newUsername').value;
        const newPassword = document.getElementById('newPassword').value;
        const expiryDays = parseInt(document.getElementById('expiryDays').value);

        if (!newUsername || !newPassword) {
            this.showNotification('Please fill all fields!', 'error');
            return;
        }

        if (this.database.users.find(u => u.username === newUsername)) {
            this.showNotification('Username already exists!', 'error');
            return;
        }

        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + expiryDays);

        this.database.users.push({
            username: newUsername,
            password: newPassword,
            role: "user",
            expiry: expiryDate.getTime(),
            createdAt: new Date().getTime()
        });

        this.database.lastUpdated = new Date().toISOString();
        this.saveToLocalStorage();

        document.getElementById('newUsername').value = '';
        document.getElementById('newPassword').value = '';
        this.showNotification(`User ${newUsername} added successfully!`, 'success');
        this.loadAdminData();
    }

    loadAdminData() {
        // Update database info
        document.getElementById('dbUserCount').value = this.database.users.length;
        document.getElementById('dbRequestCount').value = this.database.bugRequests.length;

        // Load users
        const userList = document.getElementById('userList');
        const regularUsers = this.database.users.filter(u => u.role === 'user');
        
        userList.innerHTML = '';
        regularUsers.forEach(user => {
            const li = document.createElement('li');
            li.className = 'user-item';
            const expiryDate = new Date(user.expiry);
            const isExpired = user.expiry < Date.now();
            
            li.innerHTML = `
                <div>
                    <div><strong>${user.username}</strong></div>
                    <div>Expires: ${expiryDate.toLocaleDateString()}</div>
                </div>
                <span class="status ${isExpired ? 'status-pending' : 'status-completed'}">
                    ${isExpired ? 'Expired' : 'Active'}
                </span>
            `;
            userList.appendChild(li);
        });

        // Load bug requests
        const bugList = document.getElementById('bugRequests');
        bugList.innerHTML = '';
        
        this.database.bugRequests.forEach(request => {
            const li = document.createElement('li');
            li.className = 'bug-item';
            li.innerHTML = `
                <div>
                    <div><strong>${request.targetNumber}</strong></div>
                    <div>${this.getBugTypeName(request.bugType)} - by ${request.username}</div>
                    <div>${request.timestamp}</div>
                </div>
                <div>
                    <span class="status ${request.status === 'pending' ? 'status-pending' : 'status-completed'}">
                        ${request.status === 'pending' ? 'Pending' : 'Completed'}
                    </span>
                    <button class="btn" onclick="app.processRequest(${request.id})" style="margin-left: 10px;">
                        <i class="fas fa-cog"></i>
                    </button>
                </div>
            `;
            bugList.appendChild(li);
        });
    }

    processRequest(id) {
        const request = this.database.bugRequests.find(req => req.id === id);
        if (request) {
            document.getElementById('adminTarget').value = request.targetNumber;
            document.getElementById('adminBugType').value = request.bugType;
            request.status = 'completed';
            this.database.lastUpdated = new Date().toISOString();
            this.saveToLocalStorage();
            this.loadAdminData();
            this.showNotification('Request processed!', 'success');
        }
    }

    sendBug() {
        const targetNumber = document.getElementById('adminTarget').value;
        const bugType = document.getElementById('adminBugType').value;

        if (!targetNumber) {
            this.showNotification('Please enter target number!', 'error');
            return;
        }

        const whatsappUrl = `https://wa.me/${targetNumber}?text=.${bugType}`;
        window.open(whatsappUrl, '_blank');
        this.showNotification('Bug sent successfully!', 'success');
        document.getElementById('adminTarget').value = '';
    }

    updateDatabaseFile() {
        this.showNotification('Manual update feature would trigger GitHub Action here', 'warning');
        // In real implementation, this would trigger a GitHub Action
    }

    getBugTypeName(type) {
        const types = {
            'crash-android': 'Crash Android',
            'delay-maker': 'Delay Maker', 
            'crash-ios': 'Crash iOS'
        };
        return types[type] || type;
    }

    showDatabaseInfo() {
        document.getElementById('dbUserCount').value = this.database.users.length;
        document.getElementById('dbRequestCount').value = this.database.bugRequests.length;
        document.getElementById('databaseInfoModal').classList.remove('hidden');
    }

    closeDatabaseInfo() {
        document.getElementById('databaseInfoModal').classList.add('hidden');
    }

    showNotification(message, type = 'success') {
        const notification = document.getElementById('notification');
        const notificationText = document.getElementById('notificationText');
        const icon = notification.querySelector('i');

        notificationText.textContent = message;
        notification.className = 'notification';
        
        if (type === 'error') {
            notification.classList.add('error');
            icon.className = 'fas fa-exclamation-circle';
        } else if (type === 'warning') {
            notification.classList.add('warning');
            icon.className = 'fas fa-exclamation-triangle';
        } else {
            icon.className = 'fas fa-check-circle';
        }

        notification.classList.add('show');
        setTimeout(() => notification.classList.remove('show'), 4000);
    }

    setupEventListeners() {
        // Enter key login
        document.getElementById('password').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.login();
            }
        });
    }
}

// Global app instance
const app = new DarkVerseApp();

// Global functions for HTML onclick
function login() { app.login(); }
function logout() { app.logout(); }
function showSection(section) { app.showSection(section); }
function sendBugRequest() { app.sendBugRequest(); }
function addUser() { app.addUser(); }
function sendBug() { app.sendBug(); }
function showDatabaseInfo() { app.showDatabaseInfo(); }
function closeDatabaseInfo() { app.closeDatabaseInfo(); }
function updateDatabaseFile() { app.updateDatabaseFile(); }
