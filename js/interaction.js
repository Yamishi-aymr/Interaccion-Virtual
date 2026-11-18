
/* =====================================================
   PRACTICA 3.2 - INTERACCION VIRTUAL
   MODULO: INTERACTION.JS

   Interacción física mediante seguimiento de manos.

   Funciones:
   - Selección de objetos.
   - Detección de proximidad.
   - Raycasting de apoyo.
   - Agarre mediante pinza.
   - Movimiento de objetos.
   - Liberación física.
   - Control de agarres simultáneos.
===================================================== */

import * as THREE from 'three';


// =============================================
// CONFIGURACIÓN
// =============================================

const INTERACTION_CONFIG = {

    // Distancia máxima para seleccionar una figura.
    grabDistance: 0.48,

    // Distancia para considerar que una figura
    // está siendo manipulada.
    selectionDistance: 0.55,

    // Velocidad máxima al soltar un objeto.
    maxReleaseSpeed: 3.5,

    // Masa original de cada categoría.
    masses: {

        sphere: 0.75,

        cube: 0.95,

        pyramid: 0.85,

        octahedron: 0.85

    }

};


// =============================================
// CREAR SISTEMA DE INTERACCIÓN
// =============================================

export function createInteractionSystem({

    xr,

    physics,

    objects,

    camera = null

}) {

    console.log(

        '[INTERACTION] Inicializando interacción...'

    );


    if (!xr || !physics || !objects) {

        throw new Error(

            '[INTERACTION] Faltan dependencias obligatorias.'

        );

    }


    // =================================
    // ESTADO GENERAL
    // =================================

    const raycaster = new THREE.Raycaster();

    const direction = new THREE.Vector3();

    const temporaryPosition = new THREE.Vector3();


    const grabbedObjects = new Map();

    const selectedObjects = new Map();


    let disposed = false;


    // =================================
    // VALIDAR OBJETO
    // =================================

    function isGrabbable(object) {

        if (!object) {
            return false;
        }


        if (!object.mesh || !object.body) {
            return false;
        }


        if (object.isClassified) {
            return false;
        }


        if (object.isGrabbed) {
            return false;
        }


        if (object.isBeingProcessed) {
            return false;
        }


        return true;

    }


    // =================================
    // OBTENER POSICIÓN MUNDIAL
    // =================================

    function getObjectPosition(object) {

        object.mesh.getWorldPosition(

            temporaryPosition

        );


        return temporaryPosition.clone();

    }


    // =================================
    // DISTANCIA ENTRE MANO Y OBJETO
    // =================================

    function getDistanceToObject(handPosition, object) {

        const objectPosition = getObjectPosition(object);


        return handPosition.distanceTo(

            objectPosition

        );

    }


    // =================================
    // BUSCAR OBJETO CERCANO
    // =================================

    function findNearestObject(handPosition, handState) {

        let nearestObject = null;

        let nearestDistance =

            INTERACTION_CONFIG.grabDistance;


        for (const object of objects) {

            if (!isGrabbable(object)) {
                continue;
            }


            const distance = getDistanceToObject(

                handPosition,

                object

            );


            if (distance < nearestDistance) {

                nearestDistance = distance;

                nearestObject = object;

            }

        }


        return {

            object: nearestObject,

            distance: nearestDistance

        };

    }


    // =================================
    // RAYCASTING DE APOYO
    // =================================

    /**
     * Proyecta un rayo desde la muñeca hacia
     * el dedo índice.
     *
     * Sirve como apoyo para seleccionar una
     * figura cuando la trayectoria la atraviesa.
     */
    function raycastHandObjects(handState) {

        if (!handState || !handState.tracked) {

            return null;

        }


        const origin = handState.wristPosition;

        const target = handState.indexPosition;


        direction.subVectors(

            target,

            origin

        );


        if (direction.lengthSq() < 0.0001) {

            return null;

        }


        direction.normalize();


        raycaster.set(

            origin,

            direction

        );


        raycaster.far = 1.2;


        const meshes = objects

            .filter(isGrabbable)

            .map(object => object.mesh);


        const intersections = raycaster.intersectObjects(

            meshes,

            true

        );


        if (intersections.length === 0) {

            return null;

        }


        const hit = intersections[0];


        // Encontrar el objeto propietario de la malla.
        let current = hit.object;


        while (current && !current.userData.objectData) {

            current = current.parent;

        }


        return current?.userData.objectData || null;

    }


    // =================================
    // SELECCIONAR FIGURA
    // =================================

    function selectObject(handState) {

        if (!handState || !handState.tracked) {

            return null;

        }


        const handId = handState.handedness;


        // Evitar que una mano tenga varios objetos.
        if (grabbedObjects.has(handId)) {

            return grabbedObjects.get(handId).object;

        }


        // Buscar primero mediante proximidad.
        const nearest = findNearestObject(

            handState.centerPosition,

            handState

        );


        // Si no hay figura cercana, probar raycasting.
        let object = nearest.object;


        if (!object) {

            object = raycastHandObjects(handState);

        }


        if (!object || !isGrabbable(object)) {

            return null;

        }


        const distance = getDistanceToObject(

            handState.centerPosition,

            object

        );


        // El raycasting no debe permitir seleccionar
        // figuras que estén demasiado lejos.
        if (

            distance > INTERACTION_CONFIG.selectionDistance

        ) {

            return null;

        }


        selectedObjects.set(

            handId,

            object

        );


        object.mesh.userData.selected = true;


        console.log(

            `[INTERACTION] Seleccionado: ${object.categoryName}`

        );


        return object;

    }


    // =================================
    // INICIAR AGARRE
    // =============================================

    function grabObject(handState) {

        if (!handState || !handState.tracked) {

            return false;

        }


        const handId = handState.handedness;


        // Una mano no puede recoger dos objetos.
        if (grabbedObjects.has(handId)) {

            return false;

        }


        // Evitar que dos manos sujeten el mismo objeto.
        const object = selectObject(handState);


        if (!object) {

            console.log(

                '[INTERACTION] No se encontró una figura cercana.'

            );

            return false;

        }


        const alreadyGrabbed = [...grabbedObjects.values()]

            .some(entry => entry.object === object);


        if (alreadyGrabbed) {

            return false;

        }


        // Guardar posición relativa entre la mano
        // y el centro de la figura.
        const offset = new THREE.Vector3(

            object.body.position.x,

            object.body.position.y,

            object.body.position.z

        ).sub(handState.centerPosition);


        // Cambiar el cuerpo a cinemático.
        physics.setKinematic(object.body);


        object.isGrabbed = true;

        object.mesh.userData.grabbed = true;


        const grabData = {

            object,

            handId,

            offset,

            lastHandPosition: handState.centerPosition.clone(),

            previousHandPosition: handState.centerPosition.clone(),

            lastUpdateTime: performance.now(),

            velocity: new THREE.Vector3(),

            originalMass:

                INTERACTION_CONFIG.masses[object.category] || 1

        };


        grabbedObjects.set(

            handId,

            grabData

        );


        selectedObjects.delete(handId);


        console.log(

            `[INTERACTION] Objeto sujetado: ${object.categoryName}`

        );


        return true;

    }


    // =================================
    // ACTUALIZAR MOVIMIENTO
    // =================================

    function updateGrabbedObject(handState, deltaTime) {

        const handId = handState.handedness;


        const grabData = grabbedObjects.get(handId);


        if (!grabData) {

            return;

        }


        const object = grabData.object;


        if (!object || !object.body) {

            releaseObject(handId);

            return;

        }


        // Posición deseada del objeto.
        const targetPosition =

            handState.centerPosition.clone().add(

                grabData.offset

            );


        // Mover el cuerpo cinemático.
        physics.moveKinematicBody(

            object.body,

            targetPosition,

            deltaTime

        );


        // Calcular velocidad aproximada de la mano.
        const safeDelta = Math.max(

            deltaTime,

            1 / 120

        );


        grabData.velocity.subVectors(

            handState.centerPosition,

            grabData.previousHandPosition

        ).divideScalar(safeDelta);


        grabData.velocity.clampLength(

            0,

            INTERACTION_CONFIG.maxReleaseSpeed

        );


        grabData.previousHandPosition.copy(

            handState.centerPosition

        );


        grabData.lastHandPosition.copy(

            handState.centerPosition

        );


        grabData.lastUpdateTime = performance.now();

    }


    // =================================
    // LIBERAR FIGURA
    // =================================

    function releaseObject(handId, options = {}) {

        const grabData = grabbedObjects.get(handId);


        if (!grabData) {

            return false;

        }


        const object = grabData.object;


        // Recuperar comportamiento dinámico.
        physics.setDynamic(

            object.body,

            grabData.originalMass

        );


        // Aplicar velocidad de lanzamiento suave.
        if (!options.stopVelocity) {

            object.body.velocity.set(

                grabData.velocity.x,

                grabData.velocity.y,

                grabData.velocity.z

            );

        }


        object.isGrabbed = false;

        object.mesh.userData.grabbed = false;

        object.mesh.userData.selected = false;


        // Limpiar estado.
        grabbedObjects.delete(handId);

        selectedObjects.delete(handId);


        console.log(

            `[INTERACTION] Objeto liberado: ${object.categoryName}`

        );


        return true;

    }


    // =================================
    // PROCESAR EVENTOS XR
    // =================================

    function processXREvents(events, handStates) {

        if (!events || events.length === 0) {

            return;

        }


        events.forEach(event => {

            const handState = handStates.find(

                hand => hand.handedness === event.hand

            ) || xr.getHand(event.hand);


            if (event.type === 'pinchstart') {

                if (handState && handState.tracked) {

                    grabObject(handState);

                }

            }


            if (event.type === 'pinchend') {

                releaseObject(event.hand);

            }

        });

    }


    // =================================
    // ACTUALIZAR SISTEMA
    // =================================

    function update(deltaTime = 1 / 60) {

        if (disposed) {

            return;

        }


        // Obtener estado actualizado de XR.
        const xrData = xr.update();


        const handStates = xrData.hands;


        // Procesar inicio y fin de pinza.
        processXREvents(

            xrData.events,

            handStates

        );


        // Mover objetos que continúan sujetados.
        handStates.forEach(handState => {

            if (!handState.pinching) {

                return;

            }


            updateGrabbedObject(

                handState,

                deltaTime

            );

        });


        // Liberar agarres si se pierde el seguimiento.
        for (const [handId] of grabbedObjects) {

            const trackedHand = handStates.find(

                hand => hand.handedness === handId

            );


            if (!trackedHand || !trackedHand.tracked) {

                releaseObject(handId);

            }

        }

    }


    // =================================
    // LIBERAR TODOS LOS OBJETOS
    // =================================

    function releaseAll() {

        const handIds = [...grabbedObjects.keys()];


        handIds.forEach(handId => {

            releaseObject(handId);

        });


        selectedObjects.clear();

    }


    // =================================
    // CONSULTAR OBJETOS SUJETADOS
    // =================================

    function getGrabbedObjects() {

        return [...grabbedObjects.values()].map(

            entry => entry.object

        );

    }


    // =================================
    // CONSULTAR ESTADO DE INTERACCIÓN
    // =================================

    function getStatus() {

        return {

            totalGrabbed: grabbedObjects.size,

            totalSelected: selectedObjects.size,

            grabbedObjects: getGrabbedObjects().map(

                object => ({

                    id: object.id,

                    category: object.category,

                    categoryName: object.categoryName

                })

            )

        };

    }


    // =================================
    // DESTRUIR SISTEMA
    // =================================

    function dispose() {

        if (disposed) {

            return;

        }


        releaseAll();

        disposed = true;


        console.log(

            '[INTERACTION] Sistema liberado.'

        );

    }


    // =================================
    // API PÚBLICA
    // =================================

    console.log(

        '[INTERACTION] Sistema preparado correctamente.'

    );


    return {

        update,

        grabObject,

        releaseObject,

        releaseAll,

        selectObject,

        getGrabbedObjects,

        getStatus,

        dispose

    };

}
