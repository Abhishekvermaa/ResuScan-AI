// ================= GLOBAL STATE =================
const state = {
  token: localStorage.getItem('token'),
  userId: localStorage.getItem('userId'),
  userName: localStorage.getItem('userName'),
  results: [],
  activeResult: null,
  activeScreen: 'screen', // 'screen' or 'results'
  selectedFile: null,
};

// Redirect directly if not authenticated
if (!state.token || !state.userId || !state.userName) {
  window.location.href = 'index.html';
}

// ================= DOM ELEMENTS =================
const elements = {
  toast: document.getElementById('toast'),
  userDisplayName: document.getElementById('user-display-name'),
  logoutBtn: document.getElementById('logout-btn'),
  navScreen: document.getElementById('nav-screen'),
  navResults: document.getElementById('nav-results'),
  
  // Screens
  screenTitle: document.getElementById('screen-title'),
  screenSubtitle: document.getElementById('screen-subtitle'),
  screeningScreen: document.getElementById('screening-screen'),
  resultsScreen: document.getElementById('results-screen'),
  
  // Stats
  statResultsCount: document.getElementById('stat-results-count'),
  statAvgScore: document.getElementById('stat-avg-score'),
  statStrongCount: document.getElementById('stat-strong-count'),
  
  // Screening Console
  jdInput: document.getElementById('jd-input'),
  dropzone: document.getElementById('dropzone'),
  fileInput: document.getElementById('file-input'),
  screenBtn: document.getElementById('screen-btn'),
  uploadProgressContainer: document.getElementById('upload-progress-container'),
  progressPercent: document.getElementById('progress-percent'),
  progressFill: document.getElementById('progress-fill'),
  uploadStatusText: document.getElementById('upload-status-text'),
  
  // Past Results
  resultsListBody: document.getElementById('results-list-body'),
  resultsEmptyState: document.getElementById('results-empty-state'),
  resultSearch: document.getElementById('result-search'),
  
  // Modals
  candidateModal: document.getElementById('candidate-modal'),
  deleteResultBtn: document.getElementById('delete-result-btn'),
  
  // Modal Fields
  modalCandRec: document.getElementById('modal-candidate-recommendation'),
  modalCandScore: document.getElementById('modal-candidate-score'),
  modalCandSummary: document.getElementById('modal-candidate-summary'),
  modalCandStrengths: document.getElementById('modal-candidate-strengths'),
  modalCandMissing: document.getElementById('modal-candidate-missing'),
  modalCandSuggestions: document.getElementById('modal-candidate-suggestions'),
  modalJobDescription: document.getElementById('modal-job-description'),
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

// ================= HTML ESCAPER FOR XSS PREVENTION =================
function escapeHTML(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ================= API CALL HELPER =================
async function apiCall(endpoint, method = 'GET', body = null, isMultipart = false) {
  const headers = {};
  if (state.token) {
    headers['Authorization'] = `Bearer ${state.token}`;
  }
  if (!isMultipart) {
    headers['Content-Type'] = 'application/json';
  }

  const options = {
    method,
    headers,
  };

  if (body) {
    options.body = isMultipart ? body : JSON.stringify(body);
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
    if (error.message.includes('Unauthorized') || error.message.includes('expired')) {
      logout();
    }
    throw error;
  }
}

// ================= LOGOUT MANAGEMENT =================
function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('userId');
  localStorage.removeItem('userName');
  state.token = null;
  state.userId = null;
  state.userName = null;
  window.location.href = 'index.html';
}

elements.logoutBtn.addEventListener('click', logout);

// ================= SCREEN SWITCHING =================
function switchScreen(screen) {
  state.activeScreen = screen;
  if (screen === 'screen') {
    elements.navScreen.classList.add('active');
    elements.navResults.classList.remove('active');
    elements.screeningScreen.classList.remove('hidden');
    elements.resultsScreen.classList.add('hidden');
    elements.screenTitle.textContent = 'Screen Resume';
    elements.screenSubtitle.textContent = 'Evaluate a candidate\'s resume PDF against a target job description';
  } else if (screen === 'results') {
    elements.navResults.classList.add('active');
    elements.navScreen.classList.remove('active');
    elements.screeningScreen.classList.add('hidden');
    elements.resultsScreen.classList.remove('hidden');
    elements.screenTitle.textContent = 'Past Screenings';
    elements.screenSubtitle.textContent = 'Browse and audit previous candidate match scores and metrics';
    fetchResults();
  }
}

elements.navScreen.addEventListener('click', (e) => { e.preventDefault(); switchScreen('screen'); });
elements.navResults.addEventListener('click', (e) => { e.preventDefault(); switchScreen('results'); });

// ================= STATS CONTROLLER =================
async function fetchResultsAndStats() {
  try {
    const results = await apiCall('/api/results');
    state.results = results;
    
    // Total count
    elements.statResultsCount.textContent = results.length;
    
    // Average score calculation
    if (results.length > 0) {
      const sum = results.reduce((acc, curr) => acc + curr.matchScore, 0);
      elements.statAvgScore.textContent = Math.round(sum / results.length) + '%';
      
      // High match count (score >= 80)
      const strongCount = results.filter(r => r.matchScore >= 80).length;
      elements.statStrongCount.textContent = strongCount;
    } else {
      elements.statAvgScore.textContent = '0%';
      elements.statStrongCount.textContent = '0';
    }
  } catch (err) {}
}

// ================= PAST RESULTS CONTROLLER =================
async function fetchResults() {
  try {
    const results = await apiCall('/api/results');
    state.results = results;
    renderResults(results);
  } catch (err) {}
}

function renderResults(resultsList) {
  elements.resultsListBody.innerHTML = '';
  
  if (resultsList.length === 0) {
    elements.resultsEmptyState.classList.remove('hidden');
    return;
  }
  
  elements.resultsEmptyState.classList.add('hidden');

  resultsList.forEach(result => {
    const row = document.createElement('tr');
    
    // Determine score colors
    let scoreColor = 'score-red';
    if (result.matchScore >= 80) scoreColor = 'score-green';
    else if (result.matchScore >= 60) scoreColor = 'score-orange';

    // Form JD snippet
    const jdSnippet = result.jobDescription.length > 80 
      ? result.jobDescription.substring(0, 80) + '...' 
      : result.jobDescription;

    row.innerHTML = `
      <td><span style="font-size:0.9rem; opacity:0.95">${escapeHTML(jdSnippet)}</span></td>
      <td><span class="score-badge ${scoreColor}">${result.matchScore}%</span></td>
      <td>${new Date(result.createdAt).toLocaleDateString()}</td>
      <td class="text-right">
        <button class="btn btn-outline btn-sm btn-view-report"><i class="fa-regular fa-file-lines"></i> View Report</button>
      </td>
    `;
    
    row.querySelector('.btn-view-report').addEventListener('click', () => {
      openReportModal(result);
    });
    
    elements.resultsListBody.appendChild(row);
  });
}

// Client side search filtering
elements.resultSearch.addEventListener('input', (e) => {
  const query = e.target.value.toLowerCase();
  const filtered = state.results.filter(r => r.jobDescription.toLowerCase().includes(query));
  renderResults(filtered);
});

// ================= DRAG AND DROP & UPLOAD PROCESS =================

elements.dropzone.addEventListener('click', () => {
  elements.fileInput.click();
});

// Drag events
['dragenter', 'dragover'].forEach(eventName => {
  elements.dropzone.addEventListener(eventName, (e) => {
    e.preventDefault();
    elements.dropzone.classList.add('active');
  }, false);
});

['dragleave', 'drop'].forEach(eventName => {
  elements.dropzone.addEventListener(eventName, (e) => {
    e.preventDefault();
    elements.dropzone.classList.remove('active');
  }, false);
});

// Drop handler
elements.dropzone.addEventListener('drop', (e) => {
  const dt = e.dataTransfer;
  const files = dt.files;
  if (files.length > 0) {
    selectFile(files[0]);
  }
});

// File click selection
elements.fileInput.addEventListener('change', (e) => {
  if (e.target.files.length > 0) {
    selectFile(e.target.files[0]);
  }
});

function selectFile(file) {
  if (file.type !== 'application/pdf') {
    showToast('Only PDF files are supported!', 'error');
    return;
  }
  state.selectedFile = file;
  elements.dropzone.querySelector('.dropzone-text').innerHTML = `Selected File: <span class="highlight" style="color:var(--green)">${escapeHTML(file.name)}</span>`;
}

// Action Button Submit
elements.screenBtn.addEventListener('click', async () => {
  const jdText = elements.jdInput.value;
  const file = state.selectedFile;

  if (!jdText || jdText.trim() === '') {
    showToast('Please paste a Job Description first!', 'error');
    return;
  }
  if (!file) {
    showToast('Please upload or drop a resume PDF file!', 'error');
    return;
  }

  const formData = new FormData();
  formData.append('resume', file);
  formData.append('jobDescription', jdText);

  // Animate progress indicators
  elements.uploadProgressContainer.classList.remove('hidden');
  elements.progressFill.style.width = '15%';
  elements.progressPercent.textContent = '15%';
  elements.uploadStatusText.textContent = 'Uploading PDF resume...';

  const timer1 = setTimeout(() => {
    elements.progressFill.style.width = '45%';
    elements.progressPercent.textContent = '45%';
    elements.uploadStatusText.textContent = 'Extracting resume text contents...';
  }, 1000);

  const timer2 = setTimeout(() => {
    elements.progressFill.style.width = '75%';
    elements.progressPercent.textContent = '75%';
    elements.uploadStatusText.textContent = 'OpenAI evaluating match score and gaps...';
  }, 2200);

  try {
    const res = await apiCall('/api/screen', 'POST', formData, true);
    
    elements.progressFill.style.width = '100%';
    elements.progressPercent.textContent = '100%';
    
    setTimeout(async () => {
      // Clear timers & hide loading
      clearTimeout(timer1);
      clearTimeout(timer2);
      elements.uploadProgressContainer.classList.add('hidden');
      
      // Reset upload inputs
      state.selectedFile = null;
      elements.fileInput.value = '';
      elements.dropzone.querySelector('.dropzone-text').innerHTML = `Drag & drop resume PDF here or <span class="highlight">browse files</span>`;
      
      showToast('AI resume screening complete!');
      
      // Update statistics
      await fetchResultsAndStats();
      
      // Open report modal directly
      const resultObj = state.results.find(r => r._id === res.resultId) || {
        _id: res.resultId,
        matchScore: res.matchScore,
        missingSkills: res.missingSkills,
        strengths: res.strengths,
        suggestions: res.suggestions,
        jobDescription: jdText
      };
      openReportModal(resultObj);
      
    }, 500);

  } catch (err) {
    clearTimeout(timer1);
    clearTimeout(timer2);
    elements.uploadProgressContainer.classList.add('hidden');
  }
});

// ================= REPORT DETAILS MODAL =================
function openReportModal(result) {
  state.activeResult = result;
  
  elements.modalCandScore.textContent = `${result.matchScore}%`;
  
  // Set border color based on score
  const scoreCircle = document.querySelector('.score-circle');
  if (result.matchScore >= 80) {
    scoreCircle.style.borderColor = 'var(--green)';
    elements.modalCandRec.textContent = 'Strong Match';
    elements.modalCandRec.className = 'badge badge-shortlist';
  } else if (result.matchScore >= 60) {
    scoreCircle.style.borderColor = 'var(--orange)';
    elements.modalCandRec.textContent = 'Potential Match';
    elements.modalCandRec.className = 'badge badge-interview';
  } else {
    scoreCircle.style.borderColor = 'var(--red)';
    elements.modalCandRec.textContent = 'Weak Match';
    elements.modalCandRec.className = 'badge badge-reject';
  }

  // Summary
  elements.modalCandSummary.textContent = result.suggestions.length > 0 
    ? `The AI has evaluated the resume match quality at ${result.matchScore}%. Review the details below for matches and recommendations.`
    : 'No summary evaluation details found.';

  // Bullets: Strengths
  elements.modalCandStrengths.innerHTML = '';
  const strengths = result.strengths || [];
  if (strengths.length > 0) {
    strengths.forEach(s => {
      const li = document.createElement('li');
      li.textContent = s;
      elements.modalCandStrengths.appendChild(li);
    });
  } else {
    elements.modalCandStrengths.innerHTML = '<li>None identified</li>';
  }

  // Bullets: Gaps & Missing Skills
  elements.modalCandMissing.innerHTML = '';
  const missing = result.missingSkills || [];
  if (missing.length > 0) {
    missing.forEach(m => {
      const li = document.createElement('li');
      li.textContent = m;
      elements.modalCandMissing.appendChild(li);
    });
  } else {
    elements.modalCandMissing.innerHTML = '<li>None identified</li>';
  }

  // Bullets: AI Suggestions
  elements.modalCandSuggestions.innerHTML = '';
  const suggestions = result.suggestions || [];
  if (suggestions.length > 0) {
    suggestions.forEach(s => {
      const li = document.createElement('li');
      li.textContent = s;
      elements.modalCandSuggestions.appendChild(li);
    });
  } else {
    elements.modalCandSuggestions.innerHTML = '<li>None identified</li>';
  }

  // Paste full Job Description
  elements.modalJobDescription.textContent = result.jobDescription;

  elements.candidateModal.classList.remove('hidden');
}

// Modal closing
document.querySelectorAll('.close-modal-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    elements.candidateModal.classList.add('hidden');
  });
});

// Delete result action
elements.deleteResultBtn.addEventListener('click', async () => {
  if (!state.activeResult) return;
  if (!confirm('Are you sure you want to delete this screening result? This action cannot be undone.')) return;

  try {
    const res = await apiCall(`/api/results/${state.activeResult._id || state.activeResult.resultId}`, 'DELETE');
    showToast(res.message || 'Result deleted successfully');
    elements.candidateModal.classList.add('hidden');
    
    // Refresh
    await fetchResultsAndStats();
    if (state.activeScreen === 'results') {
      renderResults(state.results);
    }
  } catch (err) {}
});

// ================= INITIATION =================
function initDashboard() {
  elements.userDisplayName.textContent = state.userName;
  switchScreen('screen');
  fetchResultsAndStats();
}

initDashboard();
