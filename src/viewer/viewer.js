// ES module viewer for Specify7+
// Imports Three.js module and JSM loaders directly

import * as THREE from '../../lib/three/three.module.js';
import { OrbitControls } from '../../lib/three/jsm/OrbitControls.js';
import { STLLoader } from '../../lib/three/jsm/STLLoader.js';
import { OBJLoader } from '../../lib/three/jsm/OBJLoader.js';
import { PLYLoader } from '../../lib/three/jsm/PLYLoader.js';
// import { GLTFLoader } from '../../lib/three/jsm/GLTFLoader.js'; // optional

function showError(message) {
    const loadingEl = document.getElementById('loading');
    const errorEl = document.getElementById('error');
    const errorMsg = document.getElementById('error-message');

    if (loadingEl) loadingEl.classList.add('hidden');
    if (errorEl) errorEl.classList.remove('hidden');
    if (errorMsg) errorMsg.textContent = message;
}

console.log('THREE (module) revision:', THREE.REVISION);

let scene, camera, renderer, controls, mesh;
let wireframeEnabled = false;
let ambientLight, directionalLight, pointLight1, pointLight2;
let currentMaterial = null;


const urlParams = new URLSearchParams(window.location.search);
const modelUrl = urlParams.get('url');
const modelTitle = urlParams.get('title');
const modelFilename = urlParams.get('filename');
const modelName = urlParams.get('name');
const displayTitle = modelTitle || modelFilename || modelName || '3D Model';

