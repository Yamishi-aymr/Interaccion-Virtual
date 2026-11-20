
/* =====================================================
   PRACTICA 3.2 - INTERACCION VIRTUAL
   MODULO PRINCIPAL: MAIN.JS

   Integración general:
   Three.js + Cannon-es + WebXR + Hand Tracking
===================================================== */

import * as THREE from 'three';

import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import { VRButton } from 'three/addons/webxr/VRButton.js';

import { createPhysicsWorld } from './physics.js';

import { createLaboratoryScene } from './scene.js';

import { createXRSystem } from './xr.js';

import { createInteractionSystem } from './interaction.js';

import { createGameSystem } from './game.js';

import { createHUD } from './hud.js';

import { createAudioSystem } from './audio.js';

import { createEffectsSystem } from './effects.js';

import { createTableCounters } from './tableCounters.js';


// =============================================
// ELEMENTOS HTML
// =============================================

const container = document.getElementById(
    'scene-container'
);

const loadingScreen = document.getElementById(
    'loading-screen'
);

const compatibilityStatus = document.getElementById(
    'compatibility-status'
);

const errorMessage = document.getElementById(
    'error-message'
);

const vrButtonContainer = document.getElementById(
    'vr-button-container'
);


// =============================================
// VALIDAR CONTENEDOR
// =============================================

if (!container) {

    throw new Error(
        'No se encontró el elemento scene-container.'
    );

}


// =============================================
// VARIABLES GENERALES
// =============================================

let scene;

let camera;

let renderer;

let controls;

let clock;

let physics;

let laboratory;

let xr;

let interaction;

let game;

let hud;

let audio;

let effects;

let tableCounters;

let initialized = false;

let disposed = false;


// =============================================
// CONFIGURACIÓN GENERAL
// =============================================

const APP_CONFIG = {

    background: 0x080D1B,

    cameraPosition: {

        x: 0,

        y: 1.7,

        z: 8

    },

    cameraTarget: {

        x: 0,

        y: 1.1,

        z: 0

    },

    maxPixelRatio: 2,

    enableShadows: true

};


// =============================================
// MENSAJES
// =============================================

function showError(message) {

    console.error('[MAIN]', message);


    if (errorMessage) {

        errorMessage.textContent = message;

    }

}


function setStatus(message) {

    if (compatibilityStatus) {

        compatibilityStatus.textContent = message;

    }

}


// =============================================
// CREAR ESCENA
// =============================================

function initializeScene() {

    scene = new THREE.Scene();

    scene.background = new THREE.Color(
        APP_CONFIG.background
    );


    // Cámara.
    camera = new THREE.PerspectiveCamera(

        70,

        container.clientWidth /
        container.clientHeight,

        0.05,

        100

    );


    camera.position.set(

        APP_CONFIG.cameraPosition.x,

        APP_CONFIG.cameraPosition.y,

        APP_CONFIG.cameraPosition.z

    );


    camera.lookAt(

        APP_CONFIG.cameraTarget.x,

        APP_CONFIG.cameraTarget.y,

        APP_CONFIG.cameraTarget.z

    );


    // Renderer.
    renderer = new THREE.WebGLRenderer({

        antialias: true,

        alpha: false,

        powerPreference: 'high-performance'

    });


    renderer.setPixelRatio(

        Math.min(

            window.devicePixelRatio,

            APP_CONFIG.maxPixelRatio

        )

    );


    renderer.setSize(

        container.clientWidth,

        container.clientHeight

    );


    renderer.outputColorSpace = THREE.SRGBColorSpace;

    renderer.toneMapping = THREE.ACESFilmicToneMapping;

    renderer.toneMappingExposure = 1.1;


    renderer.shadowMap.enabled =

        APP_CONFIG.enableShadows;

    renderer.shadowMap.type =

        THREE.PCFSoftShadowMap;


    // Habilitar WebXR.
    renderer.xr.enabled = true;

    renderer.xr.setReferenceSpaceType('local-floor');


    renderer.domElement.setAttribute(

        'aria-label',

        'Vista tridimensional del laboratorio virtual'

    );


    container.appendChild(renderer.domElement);


    // Controles de escritorio.
    controls = new OrbitControls(

        camera,

        renderer.domElement

    );


    controls.enableDamping = true;

    controls.dampingFactor = 0.06;

    controls.target.set(

        APP_CONFIG.cameraTarget.x,

        APP_CONFIG.cameraTarget.y,

        APP_CONFIG.cameraTarget.z

    );


    controls.minDistance = 2;

    controls.maxDistance = 13;

    controls.maxPolarAngle = Math.PI / 2;


    clock = new THREE.Clock();


    console.log('[MAIN] Escena y renderer preparados.');

}


