import { GoogleGenerativeAI } from "@google/generative-ai";

// === 1. AI CONFIG ===
const API_KEY = "AIzaSyCesvYAL89JtWVzlielzxO7IKhw3x9Tf5o"; // Ankit, yahan apni key paste kar do bhai
const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const dom = {
    micBtn: document.getElementById('mic-btn'),
    transcript: document.getElementById('transcript-box'),
    status: document.getElementById('status-text'),
    slip: document.getElementById('patient-slip'),
    map: document.getElementById('hospital-map'),
    token: document.getElementById('slip-token'),
    dept: document.getElementById('slip-dept'),
    triage: document.getElementById('slip-triage')
};

let isSpeaking = false;
let avatarMesh;

// === 2. 3D AVATAR (CENTER) ===
const avCont = document.getElementById('3d-avatar-container');
const avScene = new THREE.Scene();
const avCam = new THREE.PerspectiveCamera(45, avCont.clientWidth/avCont.clientHeight, 0.1, 1000);
const avRenderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
avRenderer.setSize(avCont.clientWidth, avCont.clientHeight);
avCont.appendChild(avRenderer.domElement);
avScene.add(new THREE.AmbientLight(0xffffff, 1.2));
avCam.position.z = 4.5;

new THREE.GLTFLoader().load('Meshy_AI_A_highly_detailed_3D__0329142719_texture.glb', (gltf) => {
    avatarMesh = gltf.scene;
    avatarMesh.scale.set(1.5, 1.5, 1.5);
    avatarMesh.position.set(0, -1, 0);
    avScene.add(avatarMesh);
});

// === 3. GEMINI AI BRAIN ===
async function getAIResponse(userInput) {
    const prompt = `You are REKAA, a medical AI assistant. Analyze: "${userInput}". 
    1. Triage: Emergency or Standard?
    2. Dept: Suggest a hospital department (Emergency, Cardiology, OPD, or Pharmacy).
    3. Reply: 1 short friendly sentence in the SAME language (Hindi or English).
    Return ONLY JSON: {"triage":"...", "dept":"...", "reply":"..."}`;

    try {
        const result = await model.generateContent(prompt);
        const text = result.response.text().replace(/```json|```/g, "");
        return JSON.parse(text);
    } catch (e) {
        return { triage: "Standard", dept: "General OPD", reply: "I've noted that. Please take a slip." };
    }
}

// === 4. MULTILINGUAL FEMALE VOICE ===
function speak(text) {
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    
    // Pick Indian Female Voice
    const femaleVoice = voices.find(v => (v.name.includes('Female') || v.name.includes('Sangeeta') || v.name.includes('Heera') || v.name.includes('Google हिन्दी'))) || voices[0];
    utt.voice = femaleVoice;
    utt.lang = /[\u0900-\u097F]/.test(text) ? 'hi-IN' : 'en-IN';
    utt.pitch = 1.2;
    utt.onstart = () => isSpeaking = true;
    utt.onend = () => isSpeaking = false;
    window.speechSynthesis.speak(utt);
}

// === 5. GOOGLE MAPS STYLE NAVIGATOR ===
const ctx = dom.map.getContext('2d');
function drawMap(targetDept = null) {
    const w = dom.map.width = dom.map.offsetWidth;
    const h = dom.map.height = dom.map.offsetHeight;
    ctx.clearRect(0,0,w,h);
    
    // Hallways
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(w*0.1, h*0.4, w*0.8, h*0.2); 
    ctx.fillRect(w*0.45, h*0.1, w*0.1, h*0.8);

    const rooms = [
        { name: 'Emergency', x: w*0.1, y: h*0.1, color: '#f8d7da' },
        { name: 'Cardiology', x: w*0.6, y: h*0.1, color: '#cfe2ff' },
        { name: 'OPD', x: w*0.1, y: h*0.65, color: '#d1e7dd' },
        { name: 'Pharmacy', x: w*0.6, y: h*0.65, color: '#fff3cd' }
    ];

    rooms.forEach(r => {
        ctx.fillStyle = r.color;
        ctx.fillRect(r.x, r.y, w*0.3, h*0.25);
        ctx.fillStyle = "#333";
        ctx.font = "bold 10px Segoe UI";
        ctx.fillText(r.name, r.x+5, r.y+15);
    });

    if(targetDept) {
        ctx.strokeStyle = "#4285f4"; ctx.setLineDash([5, 5]); ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(w*0.5, h*0.9); ctx.lineTo(w*0.5, h*0.5);
        const target = rooms.find(rm => targetDept.includes(rm.name)) || rooms[0];
        ctx.lineTo(target.x + w*0.15, h*0.5);
        ctx.lineTo(target.x + w*0.15, target.y + h*0.12);
        ctx.stroke();
    }
}

// === 6. SPEECH & INTERACTION ===
const Speech = window.SpeechRecognition || window.webkitSpeechRecognition;
const rec = new Speech();
rec.lang = 'hi-IN';

dom.micBtn.onclick = () => { rec.start(); dom.micBtn.classList.add('active'); dom.micBtn.innerText = "Listening..."; };

rec.onresult = async (e) => {
    const text = e.results[0][0].transcript;
    dom.micBtn.classList.remove('active');
    dom.micBtn.innerText = "Tap to Speak";
    dom.transcript.innerHTML += `<br><br><b>Patient:</b> "${text}"`;
    
    dom.status.innerHTML = "<strong>Status:</strong> REKAA is thinking...";
    const ai = await getAIResponse(text);
    
    // Updates
    dom.token.innerText = ai.triage === "Emergency" ? "E-" + Math.floor(Math.random()*100) : "OPD-" + Math.floor(Math.random()*100);
    dom.dept.innerText = ai.dept;
    dom.triage.innerText = ai.triage;
    dom.slip.classList.add('printing');
    drawMap(ai.dept);
    
    dom.transcript.innerHTML += `<br><br><b style="color:#4a90e2">REKAA:</b> "${ai.reply}"`;
    dom.status.innerHTML = "<strong>Status:</strong> Ready";
    speak(ai.reply);
};

// ANIMATION LOOP
function animate() {
    requestAnimationFrame(animate);
    if (avatarMesh) {
        avatarMesh.position.y = -1 + Math.sin(Date.now() * 0.002) * 0.01;
        avatarMesh.scale.y = isSpeaking ? 1.5 + (Math.random()*0.05) : 1.5;
    }
    avRenderer.render(avScene, avCam);
}
animate();
window.onload = () => drawMap();