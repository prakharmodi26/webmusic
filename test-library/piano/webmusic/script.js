// Constants
const GRID_ROWS = 3;
const GRID_COLS = 4;

// Note mapping (row-major order)
const NOTE_GRID = [
    ['G5', 'A5', 'C6', 'D6'],  // Top row
    ['C5', 'D5', 'E5', 'G5'],  // Middle row
    ['C4', 'D4', 'E4', 'G4']   // Bottom row
];

// Drumstick configuration
const DRUMSTICK_EXTENSION_FACTOR = 1.5;
const DRUMSTICK_WIDTH = 6;

// Pad configuration
const PAD_RADIUS_FACTOR = 0.4;

// Hit detection configuration
const PENETRATION_THRESHOLD = 0.3; // 30% into pad
const Z_MOVEMENT_THRESHOLD = 0.01;
const COOLDOWN_DURATION = 300; // 300ms per pad

// Detection modes
let useMotionDetection = false; // Toggle via UI

// Pad state constants
const PAD_STATE_IDLE = 'idle';
const PAD_STATE_ENTERING = 'entering';
const PAD_STATE_HIT = 'hit';
const PAD_STATE_COOLDOWN = 'cooldown';

// State
let currentCell = null;
let currentNote = null;
let hands = null;
let camera = null;
let synth = null;
let reverb = null;
let padCircles = []; // {row, col, centerX, centerY, radius}
let padStates = {}; // {"row,col": {state, lastHitTime, previousZ}}

// DOM elements
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const startButton = document.getElementById('startButton');
const videoContainer = document.getElementById('videoContainer');
const errorDiv = document.getElementById('error');

// Initialize audio synthesis
function initAudio() {
    reverb = new Tone.Reverb({
        decay: 2.5,
        wet: 0.3
    }).toDestination();

    synth = new Tone.PolySynth(Tone.Synth, {
        oscillator: {
            type: 'sine'
        },
        envelope: {
            attack: 0.05,
            decay: 0.2,
            sustain: 0.5,
            release: 0.3
        }
    }).connect(reverb);
}

// Calculate drumstick tip position extending from wrist through finger
function calculateDrumstickTip(landmarks) {
    const wrist = landmarks[0];
    const indexTip = landmarks[8];

    // Direction vector from wrist to finger tip
    const dx = indexTip.x - wrist.x;
    const dy = indexTip.y - wrist.y;
    const dz = indexTip.z - wrist.z;

    // Extend 1.5x beyond finger tip
    return {
        base: indexTip,
        tip: {
            x: indexTip.x + (dx * DRUMSTICK_EXTENSION_FACTOR),
            y: indexTip.y + (dy * DRUMSTICK_EXTENSION_FACTOR),
            z: indexTip.z + (dz * DRUMSTICK_EXTENSION_FACTOR)
        }
    };
}

// Calculate circular pad regions
function calculatePadCircles() {
    padCircles = [];
    const cellWidth = canvas.width / GRID_COLS;
    const cellHeight = canvas.height / GRID_ROWS;
    const radius = PAD_RADIUS_FACTOR * Math.min(cellWidth, cellHeight);

    for (let row = 0; row < GRID_ROWS; row++) {
        for (let col = 0; col < GRID_COLS; col++) {
            padCircles.push({
                row,
                col,
                centerX: (col + 0.5) * cellWidth,
                centerY: (row + 0.5) * cellHeight,
                radius
            });
        }
    }
}

// Initialize pad states
function initPadStates() {
    padStates = {};
    for (let row = 0; row < GRID_ROWS; row++) {
        for (let col = 0; col < GRID_COLS; col++) {
            padStates[`${row},${col}`] = {
                state: PAD_STATE_IDLE,
                lastHitTime: 0,
                previousZ: null
            };
        }
    }
}

// Check if drumstick tip hits any pad
function checkPadHit(drumstickTip) {
    const tipX = drumstickTip.x * canvas.width;
    const tipY = drumstickTip.y * canvas.height;

    for (let pad of padCircles) {
        const dx = tipX - pad.centerX;
        const dy = tipY - pad.centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < pad.radius) {
            const penetration = 1 - (distance / pad.radius);
            return {
                hit: true,
                pad: { row: pad.row, col: pad.col },
                penetration,
                zDepth: drumstickTip.z
            };
        }
    }
    return { hit: false };
}

