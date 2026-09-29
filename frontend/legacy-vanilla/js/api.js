const API_BASE = '/api';

function getToken() {
  return localStorage.getItem('token');
}

function getUser() {
  const userStr = localStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
}

function setAuth(token, user) {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
}

function clearAuth() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = 'index.html';
}

function checkAuth() {
  const token = getToken();
  if (!token) {
    if (!window.location.pathname.endsWith('index.html') && window.location.pathname !== '/') {
      window.location.href = 'index.html';
    }
  }
}

async function apiFetch(endpoint, options = {}) {
  const token = getToken();
  const headers = options.headers || {};
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (!options.isFormData && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const config = {
    ...options,
    headers: headers
  };

  const response = await fetch(`${API_BASE}${endpoint}`, config);
  
  if (response.status === 401) {
    clearAuth();
    throw new Error('Unauthorized');
  }

  return response;
}

function renderNavbar() {
  const navContainer = document.getElementById('navbar');
  if (!navContainer) return;

  const user = getUser();
  if (!user) {
    navContainer.innerHTML = `
      <div class="navbar">
        <a href="index.html" class="brand">ResolveHub</a>
      </div>
    `;
    return;
  }

  navContainer.innerHTML = `
    <div class="navbar">
      <a href="dashboard.html" class="brand">ResolveHub MVP</a>
      <div class="nav-links">
        <a href="dashboard.html">Dashboard</a>
        <a href="create-ticket.html">Create Ticket</a>
        <a href="my-tickets.html">My Tickets</a>
        <a href="profile.html">Profile</a>
        <span class="user-badge">${user.name} (${user.role})</span>
        <button class="btn-logout" onclick="clearAuth()">Logout</button>
      </div>
    </div>
  `;
}
