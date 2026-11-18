
/* =====================================================
   PRACTICA 3.2 - INTERACCION VIRTUAL
   MODULO: XR.JS

   Seguimiento de manos mediante WebXR.
   Compatible con Meta Quest 3.

   Funciones:
   - Detección de ambas manos.
   - Seguimiento de articulaciones.
   - Gesto de pinza.
   - Posición tridimensional.
   - Detección de pérdida de seguimiento.
===================================================== */

import * as THREE from 'three';

import {
    XRHandModelFactory
} from 'three/addons/webxr/XRHandModelFactory.js';


// =============================================
// CONFIGURACIÓN
// =============================================

const XR_CONFIG = {

    // Distancia máxima para iniciar una pinza.
    pinchStartDistance: 0.025,

    // Distancia para liberar una pinza.
    // Se utiliza un umbral diferente para evitar
    // cambios repetitivos entre estados.
    pinchReleaseDistance: 0.045,

    // Tiempo máximo sin seguimiento.
    trackingTimeout: 0.5,

    // Modelo visual de las manos.
    handModelType: 'spheres'

};


// =============================================
// NOMBRES DE ARTICULACIONES
// =============================================

const JOINTS = {

    THUMB_TIP: 'thumb-tip',

    INDEX_TIP: 'index-finger-tip',

    WRIST: 'wrist',

    THUMB_METACARPAL: 'thumb-metacarpal',

    INDEX_PROXIMAL: 'index-finger-phalanx-proximal'

};


// =============================================
// CREAR SISTEMA DE SEGUIMIENTO
// =============================================

