
/* =====================================================
   PRACTICA 3.2 - INTERACCION VIRTUAL
   MODULO: UTILS.JS
   Funciones auxiliares generales
===================================================== */

import * as THREE from 'three';


// =============================================
// GENERAR NÚMEROS ALEATORIOS
// =============================================

/**
 * Genera un número aleatorio entre mínimo y máximo.
 */
export function randomRange(min, max) {

    return Math.random() * (max - min) + min;

}


/**
 * Genera un número entero aleatorio.
 */
export function randomInt(min, max) {

    return Math.floor(
        randomRange(min, max + 1)
    );

}


// =============================================
// MEZCLAR ELEMENTOS DE UN ARRAY
// =============================================

/**
 * Devuelve una copia aleatoriamente mezclada.
 * No modifica el arreglo original.
 */
export function shuffleArray(array) {

    const result = [...array];

    for (let i = result.length - 1; i > 0; i--) {

        const j = randomInt(0, i);

        [result[i], result[j]] = [
            result[j],
            result[i]
        ];

    }

    return result;

}


// =============================================
// IDENTIFICADORES ÚNICOS
// =============================================

/**
 * Genera un identificador único para objetos.
 */
export function generateId(prefix = 'object') {

    return `${prefix}-${crypto.randomUUID()}`;

}


// =============================================
// DISTANCIA ENTRE OBJETOS
// =============================================

/**
 * Calcula la distancia entre dos vectores.
 */
export function distanceBetween(a, b) {

    return a.distanceTo(b);

}


/**
 * Comprueba si dos objetos están suficientemente cerca.
 */
export function isWithinDistance(a, b, threshold) {

    return distanceBetween(a, b) <= threshold;

}


// =============================================
// POSICIONES ALEATORIAS
// =============================================

/**
 * Genera una posición aleatoria dentro de un área.
 */
export function randomPosition({

    minX = -1,

    maxX = 1,

    minY = 0.5,

    maxY = 2,

    minZ = -1,

    maxZ = 1

} = {}) {

    return new THREE.Vector3(

        randomRange(minX, maxX),

        randomRange(minY, maxY),

        randomRange(minZ, maxZ)

    );

}


// =============================================
// LIMITAR VALORES
// =============================================

/**
 * Mantiene un número dentro de un rango.
 */
export function clamp(value, min, max) {

    return Math.max(
        min,
        Math.min(max, value)
    );

}


// =============================================
// INTERPOLACIÓN
// =============================================

/**
 * Interpolación lineal entre dos valores.
 */
export function lerp(start, end, alpha) {

    return start + (end - start) * alpha;

}


// =============================================
// FORMATO DE TIEMPO
// =============================================

/**
 * Convierte segundos a formato MM:SS.
 */
export function formatTime(totalSeconds) {

    const safeSeconds = Math.max(
        0,
        Math.floor(totalSeconds)
    );

    const minutes = Math.floor(
        safeSeconds / 60
    );

    const seconds = safeSeconds % 60;

    return [

        String(minutes).padStart(2, '0'),

        String(seconds).padStart(2, '0')

    ].join(':');

}


// =============================================
// VALIDACIONES
// =============================================

/**
 * Comprueba que un vector tenga valores válidos.
 */
export function isValidVector3(vector) {

    return Boolean(

        vector &&

        Number.isFinite(vector.x) &&

        Number.isFinite(vector.y) &&

        Number.isFinite(vector.z)

    );

}


/**
 * Comprueba que un valor sea numérico y finito.
 */
export function isValidNumber(value) {

    return Number.isFinite(value);

}


// =============================================
// LIMPIEZA DE OBJETOS THREE.JS
// =============================================

/**
 * Libera geometrías, materiales y texturas.
 *
 * Importante:
 * No debe utilizarse sobre recursos compartidos
 * que todavía estén siendo utilizados por otros objetos.
 */
export function disposeObject3D(object) {

    if (!object) {
        return;
    }


    object.traverse(child => {

        if (child.geometry) {

            child.geometry.dispose();

        }


        if (child.material) {

            const materials = Array.isArray(child.material)

                ? child.material

                : [child.material];


            materials.forEach(material => {

                if (!material) {
                    return;
                }


                // Liberar texturas propias del material.
                Object.values(material).forEach(value => {

                    if (value && value.isTexture) {

                        value.dispose();

                    }

                });


                material.dispose();

            });

        }

    });

}


// =============================================
// CENTRO DE UN GRUPO 3D
// =============================================

/**
 * Actualiza y obtiene el centro de un objeto 3D.
 */
export function getObjectCenter(object) {

    const box = new THREE.Box3();

    box.setFromObject(object);

    return box.getCenter(
        new THREE.Vector3()
    );

}


// =============================================
// PAUSA
// =============================================

/**
 * Espera una cantidad de milisegundos.
 */
export function delay(milliseconds) {

    return new Promise(resolve => {

        setTimeout(resolve, milliseconds);

    });

}


// =============================================
// DEPURACIÓN
// =============================================

/**
 * Registra información del laboratorio.
 */
export function debugLog(module, message, data = null) {

    console.log(

        `[${module}] ${message}`,

        data ?? ''

    );

}


// =============================================
// CONFIGURACIÓN GENERAL
// =============================================

export const GAME_CONFIG = {

    TOTAL_OBJECTS: 20,

    TOTAL_CATEGORIES: 4,

    OBJECTS_PER_CATEGORY: 5,

    TOTAL_CONTAINERS: 4,

    TARGET_FPS: 72,

    PHYSICS_FPS: 60,

    MAX_DELTA_TIME: 0.05,

    GRAVITY: -9.82

};


// =============================================
// CATEGORÍAS DEL LABORATORIO
// =============================================

export const CATEGORIES = {

    SPHERE: {

        id: 'sphere',

        name: 'Esferas',

        color: 0x28A9FF,

        hexColor: '#28A9FF',

        count: 5

    },


    CUBE: {

        id: 'cube',

        name: 'Cubos',

        color: 0xFF5577,

        hexColor: '#FF5577',

        count: 5

    },


    PYRAMID: {

        id: 'pyramid',

        name: 'Pirámides',

        color: 0xFFD166,

        hexColor: '#FFD166',

        count: 5

    },


    OCTAHEDRON: {

        id: 'octahedron',

        name: 'Octaedros',

        color: 0xA78BFA,

        hexColor: '#A78BFA',

        count: 5

    }

};


// =============================================
// POSICIONES DE LAS CUATRO MESAS
// =============================================

export const TABLE_POSITIONS = [

    new THREE.Vector3(-3, 0, -3),

    new THREE.Vector3(3, 0, -3),

    new THREE.Vector3(-3, 0, 3),

    new THREE.Vector3(3, 0, 3)

];


// =============================================
// POSICIONES DE LOS RECIPIENTES
// =============================================

export const CONTAINER_POSITIONS = [

    new THREE.Vector3(-2.5, 0, -5),

    new THREE.Vector3(2.5, 0, -5),

    new THREE.Vector3(-2.5, 0, 5),

    new THREE.Vector3(2.5, 0, 5)

];


console.log(
    '[UTILS] Módulo de utilidades cargado correctamente.'
);
