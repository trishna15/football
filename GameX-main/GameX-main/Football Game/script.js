/* ==========================================================================
   GOALKEEPER'S POV - 3D GAME ENGINE (THREE.JS)
   Features: Procedural Mannequin Rigging, 3D Diving Physics, MediaPipe Tracker
   ========================================================================== */

// --- 1. Sound Synthesizer Class (Web Audio API) ---
class SoundSynth {
    constructor() {
        this.ctx = null;
        this.isMuted = false;
    }

    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    setMute(muteState) {
        this.isMuted = muteState;
    }

    playRadarScan() {
        if (this.isMuted || !this.ctx) return;
        this.init();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1600, this.ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.04, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.08);
    }

    playKick() {
        if (this.isMuted || !this.ctx) return;
        this.init();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(130, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(35, this.ctx.currentTime + 0.25);
        gain.gain.setValueAtTime(0.7, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.25);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.25);
    }

    playSave() {
        if (this.isMuted || !this.ctx) return;
        this.init();
        const osc = this.ctx.createOscillator();
        const sweep = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(500, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.3);
        sweep.type = 'sawtooth';
        sweep.frequency.setValueAtTime(150, this.ctx.currentTime);
        sweep.frequency.exponentialRampToValueAtTime(700, this.ctx.currentTime + 0.25);
        gain.gain.setValueAtTime(0.35, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);
        osc.connect(gain);
        sweep.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        sweep.start();
        osc.stop(this.ctx.currentTime + 0.3);
        sweep.stop(this.ctx.currentTime + 0.3);
    }

    playGoal() {
        if (this.isMuted || !this.ctx) return;
        this.init();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(280, this.ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(450, this.ctx.currentTime + 0.2);
        osc.frequency.linearRampToValueAtTime(280, this.ctx.currentTime + 0.4);
        osc.frequency.linearRampToValueAtTime(450, this.ctx.currentTime + 0.6);
        gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.75);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.75);
        this.playStadiumRoar();
    }

    playStadiumRoar() {
        if (this.isMuted || !this.ctx) return;
        this.init();
        const bufferSize = this.ctx.sampleRate * 2.0;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        const source = this.ctx.createBufferSource();
        source.buffer = buffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(450, this.ctx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.4);
        filter.frequency.exponentialRampToValueAtTime(350, this.ctx.currentTime + 1.8);
        filter.Q.setValueAtTime(1.2, this.ctx.currentTime);
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.01, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.4, this.ctx.currentTime + 0.3);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 1.9);
        source.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        source.start();
        source.stop(this.ctx.currentTime + 2.0);
    }
}

const soundSynth = new SoundSynth();

// --- 2. Game Engine States & Configurations ---
const GAME_CONFIG = {
    totalAttempts: 7,             // Match loop consists strictly of 7 shot attempts
    ballDuration: 1300,           // ms for floating ball path
    reboundDuration: 600          // ms for collision bounce animations
};

const gameState = {
    saves: 0,
    goals: 0,
    attempts: 0,
    currentDifficulty: 'MEDIUM',
    highScoreSaves: 0,
    highScoreRate: 0,
    
    // Screen Router States
    activeScreen: 'menu-screen',
    gameActive: false,
    cameraInitialized: false,
    handDetected: false,
    isKicking: false,
    
    // Position Sectors
    goalkeeperSector: 'bottom-center', // top-left, top-center, top-right, bottom-left, bottom-center, bottom-right
    ballTargetSector: null,
    
    // Timing / Animation Frames
    kickTimer: null,
    countdownTimer: null,
    radarSweepAngle: 0,
    
    // 3D Objects References
    ballTarget3D: new THREE.Vector3(),
    ballCurrent3D: new THREE.Vector3(),
    ballWobbleSeedX: 0,
    ballWobbleSeedY: 0,
    
    // Hand Landmarks coordinate cache
    palmCoords: null
};

// DOM Cache
const dom = {
    // Screen elements
    menuScreen: document.getElementById('menu-screen'),
    gameplayScreen: document.getElementById('gameplay-screen'),
    mainMenuStack: document.getElementById('main-menu-stack'),
    roleSelectionStack: document.getElementById('role-selection-stack'),
    takerLockedModal: document.getElementById('taker-locked-modal'),
    gameOverOverlay: document.getElementById('game-over-overlay'),
    
    // Navigation Buttons
    singleplayerBtn: document.getElementById('singleplayer-btn'),
    roleGoalieBtn: document.getElementById('role-goalie-btn'),
    roleTakerBtn: document.getElementById('role-taker-btn'),
    roleBackBtn: document.getElementById('role-back-btn'),
    takerLockedCloseBtn: document.getElementById('taker-locked-close-btn'),
    retryGameBtn: document.getElementById('retry-game-btn'),
    exitToMenuBtn: document.getElementById('exit-to-menu-btn'),
    
    // HUD Stats Elements
    valAttempts: document.getElementById('tel-val-attempts'),
    valSaves: document.getElementById('tel-val-saves'),
    gameMuteBtn: document.getElementById('game-mute-btn'),
    gameBackBtn: document.getElementById('game-back-to-menu-btn'),
    
    // Viewport
    pitchViewport: document.getElementById('pitch-viewport'),
    threeCanvas: document.getElementById('three-canvas'),
    actionToast: document.getElementById('action-toast'),
    roundCountdown: document.getElementById('round-countdown'),
    
    // Goal Sector Overlays
    sectorsOverlay: document.getElementById('goal-sectors-overlay'),
    sectors: {
        'top-left': document.getElementById('sector-top-left'),
        'top-center': document.getElementById('sector-top-center'),
        'top-right': document.getElementById('sector-top-right'),
        'bottom-left': document.getElementById('sector-bottom-left'),
        'bottom-center': document.getElementById('sector-bottom-center'),
        'bottom-right': document.getElementById('sector-bottom-right')
    },
    
    // Webcam Radar
    video: document.getElementById('webcam-video'),
    radarCanvas: document.getElementById('radar-canvas'),
    radarLockStatus: document.getElementById('radar-lock-status'),
    radarActiveSector: document.getElementById('radar-active-sector'),
    webcamLoadingMsg: document.getElementById('webcam-loading-msg')
};

// --- 3. Three.js 3D Setup Variables ---
let renderer, scene, camera;
let pitchLawn, goalFrame, goalNetMesh;
let strikerModel, goalieModel;
let ball3D, ball3DGlow;
let ballTrailSpheres = [];
const TRAIL_COUNT = 15;
let particlePool = [];
const PARTICLE_COUNT = 45;

// Rigged Human Joint Groups
let goalieJoints = {};
let strikerJoints = {};

// Default Pose Rotations cache
const goalieIdleRotations = {
    leftShoulderZ: 0.2,
    rightShoulderZ: -0.2,
    leftShoulderX: 0.1,
    rightShoulderX: 0.1,
    leftHipX: 0,
    rightHipX: 0,
    leftKneeX: 0,
    rightKneeX: 0,
    torsoZ: 0
};