// State machine logic for hit detection
function processHitDetection(drumstickTip) {
    const now = Date.now();
    const hitResult = checkPadHit(drumstickTip);

    // Reset pads not currently being hit
    Object.keys(padStates).forEach(key => {
        if (!hitResult.hit || key !== `${hitResult.pad.row},${hitResult.pad.col}`) {
            const state = padStates[key];
            if (state.state === PAD_STATE_COOLDOWN &&
                now - state.lastHitTime > COOLDOWN_DURATION) {
                state.state = PAD_STATE_IDLE;
            } else if (state.state !== PAD_STATE_IDLE &&
                       state.state !== PAD_STATE_COOLDOWN) {
                state.state = PAD_STATE_IDLE;
            }
            state.previousZ = null;
        }
    });

    if (hitResult.hit) {
        const padKey = `${hitResult.pad.row},${hitResult.pad.col}`;
        const padState = padStates[padKey];

        switch (padState.state) {
            case PAD_STATE_IDLE:
                padState.state = PAD_STATE_ENTERING;
                padState.previousZ = hitResult.zDepth;
                break;

            case PAD_STATE_ENTERING:
                if (hitResult.penetration >= PENETRATION_THRESHOLD) {
                    let shouldTrigger = true;

                    // Check motion detection mode
                    if (useMotionDetection) {
                        const zMovement = padState.previousZ - hitResult.zDepth;
                        shouldTrigger = zMovement > Z_MOVEMENT_THRESHOLD;
                    }

                    if (shouldTrigger) {
                        padState.state = PAD_STATE_HIT;
                        padState.lastHitTime = now;
                        triggerNoteOnce(hitResult.pad);
                    }
                }
                padState.previousZ = hitResult.zDepth;
                break;

            case PAD_STATE_HIT:
                padState.state = PAD_STATE_COOLDOWN;
                break;
        }

        return { isHitting: padState.state === PAD_STATE_HIT, cell: hitResult.pad };
    }

    return { isHitting: false, cell: null };
}

// Trigger a note once (replaces old triggerNote)
function triggerNoteOnce(cell) {
    // Stop previous note
    if (currentNote) {
        synth.triggerRelease(currentNote);
    }

    // Start new note
    const note = NOTE_GRID[cell.row][cell.col];
    synth.triggerAttack(note);

    // Update state
    currentCell = cell;
    currentNote = note;
}

// Stop current note
function stopNote() {
    if (currentNote) {
        synth.triggerRelease(currentNote);
        currentNote = null;
        currentCell = null;
    }
}

// Draw circular pads on canvas
function drawGrid() {
    // Draw circular pads
    for (let pad of padCircles) {
        const row = pad.row;
        const col = pad.col;
        const note = NOTE_GRID[row][col];

        // Check if this pad is active
        const padKey = `${row},${col}`;
        const padState = padStates[padKey];
        const isActive = padState && (padState.state === PAD_STATE_HIT || padState.state === PAD_STATE_COOLDOWN);

        // Draw circle background
        ctx.beginPath();
        ctx.arc(pad.centerX, pad.centerY, pad.radius, 0, 2 * Math.PI);
        ctx.fillStyle = isActive ? 'rgba(102, 126, 234, 0.4)' : 'rgba(255, 255, 255, 0.1)';
        ctx.fill();

        // Draw circle border
        ctx.strokeStyle = isActive ? 'rgba(102, 126, 234, 1)' : 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = isActive ? 4 : 2;
        ctx.stroke();

        // Add glow effect for active pads
        if (isActive) {
            ctx.shadowBlur = 20;
            ctx.shadowColor = 'rgba(102, 126, 234, 0.8)';
            ctx.beginPath();
            ctx.arc(pad.centerX, pad.centerY, pad.radius, 0, 2 * Math.PI);
            ctx.stroke();
            ctx.shadowBlur = 0;
        }
    }

    // Draw note labels
    ctx.font = '24px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let pad of padCircles) {
        const note = NOTE_GRID[pad.row][pad.col];
        const padKey = `${pad.row},${pad.col}`;
        const padState = padStates[padKey];
        const isActive = padState && (padState.state === PAD_STATE_HIT || padState.state === PAD_STATE_COOLDOWN);

        ctx.fillStyle = isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.7)';
        ctx.fillText(note, pad.centerX, pad.centerY);
    }
}

