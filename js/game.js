
/* =====================================================
   PRACTICA 3.2 - INTERACCION VIRTUAL
   MODULO: GAME.JS

   Sistema de juego y clasificación.

   Funciones:
   - Validar recipientes.
   - Registrar aciertos y errores.
   - Controlar cronómetro.
   - Calcular precisión.
   - Gestionar progreso.
   - Recuperar objetos.
   - Reiniciar práctica.
===================================================== */


// =============================================
// CONFIGURACIÓN
// =============================================

const GAME_CONFIG = {

    totalObjects: 32,

    stableVelocity: 0.18,

    stableTime: 0.8,

    containerMargin: 0.12,

    minimumContainerHeight: 0.08,

    maximumContainerHeight: 1.15,

    fallLimit: -2,

    boundaryLimit: 9,

    resetHeight: 1.2,

    objectMasses: {

        sphere: 0.75,

        cube: 0.95,

        pyramid: 0.85,

        octahedron: 0.85

    }

};


// =============================================
// CREAR SISTEMA DE JUEGO
// =============================================

export function createGameSystem({

    objects,

    containers,

    physics,

    onUpdate = null,

    onComplete = null

}) {

    console.log('[GAME] Inicializando sistema de juego...');


    if (!objects || !containers || !physics) {

        throw new Error(
            '[GAME] Faltan dependencias obligatorias.'
        );

    }


    // =================================
    // ESTADO GENERAL
    // =================================

    let started = false;

    let paused = false;

    let completed = false;

    let elapsedTime = 0;

    let correctCount = 0;

    let errorCount = 0;

    let disposed = false;


    // =================================
    // ESTADO INDIVIDUAL DE FIGURAS
    // =================================

    const objectStates = new Map();


    objects.forEach(object => {

        objectStates.set(object.id, {

            wasGrabbed: false,

            stableTime: 0,

            attemptResolved: false,

            lastContainer: null,

            attempts: 0,

            correct: false

        });

    });


    // =================================
    // ESTADÍSTICAS POR CATEGORÍA
    // =================================

    // Las cantidades se calculan desde los objetos reales.
    const categoryStats = {};

    objects.forEach(object => {

        if (!categoryStats[object.category]) {

            categoryStats[object.category] = {
                correct: 0,
                errors: 0,
                total: 0
            };

        }

        categoryStats[object.category].total++;

    });


    // =================================
    // UTILIDADES
    // =================================

    function clamp(value, min, max) {

        return Math.max(

            min,

            Math.min(max, value)

        );

    }


    function getObjectSpeed(object) {

        return object.body.velocity.length();

    }


    // =================================
    // IDENTIFICAR RECIPIENTE
    // =================================

    /**
     * Comprueba si el centro de una figura
     * se encuentra dentro de un recipiente.
     */

    function findContainer(object) {

        const position = object.body.position;


        for (const container of containers) {

            const bounds = container.physics.bounds;


            const insideX =

                position.x >= bounds.minX + GAME_CONFIG.containerMargin &&

                position.x <= bounds.maxX - GAME_CONFIG.containerMargin;


            const insideZ =

                position.z >= bounds.minZ + GAME_CONFIG.containerMargin &&

                position.z <= bounds.maxZ - GAME_CONFIG.containerMargin;


            const insideY =

                position.y >=

                bounds.minY + GAME_CONFIG.minimumContainerHeight &&

                position.y <=

                bounds.minY + GAME_CONFIG.maximumContainerHeight;


            if (insideX && insideZ && insideY) {

                return container;

            }

        }


        return null;

    }


    // =================================
    // VALIDAR CLASIFICACIÓN
    // =================================

    function validateClassification(object, container) {

        if (!object || !container) {

            return {

                valid: false,

                reason: 'outside-container'

            };

        }


        if (object.category === container.category) {

            return {

                valid: true,

                reason: 'correct-category'

            };

        }


        return {

            valid: false,

            reason: 'incorrect-category'

        };

    }


    // =================================
    // REGISTRAR ACIERTO
    // =================================

    function registerCorrect(object, container) {

        if (object.isClassified) {

            return false;

        }


        object.isClassified = true;

        object.isCorrect = true;

        object.isGrabbed = false;


        correctCount++;


        const stats = categoryStats[object.category];

        if (stats) {

            stats.correct++;

        }


        const state = objectStates.get(object.id);

        state.correct = true;

        state.attemptResolved = true;

        state.lastContainer = container.category;


        // Registrar figura en el recipiente.
        if (!container.objectsInside.includes(object.id)) {

            container.objectsInside.push(object.id);

        }


        // Mantener el objeto en reposo.
        object.body.velocity.set(0, 0, 0);

        object.body.angularVelocity.set(0, 0, 0);

        object.body.sleep();


        console.log(

            `[GAME] ACIERTO: ${object.categoryName} en ${container.categoryName}`

        );


        emitUpdate('correct', {

            object,

            container,

            correctCount,

            errorCount

        });


        checkCompletion();


        return true;

    }


    // =================================
    // REGISTRAR ERROR
    // =================================

    function registerError(object, container) {

        const state = objectStates.get(object.id);


        if (state.attemptResolved) {

            return false;

        }


        errorCount++;


        const stats = categoryStats[object.category];

        if (stats) {

            stats.errors++;

        }


        state.attemptResolved = true;

        state.lastContainer = container.category;

        state.stableTime = 0;


        console.warn(

            `[GAME] ERROR: ${object.categoryName} en ${container.categoryName}`

        );


        emitUpdate('error', {

            object,

            container,

            correctCount,

            errorCount

        });


        return true;

    }


    // =================================
    // RECUPERAR OBJETO
    // =================================

    function recoverObject(object) {

        if (!object || object.isGrabbed || object.isClassified) {

            return;

        }


        const body = object.body;


        // Recuperar su masa.
        physics.setDynamic(

            body,

            GAME_CONFIG.objectMasses[object.category] || 1

        );


        // Regresar a la posición inicial.
        body.position.set(

            object.initialPosition.x,

            object.initialPosition.y,

            object.initialPosition.z

        );


        // Restaurar rotación.
        body.quaternion.set(0, 0, 0, 1);


        // Eliminar velocidades.
        body.velocity.set(0, 0, 0);

        body.angularVelocity.set(0, 0, 0);


        body.force.set(0, 0, 0);

        body.torque.set(0, 0, 0);


        body.aabbNeedsUpdate = true;

        body.wakeUp();


        // Limpiar estado.
        const state = objectStates.get(object.id);

        state.stableTime = 0;

        state.attemptResolved = false;

        state.lastContainer = null;


        object.isGrabbed = false;


        console.log(

            `[GAME] Objeto recuperado: ${object.categoryName}`

        );

    }


    // =================================
    // DETECTAR OBJETOS FUERA DEL ÁREA
    // =================================

    function checkOutOfBounds(object) {

        const position = object.body.position;


        const outside =

            position.y < GAME_CONFIG.fallLimit ||

            Math.abs(position.x) > GAME_CONFIG.boundaryLimit ||

            Math.abs(position.z) > GAME_CONFIG.boundaryLimit;


        if (outside) {

            recoverObject(object);

            return true;

        }


        return false;

    }


    // =================================
    // PROCESAR CLASIFICACIÓN
    // =================================

    function processObject(object, deltaTime) {

        if (object.isClassified) {

            return;

        }


        const state = objectStates.get(object.id);


        // Detectar si el usuario está sujetando.
        if (object.isGrabbed) {

            if (!state.wasGrabbed) {

                state.attempts++;

                state.attemptResolved = false;

                state.stableTime = 0;

                state.lastContainer = null;

            }


            state.wasGrabbed = true;

            return;

        }


        // Detectar liberación.
        if (state.wasGrabbed) {

            state.wasGrabbed = false;

            state.stableTime = 0;

        }


        // No procesar mientras la figura todavía
        // está en movimiento.
        const speed = getObjectSpeed(object);


        if (speed > GAME_CONFIG.stableVelocity) {

            state.stableTime = 0;

            return;

        }


        // Comprobar recipiente.
        const container = findContainer(object);


        if (!container) {

            state.stableTime = 0;

            return;

        }


        // Esperar estabilización.
        state.stableTime += deltaTime;


        if (state.stableTime < GAME_CONFIG.stableTime) {

            return;

        }


        // Evitar repetir el mismo intento.
        if (state.attemptResolved) {

            return;

        }


        // Validar categoría.
        const result = validateClassification(

            object,

            container

        );


        if (result.valid) {

            registerCorrect(

                object,

                container

            );

        } else {

            registerError(

                object,

                container

            );

        }

    }


    // =================================
    // CRONÓMETRO
    // =================================

    function start() {

        if (completed || started) {

            return;

        }


        started = true;

        paused = false;


        console.log('[GAME] Práctica iniciada.');

        emitUpdate('start');

    }


    function pause() {

        if (!started || paused || completed) {

            return;

        }


        paused = true;

        console.log('[GAME] Práctica pausada.');

        emitUpdate('pause');

    }


    function resume() {

        if (!started || !paused || completed) {

            return;

        }


        paused = false;

        console.log('[GAME] Práctica reanudada.');

        emitUpdate('resume');

    }


    function updateTimer(deltaTime) {

        if (!started || paused || completed) {

            return;

        }


        elapsedTime += deltaTime;

    }


    // =================================
    // CALCULAR PRECISIÓN
    // =================================

    function getAccuracy() {

        const attempts = correctCount + errorCount;


        if (attempts === 0) {

            return 0;

        }


        return Math.round(

            (correctCount / attempts) * 100

        );

    }


    // =================================
    // FORMATO DEL CRONÓMETRO
    // =================================

    function getFormattedTime() {

        const totalSeconds = Math.floor(elapsedTime);


        const minutes = Math.floor(

            totalSeconds / 60

        );


        const seconds = totalSeconds % 60;


        return [

            String(minutes).padStart(2, '0'),

            String(seconds).padStart(2, '0')

        ].join(':');

    }


    // =================================
    // PROGRESO
    // =================================

    function getProgress() {

        return {

            correct: correctCount,

            total: objects.length,

            percentage: Math.round(

                (correctCount / objects.length) * 100

            )

        };

    }


    // =================================
    // COMPROBAR FINALIZACIÓN
    // =================================

    function checkCompletion() {

        if (

            completed ||

            correctCount < objects.length

        ) {

            return;

        }


        completed = true;

        paused = true;


        const results = getStats();


        console.log(

            '[GAME] ¡PRÁCTICA COMPLETADA!'

        );


        console.log(results);


        emitUpdate('complete', results);


        if (typeof onComplete === 'function') {

            onComplete(results);

        }

    }


    // =================================
    // EMITIR ACTUALIZACIONES
    // =================================

    function emitUpdate(event, data = null) {

        if (typeof onUpdate === 'function') {

            onUpdate({

                event,

                data,

                stats: getStats()

            });

        }

    }


    // =================================
    // ACTUALIZAR SISTEMA
    // =================================

    function update(deltaTime = 1 / 60) {

        if (disposed || paused || completed || !started) {

            return;

        }


        const safeDelta = clamp(

            deltaTime,

            0,

            0.05

        );


        // El cronómetro solo avanza después de start().
        updateTimer(safeDelta);


        // Procesar los veinte objetos.
        objects.forEach(object => {

            if (object.isClassified) {

                return;

            }


            // Recuperar piezas fuera del laboratorio.
            if (checkOutOfBounds(object)) {

                return;

            }


            processObject(

                object,

                safeDelta

            );

        });

    }


    // =================================
    // ESTADÍSTICAS COMPLETAS
    // =================================

    function getStats() {

        return {

            started,

            paused,

            completed,

            elapsedTime,

            formattedTime: getFormattedTime(),

            correct: correctCount,

            errors: errorCount,

            total: objects.length,

            accuracy: getAccuracy(),

            progress: getProgress(),

            remaining:

                objects.length - correctCount,

            categories: structuredClone(categoryStats)

        };

    }


    // =================================
    // REINICIAR PRÁCTICA
    // =================================

    function reset() {

        console.log('[GAME] Reiniciando práctica...');


        // Reiniciar cronómetro y puntuación.
        started = false;

        paused = false;

        completed = false;

        elapsedTime = 0;

        correctCount = 0;

        errorCount = 0;


        // Reiniciar estadísticas.
        Object.keys(categoryStats).forEach(category => {

            categoryStats[category].correct = 0;

            categoryStats[category].errors = 0;

        });


        // Reiniciar recipientes.
        containers.forEach(container => {

            if (Array.isArray(container.objectsInside)) {

                container.objectsInside.length = 0;

            }

        });


        // Reiniciar figuras.
        objects.forEach(object => {

            object.isClassified = false;

            object.isCorrect = false;

            object.isGrabbed = false;


            const state = objectStates.get(object.id);


            state.wasGrabbed = false;

            state.stableTime = 0;

            state.attemptResolved = false;

            state.lastContainer = null;

            state.attempts = 0;

            state.correct = false;


            recoverObject(object);

        });


        console.log('[GAME] Práctica reiniciada.');

        emitUpdate('reset');

    }


    // =================================
    // LIBERAR RECURSOS
    // =================================

    function dispose() {

        if (disposed) {

            return;

        }


        paused = true;

        disposed = true;


        console.log('[GAME] Sistema liberado.');

    }


    // =================================
    // API PÚBLICA
    // =================================

    console.log(

        '[GAME] Sistema de clasificación preparado.'

    );


    return {

        start,

        pause,

        resume,

        update,

        reset,

        getStats,

        getProgress,

        getAccuracy,

        getFormattedTime,

        findContainer,

        validateClassification,

        recoverObject,

        dispose

    };

}
