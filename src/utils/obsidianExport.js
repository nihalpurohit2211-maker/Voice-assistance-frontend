/**
 * Obsidian Export Utility
 * Generates clean Markdown files and triggers browser downloads.
 * No Obsidian API integration -- just .md files the user drags into their vault.
 */

function downloadMarkdown(filename, content) {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function formatDate(dateInput, forFilename = false) {
    const d = new Date(dateInput);
    if (forFilename) {
        return d.toISOString().split('T')[0];
    }
    return d.toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

/**
 * Export all memories to a single Obsidian-ready Markdown file.
 * @param {Array<{id: string, text: string, created_at: string}>} memories
 */
export function exportMemoriesToObsidian(memories) {
    const exportDate = new Date();
    const exportDateStr = formatDate(exportDate);
    const filenameDateStr = formatDate(exportDate, true);

    const lines = [
        `# Memories Export`,
        ``,
        `*Exported: ${exportDateStr}*`,
        `*Total memories: ${memories.length}*`,
        ``,
        `---`,
        ``,
    ];

    memories.forEach((memory, index) => {
        lines.push(`## Memory ${index + 1}`);
        lines.push(`*Saved: ${formatDate(memory.created_at)}*`);
        lines.push(``);
        lines.push(memory.text);
        lines.push(``);
        lines.push(`---`);
        lines.push(``);
    });

    downloadMarkdown(`memories-${filenameDateStr}.md`, lines.join('\n'));
}

/**
 * Export a single chat session transcript to an Obsidian-ready Markdown file.
 * @param {{ started_at: string, messages: Array<{role: string, content: string, created_at: string, was_interrupted?: boolean}> }} chat
 */
export function exportChatToObsidian(chat) {
    const sessionDate = formatDate(chat.started_at);
    const filenameDateStr = formatDate(chat.started_at, true);

    const lines = [
        `# Voice Session -- ${sessionDate}`,
        ``,
        `*Session started: ${sessionDate}*`,
        `*Messages: ${chat.messages.length}*`,
        ``,
        `---`,
        ``,
    ];

    chat.messages.forEach((msg) => {
        const speaker = msg.role === 'user' ? '**You**' : '**Assistant**';
        const time = formatDate(msg.created_at);
        lines.push(`### ${speaker}`);
        lines.push(`*${time}*`);
        lines.push(``);
        lines.push(msg.content);
        if (msg.was_interrupted) {
            lines.push(``);
            lines.push(`> *Interrupted*`);
        }
        lines.push(``);
    });

    downloadMarkdown(`session-${filenameDateStr}.md`, lines.join('\n'));
}