// =============================================
// CREAR MOTOR FÍSICO
// =============================================

function initializePhysics() {

    physics = createPhysicsWorld();


    console.log(

        '[MAIN] Motor físico conectado.',

        physics.getStats()

    );

}


// =============================================
// CONSTRUIR LABORATORIO
// =============================================

function initializeLaboratory() {

    laboratory = createLaboratoryScene(

        scene,

        physics

    );


    tableCounters = createTableCounters(

        scene,

        laboratory.tables

    );


    console.log('[MAIN] Laboratorio construido con contadores por mesa.');

}


// =============================================
// INICIALIZAR XR
// =============================================

function initializeXR() {

    xr = createXRSystem(

        renderer,

        scene

    );


    console.log('[MAIN] Seguimiento XR preparado.');

}


// =============================================
// INICIALIZAR AUDIO
// =============================================

function initializeAudio() {

    audio = createAudioSystem();


    console.log('[MAIN] Audio preparado.');

}


// =============================================
// INICIALIZAR EFECTOS
// =============================================

function initializeEffects() {

    effects = createEffectsSystem(scene);


    console.log('[MAIN] Efectos preparados.');

}


// =============================================
// INICIALIZAR HUD
// =============================================

function initializeHUD() {

    hud = createHUD(camera, {

        onReset: () => {

            resetApplication();

        },


        onExit: () => {

            exitVR();

        }

    });


    console.log('[MAIN] HUD conectado.');

}


// =============================================
// INICIALIZAR INTERACCIÓN
// =============================================

function initializeInteraction() {

    interaction = createInteractionSystem({

        xr,

        physics,

        objects: laboratory.objects,

        camera

    });


    console.log('[MAIN] Interacción conectada.');

}


// =============================================
// INICIALIZAR JUEGO
// =============================================

function initializeGame() {

    game = createGameSystem({

        objects: laboratory.objects,

        containers: laboratory.containers,

        physics,


        onUpdate: event => {

            const {

                event: eventType,

                data,

                stats

            } = event;


            // Actualizar HUD.
            if (hud) {

                hud.updateStats(stats);

            }

            if (tableCounters) {

                tableCounters.update(stats.categories);

            }


            // Acierto.
            if (eventType === 'correct') {

                audio.playCorrect();


                if (data?.object) {

                    const position = new THREE.Vector3(

                        data.object.body.position.x,

                        data.object.body.position.y,

                        data.object.body.position.z

                    );


                    effects.correct(position);

                }

            }


            // Error.
            if (eventType === 'error') {

                audio.playError();


                if (data?.object) {

                    const position = new THREE.Vector3(

                        data.object.body.position.x,

                        data.object.body.position.y,

                        data.object.body.position.z

                    );


                    effects.error(position);

                }

            }


            // Reinicio.
            if (eventType === 'reset') {

                effects.clear();

                hud.updateStats(stats);

            }


            // Finalización.
            if (eventType === 'complete') {

                audio.playComplete();

                console.log(

                    '[MAIN] Resultados finales:',

                    data

                );

            }

        },


        onComplete: results => {

            console.log(

                '[MAIN] ¡Laboratorio completado!',

                results

            );

        }

    });


    const initialStats = game.getStats();

    hud.updateStats(initialStats);

    tableCounters?.update(initialStats.categories);


    console.log('[MAIN] Sistema de juego conectado.');

}


// =============================================
// CONFIGURAR BOTÓN WEBXR
// =============================================