// --- 4. Initialization & Event Handlers ---
window.addEventListener('DOMContentLoaded', () => {
    // Load local storage high scores
    loadHighScores();

    // Menu Transitions
    dom.singleplayerBtn.addEventListener('click', () => {
        transitionStack(dom.mainMenuStack, dom.roleSelectionStack);
    });

    dom.roleBackBtn.addEventListener('click', () => {
        transitionStack(dom.roleSelectionStack, dom.mainMenuStack);
    });

    dom.roleTakerBtn.addEventListener('click', () => {
        showModal(dom.takerLockedModal);
    });

    dom.takerLockedCloseBtn.addEventListener('click', () => {
        hideModal(dom.takerLockedModal);
    });

    // Goalie active mode trigger
    dom.roleGoalieBtn.addEventListener('click', () => {
        switchScreen('gameplay-screen');
        initThreeEngine();
        startGameFlow();
    });

    // HUD Actions
    dom.gameMuteBtn.addEventListener('click', toggleMute);
    dom.gameBackBtn.addEventListener('click', () => {
        exitToMainMenu();
    });

    // Scoreboard Actions
    dom.retryGameBtn.addEventListener('click', () => {
        hideModal(dom.gameOverOverlay);
        startGameFlow();
    });

    dom.exitToMenuBtn.addEventListener('click', () => {
        hideModal(dom.gameOverOverlay);
        exitToMainMenu();
    });

    // Fallback Mouse Control
    for (let sector in dom.sectors) {
        dom.sectors[sector].addEventListener('mousemove', () => {
            if (!gameState.cameraInitialized && gameState.gameActive) {
                updateGoalkeeperSector(sector);
            }
        });
    }

    // Resize events
    window.addEventListener('resize', handleViewportResize);
});

function transitionStack(from, to) {
    from.classList.remove('active');
    from.classList.add('hidden');
    setTimeout(() => {
        to.classList.remove('hidden');
        to.classList.add('active');
    }, 200);
}

function showModal(modal) { modal.classList.remove('hidden'); }
function hideModal(modal) { modal.classList.add('hidden'); }

function switchScreen(screenId) {
    if (screenId === 'gameplay-screen') {
        dom.menuScreen.classList.remove('active');
        dom.menuScreen.classList.add('hidden');
        dom.gameplayScreen.classList.remove('hidden');
        dom.gameplayScreen.classList.add('active');
        gameState.activeScreen = 'gameplay-screen';
    } else {
        dom.gameplayScreen.classList.remove('active');
        dom.gameplayScreen.classList.add('hidden');
        dom.menuScreen.classList.remove('hidden');
        dom.menuScreen.classList.add('active');
        gameState.activeScreen = 'menu-screen';
    }
}

function toggleMute() {
    const isMuted = !soundSynth.isMuted;
    soundSynth.setMute(isMuted);
    
    const icon = dom.gameMuteBtn.querySelector('i');
    if (isMuted) {
        icon.className = "fa-solid fa-volume-xmark";
        dom.gameMuteBtn.style.borderColor = "var(--neon-red)";
        dom.gameMuteBtn.style.color = "var(--neon-red)";
    } else {
        icon.className = "fa-solid fa-volume-high";
        dom.gameMuteBtn.style.borderColor = "";
        dom.gameMuteBtn.style.color = "";
    }
}

function handleViewportResize() {
    if (!renderer) return;
    const w = dom.threeCanvas.clientWidth;
    const h = dom.threeCanvas.clientHeight;
    
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();

    if (dom.radarCanvas) {
        dom.radarCanvas.width = dom.radarCanvas.clientWidth;
        dom.radarCanvas.height = dom.radarCanvas.clientHeight;
    }
}

// --- 5. Three.js 3D Graphics Pipeline Setup ---
function initThreeEngine() {
    if (renderer) return; // already active

    const w = dom.threeCanvas.clientWidth;
    const h = dom.threeCanvas.clientHeight;

    // Renderer
    renderer = new THREE.WebGLRenderer({ canvas: dom.threeCanvas, antialias: true });
    renderer.setSize(w, h, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;

    // Scene
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x02040a, 0.018);

    // Camera (Third-Person standing behind net looking downfield)
    // Goal line is Z = 12. Goalkeeper sits at Z = 10. Net runs at Z = 12.3.
    // Camera is Z = 15.2 (behind net), Y = 3.6 (slightly above crossbar), looking downfield (towards Z = -15)
    camera = new THREE.PerspectiveCamera(58, w / h, 0.1, 100);
    camera.position.set(0, 3.6, 15.2);
    camera.lookAt(new THREE.Vector3(0, 1.2, -10));

    // Ambient Lighting
    const ambientLight = new THREE.AmbientLight(0x0e1c36, 0.6);
    scene.add(ambientLight);

    // Main stadium directional spot lights
    const spot1 = new THREE.SpotLight(0x00f0ff, 1.8, 45, Math.PI / 4, 0.5, 1);
    spot1.position.set(-15, 15, -12);
    spot1.target.position.set(0, 0, 8);
    spot1.castShadow = true;
    scene.add(spot1);
    scene.add(spot1.target);

    const spot2 = new THREE.SpotLight(0x22c55e, 1.4, 45, Math.PI / 4, 0.5, 1);
    spot2.position.set(15, 15, -12);
    spot2.target.position.set(0, 0, 8);
    spot2.castShadow = true;
    scene.add(spot2);
    scene.add(spot2.target);

    // Dynamic glowing ring lights around the field for futuristic aesthetic
    const stadiumRingGeom = new THREE.RingGeometry(18, 18.3, 32);
    const stadiumRingMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, side: THREE.DoubleSide, opacity: 0.12, transparent: true });
    const stadiumRing = new THREE.Mesh(stadiumRingGeom, stadiumRingMat);
    stadiumRing.rotation.x = Math.PI / 2;
    stadiumRing.position.set(0, 0.05, 0);
    scene.add(stadiumRing);

    // Build models
    create3DPitch();
    create3DGoalFrame();
    
    // Rig Characters
    build3DStriker();
    build3DGoalkeeper();
    
    // Create ball elements
    create3DBall();
    create3DCollisionParticles();

    // Trigger render sizing
    handleViewportResize();

    // Start render ticking loop
    requestAnimationFrame(renderTick);
}

// 3D Pitch
function create3DPitch() {
    const pitchWidth = 30;
    const pitchLength = 60;
    
    const lawnGeom = new THREE.PlaneGeometry(pitchWidth, pitchLength);
    // Dark cyber green grid material
    const lawnMat = new THREE.MeshPhongMaterial({ 
        color: 0x040f21, 
        specular: 0x051d3b,
        shininess: 20
    });
    
    pitchLawn = new THREE.Mesh(lawnGeom, lawnMat);
    pitchLawn.rotation.x = -Math.PI / 2;
    pitchLawn.position.set(0, 0, 0);
    pitchLawn.receiveShadow = true;
    scene.add(pitchLawn);

    // Standard markings (Penalty box, penalty spot, center circles)
    const lineMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, opacity: 0.25, transparent: true });
    
    // Penalty spot circle
    const spotGeom = new THREE.CircleGeometry(0.12, 16);
    const spotMesh = new THREE.Mesh(spotGeom, lineMat);
    spotMesh.rotation.x = -Math.PI / 2;
    spotMesh.position.set(0, 0.01, -8); // spot is at Z = -8
    scene.add(spotMesh);

    // Penalty box outline
    const penBoxGeom = new THREE.PlaneGeometry(16, 12);
    const penBoxEdges = new THREE.EdgesGeometry(penBoxGeom);
    const penBoxLines = new THREE.LineSegments(penBoxEdges, lineMat);
    penBoxLines.rotation.x = -Math.PI / 2;
    penBoxLines.position.set(0, 0.015, 6); // centered at Z = 6
    scene.add(penBoxLines);
}

