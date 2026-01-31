/**
 * =========================
 * VARIABLES PRINCIPALES
 * =========================
 */

const game = document.getElementById("game");
const scoreDisplay = document.getElementById("score");

const hitLineY = game.clientHeight - 135;
const lanes = [80, 185, 290];
const hitboxSize = 33;

let totalPress = 0;
let notesPlayed = 0;
let notesHit = 0;

let spaceHeld = false;
let paused = false;
let gameOver = false;

/**
 * =========================
 * VITESSE DYNAMIQUE
 * =========================
 */

let speed = 4.5;
let minSpawn = 1000;
let maxSpawn = 1500;


setInterval(() => {
    if (gameOver) return;
    speed = possibleSpeeds[Math.floor(Math.random() * possibleSpeeds.length)];
}, 10000);

/**
 * =========================
 * SYSTÈME ANTI-COLLISION
 * =========================
 */

// Garde en mémoire quelle lane est occupée et jusqu'à quand
const laneOccupied = {
    0: 0,  // lane 80px
    1: 0,  // lane 185px
    2: 0   // lane 290px
};

function getLaneIndex(laneX) {
    return lanes.indexOf(laneX);
}

function isLaneAvailable(laneIndex) {
    return Date.now() > laneOccupied[laneIndex];
}

function reserveLane(laneIndex, duration = 1500) {
    laneOccupied[laneIndex] = Date.now() + duration;
}

/**
 * =========================
 * NOTE NORMALE
 * =========================
 */

function spawnNote(laneIndex = null) {
    if (gameOver) return;

    // Choix de lane disponible
    if (laneIndex === null) {
        const availableLanes = [0, 1, 2].filter(i => isLaneAvailable(i));
        if (availableLanes.length === 0) return; // Aucune lane dispo
        laneIndex = availableLanes[Math.floor(Math.random() * availableLanes.length)];
    } else if (!isLaneAvailable(laneIndex)) {
        return; // Lane déjà occupée
    }

    const lane = lanes[laneIndex];
    reserveLane(laneIndex, 1200); // Réserve la lane pendant 1.2s

    const note = document.createElement("div");
    note.className = "note";
    note.style.left = lane + "px";
    game.appendChild(note);

    let y = -30;
    let active = true;
    let counted = false;

    const fall = setInterval(() => {
        if (paused || gameOver) return;

        y += speed;
        note.style.top = y + "px";

        if (y > hitLineY + hitboxSize && active && !counted) {
            notesPlayed++;
            counted = true;
            active = false;
            updateScore();
        }

        if (y > game.clientHeight) {
            clearInterval(fall);
            note.remove();
        }
    }, 16);

    note.tryHit = () => {
        if (!active || counted) return false;

        if (y > hitLineY - hitboxSize && y < hitLineY + hitboxSize) {
            notesHit++;
            notesPlayed++;
            counted = true;
            active = false;
            updateScore();
            clearInterval(fall);
            note.remove();
            return true;
        }
        return false;
    };
}

/**
 * =========================
 * NOTE LONGUE (CORRIGÉE)
 * =========================
 */

function spawnLongNote(laneIndex = null, length = 6) {
    if (gameOver) return;

    // Choix de lane disponible
    if (laneIndex === null) {
        const availableLanes = [0, 1, 2].filter(i => isLaneAvailable(i));
        if (availableLanes.length === 0) return;
        laneIndex = availableLanes[Math.floor(Math.random() * availableLanes.length)];
    } else if (!isLaneAvailable(laneIndex)) {
        return;
    }

    const lane = lanes[laneIndex];
    reserveLane(laneIndex, 2000); // Réserve plus longtemps pour les notes longues

    const spacing = 30;
    const notesArray = [];

    let y = -spacing * length;
    let active = true;
    let counted = false;
    let heldCorrectly = false; // Nouveau : vérifie si le joueur maintient

    for (let i = 0; i < length; i++) {
        const n = document.createElement("div");
        n.className = "note long-note";
        n.style.left = lane + "px";
        n.style.top = y + i * spacing + "px";
        n.style.height = spacing + "px";
        game.appendChild(n);
        notesArray.push(n);
    }

    const fall = setInterval(() => {
        if (paused || gameOver) return;

        y += speed;

        notesArray.forEach((n, i) => {
            n.style.top = y + i * spacing + "px";
        });

        // Si la note longue passe sans être maintenue = RATÉ
        if (y > hitLineY + hitboxSize && active && !counted) {
            notesPlayed += length;
            counted = true;
            active = false;
            updateScore();
        }

        if (y > game.clientHeight) {
            clearInterval(fall);
            notesArray.forEach(n => n.remove());
        }
    }, 16);

    notesArray[0].tryHit = () => {
        if (!active || counted) return false;

        const firstY = parseInt(notesArray[0].style.top);
        
        // Vérifie que le joueur maintient SPACE enfoncé
        if (firstY > hitLineY - hitboxSize && 
            firstY < hitLineY + hitboxSize && 
            spaceHeld) {  // <-- CHANGEMENT IMPORTANT
            
            notesHit += length;
            notesPlayed += length;
            counted = true;
            active = false;
            heldCorrectly = true;
            updateScore();
            clearInterval(fall);
            notesArray.forEach(n => n.remove());
            return true;
        }
        return false;
    };
}

