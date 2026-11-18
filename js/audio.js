
/* =====================================================
   PRACTICA 3.2 - INTERACCION VIRTUAL
   MODULO: AUDIO.JS
   Sonidos generados mediante Web Audio API.
===================================================== */

export function createAudioSystem() {

    let audioContext = null;

    let muted = false;

    let initialized = false;


    // =================================
    // INICIALIZAR AUDIO
    // =================================

    function initialize() {

        if (initialized) {

            if (audioContext?.state === 'suspended') {

                audioContext.resume();

            }

            return;

        }


        const AudioContextClass =

            window.AudioContext ||

            window.webkitAudioContext;


        if (!AudioContextClass) {

            console.warn('[AUDIO] Web Audio no disponible.');

            return;

        }


        audioContext = new AudioContextClass();

        initialized = true;

        console.log('[AUDIO] Sistema inicializado.');

    }


    // =================================
    // GENERADOR DE TONOS
    // =================================

    function tone({

        frequency = 440,

        duration = 0.15,

        type = 'sine',

        volume = 0.12,

        endFrequency = null

    } = {}) {

        if (muted || !audioContext) {

            return;

        }


        const oscillator = audioContext.createOscillator();

        const gain = audioContext.createGain();


        oscillator.type = type;

        oscillator.frequency.setValueAtTime(

            frequency,

            audioContext.currentTime

        );


        if (endFrequency !== null) {

            oscillator.frequency.exponentialRampToValueAtTime(

                Math.max(endFrequency, 1),

                audioContext.currentTime + duration

            );

        }


        gain.gain.setValueAtTime(

            0.0001,

            audioContext.currentTime

        );


        gain.gain.exponentialRampToValueAtTime(

            volume,

            audioContext.currentTime + 0.02

        );


        gain.gain.exponentialRampToValueAtTime(

            0.0001,

            audioContext.currentTime + duration

        );


        oscillator.connect(gain);

        gain.connect(audioContext.destination);


        oscillator.start();

        oscillator.stop(

            audioContext.currentTime + duration + 0.02

        );

    }


    // =================================
    // SONIDO DE ACIERTO
    // =================================

    function playCorrect() {

        tone({

            frequency: 550,

            endFrequency: 850,

            duration: 0.18,

            type: 'sine'

        });


        setTimeout(() => {

            tone({

                frequency: 850,

                endFrequency: 1100,

                duration: 0.2,

                type: 'sine'

            });

        }, 130);

    }


    // =================================
    // SONIDO DE ERROR
    // =================================

    function playError() {

        tone({

            frequency: 240,

            endFrequency: 110,

            duration: 0.3,

            type: 'triangle',

            volume: 0.1

        });

    }


    // =================================
    // SONIDO DE AGARRE
    // =================================

    function playGrab() {

        tone({

            frequency: 420,

            endFrequency: 620,

            duration: 0.1,

            type: 'sine',

            volume: 0.07

        });

    }


    // =================================
    // SONIDO DE LIBERACIÓN
    // =================================

    function playRelease() {

        tone({

            frequency: 400,

            endFrequency: 260,

            duration: 0.12,

            type: 'sine',

            volume: 0.06

        });

    }


    // =================================
    // SONIDO DE FINALIZACIÓN
    // =================================

    function playComplete() {

        const notes = [

            523,

            659,

            784,

            1046

        ];


        notes.forEach((frequency, index) => {

            setTimeout(() => {

                tone({

                    frequency,

                    duration: 0.35,

                    volume: 0.13,

                    type: 'sine'

                });

            }, index * 180);

        });

    }


    // =================================
    // CONTROL DE AUDIO
    // =================================

    function setMuted(value) {

        muted = Boolean(value);

    }


    function isMuted() {

        return muted;

    }


    function dispose() {

        if (audioContext) {

            audioContext.close();

            audioContext = null;

        }

        initialized = false;

    }


    return {

        initialize,

        playCorrect,

        playError,

        playGrab,

        playRelease,

        playComplete,

        setMuted,

        isMuted,

        dispose

    };

}