// 3D Goal Frame & Grid net mesh
function create3DGoalFrame() {
    // Goalposts height = 2.5, width = 7.32 (from X = -3.66 to 3.66)
    const postRadius = 0.08;
    const postHeight = 2.5;
    const goalWidth = 7.32;
    const goalDepth = 1.6;
    const goalLineZ = 12.0;

    const postGeom = new THREE.CylinderGeometry(postRadius, postRadius, postHeight, 16);
    const postMat = new THREE.MeshPhongMaterial({ color: 0xffffff, emissive: 0x00f0ff, emissiveIntensity: 0.15 });

    // Left post
    const leftPost = new THREE.Mesh(postGeom, postMat);
    leftPost.position.set(-goalWidth / 2, postHeight / 2, goalLineZ);
    leftPost.castShadow = true;
    scene.add(leftPost);

    // Right post
    const rightPost = new THREE.Mesh(postGeom, postMat);
    rightPost.position.set(goalWidth / 2, postHeight / 2, goalLineZ);
    rightPost.castShadow = true;
    scene.add(rightPost);

    // Crossbar
    const crossbarGeom = new THREE.CylinderGeometry(postRadius, postRadius, goalWidth, 16);
    const crossbar = new THREE.Mesh(crossbarGeom, postMat);
    crossbar.rotation.z = Math.PI / 2;
    crossbar.position.set(0, postHeight, goalLineZ);
    crossbar.castShadow = true;
    scene.add(crossbar);

    // Glow lasers running inside posts
    const laserMat = new THREE.LineBasicMaterial({ color: 0x00f0ff, linewidth: 2 });
    const laserGeom = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-goalWidth / 2, 0, goalLineZ),
        new THREE.Vector3(-goalWidth / 2, postHeight, goalLineZ),
        new THREE.Vector3(goalWidth / 2, postHeight, goalLineZ),
        new THREE.Vector3(goalWidth / 2, 0, goalLineZ)
    ]);
    const laserLine = new THREE.Line(laserGeom, laserMat);
    scene.add(laserLine);

    // Goal net backing structure (translucent grid meshes looking out downfield)
    // Runs from crossbar Z = 12.0 to ground Z = 13.5
    const netShape = new THREE.Group();
    const netGridMat = new THREE.MeshBasicMaterial({ 
        color: 0x00f0ff, 
        wireframe: true, 
        transparent: true, 
        opacity: 0.15,
        side: THREE.DoubleSide
    });

    const netBackGeom = new THREE.PlaneGeometry(goalWidth, 2.9); // back sheet slope
    const netBack = new THREE.Mesh(netBackGeom, netGridMat);
    netBack.position.set(0, postHeight / 2, goalLineZ + goalDepth / 2);
    netBack.rotation.x = Math.atan2(goalDepth, postHeight); // slope tilt
    netShape.add(netBack);

    const netSideGeom = new THREE.BufferGeometry();
    const netSideVertices = new Float32Array([
        // Left triangle
        -goalWidth/2, 0, goalLineZ,
        -goalWidth/2, postHeight, goalLineZ,
        -goalWidth/2, 0, goalLineZ + goalDepth,
        // Right triangle
        goalWidth/2, 0, goalLineZ,
        goalWidth/2, postHeight, goalLineZ,
        goalWidth/2, 0, goalLineZ + goalDepth
    ]);
    netSideGeom.setAttribute('position', new THREE.BufferAttribute(netSideVertices, 3));
    const netSides = new THREE.Mesh(netSideGeom, netGridMat);
    netShape.add(netSides);
    
    scene.add(netShape);
}

// Procedural Rigged Humanoid model builder
function createRiggedHuman(jerseyColor, pantColor, skinColor, isGoalie) {
    const mainGroup = new THREE.Group();
    
    // Torso Group (allows bending/twisting)
    const torsoGroup = new THREE.Group();
    torsoGroup.position.y = 1.0;
    
    const chestGeom = new THREE.BoxGeometry(0.7, 0.7, 0.35);
    const jerseyMat = new THREE.MeshPhongMaterial({ color: jerseyColor, shininess: 30 });
    const chest = new THREE.Mesh(chestGeom, jerseyMat);
    chest.position.y = 0.35;
    chest.castShadow = true;
    torsoGroup.add(chest);
    
    const hipGeom = new THREE.BoxGeometry(0.65, 0.3, 0.33);
    const pantMat = new THREE.MeshPhongMaterial({ color: pantColor });
    const hips = new THREE.Mesh(hipGeom, pantMat);
    hips.position.y = -0.15;
    hips.castShadow = true;
    torsoGroup.add(hips);
    
    mainGroup.add(torsoGroup);

    // Head
    const headGeom = new THREE.SphereGeometry(0.24, 16, 16);
    const skinMat = new THREE.MeshPhongMaterial({ color: skinColor });
    const head = new THREE.Mesh(headGeom, skinMat);
    head.position.y = 0.85; // relative to torso center
    head.castShadow = true;
    torsoGroup.add(head);

    const joints = {
        root: mainGroup,
        torso: torsoGroup
    };

    // Helper to build arms & legs
    function buildLimb(upperL, lowerL, scaleRadius, colorMat, skinMat, isArm, isLeft) {
        const upperGroup = new THREE.Group();
        const upperGeom = new THREE.CylinderGeometry(scaleRadius, scaleRadius * 0.8, upperL, 8);
        const upperMesh = new THREE.Mesh(upperGeom, colorMat);
        upperMesh.position.y = -upperL / 2;
        upperMesh.castShadow = true;
        upperGroup.add(upperMesh);

        const lowerGroup = new THREE.Group();
        lowerGroup.position.y = -upperL;
        const lowerGeom = new THREE.CylinderGeometry(scaleRadius * 0.8, scaleRadius * 0.6, lowerL, 8);
        const lowerMesh = new THREE.Mesh(lowerGeom, isArm ? skinMat : colorMat); // short sleeves jersey style
        lowerMesh.position.y = -lowerL / 2;
        lowerMesh.castShadow = true;
        lowerGroup.add(lowerMesh);

        // Arm end (Glove/Hand) or Leg end (boot)
        if (isArm) {
            const handGeom = isGoalie ? new THREE.BoxGeometry(0.22, 0.22, 0.12) : new THREE.SphereGeometry(0.1, 8, 8);
            const handMat = isGoalie ? new THREE.MeshPhongMaterial({ color: 0x39ff14, emissive: 0x39ff14, emissiveIntensity: 0.3 }) : skinMat; // Glowing green gloves for goalie
            const hand = new THREE.Mesh(handGeom, handMat);
            hand.position.y = -lowerL - 0.05;
            hand.castShadow = true;
            lowerGroup.add(hand);
        } else {
            const bootGeom = new THREE.BoxGeometry(0.15, 0.1, 0.3);
            const bootMat = new THREE.MeshPhongMaterial({ color: isGoalie ? 0x00f0ff : 0xff3131 }); // cyan/red boots
            const boot = new THREE.Mesh(bootGeom, bootMat);
            boot.position.set(0, -lowerL - 0.05, 0.05);
            boot.castShadow = true;
            lowerGroup.add(boot);
        }

        upperGroup.add(lowerGroup);
        return { upper: upperGroup, lower: lowerGroup };
    }

    // Arms
    const armRadius = 0.07;
    const armColor = jerseyMat;
    
    // Left Arm
    const leftArm = buildLimb(0.45, 0.4, armRadius, armColor, skinMat, true, true);
    leftArm.upper.position.set(-0.45, 0.5, 0); // shoulder offset relative to torso center
    torsoGroup.add(leftArm.upper);
    joints.leftShoulder = leftArm.upper;
    joints.leftElbow = leftArm.lower;

    // Right Arm
    const rightArm = buildLimb(0.45, 0.4, armRadius, armColor, skinMat, true, false);
    rightArm.upper.position.set(0.45, 0.5, 0);
    torsoGroup.add(rightArm.upper);
    joints.rightShoulder = rightArm.upper;
    joints.rightElbow = rightArm.lower;

    // Legs
    const legRadius = 0.09;
    const legColor = pantMat;

    // Left Leg
    const leftLeg = buildLimb(0.55, 0.5, legRadius, legColor, skinMat, false, true);
    leftLeg.upper.position.set(-0.25, -0.3, 0); // hip offset relative to torso center
    torsoGroup.add(leftLeg.upper);
    joints.leftHip = leftLeg.upper;
    joints.leftKnee = leftLeg.lower;

    // Right Leg
    const rightLeg = buildLimb(0.55, 0.5, legRadius, legColor, skinMat, false, false);
    rightLeg.upper.position.set(0.25, -0.3, 0);
    torsoGroup.add(rightLeg.upper);
    joints.rightHip = rightLeg.upper;
    joints.rightKnee = rightLeg.lower;

    // Scale entire human mesh slightly down
    mainGroup.scale.set(0.9, 0.9, 0.9);
    
    return { mesh: mainGroup, joints: joints };
}

