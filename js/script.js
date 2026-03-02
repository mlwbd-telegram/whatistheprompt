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
    const modalAdSlot = document.getElementById('modal-ad-slot');
    const closeAdBtn = document.getElementById('close-ad-btn');
    const adBlockWarning = document.getElementById('adblock-warning-msg');

    // --- USAGE COUNTER ELEMENTS ---
    const usageCounterText = document.getElementById('usage-counter-text');
    const usageCounterFill = document.getElementById('usage-counter-fill');
    const limitWarningMsg = document.getElementById('limit-warning-msg');

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

    async function handleFileSelect(file) {
        if (!file.type.startsWith('image/')) {
            alert('Please select an image file (JPG, PNG, WEBP, HEIC).');
            return;
        }

        // Show a temporary preview of the original file while we optimize
        const originalUrl = URL.createObjectURL(file);
        imagePreview.src = originalUrl;
        dropZone.style.display = 'none';
        previewContainer.style.display = 'block';

        // Show optimization status
        const statusEl = document.getElementById('optimization-status');
        const loaderEl = document.getElementById('optimization-loader');
        const statsEl = document.getElementById('optimization-stats');
        if (statusEl) { statusEl.style.display = 'block'; }
        if (loaderEl) { loaderEl.style.display = 'inline'; }
        if (statsEl) { statsEl.style.display = 'none'; }

        try {
            const { blob, originalSize, optimizedSize } = await optimizeImage(file);
            currentImageFile = blob;

            // Switch preview to optimized blob URL
            URL.revokeObjectURL(originalUrl);
            imagePreview.src = URL.createObjectURL(blob);

            // Show optimized size only
            if (loaderEl) loaderEl.style.display = 'none';
            if (statsEl) {
                const fmt = (bytes) => bytes >= 1_048_576
                    ? (bytes / 1_048_576).toFixed(1) + ' MB'
                    : Math.round(bytes / 1024) + ' KB';
                statsEl.innerHTML = `Size: <strong>${fmt(optimizedSize)}</strong>`;
                statsEl.style.display = 'block';
            }
        } catch (err) {
            console.error('Image optimization failed, falling back to original:', err);
            currentImageFile = file; // safe fallback
            if (loaderEl) loaderEl.style.display = 'none';
            if (statsEl) {
                statsEl.innerHTML = '⚠️ Optimization failed — sending original.';
                statsEl.style.display = 'block';
            }
        }
    }

    // ---------------------------------------------------------
    // IMAGE OPTIMIZER — Canvas-based, fully client-side
    //   • Resize: longest side ≤ 896 px (preserve aspect ratio)
    //   • Format: always JPEG (strips EXIF as canvas side-effect)
    //   • Quality: 0.74 → step down to 0.64 / 0.54 if > 350 KB
    //   • Hard cap: 450 KB
    // ---------------------------------------------------------
    function optimizeImage(file) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const objectUrl = URL.createObjectURL(file);

            img.onload = () => {
                URL.revokeObjectURL(objectUrl);

                const MAX_SIDE = 896;
                let { width, height } = img;

                // Downscale only — never upscale
                if (width > MAX_SIDE || height > MAX_SIDE) {
                    if (width >= height) {
                        height = Math.round(height * MAX_SIDE / width);
                        width = MAX_SIDE;
                    } else {
                        width = Math.round(width * MAX_SIDE / height);
                        height = MAX_SIDE;
                    }
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                canvas.getContext('2d').drawImage(img, 0, 0, width, height);

                // Quality step-down: 0.74 → 0.64 → 0.54
                const TARGET_SIZE = 350_000; // 350 KB ideal
                const qualities = [0.74, 0.64, 0.54];
                let qi = 0;

                const tryExport = () => {
                    canvas.toBlob(blob => {
                        if (!blob) { reject(new Error('Canvas toBlob failed')); return; }
                        if (blob.size > TARGET_SIZE && qi < qualities.length - 1) {
                            qi++;
                            tryExport();
                        } else {
                            resolve({
                                blob,
                                originalSize: file.size,
                                optimizedSize: blob.size
                            });
                        }
                    }, 'image/jpeg', qualities[qi]);
                };

                tryExport();
            };

            img.onerror = () => {
                URL.revokeObjectURL(objectUrl);
                reject(new Error('Failed to load image for optimization'));
            };

            img.src = objectUrl;
        });
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
            // Refresh usage counter when user logs in
            refreshUsageUI();
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
    // 3. USAGE QUOTA LOGIC (Firestore "usage" collection)
    //
    //    Collection: "usage"
    //    Document ID: user.uid
    //    Fields:
    //      count     (number)    — prompts used today
    //      lastReset (string)    — date string of last reset
    //
    //    Flow: CHECK quota (before ad) → SHOW ad → GENERATE → INCREMENT (after success)
    // ---------------------------------------------------------
    const MAX_DAILY = 5;
    const WORKER_URL = 'https://prompt-api.abusaifeshovon.workers.dev';

    /** Get today's date as YYYY-MM-DD (UTC, consistent with Worker) */
    function getTodayString() {
        return new Date().toISOString().slice(0, 10);
    }

    /** Fetch the current usage count from Firestore (reset if new day) */
    async function fetchUsageCount(user) {
        // Collection: users_usage/{uid}  |  Fields: count, lastDate (YYYY-MM-DD)
        const usageRef = doc(db, "users_usage", user.uid);
        const docSnap = await getDoc(usageRef);
        const today = getTodayString();

        if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.lastDate !== today) {
                // New day — reset to 0
                await setDoc(usageRef, { count: 0, lastDate: today }, { merge: true });
                return 0;
            }
            return data.count || 0;
        } else {
            // First time user — create doc
            await setDoc(usageRef, { count: 0, lastDate: today });
            return 0;
        }
    }

    /** Check if user has quota remaining (does NOT increment) */
    async function checkQuota(user) {
        const count = await fetchUsageCount(user);
        return { allowed: count < MAX_DAILY, count };
    }

    /** Increment the usage count by 1 AFTER successful generation */
    async function incrementUsage(user) {
        const usageRef = doc(db, "users_usage", user.uid);
        const docSnap = await getDoc(usageRef);
        const today = getTodayString();
        const currentCount = docSnap.exists() && docSnap.data().lastDate === today
            ? (docSnap.data().count || 0)
            : 0;
        await setDoc(usageRef, { count: currentCount + 1, lastDate: today }, { merge: true });
        return currentCount + 1;
    }

    /** Update the usage counter UI elements */
    function updateUsageCounterUI(count) {
        if (usageCounterText) {
            usageCounterText.textContent = `You have used ${count} / ${MAX_DAILY} free generations today`;
        }
        if (usageCounterFill) {
            const pct = Math.min((count / MAX_DAILY) * 100, 100);
            usageCounterFill.style.width = `${pct}%`;
            // Change color when limit reached
            usageCounterFill.style.background = count >= MAX_DAILY
                ? '#f87171'
                : 'var(--accent-gradient)';
        }
        if (limitWarningMsg) {
            if (count >= MAX_DAILY) {
                limitWarningMsg.style.display = 'block';
                limitWarningMsg.textContent = 'Daily free limit reached. Come back tomorrow.';
            } else {
                limitWarningMsg.style.display = 'none';
            }
        }
    }

    /**
     * Load and display usage count from the Worker's /api/usage endpoint.
     * Falls back to local Firestore read if the Worker call fails.
     */
    async function refreshUsageUI() {
        const user = auth.currentUser;
        if (!user) return;
        try {
            // Primary: get live count from Worker (authoritative server-side count)
            const idToken = await user.getIdToken();
            const res = await fetch(`${WORKER_URL}/api/usage`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${idToken}` },
            });
            if (res.ok) {
                const { used } = await res.json();
                updateUsageCounterUI(used);
                return;
            }
        } catch (e) {
            console.warn('Worker /api/usage failed, falling back to Firestore:', e);
        }
        // Fallback: local Firestore read
        try {
            const count = await fetchUsageCount(user);
            updateUsageCounterUI(count);
        } catch (e) {
            console.error('Failed to fetch usage count:', e);
        }
    }

    // ---------------------------------------------------------
    // 4. ADBLOCK DETECTION (via Adsterra script load attempt)
    //
    //    We inject the real Adsterra invoke.js into the modal slot.
    //    If the script fires its onload → ad network is reachable → no adblock.
    //    If the script fires its onerror → blocked → disable the button.
    //
    //    ╔═══════════════════════════════════════════════════════════╗
    //    ║  ADSTERRA CONFIG — Update the key below if zone changes  ║
    //    ╚═══════════════════════════════════════════════════════════╝
    const ADSTERRA_KEY = 'e1d24c3cd11f87e62d2147e4f6ea76fa';
    const ADSTERRA_SCRIPT_SRC = `https://www.highperformanceformat.com/${ADSTERRA_KEY}/invoke.js`;

    /**
     * Injects the Adsterra 300×250 ad into #modal-ad-slot and returns a Promise
     * that resolves with true (loaded OK) or false (blocked / error).
     * The script is created fresh each call so the ad re-renders correctly.
     */
    function loadAdsterraAd() {
        return new Promise((resolve) => {
            // Clear any previous ad content
            if (modalAdSlot) {
                modalAdSlot.innerHTML = '';
            }

            // Set global atOptions BEFORE injecting invoke.js (Adsterra reads this)
            window.atOptions = {
                'key': ADSTERRA_KEY,
                'format': 'iframe',
                'height': 250,
                'width': 300,
                'params': {}
            };

            const s = document.createElement('script');
            s.src = ADSTERRA_SCRIPT_SRC;
            s.async = true;

            // Resolved by whichever fires first
            const timeout = setTimeout(() => {
                // Treat silence after 4s as blocked (conservative)
                resolve(false);
            }, 4000);

            s.onload = () => {
                clearTimeout(timeout);
                resolve(true);
            };
            s.onerror = () => {
                clearTimeout(timeout);
                resolve(false);
            };

            if (modalAdSlot) {
                modalAdSlot.appendChild(s);
            } else {
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

    /** Open the ad modal and start the 10-second countdown */
    function openAdModal() {
        _generationLocked = true; // re-lock on every new modal open
        lockBodyScroll();
        adModal.style.display = 'flex';
        closeAdBtn.style.display = 'none';
        let timeLeft = 10;
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

            // ── 4. Adblock detection via Adsterra script load attempt ──────
            const adLoaded = await loadAdsterraAd();
            if (!adLoaded) {
                showAdblockBlocked();
                return; // button stays disabled
            }

            // ── 5. Quota CHECK (does not increment yet) ───────────────────
            try {
                const { allowed, count } = await checkQuota(currentUser);
                updateUsageCounterUI(count);
                if (!allowed) {
                    alert('Daily free limit reached. Come back tomorrow.');
                    generateBtn.disabled = false;
                    return;
                }
            } catch (error) {
                console.error('Error checking quota:', error);
                alert('Failed to verify generation limits. Please try again.');
                generateBtn.disabled = false;
                return;
            }

            // ── 6. Show Ad Modal with 10-second countdown ─────────────────
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
    // 6. BACKEND API CALL
    //    Sends Firebase ID token to worker for server-side verification.
    //    Increments usage ONLY after successful generation.
    // ---------------------------------------------------------
    async function executeGeneration() {
        // Set UI to loading state
        generateBtn.disabled = true;
        generateBtn.textContent = 'Generating...';
        loadingMsg.style.display = 'block';
        resultText.value = '';

        try {
            // Get Firebase ID token for server-side auth + quota verification
            const currentUser = auth.currentUser;
            const idToken = currentUser ? await currentUser.getIdToken() : null;

            // Call Worker API
            const generatedPrompt = await callBackendAPI(currentImageFile, idToken);
            resultText.value = generatedPrompt;

            // ── SUCCESS → increment usage count in Firestore ──────────────
            if (currentUser) {
                const newCount = await incrementUsage(currentUser);
                updateUsageCounterUI(newCount);
            }
        } catch (error) {
            console.error('Error during generation', error);
            alert('Generation failed: ' + error.message);
        } finally {
            // Reset UI
            loadingMsg.style.display = 'none';
            generateBtn.disabled = false;
            generateBtn.textContent = 'Generate Prompt';
        }
    }

    async function callBackendAPI(imageFile, idToken) {
        // imageFile is now always an optimized JPEG Blob (never the raw original).
        // FormData.append() accepts Blob directly; we give it a .jpg filename
        // so the Worker's multipart parser labels it correctly.
        const formData = new FormData();
        formData.append('image', imageFile, 'photo.jpg');

        const headers = {};
        if (idToken) {
            headers['Authorization'] = `Bearer ${idToken}`;
        }

        const response = await fetch(WORKER_URL, {
            method: 'POST',
            headers: headers,
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
