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

            const audioBuffer = await this.context.decodeAudioData(bytes.buffer);
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