// Build Striker (Z = -12 ready to run up to spot Z = -8)
function build3DStriker() {
    const s = createRiggedHuman(0xff3131, 0xffffff, 0xfddb94, false); // Red jersey, white shorts
    strikerModel = s.mesh;
    strikerJoints = s.joints;
    strikerModel.position.set(0, 0, -12); // behind penalty spot
    strikerModel.rotation.y = 0; // facing goal (towards +Z)
    scene.add(strikerModel);
}

// Build Goalkeeper (Z = 10 facing downfield towards striker)
function build3DGoalkeeper() {
    // Goalkeeper has cyan/neon blue jersey, black pants
    const g = createRiggedHuman(0x0ea5e9, 0x111827, 0xe2e8f0, true);
    goalieModel = g.mesh;
    goalieJoints = g.joints;
    goalieModel.position.set(0, 0, 10.2); // slightly ahead of goal Z=12
    goalieModel.rotation.y = Math.PI; // facing downfield (towards -Z, showing back to camera)
    scene.add(goalieModel);
    
    // Set default idle pose
    resetGoalkeeperJoints();
}

function resetGoalkeeperJoints() {
    goalieJoints.leftShoulder.rotation.set(0, 0, goalieIdleRotations.leftShoulderZ);
    goalieJoints.leftElbow.rotation.set(0, 0, 0);
    goalieJoints.rightShoulder.rotation.set(0, 0, goalieIdleRotations.rightShoulderZ);
    goalieJoints.rightElbow.rotation.set(0, 0, 0);
    goalieJoints.leftHip.rotation.set(goalieIdleRotations.leftHipX, 0, 0);
    goalieJoints.leftKnee.rotation.set(goalieIdleRotations.leftKneeX, 0, 0);
    goalieJoints.rightHip.rotation.set(goalieIdleRotations.rightHipX, 0, 0);
    goalieJoints.rightKnee.rotation.set(goalieIdleRotations.rightKneeX, 0, 0);
    goalieJoints.torso.rotation.set(0, 0, goalieIdleRotations.torsoZ);
    goalieModel.position.set(0, 0, 10.2);
}

// Create 3D Antigravity Football
function create3DBall() {
    const ballRadius = 0.22;
    const geom = new THREE.SphereGeometry(ballRadius, 32, 32);
    
    // Luminous glowing neon cyan football texture
    const mat = new THREE.MeshPhongMaterial({
        color: 0x05f0ff,
        emissive: 0x028c94,
        emissiveIntensity: 0.5,
        shininess: 50
    });
    
    ball3D = new THREE.Mesh(geom, mat);
    ball3D.position.set(0, -50, 0); // hide initially
    ball3D.castShadow = true;
    scene.add(ball3D);

    // Glowing light halo surrounding ball
    const glowGeom = new THREE.SphereGeometry(ballRadius * 1.5, 16, 16);
    const glowMat = new THREE.MeshBasicMaterial({
        color: 0x00f0ff,
        transparent: true,
        opacity: 0.22
    });
    ball3DGlow = new THREE.Mesh(glowGeom, glowMat);
    ball3D.add(ball3DGlow);

    // Build the trailing neon spheres
    ballTrailSpheres = [];
    for (let i = 0; i < TRAIL_COUNT; i++) {
        const trailScale = 1.0 - (i / TRAIL_COUNT);
        const trailGeom = new THREE.SphereGeometry(ballRadius * 0.8 * trailScale, 12, 12);
        const trailMat = new THREE.MeshBasicMaterial({
            color: 0x00f0ff,
            transparent: true,
            opacity: 0.16 * trailScale
        });
        const trailMesh = new THREE.Mesh(trailGeom, trailMat);
        trailMesh.position.set(0, -100, 0); // hidden
        scene.add(trailMesh);
        ballTrailSpheres.push(trailMesh);
    }
}

// Particle System for 3D glove saves
function create3DCollisionParticles() {
    particlePool = [];
    const geom = new THREE.BoxGeometry(0.08, 0.08, 0.08);
    const mat = new THREE.MeshBasicMaterial({
        color: 0x00f0ff,
        transparent: true,
        opacity: 0.9
    });
    
    for (let i = 0; i < PARTICLE_COUNT; i++) {
        const mesh = new THREE.Mesh(geom, mat);
        mesh.position.set(0, -100, 0);
        mesh.visible = false;
        scene.add(mesh);
        
        particlePool.push({
            mesh: mesh,
            velocity: new THREE.Vector3(),
            life: 0,
            maxLife: 0
        });
    }
}

function triggerSaveParticles(impactPos) {
    for (let i = 0; i < PARTICLE_COUNT; i++) {
        const p = particlePool[i];
        p.mesh.position.copy(impactPos);
        p.mesh.visible = true;
        
        // Random velocity vector burst
        p.velocity.set(
            (Math.random() - 0.5) * 8,
            (Math.random() - 0.3) * 6,
            (Math.random() - 0.8) * 8
        );
        p.life = 1.0;
        p.maxLife = 0.5 + Math.random() * 0.5; // lifespan
    }
}

