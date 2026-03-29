/**
 * REKAA - 3D Procedural Engine & Interaction
 * app.js - Built-in 3D Map Generation (No external GLB needed for map)
 */

window.addEventListener('DOMContentLoaded', () => {
    const dom = {
        canvasContainer: document.getElementById('3d-canvas-container'),
        micBtn: document.getElementById('mic-btn'),
        transcript: document.getElementById('transcript-box'),
        statusText: document.getElementById('status-text'),
        triageCard: document.getElementById('triage-card'),
        slip: document.getElementById('patient-slip'),
        mapBox: document.getElementById('map-box'),
        mapDest: document.getElementById('map-dest')
    };

    // === 1. AVATAR SETUP (Uses your working GLB) ===
    let scene, camera, renderer, avatarMesh;
    let baseScale = 1.5;

    function initAvatar() {
        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(45, dom.canvasContainer.clientWidth / dom.canvasContainer.clientHeight, 0.1, 1000);
        camera.position.set(0, 0, 4.5);

        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(dom.canvasContainer.clientWidth, dom.canvasContainer.clientHeight);
        dom.canvasContainer.appendChild(renderer.domElement);

        scene.add(new THREE.AmbientLight(0xffffff, 1.2));
        const dl = new THREE.DirectionalLight(0xffffff, 0.8);
        dl.position.set(1, 1, 1);
        scene.add(dl);

        new THREE.GLTFLoader().load('Meshy_AI_A_highly_detailed_3D__0329142719_texture.glb', (gltf) => {
            avatarMesh = gltf.scene;
            avatarMesh.scale.set(baseScale, baseScale, baseScale);
            avatarMesh.position.set(0, -1, 0);
            scene.add(avatarMesh);
        });
    }

    // === 2. PROCEDURAL 3D HOSPITAL MAP (The "Pro" Solution) ===
    let mapScene, mapCamera, mapRenderer, mapGroup;

    function init3DMap() {
        const mapContainer = document.getElementById('3d-map-canvas');
        mapScene = new THREE.Scene();
        mapCamera = new THREE.PerspectiveCamera(45, mapContainer.clientWidth / 160, 0.1, 1000);
        mapCamera.position.set(8, 8, 8);
        mapCamera.lookAt(0, 0, 0);

        mapRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        mapRenderer.setSize(mapContainer.clientWidth, 160);
        mapContainer.appendChild(mapRenderer.domElement);

        mapScene.add(new THREE.AmbientLight(0xffffff, 1));
        
        mapGroup = new THREE.Group();

        // Floor
        const floor = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), new THREE.MeshStandardMaterial({color: 0x222222}));
        floor.rotation.x = -Math.PI / 2;
        mapGroup.add(floor);

        // Function to create 3D Rooms
        const createRoom = (x, z, w, d, h, color, name) => {
            const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({color: color, transparent: true, opacity: 0.8}));
            box.position.set(x, h/2, z);
            mapGroup.add(box);
            
            // Wall Edges (Wireframe effect for tech look)
            const edges = new THREE.LineSegments(new THREE.EdgesGeometry(box.geometry), new THREE.LineBasicMaterial({color: 0xffffff}));
            edges.position.copy(box.position);
            mapGroup.add(edges);
        };

        // Building the Hospital Structure
        createRoom(-3, -3, 3, 3, 2, 0xff4757); // Emergency
        createRoom(2, -3, 5, 2, 1.5, 0x4a90e2); // Reception
        createRoom(-3, 2, 3, 4, 1.5, 0xff4757); // ICU
        createRoom(1, 1, 2, 3, 1.5, 0xd4ff70); // Pharmacy
        createRoom(4, 2, 2, 4, 1.5, 0x4a90e2); // General OPD

        mapScene.add(mapGroup);
    }

    // === 3. INTERACTION LOGIC ===
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';
    let isSpeaking = false;

    function rekaaSpeak(text, lang) {
        window.speechSynthesis.cancel();
        const utt = new SpeechSynthesisUtterance(text);
        utt.lang = lang;
        utt.onstart = () => isSpeaking = true;
        utt.onend = () => isSpeaking = false;
        window.speechSynthesis.speak(utt);
    }

    dom.micBtn.addEventListener('click', () => {
        recognition.start();
        dom.micBtn.innerText = "Listening...";
        dom.micBtn.style.background = "#ff4757";
    });

    recognition.onresult = (event) => {
        const text = event.results[0][0].transcript;
        dom.micBtn.innerText = "Tap to Speak";
        dom.micBtn.style.background = "linear-gradient(135deg, #d4ff70 0%, #a8cc50 100%)";
        dom.transcript.innerHTML += `<br><br><span style="color:white">Patient: "${text}"</span>`;
        
        processTriage(text.toLowerCase());
    };

    function processTriage(text) {
        let isHindi = text.includes("dard") || text.includes("bukhar") || text.includes("hai");
        let isEmergency = text.includes("pain") || text.includes("dard") || text.includes("emergency");
        
        let dept = isEmergency ? "Emergency (ER)" : "General OPD";
        let color = isEmergency ? "#ff4757" : "#4a90e2";
        
        // Update UI
        dom.triageCard.innerHTML = `<p style="font-size:0.8rem; color:#888;">Triage</p><h4 style="color:${color}">${isEmergency ? 'High Risk' : 'Standard'}</h4>`;
        dom.triageCard.style.borderLeftColor = color;
        
        document.getElementById('slip-token').innerText = isEmergency ? "E-101" : "OPD-402";
        document.getElementById('slip-dept').innerText = dept;
        document.getElementById('slip-room').innerText = isEmergency ? "Ground Floor" : "Room 105";

        let reply = isHindi ? `${dept} mein aapka swagat hai. Parcha nikal raha hai.` : `Proceed to ${dept}. Printing your slip now.`;
        
        setTimeout(() => {
            dom.slip.classList.add('printing');
            dom.transcript.innerHTML += `<br><br><span style="color:#4a90e2">REKAA: "${reply}"</span>`;
            rekaaSpeak(reply, isHindi ? 'hi-IN' : 'en-IN');
            
            // Auto-Show 3D Map
            setTimeout(() => {
                dom.mapBox.style.display = "block";
                dom.mapDest.innerText = dept;
                // Highlight the target room in 3D (Optional visual touch)
                mapGroup.rotation.y = 0; 
            }, 1500);
        }, 500);
    }

    // === 4. ANIMATION LOOP ===
    function animate() {
        requestAnimationFrame(animate);
        if (avatarMesh) {
            avatarMesh.position.y = -1 + Math.sin(Date.now() * 0.002) * 0.01;
            avatarMesh.scale.y = isSpeaking ? 1.5 + (Math.random() * 0.05) : 1.5;
        }
        renderer.render(scene, camera);

        if (dom.mapBox.style.display === "block") {
            mapGroup.rotation.y += 0.01; // Auto-rotate the 3D Hospital Map
            mapRenderer.render(mapScene, mapCamera);
        }
    }

    initAvatar();
    init3DMap();
    animate();
});