import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
document.addEventListener('DOMContentLoaded', () => {
    // Note: This script runs on both index.html and generate.html.
    // Some elements only exist on generate.html, so we check for their existence.

    // --- UPLOAD SECTION ELEMENTS ---
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const browseBtn = document.getElementById('browse-btn');
    const previewContainer = document.getElementById('preview-container');
    const imagePreview = document.getElementById('image-preview');
    const removeImageBtn = document.getElementById('remove-image-btn');

    // --- ACCOUNT / GENERATE ELEMENTS ---
    const headerLoginBtn = document.getElementById('header-login-btn');
    const mainLoginBtn = document.getElementById('main-login-btn');
    const loginWarningMsg = document.getElementById('login-warning-msg');
    const generateBtn = document.getElementById('generate-btn');
    const loadingMsg = document.getElementById('loading-msg');
    
    // --- RESULT ELEMENTS ---
    const resultText = document.getElementById('result-text');
    const copyBtn = document.getElementById('copy-btn');
    const clearBtn = document.getElementById('clear-btn');
    const copySuccess = document.getElementById('copy-success');

    // ---------------------------------------------------------
    // 1. FILE UPLOAD LOGIC
    // ---------------------------------------------------------
    if (dropZone && fileInput && browseBtn) {
        // Trigger file input when "Choose file" is clicked
        browseBtn.addEventListener('click', () => {
            fileInput.click();
        });

        // Handle drag and drop styling
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });

        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('dragover');
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');

            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                const file = e.dataTransfer.files[0];
                handleFileSelect(file);
            }
        });

        // Handle file selection from input
        fileInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files.length > 0) {
                const file = e.target.files[0];
                handleFileSelect(file);
            }
        });

        removeImageBtn.addEventListener('click', () => {
            fileInput.value = '';
            imagePreview.src = '';
            previewContainer.style.display = 'none';
            dropZone.style.display = 'block';
        });
    }

    function handleFileSelect(file) {
        // Only accept images
        if (!file.type.match('image.*')) {
            alert('Please select an image file (JPG or PNG).');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            imagePreview.src = e.target.result;
            dropZone.style.display = 'none';
            previewContainer.style.display = 'block';
        };
        reader.readAsDataURL(file);
    }

    // ---------------------------------------------------------
    // 2. ACCOUNT / LOGIN LOGIC (MOCK)
    // ---------------------------------------------------------
    // TO-DO: Replace this with actual Firebase logic
    let isLoggedIn = false;

    function mockLogin() {
        isLoggedIn = true;
        
        if (headerLoginBtn) headerLoginBtn.innerHTML = 'Sign Out';
        
        if (mainLoginBtn) {
            mainLoginBtn.style.display = 'none';
            loginWarningMsg.style.color = '#10b981'; // Green color for success
            loginWarningMsg.textContent = 'Logged in successfully! You can now generate a prompt.';
        }

        if (generateBtn) {
            generateBtn.disabled = false;
        }
    }

    function mockLogout() {
        isLoggedIn = false;
        
        if (headerLoginBtn) headerLoginBtn.innerHTML = 'Sign in';
        
        if (mainLoginBtn) {
            mainLoginBtn.style.display = 'inline-flex';
            loginWarningMsg.style.color = '#ef4444'; // Red color
            loginWarningMsg.textContent = 'Login required before generating.';
        }

        if (generateBtn) {
            generateBtn.disabled = true;
        }
    }

    if (headerLoginBtn) {
        headerLoginBtn.addEventListener('click', () => {
            if (isLoggedIn) {
                mockLogout();
            } else {
                mockLogin();
            }
        });
    }

    if (mainLoginBtn) {
        mainLoginBtn.addEventListener('click', () => {
            mockLogin();
        });
    }

    // ---------------------------------------------------------
    // 3. GENERATE BUTTON LOGIC
    // ---------------------------------------------------------
    if (generateBtn) {
        generateBtn.addEventListener('click', async () => {
            // Validate that an image is uploaded
            if (!imagePreview.src || imagePreview.src === window.location.href) {
                alert('Please upload an image first.');
                return;
            }

            // Update UI to loading state
            generateBtn.disabled = true;
            generateBtn.textContent = 'Generating...';
            loadingMsg.style.display = 'block';
            resultText.value = ''; // clear old result

            // TO-DO: Call your actual backend (Cloudflare Worker API) here.
            // Mock API delay to simulate network request:
            setTimeout(() => {
                // Mock result
                const fakePrompt = "A highly detailed, hyper-realistic cinematic shot of a stunning breathtaking landscape, 8k resolution, volumetric lighting, epic composition, vibrant colors, trending on artstation.";
                
                resultText.value = fakePrompt;
                
                // Reset UI
                loadingMsg.style.display = 'none';
                generateBtn.disabled = false;
                generateBtn.textContent = 'Generate Prompt';
            }, 2000); // 2 second mock delay
        });
    }

    // ---------------------------------------------------------
    // 4. RESULT ACTIONS (COPY / CLEAR)
    // ---------------------------------------------------------
    if (copyBtn && resultText) {
        copyBtn.addEventListener('click', () => {
            // Only copy if there's text
            if (!resultText.value) return;

            navigator.clipboard.writeText(resultText.value).then(() => {
                copySuccess.style.display = 'block';
                setTimeout(() => {
                    copySuccess.style.display = 'none';
                }, 2000);
            }).catch(err => {
                console.error('Failed to copy text: ', err);
            });
        });
    }

    if (clearBtn && resultText) {
        clearBtn.addEventListener('click', () => {
            resultText.value = '';
        });
    }

});
