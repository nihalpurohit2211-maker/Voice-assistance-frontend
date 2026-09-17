class AudioPlayer {
    constructor() {
        this.context = null;
        this.playQueue = [];
        this.activeSources = [];
        this.nextPlayTime = 0;
        this.cumulativeTextLength = 0;
        this.isBuffering = true;
        this.lastChunkTime = 0;
        this.leftoverBytes = null;
    }

    init() {
        if (!this.context) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.context = new AudioContext({ sampleRate: 24000 });
        }
        if (this.context.state === 'suspended') {
            this.context.resume();
        }
    }

    async enqueueChunk(base64Audio, textLength) {
        if (!this.context) return;

        try {
            const arrivalTime = performance.now();
            if (this.lastChunkTime) {
                console.log(`[JitterBuffer] Chunk arrived ${Math.round(arrivalTime - this.lastChunkTime)}ms after previous`);
            }
            this.lastChunkTime = arrivalTime;

            const binaryString = window.atob(base64Audio);
            
            // Combine with any leftover bytes from the previous chunk
            let len = binaryString.length;
            if (this.leftoverBytes) {
                len += this.leftoverBytes.length;
            }
            
            const bytes = new Uint8Array(len);
            let offset = 0;
            
            if (this.leftoverBytes) {
                bytes.set(this.leftoverBytes);
                offset = this.leftoverBytes.length;
                this.leftoverBytes = null;
            }
            
            for (let i = 0; i < binaryString.length; i++) {
                bytes[offset + i] = binaryString.charCodeAt(i);
            }

            // Cartesia sends raw 16-bit PCM at 24000 Hz.
            // If the chunk is an odd number of bytes, save the last byte for the next chunk
            let processBytes = bytes;
            if (bytes.length % 2 !== 0) {
                this.leftoverBytes = new Uint8Array([bytes[bytes.length - 1]]);
                processBytes = new Uint8Array(bytes.buffer, 0, bytes.length - 1);
            }

            if (processBytes.length === 0) return;

            const int16View = new Int16Array(processBytes.buffer, 0, processBytes.length / 2);
            const float32Data = new Float32Array(int16View.length);
            for (let i = 0; i < int16View.length; i++) {
                float32Data[i] = int16View[i] / 32768.0;
            }

            const audioBuffer = this.context.createBuffer(1, float32Data.length, 24000);
            audioBuffer.copyToChannel(float32Data, 0);

            this.playQueue.push({ buffer: audioBuffer, textLength });
            
            // Jitter buffer: Wait for 2 chunks before starting playback
            if (this.isBuffering && this.playQueue.length < 2) {
                console.log(`[JitterBuffer] Buffering chunk ${this.playQueue.length}/2...`);
                return;
            }
            
            this.isBuffering = false;
            this._scheduleNext();
            
        } catch (err) {
            console.error("Error decoding audio chunk", err);
        }
    }

    _scheduleNext() {
        // Ensure we don't fall behind currentTime
        if (this.nextPlayTime < this.context.currentTime) {
            this.nextPlayTime = this.context.currentTime + 0.05; // tiny buffer if we fell behind
        }

        while (this.playQueue.length > 0) {
            const nextItem = this.playQueue.shift();

            const source = this.context.createBufferSource();
            source.buffer = nextItem.buffer;
            source.connect(this.context.destination);

            console.log(`[Playback] Scheduling chunk to play at ${this.nextPlayTime.toFixed(3)}s (Current: ${this.context.currentTime.toFixed(3)}s)`);
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

    flush() {
        if (this.isBuffering) {
            console.log(`[JitterBuffer] Turn ended. Flushing remaining buffer...`);
            this.isBuffering = false;
            this._scheduleNext();
        }
        // Reset state for next turn
        this.isBuffering = true;
        this.lastChunkTime = 0;
        this.leftoverBytes = null;
    }

    stopImmediately() {
        for (const source of this.activeSources) {
            source.onended = null; // Prevent adding to cumulativeTextLength on manual stop
            try { source.stop(); } catch (e) {}
        }
        this.activeSources = [];
        this.playQueue = [];
        this.nextPlayTime = 0;
        this.isBuffering = true;
        this.lastChunkTime = 0;
        this.leftoverBytes = null;
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
        this.isBuffering = true;
        this.lastChunkTime = 0;
        this.leftoverBytes = null;
    }
}

export const audioPlayer = new AudioPlayer();