// Draw virtual drumstick
function drawDrumstick(landmarks) {
    const drumstick = calculateDrumstickTip(landmarks);
    const baseX = drumstick.base.x * canvas.width;
    const baseY = drumstick.base.y * canvas.height;
    const tipX = drumstick.tip.x * canvas.width;
    const tipY = drumstick.tip.y * canvas.height;

    // Draw drumstick shaft with gradient
    const gradient = ctx.createLinearGradient(baseX, baseY, tipX, tipY);
    gradient.addColorStop(0, '#8B4513');   // Brown base
    gradient.addColorStop(1, '#D2B48C');   // Tan tip

    ctx.strokeStyle = gradient;
    ctx.lineWidth = DRUMSTICK_WIDTH;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(baseX, baseY);
    ctx.lineTo(tipX, tipY);
    ctx.stroke();

    // Draw drumstick tip highlight
    ctx.beginPath();
    ctx.arc(tipX, tipY, 10, 0, 2 * Math.PI);
    ctx.fillStyle = '#FFD700';  // Gold
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 2;
    ctx.stroke();
}

// Draw hand landmarks
function drawHands(results) {
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const landmarks = results.multiHandLandmarks[0];

        // Draw connections
        ctx.strokeStyle = 'rgba(0, 255, 0, 0.5)';
        ctx.lineWidth = 2;

        const connections = [
            [0, 1], [1, 2], [2, 3], [3, 4],  // Thumb
            [0, 5], [5, 6], [6, 7], [7, 8],  // Index
            [0, 9], [9, 10], [10, 11], [11, 12],  // Middle
            [0, 13], [13, 14], [14, 15], [15, 16],  // Ring
            [0, 17], [17, 18], [18, 19], [19, 20],  // Pinky
            [5, 9], [9, 13], [13, 17]  // Palm
        ];

        connections.forEach(([start, end]) => {
            const startPoint = landmarks[start];
            const endPoint = landmarks[end];

            ctx.beginPath();
            ctx.moveTo(startPoint.x * canvas.width, startPoint.y * canvas.height);
            ctx.lineTo(endPoint.x * canvas.width, endPoint.y * canvas.height);
            ctx.stroke();
        });

        // Draw landmark points
        landmarks.forEach((landmark, index) => {
            const x = landmark.x * canvas.width;
            const y = landmark.y * canvas.height;

            // Highlight index finger tip
            const isIndexTip = index === 8;

            ctx.beginPath();
            ctx.arc(x, y, isIndexTip ? 8 : 4, 0, 2 * Math.PI);
            ctx.fillStyle = isIndexTip ? 'rgba(255, 0, 0, 0.8)' : 'rgba(0, 255, 0, 0.8)';
            ctx.fill();

            if (isIndexTip) {
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
                ctx.lineWidth = 2;
                ctx.stroke();
            }
        });

        // Draw virtual drumstick
        drawDrumstick(landmarks);
    }
}

// Process hand tracking results
function onResults(results) {
    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Recalculate pad circles on canvas resize
    if (padCircles.length === 0) {
        calculatePadCircles();
    }

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    drawGrid();

    // Check for hand detection
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const landmarks = results.multiHandLandmarks[0];

        // Calculate drumstick tip
        const drumstick = calculateDrumstickTip(landmarks);

        // Process hit detection
        const hitInfo = processHitDetection(drumstick.tip);

        // Draw hand landmarks
        drawHands(results);
    } else {
        // No hand detected, stop note
        stopNote();
    }
}

// Initialize MediaPipe Hands
function initHands() {
    hands = new Hands({
        locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
        }
    });

    hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.7
    });

    hands.onResults(onResults);

    // Initialize pad states
    initPadStates();
}

// Initialize camera
async function initCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: { ideal: 1280 },
                height: { ideal: 720 }
            }
        });

        video.srcObject = stream;

        camera = new Camera(video, {
            onFrame: async () => {
                await hands.send({ image: video });
            },
            width: 1280,
            height: 720
        });

        await camera.start();
    } catch (error) {
        console.error('Camera error:', error);
        videoContainer.style.display = 'none';
        errorDiv.style.display = 'block';
        errorDiv.textContent = 'Camera access denied. Please allow camera permissions and refresh the page.';
    }
}

// Start button handler
startButton.addEventListener('click', async () => {
    try {
        // Start audio context
        await Tone.start();
        console.log('Audio context started');

        // Initialize audio
        initAudio();

        // Initialize hands
        initHands();

        // Initialize camera
        await initCamera();

        // Hide start button, show video
        startButton.style.display = 'none';
        videoContainer.style.display = 'flex';

        // Show mode toggle
        document.getElementById('modeToggle').style.display = 'block';
        document.getElementById('motionModeCheckbox').addEventListener('change', (e) => {
            useMotionDetection = e.target.checked;
        });
    } catch (error) {
        console.error('Initialization error:', error);
        errorDiv.style.display = 'block';
        errorDiv.textContent = 'Failed to initialize. Please refresh and try again.';
    }
});
