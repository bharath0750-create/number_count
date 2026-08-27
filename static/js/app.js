// 3D & 4D Number Counter - JavaScript Functions

document.addEventListener('DOMContentLoaded', function() {
    // Initialize tooltips
    initTooltips();
    
    // Initialize form validation
    initFormValidation();
    
    // Auto-dismiss alerts
    autoDismissAlerts();
    
    // Confirm delete actions
    initDeleteConfirmations();
    
    // Search form enhancements
    initSearchForm();
});

// Initialize Bootstrap Tooltips
function initTooltips() {
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function(tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
}

// Form Validation Enhancement
function initFormValidation() {
    const forms = document.querySelectorAll('.needs-validation, form[novalidate]');
    
    forms.forEach(function(form) {
        form.addEventListener('submit', function(event) {
            if (!form.checkValidity()) {
                event.preventDefault();
                event.stopPropagation();
            }
            form.classList.add('was-validated');
        }, false);
    });
    
    // Real-time validation feedback
    const inputs = document.querySelectorAll('.form-control, .form-select');
    inputs.forEach(function(input) {
        input.addEventListener('blur', function() {
            if (this.checkValidity()) {
                this.classList.remove('is-invalid');
                this.classList.add('is-valid');
            } else {
                this.classList.remove('is-valid');
                this.classList.add('is-invalid');
            }
        });
        
        input.addEventListener('input', function() {
            if (this.classList.contains('is-invalid') && this.checkValidity()) {
                this.classList.remove('is-invalid');
                this.classList.add('is-valid');
            }
        });
    });
}

// Auto-dismiss alerts after 5 seconds
function autoDismissAlerts() {
    const alerts = document.querySelectorAll('.alert:not(.alert-permanent)');
    
    alerts.forEach(function(alert) {
        setTimeout(function() {
            const bsAlert = new bootstrap.Alert(alert);
            bsAlert.close();
        }, 5000);
    });
}

// Delete Confirmation
function initDeleteConfirmations() {
    const deleteForms = document.querySelectorAll('form[action*="delete"]');
    
    deleteForms.forEach(function(form) {
        form.addEventListener('submit', function(event) {
            const submitBtn = form.querySelector('button[type="submit"]');
            const confirmMessage = submitBtn?.dataset.confirm || 'Are you sure you want to delete this? This action cannot be undone.';
            
            if (!confirm(confirmMessage)) {
                event.preventDefault();
                return false;
            }
            
            // Show loading state
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"></span>Deleting...';
            }
        });
    });
}

// Search Form Enhancements
function initSearchForm() {
    const searchForms = document.querySelectorAll('form[method="GET"] input[name="search"]');
    
    searchForms.forEach(function(input) {
        // Clear button
        const wrapper = document.createElement('div');
        wrapper.className = 'position-relative';
        input.parentNode.insertBefore(wrapper, input);
        wrapper.appendChild(input);
        
        const clearBtn = document.createElement('button');
        clearBtn.type = 'button';
        clearBtn.className = 'btn btn-sm btn-outline-secondary position-absolute top-50 end-0 translate-middle-y me-2';
        clearBtn.innerHTML = '<i class="fas fa-times"></i>';
        clearBtn.style.display = 'none';
        clearBtn.setAttribute('aria-label', 'Clear search');
        wrapper.appendChild(clearBtn);
        
        input.addEventListener('input', function() {
            clearBtn.style.display = this.value ? 'block' : 'none';
        });
        
        clearBtn.addEventListener('click', function() {
            input.value = '';
            clearBtn.style.display = 'none';
            input.focus();
            // Submit form to clear search
            input.closest('form').submit();
        });
        
        // Show clear button if there's already a value
        if (input.value) {
            clearBtn.style.display = 'block';
        }
    });
}