/**
 * =========================
 * CLAVIER
 * =========================
 */

document.addEventListener("keydown", (e) => {
    if (e.code === "KeyP") {
        paused = !paused;
        document.getElementById("pauseOverlay").style.opacity = paused ? 1 : 0;
        return;
    }

    if (e.code === "Space" && !paused && !gameOver) {
        totalPress++;
        spaceHeld = true;

        const notes = document.querySelectorAll(".note");
        for (let note of notes) {
            if (note.tryHit && note.tryHit()) break;
        }
        updateScore();
    }
});

document.addEventListener("keyup", (e) => {
    if (e.code === "Space") spaceHeld = false;
});

/**
 * =========================
 * SCORE
 * =========================
 */

function updateScore() {
    scoreDisplay.textContent =
        "Réussies : " + notesHit +
        " | Total : " + notesPlayed +
        " | Appuis : " + totalPress;
}

/**
 * =========================
 * SPAWN
 * =========================
 */

function randomSpawn() {
    if (gameOver) return;

    if (paused) {
        setTimeout(randomSpawn, 100); 
        return;
    }

    const isLong = Math.random() < 0.3;
    if (isLong) spawnLongNote();
    else spawnNote();

    const nextTime = Math.random() * (maxSpawn - minSpawn) + minSpawn;
    setTimeout(randomSpawn, nextTime);
}

randomSpawn();

/*********************************
 * CHRONO + FIN DE PARTIE (30s)
 *********************************/

let gameDuration = 30;
let timeLeft = gameDuration;
let timerInterval = null;

const timerDisplay = document.getElementById("timer");

function startTimer() {
    timerDisplay.textContent = "Temps : " + timeLeft;

    timerInterval = setInterval(() => {
        if (paused || gameOver) return;

        timeLeft--;
        timerDisplay.textContent = "Temps : " + timeLeft;

        if (timeLeft <= 0) {
            endGame();
        }
    }, 1000);
}

function endGame() {
    gameOver = true;
    clearInterval(timerInterval);

    document.querySelectorAll(".note").forEach(n => n.remove());

    const overlay = document.getElementById("pauseOverlay");

    overlay.style.opacity = 1;
    overlay.style.background = "rgba(0, 0, 0, 0.75)";
    overlay.style.display = "flex";
    overlay.style.justifyContent = "center";
    overlay.style.alignItems = "center";

    overlay.innerHTML = `
        <div class="scorePanel" style="
            background: rgba(20,20,20,0.95);
            padding: 20px 30px;
            border-radius: 12px;
            border: 3px solid white;
            min-width: 220px;
            font-size: 14px;
            text-align: center;
            color: white;
        ">
            <h2 style="margin-bottom:12px;">Fin de partie</h2>
            <p>Réussies : ${notesHit}</p>
            <p>Total : ${notesPlayed}</p>
            <p>Appuis : ${totalPress}</p>
            <p>Précision : ${notesPlayed > 0 ? Math.round((notesHit / notesPlayed) * 100) : 0}%</p>
        </div>
    `;
}
note.tryHit = () => {
    if (!active || counted) return false;

    if (y > hitLineY - hitboxSize && y < hitLineY + hitboxSize) {
        notesHit++;
        notesPlayed++;
        counted = true;
        active = false;
        updateScore();
        clearInterval(fall);
        note.remove();

        // Jouer le son
        hitSound.currentTime = 0; 
        hitSound.play();

        return true;
    }
    return false;
};

startTimer();