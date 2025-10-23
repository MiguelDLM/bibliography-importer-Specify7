/**
 * 3D Model Viewer using Three.js
 * This module loads and displays STL files from Specify 7
 */

(function() {
    'use strict';

    /**
     * Show error message
     */
    function showError(message) {
        const loadingEl = document.getElementById('loading');
        const errorEl = document.getElementById('error');
        const errorMsg = document.getElementById('error-message');

        if (loadingEl) loadingEl.classList.add('hidden');
        if (errorEl) errorEl.classList.remove('hidden');
        if (errorMsg) errorMsg.textContent = message;
    }

    // Check if THREE is loaded
    if (typeof THREE === 'undefined') {
        console.error('THREE.js is not loaded!');
        document.addEventListener('DOMContentLoaded', function() {
            showError('Error: THREE.js no se cargó correctamente');
        });
        return;
    }

    // Check if required components are available
    if (typeof THREE.STLLoader === 'undefined') {
        console.error('THREE.STLLoader is not loaded!');
        document.addEventListener('DOMContentLoaded', function() {
            showError('Error: STLLoader no se cargó correctamente');
        });
        return;
    }

    if (typeof THREE.OrbitControls === 'undefined') {
        console.error('THREE.OrbitControls is not loaded!');
        document.addEventListener('DOMContentLoaded', function() {
            showError('Error: OrbitControls no se cargó correctamente');
        });
        return;
    }

    console.log('THREE.js version:', THREE.REVISION);
    console.log('All required libraries loaded successfully');

    // Global variables
    let scene, camera, renderer, controls, mesh;
    let wireframeEnabled = false;

    // Get URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const modelUrl = urlParams.get('url');
    const modelName = urlParams.get('name') || '3D Model';

    /**
     * Initialize the 3D viewer
     */
    function init() {
        if (!modelUrl) {
            showError('No 3D model URL specified');
            return;
        }

        // Update page title
        document.getElementById('model-title').textContent = modelName;

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

        // Add lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 10, 5);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        scene.add(directionalLight);

        const pointLight1 = new THREE.PointLight(0xffffff, 0.3);
        pointLight1.position.set(-10, -10, -5);
        scene.add(pointLight1);

        const pointLight2 = new THREE.PointLight(0xffffff, 0.2);
        pointLight2.position.set(10, -10, 10);
        scene.add(pointLight2);

    // (no floor/grid/axes by default) keep scene minimal for 3D models

        // Add orbit controls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    // Allow a wide zoom range; tight limits will be set after model loads
    controls.minDistance = 0.01;
    controls.maxDistance = 1e9;
    controls.autoRotate = false;
    controls.autoRotateSpeed = 0.5;

        // Load the model
        loadModel(modelUrl);

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
        const loader = new THREE.STLLoader();

        loader.load(
            url,
            function(geometry) {
                // Success callback
                console.log('Model loaded successfully');

                // Center the geometry
                geometry.computeBoundingBox();
                const center = new THREE.Vector3();
                geometry.boundingBox.getCenter(center);
                geometry.translate(-center.x, -center.y, -center.z);

                // Compute normals for smooth shading
                geometry.computeVertexNormals();

                // Create material
                const material = new THREE.MeshStandardMaterial({
                    color: 0x8844ff,
                    roughness: 0.4,
                    metalness: 0.6,
                    side: THREE.DoubleSide,
                    flatShading: false
                });

                // Create mesh
                mesh = new THREE.Mesh(geometry, material);
                mesh.castShadow = true;
                mesh.receiveShadow = true;

                // Add to scene
                scene.add(mesh);

                // Adjust camera to fit model
                fitCameraToModel(geometry);

                // Hide loading indicator
                document.getElementById('loading').classList.add('hidden');
            },
            function(xhr) {
                // Progress callback
                const percentComplete = xhr.loaded / xhr.total * 100;
                console.log('Loading: ' + Math.round(percentComplete) + '%');
            },
            function(error) {
                // Error callback
                console.error('Error loading model:', error);
                showError('Could not load 3D model. Verify the file is valid and accessible.');
            }
        );
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
            hint.textContent = '🖱️ Click y arrastra para rotar | Rueda para zoom | Click derecho para mover';
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

})();