// Number Input Preview (for Add Numbers page)
function initNumberPreview(textareaId, previewIds) {
    const textarea = document.getElementById(textareaId);
    if (!textarea) return;
    
    const preview = {
        total: document.getElementById(previewIds.total),
        count4D: document.getElementById(previewIds.count4D),
        count3D: document.getElementById(previewIds.count3D),
        countInvalid: document.getElementById(previewIds.countInvalid),
        section: document.getElementById(previewIds.section)
    };
    
    let debounceTimer;
    
    function classifyNumber(num) {
        num = num.trim();
        if (!num) return null;
        if (/^\d{3}$/.test(num)) return '3D';
        if (/^\d{4}$/.test(num)) return '4D';
        return 'Invalid';
    }
    
    function parseInput(text) {
        if (!text) return [];
        const normalized = text.replace(/,/g, ' ');
        return normalized.split(/\s+/).filter(s => s.trim());
    }
    
    function calculatePreview() {
        const numbers = parseInput(textarea.value);
        
        if (numbers.length === 0) {
            if (preview.section) preview.section.style.display = 'none';
            return;
        }
        
        let total = 0, count4D = 0, count3D = 0, countInvalid = 0;
        
        numbers.forEach(function(num) {
            const type = classifyNumber(num);
            if (type) {
                total++;
                if (type === '4D') count4D++;
                else if (type === '3D') count3D++;
                else countInvalid++;
            }
        });
        
        if (preview.total) preview.total.textContent = total;
        if (preview.count4D) preview.count4D.textContent = count4D;
        if (preview.count3D) preview.count3D.textContent = count3D;
        if (preview.countInvalid) preview.countInvalid.textContent = countInvalid;
        if (preview.section) preview.section.style.display = 'block';
    }
    
    textarea.addEventListener('input', function() {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(calculatePreview, 300);
    });
    
    // Initial calculation
    calculatePreview();
}

// Copy to Clipboard
function copyToClipboard(text, successMessage = 'Copied to clipboard!') {
    navigator.clipboard.writeText(text).then(function() {
        showToast(successMessage, 'success');
    }).catch(function() {
        showToast('Failed to copy', 'danger');
    });
}

// Toast Notification
function showToast(message, type = 'info', duration = 3000) {
    // Create toast container if it doesn't exist
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
        container.style.zIndex = '1060';
        document.body.appendChild(container);
    }
    
    const toastId = 'toast-' + Date.now();
    const bgClass = type === 'success' ? 'bg-success' : 
                    type === 'danger' ? 'bg-danger' : 
                    type === 'warning' ? 'bg-warning text-dark' : 'bg-info';
    
    const toastHtml = `
        <div id="${toastId}" class="toast ${bgClass} text-white" role="alert" aria-live="assertive" aria-atomic="true" data-bs-delay="${duration}">
            <div class="toast-header ${bgClass} text-white border-0">
                <strong class="me-auto">Notification</strong>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
            <div class="toast-body">${message}</div>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', toastHtml);
    
    const toastEl = document.getElementById(toastId);
    const toast = new bootstrap.Toast(toastEl);
    toast.show();
    
    toastEl.addEventListener('hidden.bs.toast', function() {
        toastEl.remove();
    });
}

// Format Number for Display
function formatNumber(number, type) {
    const badges = {
        '3D': '<span class="badge bg-info">3D</span>',
        '4D': '<span class="badge bg-success">4D</span>',
        'Invalid': '<span class="badge bg-warning text-dark">Invalid</span>'
    };
    return badges[type] || '<span class="badge bg-secondary">Unknown</span>';
}

// Debounce Function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Throttle Function
function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// Local Storage Helpers
const Storage = {
    get: function(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (e) {
            return defaultValue;
        }
    },
    set: function(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (e) {
            return false;
        }
    },
    remove: function(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (e) {
            return false;
        }
    }
};

// API Helper
async function apiRequest(url, options = {}) {
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
        }
    };
    
    const mergedOptions = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...(options.headers || {})
        }
    };
    
    try {
        const response = await fetch(url, mergedOptions);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || `HTTP error! status: ${response.status}`);
        }
        
        return data;
    } catch (error) {
        console.error('API Request failed:', error);
        throw error;
    }
}

// Export functions for global use
window.NumberCounter = {
    initNumberPreview,
    copyToClipboard,
    showToast,
    formatNumber,
    debounce,
    throttle,
    Storage,
    apiRequest
};