function initializeVRButton() {

    if (!navigator.xr) {

        setStatus(

            'WebXR no está disponible en este navegador. Puedes explorar el laboratorio en modo escritorio.'

        );


        return;

    }


    const button = VRButton.createButton(

        renderer,

        {

            requiredFeatures: [

                'hand-tracking'

            ],

            optionalFeatures: [

                'local-floor',

                'bounded-floor'

            ]

        }

    );


    button.id = 'enter-vr-button';


    vrButtonContainer.appendChild(button);


    setStatus(

        'WebXR disponible. Utiliza Meta Quest Browser para entrar en VR.'

    );


    // =================================
    // SESIÓN INICIADA
    // =================================

    renderer.xr.addEventListener(

        'sessionstart',

        () => {

            console.log(

                '[MAIN] Sesión inmersiva iniciada.'

            );


            audio.initialize();


            if (game.getStats().started) {

                game.resume();

            } else {

                game.start();

            }


            controls.enabled = false;

            hud.setVisible(true);


            setStatus(

                'Experiencia VR activa. Seguimiento de manos habilitado.'

            );

        }

    );


    // =================================
    // SESIÓN FINALIZADA
    // =================================

    renderer.xr.addEventListener(

        'sessionend',

        () => {

            console.log(

                '[MAIN] Sesión inmersiva finalizada.'

            );


            interaction.releaseAll();

            game.pause();


            controls.enabled = true;

            hud.setVisible(true);


            setStatus(

                'Sesión VR finalizada. El laboratorio continúa disponible en modo escritorio.'

            );

        }

    );

}


// =============================================
// REINICIAR APLICACIÓN
// =============================================

function resetApplication() {

    if (!game || !interaction) {

        return;

    }


    console.log('[MAIN] Reiniciando laboratorio...');


    interaction.releaseAll();

    game.reset();


    // Actualizar sincronización.
    physics.syncAll(laboratory.objects);


    hud.updateStats(

        game.getStats()

    );


    console.log('[MAIN] Reinicio completado.');

}


// =============================================
// SALIR DE VR
// =============================================

async function exitVR() {

    if (!renderer || !renderer.xr) {

        return;

    }


    try {

        const session = renderer.xr.getSession();


        if (session) {

            await session.end();

            console.log('[MAIN] Salida de VR solicitada.');

        }

    } catch (error) {

        console.error(

            '[MAIN] Error al salir de VR:',

            error

        );

    }

}


// =============================================
// COMPATIBILIDAD WEBXR
// =============================================

async function checkXRCompatibility() {

    if (!navigator.xr) {

        setStatus(

            'Este navegador no ofrece WebXR. Modo escritorio disponible.'

        );

        return false;

    }


    try {

        const supported = await navigator.xr.isSessionSupported(

            'immersive-vr'

        );


        if (supported) {

            setStatus(

                'Dispositivo compatible con realidad virtual.'

            );

        } else {

            setStatus(

                'No se detectó soporte VR en este dispositivo. Puedes explorar el modo escritorio.'

            );

        }


        return supported;

    } catch (error) {

        console.warn(

            '[MAIN] No fue posible comprobar WebXR:',

            error

        );


        return false;

    }

}


// =============================================
// INICIAR PRÁCTICA EN ESCRITORIO
// =============================================

function setupDesktopStart() {

    renderer.domElement.addEventListener(

        'pointerdown',

        () => {

            if (!renderer.xr.isPresenting) {

                audio.initialize();

                if (!game.getStats().started) {

                    game.start();

                }

            }

        }

    );

}


// =============================================
// AJUSTAR TAMAÑO
// =============================================

function handleResize() {

    if (!camera || !renderer) {

        return;

    }


    const width = container.clientWidth;

    const height = container.clientHeight;


    camera.aspect = width / height;

    camera.updateProjectionMatrix();


    renderer.setSize(

        width,

        height

    );


    renderer.setPixelRatio(

        Math.min(

            window.devicePixelRatio,

            APP_CONFIG.maxPixelRatio

        )

    );

}


