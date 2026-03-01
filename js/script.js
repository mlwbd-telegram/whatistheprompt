import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

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
const db = getFirestore(app);
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

    // --- AD MODAL ELEMENTS ---
    const adModal = document.getElementById('ad-modal');
    const adCountdown = document.getElementById('ad-countdown');
    const adTimerLabel = document.getElementById('ad-timer-label');
    const monetagAdSlot = document.getElementById('monetag-ad-slot');
    const closeAdBtn = document.getElementById('close-ad-btn');
    const adBlockWarning = document.getElementById('adblock-warning-msg');

    // ---------------------------------------------------------
    // 1. FILE UPLOAD LOGIC
    // ---------------------------------------------------------
    let currentImageFile = null;

    if (dropZone && fileInput && browseBtn) {
        browseBtn.addEventListener('click', () => {
            fileInput.click();
        });

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
                handleFileSelect(e.dataTransfer.files[0]);
            }
        });

        fileInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files.length > 0) {
                handleFileSelect(e.target.files[0]);
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

    onAuthStateChanged(auth, (user) => {
        if (user) {
            isLoggedIn = true;
            if (headerLoginBtn) {
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
                Sign in`;
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
    // 3. QUOTA LOGIC
    // ---------------------------------------------------------
    async function checkAndConsumeQuota(user) {
        const userRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(userRef);

        // Get today's local date string
        const today = new Date().toLocaleDateString();

        if (docSnap.exists()) {
            const data = docSnap.data();

            if (data.lastReset !== today) {
                // Reset for a new day
                await setDoc(userRef, { dailyCount: 1, lastReset: today }, { merge: true });
                return true;
            } else {
                if (data.dailyCount >= 5) {
                    return false; // Limit reached
                } else {
                    await setDoc(userRef, { dailyCount: data.dailyCount + 1 }, { merge: true });
                    return true;
                }
            }
        } else {
            // First time user
            await setDoc(userRef, { dailyCount: 1, lastReset: today });
            return true;
        }
    }

    // ---------------------------------------------------------
    // 4. ADBLOCK DETECTION (via Monetag script load attempt)
    //
    //    We try to load the real Monetag script into the modal slot.
    //    If the script fires its onload → ad network is reachable → no adblock.
    //    If the script fires its onerror → blocked  → disable the button.
    //
    //    ╔══════════════════════════════════════════════════════════╗
    //    ║  MONETAG_SCRIPT_SRC — PASTE YOUR MONETAG ZONE URL HERE  ║
    //    ║  Replace the placeholder URL below with the src value   ║
    //    ║  from your Monetag dashboard (Zone → Get Tag → src=…)   ║
    //    ╚══════════════════════════════════════════════════════════╝
    const MONETAG_SCRIPT_SRC = 'https://gizokraijaw.net/vignette.min.js'; // ← REPLACE WITH YOUR MONETAG SCRIPT URL
    const MONETAG_ZONE_ID = '10664014';                                  // ← REPLACE WITH YOUR MONETAG ZONE ID (if needed by the script)

    /**
     * Injects the Monetag script into #monetag-ad-slot and returns a Promise
     * that resolves with true (loaded OK) or false (blocked / error).
     * The script is created fresh each call so the ad re-fires correctly.
     */
    function loadMonetagAd() {
        return new Promise((resolve) => {
            // Clear any previous content
            if (monetagAdSlot) {
                monetagAdSlot.innerHTML = '';
            }

            const s = document.createElement('script');
            s.src = MONETAG_SCRIPT_SRC;
            if (MONETAG_ZONE_ID) s.dataset.zone = MONETAG_ZONE_ID;
            s.async = true;

            // Resolved by whichever fires first
            const timeout = setTimeout(() => {
                // Treat silence after 3 s as blocked (conservative)
                resolve(false);
            }, 3000);

            s.onload = () => {
                clearTimeout(timeout);
                resolve(true);
            };
            s.onerror = () => {
                clearTimeout(timeout);
                resolve(false);
            };

            if (monetagAdSlot) {
                monetagAdSlot.appendChild(s);
            } else {
                // Fallback — append to body if slot somehow missing
                document.body.appendChild(s);
            }
        });
    }

    // ---------------------------------------------------------
    // 5. GENERATE BUTTON LOGIC & AD MODAL
    //
    //  Race-condition guard: `_generationLocked` ensures the backend
    //  API is never called until the full ad timer has expired AND the
    //  user has clicked Close. Even if someone calls executeGeneration()
    //  from the browser console, the lock will have already been consumed.
    // ---------------------------------------------------------
    let adTimerInterval = null;
    let _generationLocked = true; // starts locked — unlocked only after timer + close

    /** Lock background scrolling while ad modal is visible */
    function lockBodyScroll() { document.body.style.overflow = 'hidden'; }
    /** Restore scrolling after modal is dismissed */
    function unlockBodyScroll() { document.body.style.overflow = ''; }

    /** Show the adblock warning and permanently disable the generate button */
    function showAdblockBlocked() {
        generateBtn.disabled = true;
        generateBtn.textContent = 'Ad Blocker Detected';
        if (adBlockWarning) {
            adBlockWarning.style.display = 'block';
            adBlockWarning.textContent = 'Ad blocker detected. Please disable ad blocker to use this tool.';
        } else {
            // Fallback — insert a warning paragraph near the button if element missing
            const warn = document.createElement('p');
            warn.id = 'adblock-warning-msg';
            warn.style.cssText = 'color:#f87171;font-size:0.85rem;margin-top:0.75rem;text-align:center;';
            warn.textContent = 'Ad blocker detected. Please disable ad blocker to use this tool.';
            generateBtn.parentNode.insertBefore(warn, generateBtn.nextSibling);
        }
    }

    /** Open the ad modal and start the 20-second countdown */
    function openAdModal() {
        _generationLocked = true; // re-lock on every new modal open
        lockBodyScroll();
        adModal.style.display = 'flex';
        closeAdBtn.style.display = 'none';
        let timeLeft = 20;
        adCountdown.textContent = timeLeft;
        if (adTimerLabel) adTimerLabel.textContent = 'seconds remaining';

        // Clear any stale interval from a previous run
        if (adTimerInterval) clearInterval(adTimerInterval);

        adTimerInterval = setInterval(() => {
            timeLeft--;
            adCountdown.textContent = timeLeft;
            if (timeLeft <= 0) {
                clearInterval(adTimerInterval);
                adTimerInterval = null;
                // Timer finished — unlock and reveal Close button
                _generationLocked = false;
                closeAdBtn.style.display = 'flex';
                if (adTimerLabel) adTimerLabel.textContent = 'Ad complete — click below to generate!';
            }
        }, 1000);
    }

    /** Close the ad modal and restore scroll */
    function closeAdModal() {
        unlockBodyScroll();
        adModal.style.display = 'none';
        if (adTimerInterval) {
            clearInterval(adTimerInterval);
            adTimerInterval = null;
        }
    }

    if (generateBtn) {
        generateBtn.addEventListener('click', async () => {

            // ── 1. Auth gate ──────────────────────────────────────────────
            if (!isLoggedIn) {
                // Trigger login popup; do NOT show ad during login flow
                await handleLogin();
                return;
            }

            // ── 2. Image gate ─────────────────────────────────────────────
            if (!currentImageFile) {
                alert('Please upload an image first.');
                return;
            }

            const currentUser = auth.currentUser;
            if (!currentUser) return;

            // ── 3. Disable button to prevent spam clicks ──────────────────
            generateBtn.disabled = true;

            // ── 4. Adblock detection via Monetag script load attempt ──────
            //    We inject the actual Monetag script; if it errors/times out
            //    the user has an ad blocker and we stop here permanently.
            const adLoaded = await loadMonetagAd();
            if (!adLoaded) {
                showAdblockBlocked();
                return; // button stays disabled
            }

            // ── 5. Quota gate ─────────────────────────────────────────────
            try {
                const hasQuota = await checkAndConsumeQuota(currentUser);
                if (!hasQuota) {
                    alert('Daily limit reached (5/5). Please come back tomorrow.');
                    generateBtn.disabled = false;
                    return;
                }
            } catch (error) {
                console.error('Error checking quota:', error);
                alert('Failed to verify generation limits. Please try again.');
                generateBtn.disabled = false;
                return;
            }

            // ── 6. Show Ad Modal with countdown ───────────────────────────
            openAdModal();
        });
    }

    if (closeAdBtn) {
        closeAdBtn.addEventListener('click', async () => {
            // Extra safety: only allow generation if lock released by timer
            if (_generationLocked) return;
            closeAdModal();
            await executeGeneration();
        });
    }

    // ---------------------------------------------------------
    // 5. BACKEND API CALL
    // ---------------------------------------------------------
    async function executeGeneration() {
        // Set UI to loading state
        generateBtn.disabled = true;
        generateBtn.textContent = 'Generating...';
        loadingMsg.style.display = 'block';
        resultText.value = '';

        try {
            // Call API
            const generatedPrompt = await callBackendAPI(currentImageFile);
            resultText.value = generatedPrompt;
        } catch (error) {
            console.error("Error during generation", error);
            alert("Generation failed: " + error.message);
        } finally {
            // Reset UI
            loadingMsg.style.display = 'none';
            generateBtn.disabled = false;
            generateBtn.textContent = 'Generate Prompt';
        }
    }

    async function callBackendAPI(imageFile) {
        const formData = new FormData();
        formData.append("image", imageFile);

        const response = await fetch('https://prompt-api.abusaifeshovon.workers.dev', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            let errorText = await response.text();
            try {
                const json = JSON.parse(errorText);
                errorText = json.error || errorText;
            } catch (e) {
                // If it's not JSON, keep raw text
            }
            throw new Error(`Worker returned ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        return data.result;
    }

    // ---------------------------------------------------------
    // 6. RESULT ACTIONS (COPY / CLEAR)
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