export function createXRSystem(renderer, scene) {

    console.log('[XR] Inicializando seguimiento de manos...');


    // =================================
    // VALIDAR DEPENDENCIAS
    // =================================

    if (!renderer || !renderer.xr) {

        throw new Error(
            '[XR] Se necesita un WebGLRenderer con XR habilitado.'
        );

    }


    // =================================
    // FABRICAR MODELOS DE MANOS
    // =================================

    const handFactory = new XRHandModelFactory();


    // =================================
    // ESTADO GENERAL
    // =================================

    let sessionActive = false;

    let disposed = false;


    // =================================
    // CREAR ESTADOS INDIVIDUALES
    // =================================

    function createHandState(index) {

        const hand = renderer.xr.getHand(index);

        const model = handFactory.createHandModel(

            hand,

            XR_CONFIG.handModelType

        );


        hand.add(model);

        hand.visible = false;

        hand.name = `XR-Hand-${index}`;


        const state = {

            index,

            hand,

            model,

            handedness: null,

            connected: false,

            tracked: false,

            pinching: false,

            pinchDistance: Infinity,

            lastTrackingTime: 0,

            pinchStartPosition: new THREE.Vector3(),

            thumbPosition: new THREE.Vector3(),

            indexPosition: new THREE.Vector3(),

            wristPosition: new THREE.Vector3(),

            centerPosition: new THREE.Vector3(),

            previousPinching: false,

            listeners: {}

        };


        return state;

    }


    // =================================
    // REGISTRAR AMBAS MANOS
    // =================================

    const hands = [

        createHandState(0),

        createHandState(1)

    ];


    hands.forEach(state => {

        scene.add(state.hand);

    });


    // =================================
    // OBTENER ARTICULACIÓN
    // =================================

    function getJoint(hand, jointName) {

        if (!hand || !hand.joints) {

            return null;

        }


        const joint = hand.joints[jointName];


        if (!joint || !joint.visible) {

            return null;

        }


        return joint;

    }


    // =================================
    // ACTUALIZAR POSICIONES
    // =================================

    function updateJointPositions(state) {

        const thumb = getJoint(

            state.hand,

            JOINTS.THUMB_TIP

        );


        const index = getJoint(

            state.hand,

            JOINTS.INDEX_TIP

        );


        const wrist = getJoint(

            state.hand,

            JOINTS.WRIST

        );


        // Se necesitan ambos dedos para detectar
        // correctamente una pinza.
        if (!thumb || !index) {

            state.tracked = false;

            return false;

        }


        // Obtener coordenadas mundiales.
        thumb.getWorldPosition(

            state.thumbPosition

        );


        index.getWorldPosition(

            state.indexPosition

        );


        if (wrist) {

            wrist.getWorldPosition(

                state.wristPosition

            );

        }


        // Distancia entre pulgar e índice.
        state.pinchDistance =

            state.thumbPosition.distanceTo(

                state.indexPosition

            );


        // Centro de la pinza.
        state.centerPosition.addVectors(

            state.thumbPosition,

            state.indexPosition

        ).multiplyScalar(0.5);


        state.tracked = true;

        state.lastTrackingTime = performance.now();


        return true;

    }


    // =================================
    // DETECTAR GESTO DE PINZA
    // =================================

    function updatePinch(state) {

        if (!state.tracked) {

            if (state.pinching) {

                state.pinching = false;

                return {

                    type: 'pinchend',

                    hand: state.handedness,

                    handIndex: state.index

                };

            }

            return null;

        }


        const distance = state.pinchDistance;


        // Iniciar pinza.
        if (

            !state.pinching &&

            distance <= XR_CONFIG.pinchStartDistance

        ) {

            state.pinching = true;

            state.pinchStartPosition.copy(

                state.centerPosition

            );


            return {

                type: 'pinchstart',

                hand: state.handedness,

                handIndex: state.index,

                position: state.centerPosition.clone(),

                distance

            };

        }


        // Liberar pinza.
        if (

            state.pinching &&

            distance >= XR_CONFIG.pinchReleaseDistance

        ) {

            state.pinching = false;


            return {

                type: 'pinchend',

                hand: state.handedness,

                handIndex: state.index,

                position: state.centerPosition.clone(),

                distance

            };

        }


        return null;

    }


    // =================================
    // CONEXIÓN DE MANOS
    // =================================

    function handleConnected(state, event) {

        const data = event.data || {};


        state.connected = true;

        state.handedness = data.handedness || null;

        state.tracked = false;

        state.pinching = false;


        state.hand.visible = true;


        console.log(

            `[XR] Mano conectada: ${state.handedness || state.index}`

        );

    }


    // =================================
    // DESCONEXIÓN DE MANOS
    // =================================

    function handleDisconnected(state) {

        const wasPinching = state.pinching;


        state.connected = false;

        state.tracked = false;

        state.pinching = false;

        state.pinchDistance = Infinity;

        state.handedness = null;


        state.hand.visible = false;


        if (wasPinching) {

            console.log(

                '[XR] Pinza cancelada por desconexión.'

            );

        }


        console.log(

            `[XR] Mano desconectada: ${state.index}`

        );

    }


    // =================================
    // REGISTRAR EVENTOS DE CADA MANO
    // =================================

    hands.forEach(state => {

        state.listeners.connected = event => {

            handleConnected(state, event);

        };


        state.listeners.disconnected = () => {

            handleDisconnected(state);

        };


        state.hand.addEventListener(

            'connected',

            state.listeners.connected

        );


        state.hand.addEventListener(

            'disconnected',

            state.listeners.disconnected

        );

    });


    // =================================
    // INICIO DE SESIÓN VR
    // =================================

    function handleSessionStart() {

        sessionActive = true;

        console.log(

            '[XR] Sesión VR iniciada.'

        );

    }


    // =================================
    // FINALIZAR SESIÓN VR
    // =================================

    function handleSessionEnd() {

        sessionActive = false;


        hands.forEach(state => {

            handleDisconnected(state);

        });


        console.log(

            '[XR] Sesión VR finalizada.'

        );

    }


    renderer.xr.addEventListener(

        'sessionstart',

        handleSessionStart

    );


    renderer.xr.addEventListener(

        'sessionend',

        handleSessionEnd

    );


    // =================================
    // ACTUALIZAR SISTEMA COMPLETO
    // =================================

    function update() {

        if (disposed || !sessionActive) {

            return {

                hands: [],

                events: []

            };

        }


        const events = [];

        const currentHands = [];


        hands.forEach(state => {

            if (!state.connected) {

                return;

            }


            // Actualizar articulaciones.
            const valid = updateJointPositions(state);


            if (!valid) {

                const event = updatePinch(state);

                if (event) {

                    events.push(event);

                }

                return;

            }


            // Actualizar gesto de pinza.
            const pinchEvent = updatePinch(state);


            if (pinchEvent) {

                events.push(pinchEvent);

            }


            currentHands.push({

                index: state.index,

                handedness: state.handedness,

                tracked: state.tracked,

                pinching: state.pinching,

                pinchDistance: state.pinchDistance,

                position: state.centerPosition.clone(),

                thumbPosition: state.thumbPosition.clone(),

                indexPosition: state.indexPosition.clone(),

                wristPosition: state.wristPosition.clone(),

                hand: state.hand

            });

        });


        return {

            hands: currentHands,

            events

        };

    }


    // =================================
    // CONSULTAR ESTADO DE MANOS
    // =================================

    function getHand(handedness) {

        return hands.find(

            state => state.handedness === handedness

        ) || null;

    }


    function isPinching(handedness) {

        const state = getHand(handedness);

        return Boolean(

            state &&

            state.tracked &&

            state.pinching

        );

    }


    function getHandPosition(handedness) {

        const state = getHand(handedness);


        if (!state || !state.tracked) {

            return null;

        }


        return state.centerPosition.clone();

    }


    // =================================
    // CONSULTAR ESTADO GENERAL
    // =================================

    function getStatus() {

        return {

            sessionActive,

            leftHand: hands.some(

                state =>

                    state.handedness === 'left' &&

                    state.tracked

            ),

            rightHand: hands.some(

                state =>

                    state.handedness === 'right' &&

                    state.tracked

            ),

            totalConnected: hands.filter(

                state => state.connected

            ).length,

            totalTracked: hands.filter(

                state => state.tracked

            ).length,

            totalPinching: hands.filter(

                state => state.pinching

            ).length

        };

    }


    // =================================
    // LIBERAR RECURSOS
    // =================================

    function dispose() {

        if (disposed) {

            return;

        }


        disposed = true;


        renderer.xr.removeEventListener(

            'sessionstart',

            handleSessionStart

        );


        renderer.xr.removeEventListener(

            'sessionend',

            handleSessionEnd

        );


        hands.forEach(state => {

            state.hand.removeEventListener(

                'connected',

                state.listeners.connected

            );


            state.hand.removeEventListener(

                'disconnected',

                state.listeners.disconnected

            );


            scene.remove(state.hand);

        });


        console.log(

            '[XR] Sistema de seguimiento liberado.'

        );

    }


    // =================================
    // API PÚBLICA
    // =================================

    console.log(

        '[XR] Sistema de manos preparado correctamente.'

    );


    return {

        hands,

        update,

        getHand,

        getHandPosition,

        isPinching,

        getStatus,

        dispose

    };

}
