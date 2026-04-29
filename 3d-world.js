let scene, camera, renderer, controls;
let moveForward = false,
    moveBackward = false,
    moveLeft = false,
    moveRight = false;
let isRunning = false;

// ★ 一斉召喚（左クリック）の判定用
let isSummoning = false;
let ringRotation = 0; // 輪の回転角度

let prevTime = performance.now();
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();

let swataros = [];

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x4A1C54);
    // スケールが大きくなったので、霧をもっと薄くして遠くまで見えるように
    scene.fog = new THREE.FogExp2(0x4A1C54, 0.0003);

    // ★ Swataroが超巨大なので、目の高さを50にアップ
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 10000);
    camera.position.y = 50;

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('threejs-container').appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 10);
    scene.add(directionalLight);

    controls = new THREE.PointerLockControls(camera, document.body);
    const uiOverlay = document.getElementById('ui-overlay');

    uiOverlay.addEventListener('click', () => { controls.lock(); });
    controls.addEventListener('lock', () => { uiOverlay.style.display = 'none'; });
    controls.addEventListener('unlock', () => { uiOverlay.style.display = 'flex'; });
    scene.add(controls.getObject());

    const onKeyDown = (event) => {
        switch (event.code) {
            case 'KeyW':
                moveForward = true;
                break;
            case 'KeyA':
                moveLeft = true;
                break;
            case 'KeyS':
                moveBackward = true;
                break;
            case 'KeyD':
                moveRight = true;
                break;
            case 'ShiftLeft':
            case 'ShiftRight':
                isRunning = true;
                break;
        }
    };
    const onKeyUp = (event) => {
        switch (event.code) {
            case 'KeyW':
                moveForward = false;
                break;
            case 'KeyA':
                moveLeft = false;
                break;
            case 'KeyS':
                moveBackward = false;
                break;
            case 'KeyD':
                moveRight = false;
                break;
            case 'ShiftLeft':
            case 'ShiftRight':
                isRunning = false;
                break;
        }
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);

    // ★ マウスクリックでの一斉召喚イベント
    document.addEventListener('mousedown', (event) => {
        if (controls.isLocked && event.button === 0) { // 左クリック
            isSummoning = true;
        }
    });
    document.addEventListener('mouseup', (event) => {
        if (event.button === 0) {
            isSummoning = false;
        }
    });

    // ★ 地面を「水色」にし、その上に「黒い格子(Grid)」を敷く
    const floorSize = 10000;

    // 1. 水色のベース床
    const floorGeometry = new THREE.PlaneGeometry(floorSize, floorSize);
    floorGeometry.rotateX(-Math.PI / 2);
    const floorMaterial = new THREE.MeshBasicMaterial({ color: 0x87CEEB }); // 水色
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    scene.add(floor);

    // 2. 黒い格子のライン
    const gridHelper = new THREE.GridHelper(floorSize, 150, 0x000000, 0x000000);
    gridHelper.position.y = 1; // 床と重なってチラつかないように少しだけ上に浮かす
    scene.add(gridHelper);

    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(
        'swataro.png',
        function(texture) {
            const imageAspect = texture.image.width / texture.image.height;
            // ★ Swataroをさらに超・巨大化 (高さを250に設定！)
            const height = 250;
            const width = height * imageAspect;
            const geometry = new THREE.PlaneGeometry(width, height);
            const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide });

            for (let i = 0; i < 50; i++) {
                const swataro = new THREE.Mesh(geometry, material);

                const startX = (Math.random() - 0.5) * 6000;
                const startZ = (Math.random() - 0.5) * 6000;
                swataro.position.set(startX, height / 2, startZ);

                swataro.userData = {
                    baseY: height / 2,
                    // ★ サイズに合わせて移動速度もスケールアップ
                    speedX: (Math.random() - 0.5) * 400,
                    speedZ: (Math.random() - 0.5) * 400,
                    jumpSpeed: Math.random() * 5 + 5,
                    jumpHeight: Math.random() * 80 + 20,
                    timeOffset: Math.random() * Math.PI * 2
                };

                scene.add(swataro);
                swataros.push(swataro);
            }
        },
        undefined,
        function(err) {
            console.warn("画像エラー: 代替ブロックを出します");
            for (let i = 0; i < 50; i++) {
                const boxGeo = new THREE.BoxGeometry(100, 100, 100);
                const boxMat = new THREE.MeshStandardMaterial({ color: 0xFFD700 });
                const box = new THREE.Mesh(boxGeo, boxMat);
                box.position.set((Math.random() - 0.5) * 6000, 50, (Math.random() - 0.5) * 6000);
                box.userData = { baseY: 50, speedX: (Math.random() - 0.5) * 400, speedZ: (Math.random() - 0.5) * 400, jumpSpeed: Math.random() * 5 + 5, jumpHeight: Math.random() * 80 + 20, timeOffset: Math.random() * Math.PI * 2 };
                scene.add(box);
                swataros.push(box);
            }
        }
    );

    window.addEventListener('resize', onWindowResize);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);

    const time = performance.now();
    const delta = (time - prevTime) / 1000;
    const timeInSeconds = time / 1000;

    // ★ Swataroたちの行動制御
    if (isSummoning) {
        // --- 召喚中（左クリック長押し）---
        // 全体を時計回りに回転させる（マイナス方向に角度を増やす）
        ringRotation -= delta * 0.8;

        // プレイヤーを囲む巨大な輪の半径
        const ringRadius = 1800;

        swataros.forEach((swataro, index) => {
            // それぞれのSwataroの輪での目標位置を計算
            const angle = ringRotation + (index / swataros.length) * Math.PI * 2;
            const targetX = camera.position.x + Math.cos(angle) * ringRadius;
            const targetZ = camera.position.z + Math.sin(angle) * ringRadius;
            const targetY = swataro.userData.baseY; // ジャンプを止めて地面の高さに

            // 目標位置に向かってスムーズに吸い寄せられる（Lerp処理）
            swataro.position.x += (targetX - swataro.position.x) * 5 * delta;
            swataro.position.z += (targetZ - swataro.position.z) * 5 * delta;
            swataro.position.y += (targetY - swataro.position.y) * 5 * delta;

            // プレイヤーの方を向く
            swataro.lookAt(camera.position.x, swataro.position.y, camera.position.z);
        });

    } else {
        // --- 通常時（拡散・徘徊・ジャンプ）---
        swataros.forEach(swataro => {
            // 徘徊移動
            swataro.position.x += swataro.userData.speedX * delta;
            swataro.position.z += swataro.userData.speedZ * delta;

            // 見えない壁（世界が広くなったので±4800に拡大）
            if (swataro.position.x > 4800 || swataro.position.x < -4800) swataro.userData.speedX *= -1;
            if (swataro.position.z > 4800 || swataro.position.z < -4800) swataro.userData.speedZ *= -1;

            // ジャンプ処理
            swataro.position.y = swataro.userData.baseY + Math.abs(Math.sin(timeInSeconds * swataro.userData.jumpSpeed + swataro.userData.timeOffset)) * swataro.userData.jumpHeight;

            // プレイヤーの方を向く
            swataro.lookAt(camera.position.x, swataro.position.y, camera.position.z);
        });
    }

    // プレイヤーの移動制御
    if (controls.isLocked === true) {
        velocity.x -= velocity.x * 10.0 * delta;
        velocity.z -= velocity.z * 10.0 * delta;

        direction.z = Number(moveForward) - Number(moveBackward);
        direction.x = Number(moveRight) - Number(moveLeft);
        direction.normalize();

        // 空間が広くなったので、移動速度も少しアップ
        const speed = isRunning ? 2500.0 : 1000.0;

        if (moveForward || moveBackward) velocity.z -= direction.z * speed * delta;
        if (moveLeft || moveRight) velocity.x -= direction.x * speed * delta;

        controls.moveRight(-velocity.x * delta);
        controls.moveForward(-velocity.z * delta);
    }

    prevTime = time;
    renderer.render(scene, camera);
}

init();
animate();