function init() {
    if (!modelUrl) {
        showError('No 3D model URL specified');
        return;
    }

    // Update page title
    document.getElementById('model-title').textContent = displayTitle;

    // Setup download button
    document.getElementById('download-btn').addEventListener('click', () => {
        window.open(modelUrl, '_blank');
    });

    // Setup wireframe toggle
    document.getElementById('wireframe-btn').addEventListener('click', toggleWireframe);

    // Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0a);

    // Create camera
    const container = document.getElementById('viewer-container');
    camera = new THREE.PerspectiveCamera(
        50,
        container.clientWidth / container.clientHeight,
        0.1,
        1000
    );
    camera.position.set(5, 5, 5);

    // Create renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // Add lights (store references for live control)
    ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
    scene.add(ambientLight);

    directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    pointLight1 = new THREE.PointLight(0xffffff, 0.28);
    pointLight1.position.set(-10, -10, -5);
    scene.add(pointLight1);

    pointLight2 = new THREE.PointLight(0xffffff, 0.18);
    pointLight2.position.set(10, -10, 10);
    scene.add(pointLight2);

    // (no floor/grid/axes by default) keep scene minimal for 3D models

    // Add orbit controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    // Allow a wide zoom range; tight limits will be set after model loads
    controls.minDistance = 0.01;
    controls.maxDistance = 1e9;
    controls.autoRotate = false;
    controls.autoRotateSpeed = 0.5;

    // Disable settings until model loads
    disableSettings(true);

    // Load the model
    loadModel(modelUrl);

    // Wire up UI controls
    setupUI();

        // Handle window resize
        window.addEventListener('resize', onWindowResize);

        // Start animation loop
        animate();

        // Show controls hint
        showControlsHint();
    }

    /**
     * Load 3D model
     */
    function loadModel(url) {
        const ext = url.split('.').pop().toLowerCase().split('?')[0];
        if (ext === 'stl') {
            if (typeof STLLoader === 'undefined') {
                showError('STLLoader is not loaded');
                return;
            }
            const loader = new STLLoader();
            loader.load(
                url,
                function(geometry) {
                    console.log('STL model loaded successfully');
                    geometry.computeBoundingBox();
                    const center = new THREE.Vector3();
                    geometry.boundingBox.getCenter(center);
                    geometry.translate(-center.x, -center.y, -center.z);
                    geometry.computeVertexNormals();
                    currentMaterial = new THREE.MeshStandardMaterial({
                        color: 0xffffff,
                        roughness: 0.4,
                        metalness: 0.0,
                        side: THREE.DoubleSide,
                        flatShading: false
                    });
                    mesh = new THREE.Mesh(geometry, currentMaterial);
                    mesh.castShadow = true;
                    mesh.receiveShadow = true;
                    scene.add(mesh);
                    fitCameraToModel(geometry);
                    document.getElementById('loading').classList.add('hidden');
                    disableSettings(false);
                    populateSettingsFromMaterial();
                },
                function(xhr) {
                    const percentComplete = xhr.loaded / xhr.total * 100;
                    console.log('Loading: ' + Math.round(percentComplete) + '%');
                },
                function(error) {
                    console.error('Error loading STL model:', error);
                    showError('Could not load STL model. Verify the file is valid and accessible.');
                }
            );
        } else if (ext === 'ply') {
            if (typeof PLYLoader === 'undefined') {
                showError('PLYLoader is not loaded');
                return;
            }
            const loader = new PLYLoader();
            loader.load(
                url,
                function(geometry) {
                    console.log('PLY model loaded successfully');
                    geometry.computeBoundingBox();
                    const center = new THREE.Vector3();
                    geometry.boundingBox.getCenter(center);
                    geometry.translate(-center.x, -center.y, -center.z);
                    geometry.computeVertexNormals();
                    currentMaterial = new THREE.MeshStandardMaterial({
                        color: 0xffffff,
                        roughness: 0.4,
                        metalness: 0.0,
                        side: THREE.DoubleSide,
                        flatShading: false
                    });
                    mesh = new THREE.Mesh(geometry, currentMaterial);
                    mesh.castShadow = true;
                    mesh.receiveShadow = true;
                    scene.add(mesh);
                    fitCameraToModel(geometry);
                    document.getElementById('loading').classList.add('hidden');
                    disableSettings(false);
                    populateSettingsFromMaterial();
                },
                function(xhr) {
                    const percentComplete = xhr.loaded / xhr.total * 100;
                    console.log('Loading: ' + Math.round(percentComplete) + '%');
                },
                function(error) {
                    console.error('Error loading PLY model:', error);
                    showError('Could not load PLY model. Verify the file is valid and accessible.');
                }
            );
        } else if (ext === 'obj') {
            if (typeof OBJLoader === 'undefined') {
                showError('OBJLoader is not loaded');
                return;
            }
            const loader = new OBJLoader();
            loader.load(
                url,
                function(object) {
                    console.log('OBJ model loaded successfully');
                    mesh = object;
                    // Center mesh if possible
                    let geometry = null;
                    object.traverse(function(child) {
                        if (child.isMesh) {
                            geometry = child.geometry;
                            child.castShadow = true;
                            child.receiveShadow = true;
                        }
                    });
                    if (geometry) {
                        geometry.computeBoundingBox();
                        const center = new THREE.Vector3();
                        geometry.boundingBox.getCenter(center);
                        object.position.sub(center);
                        fitCameraToModel(geometry);
                    }
                    scene.add(object);
                    document.getElementById('loading').classList.add('hidden');
                    disableSettings(false);
                },
                function(xhr) {
                    const percentComplete = xhr.loaded / xhr.total * 100;
                    console.log('Loading: ' + Math.round(percentComplete) + '%');
                },
                function(error) {
                    console.error('Error loading OBJ model:', error);
                    showError('Could not load OBJ model. Verify the file is valid and accessible.');
                }
            );
        } else if (ext === 'gltf' || ext === 'glb') {
            // GLTFLoader is optional - uncomment the import at the top to enable
            if (typeof GLTFLoader === 'undefined') {
                showError('GLTFLoader is not loaded. Enable it by uncommenting the GLTFLoader import.');
                return;
            }
            const loader = new GLTFLoader();
            loader.load(
                url,
                function(gltf) {
                    console.log('GLTF/GLB model loaded successfully');
                    mesh = gltf.scene;
                    scene.add(mesh);
                    // Center and fit camera if possible
                    let geometry = null;
                    mesh.traverse(function(child) {
                        if (child.isMesh) {
                            geometry = child.geometry;
                        }
                    });
                    if (geometry) {
                        geometry.computeBoundingBox();
                        const center = new THREE.Vector3();
                        geometry.boundingBox.getCenter(center);
                        mesh.position.sub(center);
                        fitCameraToModel(geometry);
                    }
                    document.getElementById('loading').classList.add('hidden');
                    disableSettings(false);
                },
                function(xhr) {
                    const percentComplete = xhr.loaded / xhr.total * 100;
                    console.log('Loading: ' + Math.round(percentComplete) + '%');
                },
                function(error) {
                    console.error('Error loading GLTF/GLB model:', error);
                    showError('Could not load GLTF/GLB model. Verify the file is valid and accessible.');
                }
            );
        } else {
            showError('Unsupported file format: ' + ext.toUpperCase());
        }
    }

    /**
     * Fit camera to show entire model
     */
    function fitCameraToModel(geometry) {
        // Ensure bounding volumes are up to date
        geometry.computeBoundingBox();
        geometry.computeBoundingSphere();

        const box = geometry.boundingBox;
        const sphere = geometry.boundingSphere;

        // If no sphere, fall back to box size
        const radius = (sphere && sphere.radius) ? sphere.radius : Math.max(box.getSize(new THREE.Vector3()).length() * 0.5, 1);

        // Place the camera so the model fits in view. Use the sphere radius and fov to compute distance.
        const fov = camera.fov * (Math.PI / 180);
        let distance = radius / Math.sin(fov / 2);
        distance *= 1.25; // padding

        // Use a diagonal offset so camera isn't flush to an axis
        const offset = new THREE.Vector3(distance, distance, distance);

        // Since geometry was centered to origin when loaded, target is origin
        const target = new THREE.Vector3(0, 0, 0);

        camera.near = Math.max(0.001, radius / 1000);
        camera.far = Math.max(camera.far, distance * 20);
        camera.updateProjectionMatrix();

        camera.position.copy(target).add(offset);
        camera.lookAt(target);

        // Update controls target and limits
        controls.target.copy(target);
        controls.minDistance = Math.max(0.001, radius * 0.01);
        controls.maxDistance = distance * 20;
        controls.update();
    }

    /**
     * Toggle wireframe mode
     */
    function toggleWireframe() {
        if (!mesh) return;

        wireframeEnabled = !wireframeEnabled;
        mesh.material.wireframe = wireframeEnabled;

        const btn = document.getElementById('wireframe-btn');
        if (wireframeEnabled) {
            btn.style.background = 'rgba(255, 255, 255, 0.4)';
        } else {
            btn.style.background = 'rgba(255, 255, 255, 0.2)';
        }
    }

    /**
     * Setup UI event listeners for material and lighting controls
     */
    function setupUI() {
        const preset = document.getElementById('preset-select');
        const color = document.getElementById('material-color');
        const roughness = document.getElementById('material-roughness');
        const metalness = document.getElementById('material-metalness');
        const dirLight = document.getElementById('dir-light-intensity');
        const pointLight = document.getElementById('point-light-intensity');
        const resetBtn = document.getElementById('reset-appearance');
        const fitBtn = document.getElementById('fitview-btn');

    if (preset) preset.addEventListener('change', () => applyPreset(preset.value));
        if (color) color.addEventListener('input', updateMaterialFromUI);
        if (roughness) roughness.addEventListener('input', updateMaterialFromUI);
        if (metalness) metalness.addEventListener('input', updateMaterialFromUI);
    // Directional light controls
    const dirColor = document.getElementById('dir-light-color');
    const dirAz = document.getElementById('dir-light-azimuth');
    const dirEl = document.getElementById('dir-light-elevation');
    if (dirColor) dirColor.addEventListener('input', () => updateLightsFromUI());
    if (dirAz) dirAz.addEventListener('input', () => updateLightsFromUI());
    if (dirEl) dirEl.addEventListener('input', () => updateLightsFromUI());
        if (dirLight) dirLight.addEventListener('input', updateLightsFromUI);
        if (pointLight) pointLight.addEventListener('input', updateLightsFromUI);
        if (resetBtn) resetBtn.addEventListener('click', () => {
            // Reset to fossil preset by default
            applyPreset('fossil');
            populateSettingsFromMaterial();
        });
        if (fitBtn) fitBtn.addEventListener('click', () => {
            if (mesh && mesh.geometry) fitCameraToModel(mesh.geometry);
        });
    }

    function disableSettings(disabled) {
        const panel = document.getElementById('settings-panel');
        if (!panel) return;
        panel.setAttribute('aria-hidden', disabled ? 'true' : 'false');
        Array.from(panel.querySelectorAll('input,select,button')).forEach(el => {
            el.disabled = disabled;
        });
    }

    function populateSettingsFromMaterial() {
        if (!currentMaterial) return;
        const color = document.getElementById('material-color');
        const roughness = document.getElementById('material-roughness');
        const metalness = document.getElementById('material-metalness');
        const dirLight = document.getElementById('dir-light-intensity');
        const dirColor = document.getElementById('dir-light-color');
        const dirAz = document.getElementById('dir-light-azimuth');
        const dirEl = document.getElementById('dir-light-elevation');
        const pointLight = document.getElementById('point-light-intensity');

        if (color) color.value = '#' + currentMaterial.color.getHexString();
        if (roughness) roughness.value = (currentMaterial.roughness != null) ? currentMaterial.roughness : 0.4;
        if (metalness) metalness.value = (currentMaterial.metalness != null) ? currentMaterial.metalness : 0.0;
        if (dirLight && directionalLight) dirLight.value = directionalLight.intensity;
        if (dirColor && directionalLight) {
            // directionalLight.color is THREE.Color
            dirColor.value = '#' + directionalLight.color.getHexString();
        }
        if (dirAz && dirEl && directionalLight) {
            // compute azimuth/elevation from current directionalLight position relative to origin
            const pos = directionalLight.position.clone().normalize();
            const az = Math.atan2(pos.z, pos.x) * (180 / Math.PI);
            const el = Math.asin(pos.y) * (180 / Math.PI);
            dirAz.value = Math.round(az);
            dirEl.value = Math.round(el);
        }
        if (pointLight && pointLight1) pointLight.value = pointLight1.intensity;
    }

    function applyPreset(name) {
        if (!currentMaterial) return;
        switch (name) {
            case 'fossil':
                currentMaterial.color.set('#cfc6b8');
                currentMaterial.roughness = 0.8;
                currentMaterial.metalness = 0.0;
                currentMaterial.flatShading = false;
                break;
            case 'polished':
                currentMaterial.color.set('#9b6ae6');
                currentMaterial.roughness = 0.18;
                currentMaterial.metalness = 0.12;
                currentMaterial.flatShading = false;
                break;
            case 'metallic':
                currentMaterial.color.set('#888888');
                currentMaterial.roughness = 0.2;
                currentMaterial.metalness = 0.9;
                currentMaterial.flatShading = false;
                break;
            case 'default':
            default:
                currentMaterial.color.set('#6f2b9c');
                currentMaterial.roughness = 0.4;
                currentMaterial.metalness = 0.0;
                currentMaterial.flatShading = false;
                break;
        }
        currentMaterial.needsUpdate = true;
        populateSettingsFromMaterial();
    }

    function updateMaterialFromUI() {
        if (!currentMaterial) return;
        const color = document.getElementById('material-color');
        const roughness = document.getElementById('material-roughness');
        const metalness = document.getElementById('material-metalness');

        if (color) currentMaterial.color.set(color.value);
        if (roughness) currentMaterial.roughness = parseFloat(roughness.value);
        if (metalness) currentMaterial.metalness = parseFloat(metalness.value);
        currentMaterial.needsUpdate = true;
    }

    function updateLightsFromUI() {
        const dirLight = document.getElementById('dir-light-intensity');
        const dirColor = document.getElementById('dir-light-color');
        const dirAz = document.getElementById('dir-light-azimuth');
        const dirEl = document.getElementById('dir-light-elevation');
        const pointLight = document.getElementById('point-light-intensity');

        if (dirLight && directionalLight) directionalLight.intensity = parseFloat(dirLight.value);
        if (dirColor && directionalLight) directionalLight.color.set(dirColor.value);

        // Reposition directional light using spherical coords: distance may be kept constant
        if (dirAz && dirEl && directionalLight) {
            const az = parseFloat(dirAz.value) * (Math.PI / 180);
            const el = parseFloat(dirEl.value) * (Math.PI / 180);
            // Use a reasonable distance relative to camera far or fixed distance
            const dist = Math.max(10, camera.position.length());
            const x = Math.cos(el) * Math.cos(az) * dist;
            const y = Math.sin(el) * dist;
            const z = Math.cos(el) * Math.sin(az) * dist;
            directionalLight.position.set(x, y, z);
            directionalLight.target.position.set(0,0,0);
            if (directionalLight.target && directionalLight.target.updateMatrixWorld) directionalLight.target.updateMatrixWorld();
        }

        if (pointLight && pointLight1) pointLight1.intensity = parseFloat(pointLight.value);
    }

    /**
     * Attempt to load a texture URL and apply to the material as an occlusion/roughness map if desired.
     * For now this is a placeholder for future texture URL support.
     */
    function loadTexture(url) {
        if (!THREE || !currentMaterial) return;
        const loader = new THREE.TextureLoader();
        loader.load(url, tex => {
            currentMaterial.map = tex;
            currentMaterial.needsUpdate = true;
        }, undefined, err => {
            console.warn('Texture could not be loaded', err);
        });
    }

    /**
     * Animation loop
     */
    function animate() {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
    }

    /**
     * Handle window resize
     */
    function onWindowResize() {
        const container = document.getElementById('viewer-container');
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    }

    /**
     * Show controls hint
     */
    function showControlsHint() {
        setTimeout(() => {
            const hint = document.createElement('div');
            hint.className = 'controls-hint';
            hint.textContent = '🖱️ Click and drag to rotate | Scroll to zoom | Right click to pan';
            document.getElementById('viewer-container').appendChild(hint);

            setTimeout(() => {
                hint.classList.add('hidden');
            }, 5000);
        }, 1000);
    }

// Start when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