// =============================================
// CICLO PRINCIPAL
// =============================================

function animate() {

    if (disposed) {

        return;

    }


    const deltaTime = Math.min(

        clock.getDelta(),

        0.05

    );


    // =================================
    // INTERACCIÓN DE MANOS
    // =================================

    interaction.update(deltaTime);


    // =================================
    // MOTOR FÍSICO
    // =================================

    physics.step(deltaTime);


    // =================================
    // SINCRONIZAR MALLAS
    // =================================

    physics.syncAll(

        laboratory.objects

    );


    // =================================
    // SISTEMA DE JUEGO
    // =================================

    game.update(deltaTime);


    // =================================
    // ACTUALIZAR HUD
    // =================================

    hud.update(

        deltaTime,

        xr

    );


    // =================================
    // EFECTOS
    // =================================

    effects.update(deltaTime);


    // =================================
    // CONTROLES DE ESCRITORIO
    // =================================

    if (!renderer.xr.isPresenting) {

        controls.update();

    }


    // =================================
    // RENDERIZAR
    // =================================

    renderer.render(

        scene,

        camera

    );

}


// =============================================
// LIBERAR RECURSOS
// =============================================

function cleanup() {

    if (disposed) {

        return;

    }


    disposed = true;


    console.log('[MAIN] Liberando recursos...');


    renderer.setAnimationLoop(null);


    interaction?.dispose();

    xr?.dispose();

    game?.dispose();

    hud?.dispose();

    tableCounters?.dispose();

    effects?.dispose();

    audio?.dispose();

    physics?.dispose();


    controls?.dispose();


    renderer?.dispose();


    if (renderer?.domElement.parentElement) {

        renderer.domElement.remove();

    }


    window.removeEventListener(

        'resize',

        handleResize

    );


    console.log('[MAIN] Aplicación finalizada.');

}


// =============================================
// INICIALIZAR APLICACIÓN
// =============================================

async function initializeApplication() {

    try {

        console.log(

            '===================================='

        );

        console.log(

            'PRACTICA 3.2 - INTERACCION VIRTUAL'

        );

        console.log(

            'INICIALIZANDO LABORATORIO'

        );

        console.log(

            '===================================='

        );


        // 1. Escena.
        initializeScene();


        // 2. Física.
        initializePhysics();


        // 3. Laboratorio.
        initializeLaboratory();


        // 4. Seguimiento de manos.
        initializeXR();


        // 5. Audio.
        initializeAudio();


        // 6. Efectos.
        initializeEffects();


        // 7. HUD.
        initializeHUD();


        // 8. Interacción.
        initializeInteraction();


        // 9. Juego.
        initializeGame();


        // 10. Botón VR.
        initializeVRButton();


        // 11. Inicio de escritorio.
        setupDesktopStart();


        // 12. Eventos de ventana.
        window.addEventListener(

            'resize',

            handleResize

        );


        window.addEventListener(

            'beforeunload',

            cleanup

        );


        // 13. Compatibilidad.
        await checkXRCompatibility();


        // 14. Ocultar pantalla de carga.
        if (loadingScreen) {

            loadingScreen.classList.add('hidden');

        }


        // 15. Activar animación.
        renderer.setAnimationLoop(animate);


        initialized = true;


        console.log(

            '===================================='

        );

        console.log(

            'INTEGRACION DEL LABORATORIO VERIFICADA'

        );

        console.log(

            'Objetos:', laboratory.objects.length

        );

        console.log(

            'Recipientes:', laboratory.containers.length

        );

        console.log(

            'Mesas:', laboratory.tables.length

        );

        console.log(

            'Cuerpos físicos:', physics.getStats().bodies

        );

        console.log(

            '===================================='

        );


    } catch (error) {

        console.error(

            '[MAIN] Error al inicializar:',

            error

        );


        showError(

            error.message || 'Error al iniciar el laboratorio.'

        );


        if (loadingScreen) {

            loadingScreen.classList.add('hidden');

        }

    }

}


// =============================================
// ARRANQUE
// =============================================

initializeApplication();
