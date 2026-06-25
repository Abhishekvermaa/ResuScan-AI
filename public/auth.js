// ================= GLOBAL STATE =================
const state = {
  token: localStorage.getItem('token'),
  userId: localStorage.getItem('userId'),
  userName: localStorage.getItem('userName'),
};

// Redirect directly if already authenticated
if (state.token && state.userId && state.userName) {
  window.location.href = 'dashboard.html';
}

// ================= DOM ELEMENTS =================
const elements = {
  toast: document.getElementById('toast'),
  tabLogin: document.getElementById('tab-login'),
  tabRegister: document.getElementById('tab-register'),
  loginForm: document.getElementById('login-form'),
  registerForm: document.getElementById('register-form'),
};

// ================= TOAST NOTIFICATION =================
function showToast(message, type = 'success') {
  elements.toast.textContent = message;
  elements.toast.className = `toast ${type}`;
  elements.toast.classList.remove('hidden');
  setTimeout(() => {
    elements.toast.classList.add('hidden');
  }, 3000);
}

// ================= API CALL HELPER =================
async function apiCall(endpoint, method = 'GET', body = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(endpoint, options);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Request failed');
    }
    return data;
  } catch (error) {
    console.error(`API Call error (${endpoint}):`, error);
    showToast(error.message, 'error');
    throw error;
  }
}

// ================= AUTH FORM SUBMISSIONS =================

// Login submission
elements.loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;

  try {
    const res = await apiCall('/api/auth/login', 'POST', { email, password });
    localStorage.setItem('token', res.token);
    localStorage.setItem('userId', res.userId);
    localStorage.setItem('userName', res.name);
    
    showToast('Login successful! Redirecting...', 'success');
    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 800);
  } catch (err) {}
});

// Register submission
elements.registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('reg-name').value;
  const email = document.getElementById('reg-email').value;
  const password = document.getElementById('reg-password').value;

  try {
    const res = await apiCall('/api/auth/register', 'POST', { name, email, password });
    localStorage.setItem('token', res.token);
    localStorage.setItem('userId', res.userId);
    localStorage.setItem('userName', name);
    
    showToast('Registration successful! Redirecting...', 'success');
    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 800);
  } catch (err) {}
});

// ================= TAB NAVIGATION =================
elements.tabLogin.addEventListener('click', () => {
  elements.tabLogin.classList.add('active');
  elements.tabRegister.classList.remove('active');
  elements.loginForm.classList.remove('hidden');
  elements.registerForm.classList.add('hidden');
});

elements.tabRegister.addEventListener('click', () => {
  elements.tabRegister.classList.add('active');
  elements.tabLogin.classList.remove('active');
  elements.registerForm.classList.remove('hidden');
  elements.loginForm.classList.add('hidden');
});
