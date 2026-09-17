class AudioPlayer {
    constructor() {
        this.context = null;
        this.playQueue = [];
        this.activeSources = [];
        this.nextPlayTime = 0;
        this.cumulativeTextLength = 0;
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

            // Cartesia sends raw 16-bit PCM at 24000 Hz.
            const int16View = new Int16Array(bytes.buffer);
            const float32Data = new Float32Array(int16View.length);
            for (let i = 0; i < int16View.length; i++) {
                float32Data[i] = int16View[i] / 32768.0;
            }

            const audioBuffer = this.context.createBuffer(1, float32Data.length, 24000);
            audioBuffer.copyToChannel(float32Data, 0);

            this.playQueue.push({ buffer: audioBuffer, textLength });
            this._scheduleNext();
            
        } catch (err) {
            console.error("Error decoding audio chunk", err);
        }
    }

    _scheduleNext() {
        // Ensure we don't fall behind currentTime
        if (this.nextPlayTime < this.context.currentTime) {
            this.nextPlayTime = this.context.currentTime;
        }

        while (this.playQueue.length > 0) {
            const nextItem = this.playQueue.shift();

            const source = this.context.createBufferSource();
            source.buffer = nextItem.buffer;
            source.connect(this.context.destination);

            source.start(this.nextPlayTime);
            this.nextPlayTime += nextItem.buffer.duration;

            source.onended = () => {
                this.cumulativeTextLength += (nextItem.textLength || 0);
                // Clean up active sources array to prevent memory leaks
                this.activeSources = this.activeSources.filter(s => s !== source);
            };

            this.activeSources.push(source);
        }
    }

    stopImmediately() {
        for (const source of this.activeSources) {
            source.onended = null; // Prevent adding to cumulativeTextLength on manual stop
            try { source.stop(); } catch (e) {}
        }
        this.activeSources = [];
        this.playQueue = [];
        this.nextPlayTime = 0;
        return this.cumulativeTextLength;
    }

    reset() {
        for (const source of this.activeSources) {
            source.onended = null;
            try { source.stop(); } catch (e) {}
        }
        this.activeSources = [];
        this.playQueue = [];
        this.nextPlayTime = 0;
        this.cumulativeTextLength = 0;
    }
}

export const audioPlayer = new AudioPlayer();
