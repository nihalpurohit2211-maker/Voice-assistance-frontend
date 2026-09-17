class AudioPlayer {
    constructor() {
        this.context = null;
        this.playQueue = [];
        this.isPlaying = false;
        this.currentSource = null;
        this.cumulativeTextLength = 0;
        this.currentTextLength = 0;
    }

    init() {
        if (!this.context) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.context = new AudioContext();
        }
        if (this.context.state === 'suspended') {
            this.context.resume();
        }
    }

    async enqueueChunk(base64Audio, textLength) {
        if (!this.context) return;

        try {
            const binaryString = window.atob(base64Audio);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }

            // Cartesia sends raw 16-bit PCM at 8000 Hz. decodeAudioData expects a full WAV/MP3 file with a header.
            // We must manually convert the raw PCM to Float32 for the Web Audio API.
            const int16View = new Int16Array(bytes.buffer);
            const float32Data = new Float32Array(int16View.length);
            for (let i = 0; i < int16View.length; i++) {
                float32Data[i] = int16View[i] / 32768.0;
            }

            const audioBuffer = this.context.createBuffer(1, float32Data.length, 8000);
            audioBuffer.copyToChannel(float32Data, 0);

            this.playQueue.push({ buffer: audioBuffer, textLength });

            if (!this.isPlaying) {
                this._playNext();
            }
        } catch (err) {
            console.error("Error decoding audio chunk", err);
        }
    }

    _playNext() {
        if (this.playQueue.length === 0) {
            this.isPlaying = false;
            this.currentSource = null;
            return;
        }

        this.isPlaying = true;
        const nextItem = this.playQueue.shift();
        this.currentTextLength = nextItem.textLength || 0;

        const source = this.context.createBufferSource();
        source.buffer = nextItem.buffer;
        source.connect(this.context.destination);

        source.onended = () => {
            this.cumulativeTextLength += this.currentTextLength;
            this._playNext();
        };

        source.start(0);
        this.currentSource = source;
    }

    stopImmediately() {
        if (this.currentSource) {
            this.currentSource.onended = null;
            this.currentSource.stop();
            this.currentSource = null;
        }
        this.playQueue = [];
        this.isPlaying = false;
        return this.cumulativeTextLength;
    }

    reset() {
        if (this.currentSource) {
            this.currentSource.onended = null;
            this.currentSource.stop();
        }
        this.playQueue = [];
        this.isPlaying = false;
        this.currentSource = null;
        this.cumulativeTextLength = 0;
        this.currentTextLength = 0;
    }
}

export const audioPlayer = new AudioPlayer();