// 3D Rendering tick
function renderTick(time) {
    if (gameState.activeScreen !== 'gameplay-screen') return;

    // Slight ambient breathing idle animations for goalie & striker when not active
    if (!gameState.isKicking && goalieModel) {
        const breathing = Math.sin(time * 0.003) * 0.035;
        goalieJoints.leftShoulder.rotation.z = goalieIdleRotations.leftShoulderZ + breathing;
        goalieJoints.rightShoulder.rotation.z = goalieIdleRotations.rightShoulderZ - breathing;
        
        // Striker slight bounce
        strikerModel.position.y = Math.sin(time * 0.002) * 0.02;
    }

    // Animate active save particles
    for (let i = 0; i < PARTICLE_COUNT; i++) {
        const p = particlePool[i];
        if (p.mesh.visible && p.life > 0) {
            p.mesh.position.addScaledVector(p.velocity, 0.016); // step physics
            p.velocity.y -= 0.15; // gravity pull
            p.life -= 0.02;
            p.mesh.material.opacity = p.life;
            p.mesh.rotation.x += 0.1;
            p.mesh.rotation.y += 0.1;
            
            if (p.life <= 0) {
                p.mesh.visible = false;
            }
        }
    }

    renderer.render(scene, camera);
    requestAnimationFrame(renderTick);
}

// --- 6. Web Interface Navigation Stack ---
async function startWebcamAndGame() {
    dom.singleplayerBtn.disabled = true;
    dom.webcamLoadingMsg.textContent = "Requesting webcam access...";
    soundSynth.init();

    // Verify camera access first
    const allowed = await requestCameraPermission();
    if (!allowed) {
        dom.webcamLoadingMsg.innerHTML = `<i class="fa-solid fa-circle-exclamation text-danger"></i> CAMERA BLOCKED`;
        dom.singleplayerBtn.disabled = false;
        alert("Camera access denied! Keyboard/Mouse hover fallbacks will be active.");
        return;
    }
    
    dom.webcamLoadingMsg.textContent = "Connecting signals...";
    initializeTracker();
}

async function requestCameraPermission() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach(track => track.stop());
        return true;
    } catch (e) {
        return false;
    }
}

function initializeTracker() {
    handsDetector = new Hands({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
    });

    handsDetector.setOptions({
        maxNumHands: 1,
        modelComplexity: 0,
        minDetectionConfidence: 0.55,
        minTrackingConfidence: 0.55
    });

    handsDetector.onResults(onHandsTrackingResults);

    cameraUtility = new Camera(dom.video, {
        onFrame: async () => {
            if (gameState.gameActive && gameState.activeScreen === 'gameplay-screen') {
                await handsDetector.send({ image: dom.video });
            }
        },
        width: 320,
        height: 240
    });

    cameraUtility.start()
        .then(() => {
            gameState.cameraInitialized = true;
            dom.webcamLoadingMsg.classList.add('hidden');
            dom.radarLockStatus.textContent = "SEARCHING...";
            dom.radarLockStatus.className = "radar-value text-unlocked";
            
            // Start radar canvas render sweep loop
            cancelAnimationFrame(gameState.radarAnimFrame);
            runRadarAnimationLoop();
        })
        .catch(err => {
            console.error("Camera startup error:", err);
            dom.webcamLoadingMsg.innerHTML = `<i class="fa-solid fa-circle-exclamation text-danger"></i> OFFLINE`;
            gameState.cameraInitialized = false;
        });
}

function onHandsTrackingResults(results) {
    if (!gameState.gameActive) return;

    const radarContainer = document.getElementById('webcam-radar-container');

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        if (!gameState.handDetected) {
            gameState.handDetected = true;
            dom.radarLockStatus.textContent = "SIGNAL LOCKED";
            dom.radarLockStatus.className = "radar-value text-locked";
            radarContainer.classList.add('locked-tracking');
        }

        const landmarks = results.multiHandLandmarks[0];
        
        // Grab middle finger MCP joint (landmark 9)
        const trackerJoint = landmarks[9];
        gameState.palmCoords = {
            x: trackerJoint.x,
            y: trackerJoint.y
        };

        // Map camera coordinates (raw X is mirrored horizontally relative to screen visual)
        const xScreen = 1.0 - trackerJoint.x;
        const yScreen = trackerJoint.y;

        let vertical = 'bottom';
        let horizontal = 'center';

        if (yScreen < 0.45) {
            vertical = 'top';
        }

        if (xScreen < 0.35) {
            horizontal = 'left';
        } else if (xScreen > 0.65) {
            horizontal = 'right';
        }

        const sector = `${vertical}-${horizontal}`;
        updateGoalkeeperSector(sector);

        dom.radarActiveSector.textContent = sector.toUpperCase();
        dom.radarActiveSector.className = "radar-value text-active";
    } else {
        if (gameState.handDetected) {
            gameState.handDetected = false;
            gameState.palmCoords = null;
            dom.radarLockStatus.textContent = "SEARCHING...";
            dom.radarLockStatus.className = "radar-value text-unlocked";
            dom.radarActiveSector.textContent = "NONE";
            dom.radarActiveSector.className = "radar-value text-neutral";
            radarContainer.classList.remove('locked-tracking');
        }
    }
}

