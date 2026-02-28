// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyARHithRPMeScrInNAyT-JNIOAklJ2lJrI",
    authDomain: "whatistheprompt-f21ee.firebaseapp.com",
    projectId: "whatistheprompt-f21ee",
    storageBucket: "whatistheprompt-f21ee.firebasestorage.app",
    messagingSenderId: "118376175287",
    appId: "1:118376175287:web:47e0be6732b3a775821f32"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

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
    let currentImageFile = null;

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
            currentImageFile = null;
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

        currentImageFile = file;
        const reader = new FileReader();
        reader.onload = (e) => {
            imagePreview.src = e.target.result;
            dropZone.style.display = 'none';
            previewContainer.style.display = 'block';
        };
        reader.readAsDataURL(file);
    }

    // ---------------------------------------------------------
    // 2. ACCOUNT / LOGIN LOGIC (FIREBASE)
    // ---------------------------------------------------------
    let isLoggedIn = false;

    // Listen to Auth State Changes natively
    onAuthStateChanged(auth, (user) => {
        if (user) {
            isLoggedIn = true;

            if (headerLoginBtn) {
                // Keep the icon slightly, or just text
                headerLoginBtn.innerHTML = 'Sign Out';
            }

            if (mainLoginBtn) {
                mainLoginBtn.style.display = 'none';
                if (loginWarningMsg) {
                    loginWarningMsg.style.color = '#10b981'; // Green color
                    loginWarningMsg.textContent = `Logged in successfully as ${user.displayName || 'User'}! You can now generate a prompt.`;
                }
            }

            if (generateBtn) {
                generateBtn.disabled = false;
            }
        } else {
            isLoggedIn = false;

            if (headerLoginBtn) {
                headerLoginBtn.innerHTML = `
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.16v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.16C1.43 8.55 1 10.22 1 12s.43 3.45 1.16 4.93l3.68-2.84z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.16 7.07l3.68 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Sign in with Google`;
            }

            if (mainLoginBtn) {
                mainLoginBtn.style.display = 'inline-flex';
                if (loginWarningMsg) {
                    loginWarningMsg.style.color = '#ef4444'; // Red color
                    loginWarningMsg.textContent = 'Login required before generating.';
                }
            }

            if (generateBtn) {
                generateBtn.disabled = true;
            }
        }
    });

    async function handleLogin() {
        try {
            await signInWithPopup(auth, provider);
        } catch (error) {
            console.error("Error during sign in:", error);
            alert("Login failed: " + error.message);
        }
    }

    async function handleLogout() {
        try {
            await signOut(auth);
        } catch (error) {
            console.error("Error during sign out:", error);
        }
    }

    if (headerLoginBtn) {
        headerLoginBtn.addEventListener('click', () => {
            if (isLoggedIn) {
                handleLogout();
            } else {
                handleLogin();
            }
        });
    }

    if (mainLoginBtn) {
        mainLoginBtn.addEventListener('click', handleLogin);
    }

    // ---------------------------------------------------------
    // 3. BACKEND API PLACEHOLDER
    // ---------------------------------------------------------
    async function callBackendAPI(imageFile) {
        // Note: The Cloudflare Worker expects a JSON body with { "prompt": "text..." }.
        // If you plan to analyze the uploaded 'imageFile', you'll need to do that step
        // (e.g., using a Vision API or extracting metadata) before this API call.
        //
        // For now, this is testing the connection to your live API with a dummy image description:
        const extractedTextDescription = "A young woman wearing a red jacket standing in the rain at night";

        const response = await fetch('https://prompt-api.abusaifeshovon.workers.dev', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ prompt: extractedTextDescription })
        });

        if (!response.ok) {
            throw new Error(`Worker API Error: ${response.status}`);
        }

        const data = await response.json();
        return data.result;
    }

    // ---------------------------------------------------------
    // 4. GENERATE BUTTON LOGIC & MONETAG AD
    // ---------------------------------------------------------
    if (generateBtn) {
        generateBtn.addEventListener('click', async () => {
            // Guard clauses
            if (!isLoggedIn) {
                alert('Please sign in first.');
                return;
            }

            if (!currentImageFile) {
                alert('Please upload an image first.');
                return;
            }

            // Fire Monetag Vignette Ad Script as requested
            // Note: Vignette usually overlays the screen and waits for user interaction
            (function (s) {
                s.dataset.zone = '10664014';
                s.src = 'https://gizokraijaw.net/vignette.min.js';
                [document.documentElement, document.body].filter(Boolean).pop().appendChild(s);
            })(document.createElement('script'));

            // Set UI to loading state
            generateBtn.disabled = true;
            generateBtn.textContent = 'Generating...';
            loadingMsg.style.display = 'block';
            resultText.value = '';

            try {
                // Call placeholder API function
                const generatedPrompt = await callBackendAPI(currentImageFile);
                resultText.value = generatedPrompt;
            } catch (error) {
                console.error("Error during generation", error);
                alert("Generation failed, please try again.");
            } finally {
                // Reset UI
                loadingMsg.style.display = 'none';
                generateBtn.disabled = false;
                generateBtn.textContent = 'Generate Prompt';
            }
        });
    }

    // ---------------------------------------------------------
    // 5. RESULT ACTIONS (COPY / CLEAR)
    // ---------------------------------------------------------
    if (copyBtn && resultText) {
        copyBtn.addEventListener('click', () => {
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