// Telemetry Radar Box Rendering Sweeps
function runRadarAnimationLoop() {
    if (gameState.activeScreen !== 'gameplay-screen') return;

    const ctx = dom.radarCanvas.getContext('2d');
    ctx.clearRect(0, 0, dom.radarCanvas.width, dom.radarCanvas.height);

    const w = dom.radarCanvas.width;
    const h = dom.radarCanvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const rMax = Math.min(w, h) * 0.45;

    // Draw circular grid lines
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.2)';
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.arc(cx, cy, rMax, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, rMax * 0.66, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, rMax * 0.33, 0, Math.PI * 2);
    ctx.stroke();

    // Crosshairs
    ctx.beginPath();
    ctx.moveTo(cx - rMax - 5, cy);
    ctx.lineTo(cx + rMax + 5, cy);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cx, cy - rMax - 5);
    ctx.lineTo(cx, cy + rMax + 5);
    ctx.stroke();

    // Radar divisions
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.08)';
    ctx.setLineDash([3, 3]);
    
    // Vertical sectors representation
    ctx.beginPath();
    ctx.moveTo(cx - rMax * 0.3, cy - rMax);
    ctx.lineTo(cx - rMax * 0.3, cy + rMax);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cx + rMax * 0.3, cy - rMax);
    ctx.lineTo(cx + rMax * 0.3, cy + rMax);
    ctx.stroke();

    // Horizontal dividers representation
    ctx.beginPath();
    ctx.moveTo(cx - rMax, cy - rMax * 0.1);
    ctx.lineTo(cx + rMax, cy - rMax * 0.1);
    ctx.stroke();
    
    ctx.setLineDash([]); // Reset

    // Rotating Sweep line
    gameState.radarSweepAngle += 0.022;
    const rx = cx + Math.cos(gameState.radarSweepAngle) * rMax;
    const ry = cy + Math.sin(gameState.radarSweepAngle) * rMax;
    
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(rx, ry);
    ctx.stroke();

    // Draw active target coordinate locks
    if (gameState.palmCoords && gameState.handDetected) {
        const targetX = (1.0 - gameState.palmCoords.x) * w;
        const targetY = gameState.palmCoords.y * h;

        ctx.strokeStyle = 'var(--neon-green)';
        ctx.lineWidth = 1.5;
        
        ctx.beginPath();
        ctx.arc(targetX, targetY, 8, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = 'var(--neon-green)';
        ctx.beginPath();
        ctx.arc(targetX, targetY, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Lock boundaries
        ctx.strokeStyle = 'rgba(57, 255, 20, 0.45)';
        ctx.strokeRect(targetX - 12, targetY - 12, 24, 24);

        if (Math.floor(Date.now() / 250) % 2 === 0) {
            soundSynth.playRadarScan();
        }
    }

    gameState.radarAnimFrame = requestAnimationFrame(runRadarAnimationLoop);
}

// --- 7. Goalkeeper Sector Trigger Animation ---
function updateGoalkeeperSector(sectorId) {
    if (gameState.goalkeeperSector === sectorId || !gameState.gameActive) return;

    // Reset previous sector overlays active states
    for (let s in dom.sectors) {
        dom.sectors[s].classList.remove('active-target');
    }
    
    gameState.goalkeeperSector = sectorId;
    dom.sectors[sectorId].classList.add('active-target');
    
    // Play radar sweep feedback
    soundSynth.playRadarScan();
}

// --- 8. Core Gameplay Engine & Loops ---
function startGameFlow() {
    gameState.gameActive = true;
    gameState.saves = 0;
    gameState.goals = 0;
    gameState.attempts = 0;
    gameState.isKicking = false;
    gameState.goalkeeperSector = 'bottom-center';
    
    updateHUDStats();
    resetGoalkeeperJoints();
    
    // Hide results overlay
    dom.gameOverOverlay.classList.add('hidden');
    
    // Reset striker idle
    strikerModel.position.set(0, 0, -12);
    resetStrikerJoints();

    // Start video tracking if allowed
    initWebcamTracking();

    // Run radar loops
    cancelAnimationFrame(gameState.radarAnimFrame);
    runRadarAnimationLoop();

    // Kickoff loop
    triggerNextAttemptCycle();
}

function initWebcamTracking() {
    if (gameState.cameraInitialized) return;
    
    dom.webcamLoadingMsg.classList.remove('hidden');
    dom.webcamLoadingMsg.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> INITIALIZING SYSTEM...`;

    // Attempt start
    startWebcamAndGame();
}

function resetStrikerJoints() {
    strikerJoints.leftHip.rotation.set(0, 0, 0);
    strikerJoints.rightHip.rotation.set(0, 0, 0);
    strikerJoints.leftKnee.rotation.set(0, 0, 0);
    strikerJoints.rightKnee.rotation.set(0, 0, 0);
    strikerJoints.leftShoulder.rotation.set(0, 0, -0.2);
    strikerJoints.rightShoulder.rotation.set(0, 0, 0.2);
}

function triggerNextAttemptCycle() {
    if (!gameState.gameActive) return;

    // Check if 7 shots completed
    if (gameState.attempts >= GAME_CONFIG.totalAttempts) {
        gameState.gameActive = false;
        setTimeout(endGameSession, 1200);
        return;
    }

    // Hide ball & reset locations
    hideBallAndTrail();
    clearGoalSectorGlows();

    // Start 3-second countdown
    let secondsLeft = 3;
    dom.roundCountdown.textContent = secondsLeft;
    dom.roundCountdown.className = "countdown-animated";

    gameState.countdownTimer = setInterval(() => {
        secondsLeft--;
        if (secondsLeft > 0) {
            dom.roundCountdown.textContent = secondsLeft;
            dom.roundCountdown.className = "";
            void dom.roundCountdown.offsetWidth; // Reflow reset
            dom.roundCountdown.className = "countdown-animated";
        } else {
            clearInterval(gameState.countdownTimer);
            dom.roundCountdown.className = "countdown-hidden";

            // Run Striker Animation Kicking and shoot the ball
            animateStrikerKickingRun();
        }
    }, 1000);
}

// 1. Striker Running & Kicking animation sequence
function animateStrikerKickingRun() {
    const startTime = performance.now();
    const runDuration = 1000; // 1s run up

    const startZ = -12;
    const endZ = -8.2; // penalty spot kick boundary

    function step(now) {
        if (!gameState.gameActive) return;

        const elapsed = now - startTime;
        const progress = Math.min(elapsed / runDuration, 1.0);

        // Run coordinate glide
        strikerModel.position.z = startZ + (endZ - startZ) * progress;

        // Swing legs/arms
        const wave = Math.sin(progress * Math.PI * 5); // running speed cycle
        strikerJoints.leftHip.rotation.x = wave * 0.8;
        strikerJoints.rightHip.rotation.x = -wave * 0.8;
        strikerJoints.leftKnee.rotation.x = wave > 0 ? wave * 0.5 : 0;
        strikerJoints.rightKnee.rotation.x = wave < 0 ? -wave * 0.5 : 0;
        
        strikerJoints.leftShoulder.rotation.x = -wave * 0.5;
        strikerJoints.rightShoulder.rotation.x = wave * 0.5;

        if (progress < 1.0) {
            requestAnimationFrame(step);
        } else {
            // Kick impact!
            animateStrikerStrikeFoot();
        }
    }
    requestAnimationFrame(step);
}

function animateStrikerStrikeFoot() {
    const startTime = performance.now();
    const duration = 200; // speedy swing

    function step(now) {
        const elapsed = now - startTime;
        const p = Math.min(elapsed / duration, 1.0);

        // Swing kicking leg forward
        strikerJoints.rightHip.rotation.x = -0.4 + (1.6 * p);
        strikerJoints.rightKnee.rotation.x = 0.8 * (1.0 - p);

        // Lean torso slightly forward
        strikerJoints.torso.rotation.x = -0.2 * p;

        if (p < 1.0) {
            requestAnimationFrame(step);
        } else {
            // Impact! Execute penalty trajectory path
            executeBallPenaltyLaunch();
            
            // Retract leg slowly to normal
            setTimeout(() => {
                resetStrikerJoints();
                strikerJoints.torso.rotation.x = 0;
            }, 500);
        }
    }
    requestAnimationFrame(step);
}

// 2. Trajectory Arc Vector calculation & Ball Launch
function executeBallPenaltyLaunch() {
    if (!gameState.gameActive || gameState.isKicking) return;
    gameState.isKicking = true;
    gameState.attempts++;
    updateHUDStats();

    // Pick target goal sector
    const sectors = ['top-left', 'top-center', 'top-right', 'bottom-left', 'bottom-center', 'bottom-right'];
    gameState.ballTargetSector = sectors[Math.floor(Math.random() * sectors.length)];

    // Target 3D coordinates on Goal Plane Z = 12.0
    // Goal dimensions: width = 7.32 (from -3.66 to 3.66), height = 2.5
    const goalLineZ = 12.0;
    let targetX = 0;
    let targetY = 0;

    switch (gameState.ballTargetSector) {
        case 'top-left': targetX = -2.44; targetY = 1.85; break;
        case 'top-center': targetX = 0; targetY = 1.95; break;
        case 'top-right': targetX = 2.44; targetY = 1.85; break;
        case 'bottom-left': targetX = -2.44; targetY = 0.65; break;
        case 'bottom-center': targetX = 0; targetY = 0.55; break;
        case 'bottom-right': targetX = 2.44; targetY = 0.65; break;
    }

    gameState.ballTarget3D.set(targetX, targetY, goalLineZ);
    
    // Randomize path wobble seeds for floating physics
    gameState.ballWobbleSeedX = (Math.random() - 0.5) * 1.5;
    gameState.ballWobbleSeedY = (Math.random() - 0.5) * 1.2;

    soundSynth.playKick();

    // Trigger visual target grid alert glow
    dom.sectors[gameState.ballTargetSector].classList.add('active-target');

    // Run animation frames
    animate3DBallTrajectory();
}

function animate3DBallTrajectory() {
    ball3D.position.set(0, 0.22, -8.0); // start at penalty spot
    gameState.ballCurrent3D.copy(ball3D.position);
    
    const startPos = new THREE.Vector3(0, 0.22, -8.0);
    const endPos = gameState.ballTarget3D;
    
    const startTime = performance.now();
    const duration = GAME_CONFIG.ballDuration;

    // Reset trail spheres
    for (let i = 0; i < TRAIL_COUNT; i++) {
        ballTrailSpheres[i].position.copy(startPos);
    }

    function step(now) {
        if (!gameState.gameActive) return;

        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1.0);

        // Linear step interpolation
        const t = progress;
        
        // Antigravity wobbling floats physics
        const floatCurveX = Math.sin(t * Math.PI) * gameState.ballWobbleSeedX;
        const floatCurveY = Math.sin(t * Math.PI) * 1.5 + Math.sin(t * Math.PI * 2) * gameState.ballWobbleSeedY;

        const currentX = startPos.x + (endPos.x - startPos.x) * t + floatCurveX;
        const currentY = startPos.y + (endPos.y - startPos.y) * t + floatCurveY;
        const currentZ = startPos.z + (endPos.z - startPos.z) * t;

        ball3D.position.set(currentX, currentY, currentZ);
        gameState.ballCurrent3D.copy(ball3D.position);

        // Spin ball
        ball3D.rotation.x += 0.25;
        ball3D.rotation.y += 0.15;

        // Shift 3D trail spheres behind the ball
        for (let i = TRAIL_COUNT - 1; i > 0; i--) {
            ballTrailSpheres[i].position.copy(ballTrailSpheres[i - 1].position);
        }
        ballTrailSpheres[0].position.copy(ball3D.position);

        // Coordinate goalie diving animations during ball flight progress
        animateGoalieDivingSequence(progress, gameState.goalkeeperSector);

        if (progress < 1.0) {
            requestAnimationFrame(step);
        } else {
            resolveGoalCollision();
        }
    }
    requestAnimationFrame(step);
}

// 3. Goalkeeper Diving Rig Interpolations
function animateGoalieDivingSequence(progress, sector) {
    const t = progress;
    
    // Dive coordinates target offsets
    let diveX = 0;
    let diveY = 0;
    let diveTiltZ = 0;
    
    let lShoulderZ = goalieIdleRotations.leftShoulderZ;
    let rShoulderZ = goalieIdleRotations.rightShoulderZ;
    let lHipZ = 0;
    let rHipZ = 0;
    let lKneeX = 0;
    let rKneeX = 0;

    switch (sector) {
        case 'top-left':
            diveX = -2.3; diveY = 1.7; diveTiltZ = 0.35; // leap left
            lShoulderZ = 1.8; rShoulderZ = 1.2; // arms up-left
            lHipZ = 0.2; rHipZ = -0.3; rKneeX = 0.6; // trail right leg
            break;
        case 'top-center':
            diveX = 0; diveY = 1.9; diveTiltZ = 0; // leap straight up
            lShoulderZ = 2.4; rShoulderZ = -2.4; // arms vertical
            lKneeX = 0.8; rKneeX = 0.8; // knees tucked
            break;
        case 'top-right':
            diveX = 2.3; diveY = 1.7; diveTiltZ = -0.35; // leap right
            lShoulderZ = -1.2; rShoulderZ = -1.8; // arms up-right
            lHipZ = -0.3; rHipZ = 0.2; lKneeX = 0.6;
            break;
        case 'bottom-left':
            diveX = -2.5; diveY = 0.55; diveTiltZ = 0.6; // low dive left
            lShoulderZ = 1.9; rShoulderZ = 0.5; // left arm sweeps low
            lHipZ = 0.5; rHipZ = -0.5;
            break;
        case 'bottom-center':
            diveX = 0; diveY = 0.38; diveTiltZ = 0; // crouch low center
            lShoulderZ = 0.5; rShoulderZ = -0.5; // hands low
            lHipZ = 0.3; rHipZ = 0.3; lKneeX = 0.8; rKneeX = 0.8;
            break;
        case 'bottom-right':
            diveX = 2.5; diveY = 0.55; diveTiltZ = -0.6; // low dive right
            lShoulderZ = -0.5; rShoulderZ = -1.9; // right arm sweeps low
            lHipZ = -0.5; rHipZ = 0.5;
            break;
    }

    // Interpolate Goalie position & rotation (leaping curves)
    // Goalie starts at X=0, Y=0, Z=10.2
    const currentGoalieX = 0 + (diveX - 0) * t;
    const currentGoalieY = 0 + (diveY - 0) * Math.sin(t * Math.PI / 2); // vertical leap curve
    const currentGoalieZ = 10.2 + ((10.8) - 10.2) * t; // leap back into goal mouth Z=11
    
    goalieModel.position.set(currentGoalieX, currentGoalieY, currentGoalieZ);
    goalieJoints.torso.rotation.z = 0 + (diveTiltZ - 0) * t;

    // Interpolate Rig Limb Rotations
    goalieJoints.leftShoulder.rotation.z = goalieIdleRotations.leftShoulderZ + (lShoulderZ - goalieIdleRotations.leftShoulderZ) * t;
    goalieJoints.rightShoulder.rotation.z = goalieIdleRotations.rightShoulderZ + (rShoulderZ - goalieIdleRotations.rightShoulderZ) * t;
    
    goalieJoints.leftHip.rotation.z = 0 + (lHipZ - 0) * t;
    goalieJoints.rightHip.rotation.z = 0 + (rHipZ - 0) * t;
    goalieJoints.leftKnee.rotation.x = 0 + (lKneeX - 0) * t;
    goalieJoints.rightKnee.rotation.x = 0 + (rKneeX - 0) * t;
}

// 4. Resolve Shot & Bounding Collisions
function resolveGoalCollision() {
    gameState.isKicking = false;

    // Check if goalie sector matches ball sector
    const isSaved = (gameState.goalkeeperSector === gameState.ballTargetSector);
    const targetSectorElem = dom.sectors[gameState.ballTargetSector];
    
    targetSectorElem.classList.remove('active-target');

    if (isSaved) {
        gameState.saves++;
        targetSectorElem.classList.add('zone-saved');
        soundSynth.playSave();
        triggerActionToast("SAVE!", "toast-save");

        // Spawns 3D Save particle explosion at ball contact
        triggerSaveParticles(ball3D.position);

        // Bounce ball out of goal frame
        animate3DBallRebound(true);
    } else {
        gameState.goals++;
        targetSectorElem.classList.add('zone-goaled');
        soundSynth.playGoal();
        triggerActionToast("GOAL!", "toast-goal");

        // Shake viewport
        dom.pitchViewport.classList.add('screen-shake');
        setTimeout(() => dom.pitchViewport.classList.remove('screen-shake'), 350);

        // Pass ball behind net
        animate3DBallRebound(false);
    }

    updateHUDStats();

    // LERP Goalkeeper back to center standing pose
    setTimeout(resetGoalkeeperSmoothly, 600);

    // Schedule next penalty kick cycle
    setTimeout(triggerNextAttemptCycle, 1600);
}

function animate3DBallRebound(wasSaved) {
    const startTime = performance.now();
    const duration = GAME_CONFIG.reboundDuration;

    const startPos = new THREE.Vector3().copy(ball3D.position);
    
    // saved rebounds fly forwards/outwards; conceded nets drop ball behind line
    const deflectDir = Math.random() > 0.5 ? 1 : -1;
    const endX = wasSaved ? startPos.x + (deflectDir * 4.0) : startPos.x + (deflectDir * 1.2);
    const endY = wasSaved ? 0.22 : startPos.y - 1.2; // ground roll or drop behind net
    const endZ = wasSaved ? startPos.z - 5.0 : startPos.z + 1.5; // bounce back downfield

    const endPos = new THREE.Vector3(endX, endY, endZ);

    function step(now) {
        const elapsed = now - startTime;
        const p = Math.min(elapsed / duration, 1.0);

        // Parabolic bounce arc height
        const heightArc = wasSaved ? Math.sin(p * Math.PI) * 2.0 : 0;

        const currentX = startPos.x + (endPos.x - startPos.x) * p;
        const currentY = startPos.y + (endPos.y - startPos.y) * p + heightArc;
        const currentZ = startPos.z + (endPos.z - startPos.z) * p;

        ball3D.position.set(currentX, currentY, currentZ);

        if (p < 1.0) {
            requestAnimationFrame(step);
        } else {
            hideBallAndTrail();
        }
    }
    requestAnimationFrame(step);
}

function resetGoalkeeperSmoothly() {
    const startTime = performance.now();
    const duration = 400; // 400ms recover stand up
    
    const startX = goalieModel.position.x;
    const startY = goalieModel.position.y;
    const startZ = goalieModel.position.z;
    const startTorsoZ = goalieJoints.torso.rotation.z;

    const startLShoulder = goalieJoints.leftShoulder.rotation.z;
    const startRShoulder = goalieJoints.rightShoulder.rotation.z;
    const startLHipZ = goalieJoints.leftHip.rotation.z;
    const startRHipZ = goalieJoints.rightHip.rotation.z;
    const startLKnee = goalieJoints.leftKnee.rotation.x;
    const startRKnee = goalieJoints.rightKnee.rotation.x;

    function step(now) {
        const elapsed = now - startTime;
        const p = Math.min(elapsed / duration, 1.0);

        // LERP position back to normal
        goalieModel.position.x = startX + (0 - startX) * p;
        goalieModel.position.y = startY + (0 - startY) * p;
        goalieModel.position.z = startZ + (10.2 - startZ) * p;
        goalieJoints.torso.rotation.z = startTorsoZ + (0 - startTorsoZ) * p;

        // LERP joints
        goalieJoints.leftShoulder.rotation.z = startLShoulder + (goalieIdleRotations.leftShoulderZ - startLShoulder) * p;
        goalieJoints.rightShoulder.rotation.z = startRShoulder + (goalieIdleRotations.rightShoulderZ - startRShoulder) * p;
        goalieJoints.leftHip.rotation.z = startLHipZ + (0 - startLHipZ) * p;
        goalieJoints.rightHip.rotation.z = startRHipZ + (0 - startRHipZ) * p;
        goalieJoints.leftKnee.rotation.x = startLKnee + (0 - startLKnee) * p;
        goalieJoints.rightKnee.rotation.x = startRKnee + (0 - startRKnee) * p;

        if (p < 1.0) {
            requestAnimationFrame(step);
        } else {
            resetGoalkeeperJoints();
        }
    }
    requestAnimationFrame(step);
}

function triggerActionToast(msg, className) {
    dom.actionToast.textContent = msg;
    dom.actionToast.className = "toast-hidden";
    void dom.actionToast.offsetWidth; // force reflow
    dom.actionToast.className = className;
}

function hideBallAndTrail() {
    if (ball3D) ball3D.position.set(0, -50, 0);
    for (let i = 0; i < TRAIL_COUNT; i++) {
        if (ballTrailSpheres[i]) ballTrailSpheres[i].position.set(0, -100, 0);
    }
}

function clearGoalSectorGlows() {
    for (let sector in dom.sectors) {
        dom.sectors[sector].classList.remove('active-target', 'zone-saved', 'zone-goaled');
    }
}

function updateHUDStats() {
    dom.valAttempts.textContent = `${gameState.attempts} / ${GAME_CONFIG.totalAttempts}`;
    dom.valSaves.textContent = gameState.saves;
}

// --- 9. Game Over scoreboards & record localstorage ---
function endGameSession() {
    gameState.gameActive = false;
    
    // Stop radar sweeps
    cancelAnimationFrame(gameState.radarAnimFrame);
    if (cameraUtility) {
        cameraUtility.stop();
        gameState.cameraInitialized = false;
    }

    const rate = Math.round((gameState.saves / GAME_CONFIG.totalAttempts) * 100);

    // Tactical rating labels
    let rating = "";
    if (gameState.saves >= 6) {
        rating = "RATING: IMPENETRABLE WALL";
        document.getElementById('scoreboard-title').style.color = "var(--neon-green)";
    } else if (gameState.saves >= 4) {
        rating = "RATING: ELITE COMMANDER";
        document.getElementById('scoreboard-title').style.color = "var(--neon-cyan)";
    } else if (gameState.saves >= 2) {
        rating = "RATING: SECURE TRAINING COMPLETE";
        document.getElementById('scoreboard-title').style.color = "var(--neon-gold)";
    } else {
        rating = "RATING: TELEMETRY ERROR - RE-CALIBRATION REQUIRED";
        document.getElementById('scoreboard-title').style.color = "var(--neon-red)";
    }

    // High score check
    let isNewRecord = false;
    if (gameState.saves > gameState.highScoreSaves) {
        gameState.highScoreSaves = gameState.saves;
        gameState.highScoreRate = rate;
        saveHighScores();
        isNewRecord = true;
    }

    if (isNewRecord) {
        document.getElementById('hs-banner').classList.remove('hidden');
    } else {
        document.getElementById('hs-banner').classList.add('hidden');
    }

    document.getElementById('final-saves').textContent = gameState.saves;
    document.getElementById('final-goals').textContent = gameState.goals;
    document.getElementById('final-rate').textContent = `${rate}%`;
    document.getElementById('scoreboard-feedback').textContent = rating;

    showModal(dom.gameOverOverlay);
}

function exitToMainMenu() {
    gameState.gameActive = false;
    clearTimeout(gameState.kickTimer);
    clearInterval(gameState.countdownTimer);
    cancelAnimationFrame(gameState.radarAnimFrame);

    if (cameraUtility) {
        cameraUtility.stop();
        gameState.cameraInitialized = false;
    }

    // Reset models
    hideBallAndTrail();
    clearGoalSectorGlows();
    resetGoalkeeperJoints();
    resetStrikerJoints();
    
    dom.roundCountdown.className = "countdown-hidden";
    dom.actionToast.className = "toast-hidden";

    switchScreen('menu-screen');
    transitionStack(dom.roleSelectionStack, dom.mainMenuStack);
}

function loadHighScores() {
    try {
        gameState.highScoreSaves = parseInt(localStorage.getItem('pov3d_pb_saves')) || 0;
        gameState.highScoreRate = parseInt(localStorage.getItem('pov3d_pb_rate')) || 0;
    } catch (e) {
        console.warn("Storage warning:", e);
    }
}

function saveHighScores() {
    try {
        localStorage.setItem('pov3d_pb_saves', gameState.highScoreSaves);
        localStorage.setItem('pov3d_pb_rate', gameState.highScoreRate);
    } catch (e) {
        console.warn("Storage save failed:", e);
    }
}
